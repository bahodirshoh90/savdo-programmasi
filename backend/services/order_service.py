"""
Order Service
"""
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from models import Order, OrderItem, OrderStatus, Seller, Customer, Product
from schemas import OrderCreate, OrderResponse, OrderItemResponse
try:
    from .calculation_service import CalculationService
    from .inventory_service import InventoryService
    from .audit_service import AuditService
except ImportError:
    from calculation_service import CalculationService
    from inventory_service import InventoryService
    from audit_service import AuditService
from sqlalchemy.orm import joinedload


class OrderService:
    """Service for order management"""
    
    @staticmethod
    def create_order(db: Session, order: OrderCreate) -> Order:
        """
        Create a new order (from mobile app)
        Similar to sale but with order status tracking
        """
        # Verify seller and customer exist
        seller = db.query(Seller).filter(Seller.id == order.seller_id).first()
        if not seller:
            # Try to get first active seller as fallback
            fallback_seller = db.query(Seller).filter(Seller.is_active == True).first()
            if not fallback_seller:
                raise ValueError("Seller not found and no active sellers available")
            order.seller_id = fallback_seller.id
            seller = fallback_seller
        
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if not customer:
            raise ValueError(f"Customer not found (ID: {order.customer_id})")
        
        # Create order
        db_order = Order(
            seller_id=order.seller_id,
            customer_id=order.customer_id,
            status=OrderStatus.PENDING,
            total_amount=0,
            is_offline=order.is_offline
        )
        db.add(db_order)
        db.flush()
        
        total_amount = 0
        
        # Process each item
        for item in order.items:
            # Calculate breakdown
            calculation = CalculationService.calculate_sale(
                db, item.product_id, item.requested_quantity, order.customer_id
            )
            
            if "error" in calculation:
                db.rollback()
                raise ValueError(f"Product {item.product_id}: {calculation['error']}")
            
            # Deduct inventory with audit logging
            success = CalculationService.deduct_inventory(
                db,
                item.product_id,
                calculation["packages_to_sell"],
                calculation["pieces_to_sell"],
                user_id=order.seller_id,
                user_name=seller.name,
                user_type="seller",
                action="order_created",
                reason=f"Buyurtma #${db_order.id}",
                reference_id=db_order.id,
                reference_type="order"
            )
            
            if not success:
                db.rollback()
                raise ValueError(f"Not enough stock for product {item.product_id}")
            
            # Create order item
            order_item = OrderItem(
                order_id=db_order.id,
                product_id=item.product_id,
                requested_quantity=item.requested_quantity,
                packages_sold=calculation["packages_to_sell"],
                pieces_sold=calculation["pieces_to_sell"],
                package_price=calculation["package_price"],
                piece_price=calculation["piece_price"],
                subtotal=calculation["subtotal"]
            )
            db.add(order_item)
            
            # Record inventory transaction
            InventoryService.record_transaction(
                db,
                item.product_id,
                "sale",
                -calculation["packages_to_sell"],
                -calculation["pieces_to_sell"],
                db_order.id,
                "order"
            )
            
            total_amount += calculation["subtotal"]
        
        # Update order total
        db_order.total_amount = total_amount
        
        # Mark as synced if not offline
        if not order.is_offline:
            db_order.synced_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_order)
        
        return db_order
    
    @staticmethod
    def get_orders(
        db: Session,
        status: Optional[str] = None,
        seller_id: Optional[int] = None,
        customer_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Order]:
        """Get all orders (can filter by status, seller_id, or customer_id)"""
        from sqlalchemy.orm import joinedload
        
        query = db.query(Order).options(
            joinedload(Order.customer),
            joinedload(Order.seller),
            joinedload(Order.items).joinedload(OrderItem.product)
        )
        if status:
            query = query.filter(Order.status == OrderStatus(status))
        if seller_id:
            query = query.filter(Order.seller_id == seller_id)
        if customer_id:
            query = query.filter(Order.customer_id == customer_id)
        return query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_orders_count(
        db: Session,
        status: Optional[str] = None,
        seller_id: Optional[int] = None,
        customer_id: Optional[int] = None
    ) -> int:
        """Get total count of orders matching filters"""
        query = db.query(Order)
        if status:
            query = query.filter(Order.status == OrderStatus(status))
        if seller_id:
            query = query.filter(Order.seller_id == seller_id)
        if customer_id:
            query = query.filter(Order.customer_id == customer_id)
        return query.count()
    
    @staticmethod
    def update_status(db: Session, order_id: int, status: str) -> Optional[Order]:
        """Update order status. If cancelled or returned, restore inventory."""
        db_order = db.query(Order).filter(Order.id == order_id).first()
        if not db_order:
            return None
        
        old_status = db_order.status
        new_status = OrderStatus(status)
        
        # If order was completed/processing and now cancelled/returned, restore inventory
        if old_status in [OrderStatus.COMPLETED, OrderStatus.PROCESSING] and new_status in [OrderStatus.CANCELLED, OrderStatus.RETURNED]:
            # Get seller info for audit
            seller = db.query(Seller).filter(Seller.id == db_order.seller_id).first()
            seller_name = seller.name if seller else "System"
            
            # Restore inventory for each item
            for item in db_order.items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    quantity_before = product.total_pieces
                    
                    # Restore packages and pieces
                    product.packages_in_stock += item.packages_sold
                    product.pieces_in_stock += item.pieces_sold
                    
                    quantity_after = product.total_pieces
                    
                    # Record transaction
                    InventoryService.record_transaction(
                        db=db,
                        product_id=product.id,
                        transaction_type="order_return" if new_status == OrderStatus.RETURNED else "order_cancellation",
                        packages_change=item.packages_sold,
                        pieces_change=item.pieces_sold,
                        reference_id=order_id,
                        reference_type="order",
                        notes=f"Order {new_status.value} - inventory restored"
                    )
                    
                    # Log audit
                    try:
                        action_name = "order_returned" if new_status == OrderStatus.RETURNED else "order_cancelled"
                        AuditService.log_inventory_change(
                            db=db,
                            action=action_name,
                            product_id=product.id,
                            quantity_before=quantity_before,
                            quantity_after=quantity_after,
                            packages_change=item.packages_sold,
                            pieces_change=item.pieces_sold,
                            user_id=db_order.seller_id,
                            user_name=seller_name,
                            user_type="seller",
                            reason=f"Buyurtma #{order_id} {new_status.value}",
                            reference_id=order_id,
                            reference_type="order"
                        )
                    except Exception as e:
                        print(f"Warning: Failed to log audit: {e}")
        
        db_order.status = new_status
        db.commit()
        db.refresh(db_order)
        return db_order
    
    @staticmethod
    def order_to_response(order: Order, include_relations: bool = True) -> Dict[str, Any]:
        """Convert Order model to OrderResponse dict"""
        customer_name = "Noma'lum mijoz"
        seller_name = "Noma'lum sotuvchi"
        
        try:
            if order.customer:
                customer_name = order.customer.name if order.customer else "O'chirilgan mijoz"
        except AttributeError:
            pass
        
        try:
            if order.seller:
                seller_name = order.seller.name
        except AttributeError:
            pass
        
        items_data = []
        try:
            if order.items:
                for item in order.items:
                    product_name = "Noma'lum mahsulot"
                    try:
                        if item.product:
                            product_name = item.product.name
                    except AttributeError:
                        pass
                    
                    items_data.append({
                        "id": item.id,
                        "product_id": item.product_id,
                        "product_name": product_name,
                        "requested_quantity": item.requested_quantity,
                        "packages_sold": item.packages_sold,
                        "pieces_sold": item.pieces_sold,
                        "package_price": item.package_price,
                        "piece_price": item.piece_price,
                        "subtotal": item.subtotal
                    })
        except AttributeError:
            pass
        
        return {
            "id": order.id,
            "seller_id": order.seller_id,
            "customer_id": order.customer_id,
            "customer_name": customer_name,
            "seller_name": seller_name,
            "status": order.status,
            "total_amount": order.total_amount,
            "items": items_data,
            "is_offline": order.is_offline,
            "synced_at": order.synced_at,
            "created_at": order.created_at,
            "updated_at": order.updated_at
        }
