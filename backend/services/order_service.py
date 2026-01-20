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
        try:
            print(f"[ORDER SERVICE] Starting order creation: customer_id={order.customer_id}, seller_id={order.seller_id}, items={len(order.items)}")
            
            # Verify seller and customer exist
            # For orders from customer app, always use an admin seller
            seller = None
            # Try to find admin seller (seller with admin role or admin permissions)
            admin_sellers = db.query(Seller).options(joinedload(Seller.role)).filter(
                Seller.is_active == True
            ).all()
            
            print(f"[ORDER SERVICE] Found {len(admin_sellers)} active sellers")
            
            for s in admin_sellers:
                # Check if seller has admin role
                if s.role and s.role.name:
                    role_name_lower = s.role.name.lower()
                    if 'admin' in role_name_lower or 'direktor' in role_name_lower or 'director' in role_name_lower:
                        seller = s
                        order.seller_id = s.id
                        print(f"[ORDER SERVICE] Found admin seller: {s.name} (ID: {s.id})")
                        break
                
                # Check if seller has admin permissions
                if s.role and s.role.permissions:
                    for perm in s.role.permissions:
                        if 'admin' in perm.code.lower():
                            seller = s
                            order.seller_id = s.id
                            print(f"[ORDER SERVICE] Found admin seller by permission: {s.name} (ID: {s.id})")
                            break
                    if seller:
                        break
            
            # If no admin seller found, use first active seller as fallback
            if not seller:
                fallback_seller = db.query(Seller).filter(Seller.is_active == True).first()
                if not fallback_seller:
                    error_msg = "Seller not found and no active sellers available"
                    print(f"[ORDER SERVICE] ERROR: {error_msg}")
                    raise ValueError(error_msg)
                order.seller_id = fallback_seller.id
                seller = fallback_seller
                print(f"[ORDER SERVICE] Using fallback seller: {seller.name} (ID: {seller.id})")
            
            # If seller_id was provided, verify it exists (but still use admin seller for customer app orders)
            if order.seller_id and order.seller_id != seller.id:
                # Log that we're overriding the provided seller_id
                print(f"[ORDER SERVICE] Overriding provided seller_id {order.seller_id} with admin seller {seller.id}")
            
            customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
            if not customer:
                error_msg = f"Customer not found (ID: {order.customer_id})"
                print(f"[ORDER SERVICE] ERROR: {error_msg}")
                raise ValueError(error_msg)
            
            print(f"[ORDER SERVICE] Customer found: {customer.name} (ID: {customer.id})")
            
            # Create order
            # Set payment method - default to CASH if not provided or invalid
            from models import PaymentMethod
            payment_method = PaymentMethod.CASH
            if order.payment_method:
                try:
                    # Try to get the payment method by value (e.g., "cash", "card", "debt")
                    payment_method_str = str(order.payment_method).lower().strip()
                    print(f"[ORDER SERVICE] Converting payment_method: '{payment_method_str}'")
                    
                    # Try to find matching enum by value
                    payment_method = PaymentMethod(payment_method_str)
                    print(f"[ORDER SERVICE] Payment method converted successfully: {payment_method}")
                except ValueError as e:
                    # If invalid, use CASH as default
                    print(f"[ORDER SERVICE] Invalid payment_method '{order.payment_method}', using CASH as default. Error: {e}")
                    print(f"[ORDER SERVICE] Available payment methods: {[pm.value for pm in PaymentMethod]}")
                    payment_method = PaymentMethod.CASH
            
            db_order = Order(
                seller_id=order.seller_id,
                customer_id=order.customer_id,
                status=OrderStatus.PENDING,
                total_amount=0,
                payment_method=payment_method,
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
                print(f"[ORDER SERVICE] Processed item {item.product_id}: {calculation['packages_to_sell']} packages, {calculation['pieces_to_sell']} pieces, subtotal={calculation['subtotal']}")
            
            # Update order total
            db_order.total_amount = total_amount
            
            # Mark as synced if not offline
            if not order.is_offline:
                db_order.synced_at = datetime.utcnow()
            
            db.commit()
            db.refresh(db_order)
            
            print(f"[ORDER SERVICE] Order created successfully: order_id={db_order.id}, total={total_amount}")
            return db_order
            
        except ValueError as ve:
            db.rollback()
            error_msg = str(ve)
            print(f"[ORDER SERVICE] ValueError: {error_msg}")
            # Re-raise as ValueError - will be caught by main.py and converted to HTTPException
            raise ValueError(error_msg)
        except Exception as e:
            db.rollback()
            error_msg = f"Error creating order: {str(e)}"
            print(f"[ORDER SERVICE] Unexpected error: {error_msg}")
            import traceback
            traceback.print_exc()
            raise ValueError(error_msg)
    
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
        
        # Debug logging
        print(f"[ORDER_SERVICE.get_orders] Params: status={status}, seller_id={seller_id}, customer_id={customer_id}, skip={skip}, limit={limit}")
        
        query = db.query(Order).options(
            joinedload(Order.customer),
            joinedload(Order.seller),
            joinedload(Order.items).joinedload(OrderItem.product)
        )
        
        # Count total orders before filtering
        total_before_filter = query.count()
        print(f"[ORDER_SERVICE.get_orders] Total orders before filter: {total_before_filter}")
        
        # Status bo'sh yoki None bo'lsa, filter ishlamasin
        if status is not None and status != '' and str(status).lower() != 'all':
            try:
                status_enum = OrderStatus(status)
                query = query.filter(Order.status == status_enum)
                print(f"[ORDER_SERVICE.get_orders] Applied status filter: {status} ({status_enum})")
            except ValueError as e:
                print(f"[ORDER_SERVICE.get_orders] Invalid status '{status}': {e}")
        else:
            print(f"[ORDER_SERVICE.get_orders] No status filter applied (status={status})")
        
        if seller_id:
            query = query.filter(Order.seller_id == seller_id)
            print(f"[ORDER_SERVICE.get_orders] Applied seller_id filter: {seller_id}")
        if customer_id:
            query = query.filter(Order.customer_id == customer_id)
            print(f"[ORDER_SERVICE.get_orders] Applied customer_id filter: {customer_id}")
        
        # Count after filtering
        count_after_filter = query.count()
        print(f"[ORDER_SERVICE.get_orders] Orders after filter: {count_after_filter}")
        
        result = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
        print(f"[ORDER_SERVICE.get_orders] Returning {len(result)} orders (after skip={skip}, limit={limit})")
        
        return result
    
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
        
        # If order is being completed, create a sale record
        if new_status == OrderStatus.COMPLETED and old_status != OrderStatus.COMPLETED:
            try:
                # Import SaleService and schemas
                try:
                    from .sale_service import SaleService
                    from schemas import SaleCreate, SaleItemCreate
                except ImportError:
                    from sale_service import SaleService
                    from schemas import SaleCreate, SaleItemCreate
                
                # Convert order items to sale items
                sale_items = []
                for order_item in db_order.items:
                    sale_items.append(SaleItemCreate(
                        product_id=order_item.product_id,
                        requested_quantity=order_item.requested_quantity
                    ))
                
                # Create sale from order
                # Use order's payment_method if available, otherwise default to cash
                order_payment_method = "cash"
                if db_order.payment_method:
                    if hasattr(db_order.payment_method, 'value'):
                        order_payment_method = db_order.payment_method.value
                    else:
                        order_payment_method = str(db_order.payment_method).lower()
                
                sale_create = SaleCreate(
                    seller_id=db_order.seller_id,
                    customer_id=db_order.customer_id,
                    items=sale_items,
                    payment_method=order_payment_method,  # Use order's payment method
                    payment_amount=db_order.total_amount,
                    requires_admin_approval=False  # Orders are already approved
                )
                
                # Create the sale
                sale = SaleService.create_sale(db, sale_create)
                print(f"Order #{order_id} completed - Sale #{sale.id} created automatically")
            except Exception as e:
                # Log error but don't fail the order status update
                print(f"Warning: Failed to create sale from order #{order_id}: {e}")
                import traceback
                traceback.print_exc()
        
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
        
        # Handle status enum conversion
        status_value = order.status
        if hasattr(status_value, 'value'):
            status_value = status_value.value
        
        # Handle payment_method enum conversion
        payment_method_value = None
        if hasattr(order, 'payment_method') and order.payment_method:
            payment_method_value = order.payment_method.value if hasattr(order.payment_method, 'value') else str(order.payment_method)
        
        return {
            "id": order.id,
            "seller_id": order.seller_id,
            "customer_id": order.customer_id,
            "customer_name": customer_name,
            "seller_name": seller_name,
            "status": status_value,
            "total_amount": order.total_amount,
            "payment_method": payment_method_value,
            "items": items_data,
            "is_offline": order.is_offline,
            "synced_at": order.synced_at,
            "created_at": order.created_at,
            "updated_at": order.updated_at
        }
