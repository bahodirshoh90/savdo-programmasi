"""
Sale Service
"""
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from models import Sale, SaleItem, Product, Customer, Seller, PaymentMethod
from schemas import SaleCreate, SaleResponse, SaleItemResponse
try:
    from .calculation_service import CalculationService
    from .inventory_service import InventoryService
    from .audit_service import AuditService
except ImportError:
    from calculation_service import CalculationService
    from inventory_service import InventoryService
    from audit_service import AuditService


class SaleService:
    """Service for sale management"""
    
    @staticmethod
    def create_sale(db: Session, sale: SaleCreate) -> Sale:
        """
        Create a new sale with automatic package/piece calculation
        """
        try:
            # Verify seller and customer exist
            seller = db.query(Seller).filter(Seller.id == sale.seller_id).first()
            if not seller:
                db.rollback()
                raise ValueError("Seller not found")
            
            customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
            if not customer:
                db.rollback()
                raise ValueError("Customer not found")
            
            # Create sale (will calculate total_amount while processing items)
            payment_method = PaymentMethod(sale.payment_method) if sale.payment_method else PaymentMethod.CASH
            
            # Handle payment and admin approval
            requires_approval = sale.requires_admin_approval or False
            
            # Initialize total_amount
            total_amount = 0.0
            
            # Create sale record (will update total_amount later)
            db_sale = Sale(
                seller_id=sale.seller_id,
                customer_id=sale.customer_id,
                total_amount=0,  # Will be calculated below
                payment_method=payment_method,
                payment_amount=sale.payment_amount,
                excess_action=sale.excess_action,
                requires_admin_approval=requires_approval,
                admin_approved=None if requires_approval else True  # Auto-approved if no approval needed
            )
            db.add(db_sale)
            db.flush()  # Get sale.id
            
            # Process each item
            for item in sale.items:
                # Calculate breakdown
                calculation = CalculationService.calculate_sale(
                    db, item.product_id, item.requested_quantity, sale.customer_id
                )
                
                if not calculation:
                    db.rollback()
                    raise ValueError(f"Product {item.product_id}: Calculation failed")
                
                if "error" in calculation:
                    db.rollback()
                    raise ValueError(f"Product {item.product_id}: {calculation['error']}")
                
                # Only deduct inventory if admin approved (or no approval needed)
                if not requires_approval or db_sale.admin_approved:
                    # Deduct inventory with audit logging
                    product_before = db.query(Product).filter(Product.id == item.product_id).first()
                    quantity_before = product_before.total_pieces if product_before else 0
                    
                    success = CalculationService.deduct_inventory(
                        db,
                        item.product_id,
                        calculation["packages_to_sell"],
                        calculation["pieces_to_sell"],
                        user_id=sale.seller_id,
                        user_name=seller.name,
                        user_type="seller",
                        action="sale_created",
                        reason=f"Sotuv #{db_sale.id}",
                        reference_id=db_sale.id,
                        reference_type="sale"
                    )
                    
                    if not success:
                        db.rollback()
                        raise ValueError(f"Not enough stock for product {item.product_id}")
                    
                    # Record inventory transaction
                    InventoryService.record_transaction(
                        db,
                        item.product_id,
                        "sale",
                        -calculation["packages_to_sell"],
                        -calculation["pieces_to_sell"],
                        db_sale.id,
                        "sale"
                    )
                
                # Create sale item
                sale_item = SaleItem(
                    sale_id=db_sale.id,
                    product_id=item.product_id,
                    requested_quantity=item.requested_quantity,
                    packages_sold=calculation["packages_to_sell"],
                    pieces_sold=calculation["pieces_to_sell"],
                    package_price=calculation["package_price"],
                    piece_price=calculation["piece_price"],
                    subtotal=calculation["subtotal"]
                )
                db.add(sale_item)
                total_amount += calculation["subtotal"]
            
            # Update sale total
            db_sale.total_amount = total_amount
            db.flush()
            
            # If admin approval required, don't process payment/debt yet
            if requires_approval:
                db.commit()
                db.refresh(db_sale)
                
                # Adminga bildirishnoma yuborish
                try:
                    import asyncio
                    import os
                    from dotenv import load_dotenv
                    from telegram import Bot
                    
                    # .env faylni to'g'ri joylashuvdan yuklash
                    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
                    load_dotenv(env_path)
                    TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
                    ADMIN_CHAT_IDS = [int(x) for x in (os.getenv('ADMIN_CHAT_IDS') or '').split(',') if x.strip().isdigit()]
                    
                    print(f"DEBUG: TELEGRAM_TOKEN={TELEGRAM_TOKEN}")
                    print(f"DEBUG: ADMIN_CHAT_IDS={ADMIN_CHAT_IDS}")
                    
                    if TELEGRAM_TOKEN and ADMIN_CHAT_IDS:
                        text = f"🔔 YANGI SOTUV TASDIQLASHNI KUTMOQDA!\n\n"
                        text += f"ID: #{db_sale.id}\n"
                        text += f"👤 Mijoz: {customer.name}\n"
                        text += f"👨‍💼 Sotuvchi: {seller.name}\n"
                        text += f"💰 Summa: {db_sale.total_amount:,.0f} so'm\n\n"
                        text += f"Ko'rish va tasdiqlash uchun:\n"
                        text += f"/view_sale {db_sale.id}"
                        
                        # Bildirishnomani alohida threadda yuborish
                        def send_in_thread():
                            import asyncio
                            from telegram import Bot
                            
                            async def send_notification():
                                bot = Bot(token=TELEGRAM_TOKEN)
                                for admin_id in ADMIN_CHAT_IDS:
                                    try:
                                        print(f"DEBUG: Adminga {admin_id} xabar yuborish...")
                                        await bot.send_message(chat_id=admin_id, text=text)
                                        print(f"DEBUG: Admin {admin_id}ga xabar yuborildi!")
                                    except Exception as e:
                                        print(f"DEBUG: Admin {admin_id}ga xabar yuborishda xatolik: {e}")
                            
                            # Yangi event loop yaratish
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                            try:
                                loop.run_until_complete(send_notification())
                                print("DEBUG: Bildirishnoma yuborildi!")
                            finally:
                                loop.close()
                        
                        # Alohida threadda yuborish
                        print("DEBUG: Bildirishnoma yuborish boshlandi...")
                        import threading
                        thread = threading.Thread(target=send_in_thread, daemon=True)
                        thread.start()
                    else:
                        print(f"DEBUG: Telegram sozlamalari topilmadi! Token={bool(TELEGRAM_TOKEN)}, Admins={bool(ADMIN_CHAT_IDS)}")
                except Exception as e:
                    print(f"Bildirishnoma yuborishda xatolik: {e}")
                
                return db_sale  # Return without processing payment/debt
            
            # Process payment and debt
            try:
                from .debt_service import DebtService
            except ImportError:
                from debt_service import DebtService
            from datetime import datetime
            
            payment_amount = sale.payment_amount or total_amount
            db_sale.payment_amount = payment_amount
            excess = payment_amount - total_amount  # Positive if paid more, negative if paid less
            
            if excess > 0:  # Customer paid more
                if sale.excess_action == 'debt':
                    # Apply excess to customer's debt
                    if customer.debt_balance > 0:
                        # Pay down debt
                        debt_to_pay = min(excess, customer.debt_balance)
                        DebtService.pay_debt(
                            db=db,
                            customer_id=sale.customer_id,
                            amount=debt_to_pay,
                            reason=f"Sotuv #{db_sale.id} - ortiqcha to'lov",
                            created_by=sale.seller_id,
                            created_by_name=seller.name,
                            reference_id=db_sale.id,
                            reference_type="sale"
                        )
                        # If still excess after paying debt, add to debt balance (negative)
                        remaining_excess = excess - debt_to_pay
                        if remaining_excess > 0:
                            DebtService.add_debt(
                                db=db,
                                customer_id=sale.customer_id,
                                amount=-remaining_excess,  # Negative means reduce debt
                                reason=f"Sotuv #{db_sale.id} - ortiqcha to'lov qoldig'i",
                                created_by=sale.seller_id,
                                created_by_name=seller.name,
                                reference_id=db_sale.id,
                                reference_type="sale"
                            )
                    else:
                        # No debt - excess should be returned, not added to credit
                        # Change excess_action to 'return' to indicate refund
                        db_sale.excess_action = 'return'
                        # Don't add to debt - excess should be returned to customer
                        # The excess amount will be shown as "return" in the receipt
                # else: excess_action == 'return' - nothing to do, just keep the excess as is
            elif excess < 0:  # Customer paid less (debt)
                # Add to customer's debt
                debt_amount = abs(excess)
                DebtService.add_debt(
                    db=db,
                    customer_id=sale.customer_id,
                    amount=debt_amount,
                    reason=f"Sotuv #{db_sale.id} - to'lov yetmadi",
                    created_by=sale.seller_id,
                    created_by_name=seller.name,
                    reference_id=db_sale.id,
                    reference_type="sale"
                )
            
            db.commit()
            db.refresh(db_sale)
            
            return db_sale
        except ValueError as e:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise ValueError(f"Error creating sale: {str(e)}")
    
    @staticmethod
    def get_sales(
        db: Session,
        seller_id: Optional[int] = None,
        customer_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sale]:
        """Get all sales, optionally filtered"""
        from datetime import datetime
        
        query = db.query(Sale)
        
        if seller_id:
            query = query.filter(Sale.seller_id == seller_id)
        if customer_id:
            query = query.filter(Sale.customer_id == customer_id)
        
        # Filter by status
        if status:
            from sqlalchemy import or_, and_
            if status == 'approved':
                # Approved: either no approval required OR admin approved
                query = query.filter(
                    or_(
                        Sale.requires_admin_approval == False,
                        and_(
                            Sale.requires_admin_approval == True,
                            Sale.admin_approved.is_(True)  # Use is_() for explicit True check
                        )
                    )
                )
            elif status == 'pending':
                # Pending: requires approval but not yet approved/rejected
                query = query.filter(
                    and_(
                        Sale.requires_admin_approval == True,
                        Sale.admin_approved.is_(None)  # None = pending
                    )
                )
            elif status == 'rejected':
                # Rejected: admin explicitly rejected (False, not None)
                query = query.filter(
                    and_(
                        Sale.requires_admin_approval == True,
                        Sale.admin_approved.is_(False)  # Use is_() for explicit False check
                    )
                )
        
        # Filter by date range
        if start_date:
            try:
                # Try parsing as ISO format or date format
                if 'T' in start_date:
                    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                else:
                    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(Sale.created_at >= start_dt)
            except (ValueError, AttributeError):
                pass  # Ignore invalid date format
        
        if end_date:
            try:
                # Try parsing as ISO format or date format
                if 'T' in end_date:
                    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                else:
                    end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                    # Add one day to include the entire end date
                    from datetime import timedelta
                    end_dt = end_dt + timedelta(days=1)
                query = query.filter(Sale.created_at < end_dt)
            except (ValueError, AttributeError):
                pass  # Ignore invalid date format
        
        return query.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_sales_count(
        db: Session,
        seller_id: Optional[int] = None,
        customer_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        status: Optional[str] = None
    ) -> int:
        """Get total count of sales matching filters"""
        from datetime import datetime
        
        query = db.query(Sale)
        
        if seller_id:
            query = query.filter(Sale.seller_id == seller_id)
        if customer_id:
            query = query.filter(Sale.customer_id == customer_id)
        
        # Filter by status
        if status:
            from sqlalchemy import or_, and_
            if status == 'approved':
                query = query.filter(
                    or_(
                        Sale.requires_admin_approval == False,
                        and_(
                            Sale.requires_admin_approval == True,
                            Sale.admin_approved.is_(True)
                        )
                    )
                )
            elif status == 'pending':
                query = query.filter(
                    and_(
                        Sale.requires_admin_approval == True,
                        Sale.admin_approved.is_(None)
                    )
                )
            elif status == 'rejected':
                query = query.filter(
                    and_(
                        Sale.requires_admin_approval == True,
                        Sale.admin_approved.is_(False)
                    )
                )
        
        # Filter by date range
        if start_date:
            try:
                if 'T' in start_date:
                    start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                else:
                    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(Sale.created_at >= start_dt)
            except (ValueError, AttributeError):
                pass
        
        if end_date:
            try:
                if 'T' in end_date:
                    end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                else:
                    end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                    from datetime import timedelta
                    end_dt = end_dt + timedelta(days=1)
                query = query.filter(Sale.created_at < end_dt)
            except (ValueError, AttributeError):
                pass
        
        return query.count()
    
    @staticmethod
    def get_sale(db: Session, sale_id: int) -> Optional[Sale]:
        """Get a specific sale"""
        from sqlalchemy.orm import joinedload
        return db.query(Sale).options(
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.customer),
            joinedload(Sale.seller),
            joinedload(Sale.approver)
        ).filter(Sale.id == sale_id).first()
    
    @staticmethod
    def update_sale(
        db: Session,
        sale_id: int,
        customer_id: Optional[int] = None,
        items: Optional[List] = None,
        payment_method: Optional[str] = None
    ) -> Optional[Sale]:
        """Update an existing sale"""
        sale = db.query(Sale).filter(Sale.id == sale_id).first()
        if not sale:
            return None
        
        seller = sale.seller
        
        # Return old items to inventory
        for old_item in sale.items:
            CalculationService.add_inventory(
                db,
                old_item.product_id,
                old_item.packages_sold,
                old_item.pieces_sold,
                user_id=sale.seller_id,
                user_name=seller.name,
                user_type="seller",
                action="sale_updated",
                reason=f"Sotuv #{sale.id} yangilandi - qaytarildi",
                reference_id=sale.id,
                reference_type="sale"
            )
        
        # Delete old items
        db.query(SaleItem).filter(SaleItem.sale_id == sale_id).delete()
        db.flush()
        
        # Update customer if provided
        if customer_id is not None:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if not customer:
                raise ValueError("Customer not found")
            sale.customer_id = customer_id
        
        # Update payment method if provided
        if payment_method:
            sale.payment_method = PaymentMethod(payment_method)
        
        total_amount = 0
        
        # Process new items
        if items:
            for item in items:
                # Calculate breakdown
                calculation = CalculationService.calculate_sale(
                    db, item["product_id"], item["requested_quantity"], sale.customer_id
                )
                
                if "error" in calculation:
                    db.rollback()
                    raise ValueError(f"Product {item['product_id']}: {calculation['error']}")
                
                # Deduct inventory
                success = CalculationService.deduct_inventory(
                    db,
                    item["product_id"],
                    calculation["packages_to_sell"],
                    calculation["pieces_to_sell"],
                    user_id=sale.seller_id,
                    user_name=seller.name,
                    user_type="seller",
                    action="sale_updated",
                    reason=f"Sotuv #{sale.id} yangilandi - sotildi",
                    reference_id=sale.id,
                    reference_type="sale"
                )
                
                if not success:
                    db.rollback()
                    raise ValueError(f"Not enough stock for product {item['product_id']}")
                
                # Create sale item
                sale_item = SaleItem(
                    sale_id=sale.id,
                    product_id=item["product_id"],
                    requested_quantity=item["requested_quantity"],
                    packages_sold=calculation["packages_to_sell"],
                    pieces_sold=calculation["pieces_to_sell"],
                    package_price=calculation["package_price"],
                    piece_price=calculation["piece_price"],
                    subtotal=calculation["subtotal"]
                )
                db.add(sale_item)
                
                total_amount += calculation["subtotal"]
            
            # Update sale total
            sale.total_amount = total_amount
        
        db.commit()
        db.refresh(sale)
        return sale
    
    @staticmethod
    def sale_to_response(sale: Sale, db: Optional[Session] = None) -> Dict[str, Any]:
        """Convert Sale model to SaleResponse dict"""
        # Get approver name if approved_by exists
        approver_name = None
        if sale.approved_by:
            # Try to use relationship first (if loaded via joinedload)
            try:
                if hasattr(sale, 'approver') and sale.approver:
                    approver_name = sale.approver.name
            except:
                pass
        
        # Get customer's current debt balance
        customer_debt_balance = sale.customer.debt_balance if sale.customer else 0
        
        return {
            "id": sale.id,
            "seller_id": sale.seller_id,
            "customer_id": sale.customer_id,
            "customer_name": sale.customer.name if sale.customer else "O'chirilgan mijoz",
            "seller_name": sale.seller.name if sale.seller else "Noma'lum",
            "total_amount": sale.total_amount,
            "payment_method": sale.payment_method.value if sale.payment_method else "cash",
            "payment_amount": sale.payment_amount,
            "excess_action": sale.excess_action,
            "requires_admin_approval": sale.requires_admin_approval if sale.requires_admin_approval is not None else False,
            "admin_approved": sale.admin_approved,
            "approved_by": sale.approved_by,
            "approver_name": approver_name,
            "customer_debt_balance": customer_debt_balance,
            "approved_at": sale.approved_at.isoformat() if sale.approved_at else None,
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": item.product.name,
                    "requested_quantity": item.requested_quantity,
                    "packages_sold": item.packages_sold,
                    "pieces_sold": item.pieces_sold,
                    "package_price": item.package_price,
                    "piece_price": item.piece_price,
                    "subtotal": item.subtotal
                }
                for item in sale.items
            ],
            "created_at": sale.created_at  # SQLAlchemy datetime object, already compatible with Pydantic datetime
        }
    
    @staticmethod
    def get_pending_sales(db: Session) -> List[Sale]:
        """Get all sales pending admin approval"""
        return db.query(Sale).filter(
            Sale.requires_admin_approval == True,
            Sale.admin_approved == None
        ).order_by(Sale.created_at.desc()).all()
    
    @staticmethod
    def approve_sale(db: Session, sale_id: int, approved_by: int, approved: bool = True) -> Optional[Sale]:
        """Approve or reject a sale"""
        sale = db.query(Sale).filter(Sale.id == sale_id).first()
        if not sale:
            return None
        
        if not sale.requires_admin_approval:
            raise ValueError("This sale does not require approval")
        
        if sale.admin_approved is not None:
            raise ValueError("This sale has already been processed")
        
        from datetime import datetime
        
        sale.admin_approved = approved
        sale.approved_by = approved_by if approved else None
        sale.approved_at = datetime.utcnow() if approved else None
        
        if approved:
            # Process payment and debt, deduct inventory
            try:
                from .debt_service import DebtService
            except ImportError:
                from debt_service import DebtService
            
            # Deduct inventory for each item
            for item in sale.items:
                success = CalculationService.deduct_inventory(
                    db,
                    item.product_id,
                    item.packages_sold,
                    item.pieces_sold,
                    user_id=approved_by,
                    user_name="Admin",
                    user_type="admin",
                    action="sale_approved",
                    reason=f"Sotuv #{sale.id} tasdiqlandi",
                    reference_id=sale.id,
                    reference_type="sale"
                )
                
                if not success:
                    db.rollback()
                    raise ValueError(f"Not enough stock for product {item.product_id}")
                
                # Record inventory transaction
                InventoryService.record_transaction(
                    db,
                    item.product_id,
                    "sale",
                    -item.packages_sold,
                    -item.pieces_sold,
                    sale.id,
                    "sale"
                )
            
            # Process payment and debt
            payment_amount = sale.payment_amount or sale.total_amount
            excess = payment_amount - sale.total_amount
            
            if excess > 0:  # Customer paid more
                if sale.excess_action == 'debt':
                    customer = db.query(Customer).filter(Customer.id == sale.customer_id).first()
                    if customer and customer.debt_balance > 0:
                        debt_to_pay = min(excess, customer.debt_balance)
                        DebtService.pay_debt(
                            db=db,
                            customer_id=sale.customer_id,
                            amount=debt_to_pay,
                            reason=f"Sotuv #{sale.id} - ortiqcha to'lov",
                            created_by=approved_by,
                            created_by_name="Admin",
                            reference_id=sale.id,
                            reference_type="sale"
                        )
                        remaining_excess = excess - debt_to_pay
                        if remaining_excess > 0:
                            DebtService.add_debt(
                                db=db,
                                customer_id=sale.customer_id,
                                amount=-remaining_excess,
                                reason=f"Sotuv #{sale.id} - ortiqcha to'lov qoldig'i",
                                created_by=approved_by,
                                created_by_name="Admin",
                                reference_id=sale.id,
                                reference_type="sale"
                            )
                    else:
                        DebtService.add_debt(
                            db=db,
                            customer_id=sale.customer_id,
                            amount=-excess,
                            reason=f"Sotuv #{sale.id} - ortiqcha to'lov",
                            created_by=approved_by,
                            created_by_name="Admin",
                            reference_id=sale.id,
                            reference_type="sale"
                        )
            elif excess < 0:  # Customer paid less (debt)
                debt_amount = abs(excess)
                DebtService.add_debt(
                    db=db,
                    customer_id=sale.customer_id,
                    amount=debt_amount,
                    reason=f"Sotuv #{sale.id} - to'lov yetmadi",
                    created_by=approved_by,
                    created_by_name="Admin",
                    reference_id=sale.id,
                    reference_type="sale"
                )
        else:
            # Rejected - no action needed, inventory not deducted
            pass
        
        db.commit()
        db.refresh(sale)
        return sale
    
    @staticmethod
    def get_statistics(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        seller_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get sales statistics"""
        query = db.query(Sale)
        
        if start_date:
            try:
                # Handle different date formats
                start_str = start_date.replace('Z', '+00:00') if 'Z' in start_date else start_date
                # If no timezone info, assume UTC and convert
                if '+' not in start_str and 'Z' not in start_str and start_str[-1] != 'Z':
                    # Naive datetime, assume it's UTC
                    start = datetime.fromisoformat(start_str)
                    if start.tzinfo is None:
                        from utils import UZBEKISTAN_TZ
                        # Assume input is in Uzbekistan timezone
                        start = start.replace(tzinfo=UZBEKISTAN_TZ)
                else:
                    start = datetime.fromisoformat(start_str)
                query = query.filter(Sale.created_at >= start)
            except (ValueError, AttributeError) as e:
                print(f"Warning: Invalid start_date format '{start_date}' in get_statistics: {e}")
        
        if end_date:
            try:
                # Handle different date formats
                end_str = end_date.replace('Z', '+00:00') if 'Z' in end_date else end_date
                # If no timezone info, assume UTC and convert
                if '+' not in end_str and 'Z' not in end_str and end_str[-1] != 'Z':
                    # Naive datetime, assume it's UTC
                    end = datetime.fromisoformat(end_str)
                    if end.tzinfo is None:
                        from utils import UZBEKISTAN_TZ
                        # Assume input is in Uzbekistan timezone
                        end = end.replace(tzinfo=UZBEKISTAN_TZ)
                else:
                    end = datetime.fromisoformat(end_str)
                query = query.filter(Sale.created_at <= end)
            except (ValueError, AttributeError) as e:
                print(f"Warning: Invalid end_date format '{end_date}' in get_statistics: {e}")
        
        if seller_id:
            query = query.filter(Sale.seller_id == seller_id)
        
        sales = query.all()
        
        total_sales = len(sales)
        total_amount = sum(sale.total_amount for sale in sales)
        
        # Daily statistics
        daily_stats = {}
        for sale in sales:
            date_key = sale.created_at.date().isoformat()
            if date_key not in daily_stats:
                daily_stats[date_key] = {"count": 0, "amount": 0.0}
            daily_stats[date_key]["count"] += 1
            daily_stats[date_key]["amount"] += sale.total_amount
        
        # Top products
        from collections import defaultdict
        product_stats = defaultdict(lambda: {"quantity": 0, "amount": 0.0, "name": "", "item_number": ""})
        
        for sale in sales:
            for item in sale.items:
                product_stats[item.product_id]["quantity"] += item.requested_quantity
                product_stats[item.product_id]["amount"] += item.subtotal
                product_stats[item.product_id]["name"] = item.product.name
                product_stats[item.product_id]["item_number"] = item.product.item_number or ""
        
        top_products = sorted(
            [{"product_id": k, "name": v["name"], "item_number": v["item_number"], "quantity": v["quantity"], "amount": v["amount"]}
             for k, v in product_stats.items()],
            key=lambda x: x["quantity"],
            reverse=True
        )[:10]
        
        # Top customers
        customer_stats = defaultdict(lambda: {"count": 0, "amount": 0.0, "name": ""})
        
        for sale in sales:
            # Skip sales without customer (deleted customers)
            if sale.customer_id is None:
                continue
            customer_stats[sale.customer_id]["count"] += 1
            customer_stats[sale.customer_id]["amount"] += sale.total_amount
            customer_stats[sale.customer_id]["name"] = sale.customer.name if sale.customer else "O'chirilgan mijoz"
        
        top_customers = sorted(
            [{"customer_id": k, "name": v["name"], "count": v["count"], "amount": v["amount"]}
             for k, v in customer_stats.items() if k is not None],
            key=lambda x: x["amount"],
            reverse=True
        )[:10]
        
        # Payment method statistics
        payment_stats = defaultdict(lambda: {"count": 0, "amount": 0.0})
        for sale in sales:
            method = sale.payment_method.value if sale.payment_method else "cash"
            payment_stats[method]["count"] += 1
            payment_stats[method]["amount"] += sale.total_amount
        
        # Profit calculation (revenue - cost)
        # Cost = cost_price * pieces_sold (actual purchase cost)
        # IMPORTANT: Use cost_price at the time of sale if stored, otherwise current cost_price
        total_profit = 0.0
        total_cost = 0.0
        
        for sale in sales:
            for item in sale.items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    # Calculate cost based on actual cost_price (purchase price)
                    # Only calculate profit if cost_price is set and > 0
                    cost_per_piece = product.cost_price if (product.cost_price is not None and product.cost_price > 0) else 0.0
                    
                    # Use actual sale price per piece from the item (already accounts for customer type)
                    # This is more accurate than calculating from subtotal
                    # item.piece_price is the price per piece at time of sale (wholesale or retail)
                    sale_price_per_piece = item.piece_price if item.piece_price > 0 else (item.subtotal / item.requested_quantity if item.requested_quantity > 0 else 0)
                    
                    # Safety check: if cost_price is unreasonably high (more than 2x the sale price), ignore it
                    # This prevents errors where cost_price might be incorrectly entered
                    if cost_per_piece > 0 and cost_per_piece <= sale_price_per_piece * 2:
                        cost = cost_per_piece * item.requested_quantity
                        total_cost += cost
                        total_profit += item.subtotal - cost
                    elif cost_per_piece > sale_price_per_piece * 2:
                        # Cost price seems incorrect (too high), skip cost calculation
                        # Assume no cost data available - profit = revenue (conservative estimate)
                        total_profit += item.subtotal
                    else:
                        # If no cost_price, can't calculate actual profit
                        # Just add revenue as profit (optimistic)
                        total_profit += item.subtotal
        
        return {
            "total_sales": total_sales,
            "total_amount": total_amount,
            "total_cost": total_cost,
            "total_profit": total_profit,
            "average_sale": total_amount / total_sales if total_sales > 0 else 0,
            "daily_stats": daily_stats,
            "top_products": top_products,
            "top_customers": top_customers,
            "payment_methods": dict(payment_stats)
        }
    
    @staticmethod
    def get_product_sales_history(
        db: Session,
        product_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get sales history for a specific product"""
        from models import SaleItem
        
        items = db.query(SaleItem).filter(
            SaleItem.product_id == product_id
        ).order_by(SaleItem.id.desc()).offset(skip).limit(limit).all()
        
        history = []
        for item in items:
            history.append({
                "id": item.id,
                "sale_id": item.sale_id,
                "date": item.sale.created_at.isoformat(),
                "customer_name": item.sale.customer.name if item.sale.customer else "O'chirilgan mijoz",
                "seller_name": item.sale.seller.name if item.sale.seller else "Noma'lum",
                "requested_quantity": item.requested_quantity,
                "packages_sold": item.packages_sold,
                "pieces_sold": item.pieces_sold,
                "subtotal": item.subtotal
            })
        
        return history
