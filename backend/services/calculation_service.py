"""
Calculation Service - Core logic for package/piece calculations
"""
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from models import Product, Customer, CustomerType
from services.audit_service import AuditService


class CalculationService:
    """Service for calculating sales breakdown (packages + pieces)"""
    
    @staticmethod
    def calculate_sale(
        db: Session,
        product_id: int,
        quantity: int,
        customer_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Calculate how many packages and pieces to sell based on requested quantity.
        
        Example: If 1 package = 10 pieces and seller requests 12 pieces:
        - 1 package (10 pieces)
        - 2 pieces separately
        
        Returns breakdown with prices based on customer type.
        """
        # Get product
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return None
        
        # Get customer
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return None
        
        # Validate inputs
        if quantity <= 0:
            return {
                "error": "Quantity must be greater than 0",
                "requested": quantity
            }
        
        # Validate product fields (null safety)
        if product.pieces_per_package is None or product.pieces_per_package <= 0:
            return {
                "error": "Product pieces_per_package is invalid or not set",
                "product_id": product_id,
                "product_name": product.name
            }
        
        # Ensure stock fields are not None
        packages_in_stock = product.packages_in_stock if product.packages_in_stock is not None else 0
        pieces_in_stock = product.pieces_in_stock if product.pieces_in_stock is not None else 0
        
        # Check if enough stock
        total_available = (packages_in_stock * product.pieces_per_package) + pieces_in_stock
        if quantity > total_available:
            return {
                "error": "Not enough stock",
                "requested": quantity,
                "available": total_available
            }
        
        # Calculate packages and pieces to sell
        packages_to_sell = quantity // product.pieces_per_package
        pieces_to_sell = quantity % product.pieces_per_package
        
        # Adjust if we don't have enough packages
        if packages_to_sell > packages_in_stock:
            # Use all available packages
            packages_to_sell = packages_in_stock
            # Calculate remaining pieces needed
            remaining_pieces = quantity - (packages_to_sell * product.pieces_per_package)
            pieces_to_sell = remaining_pieces
        
        # Check if we have enough loose pieces
        if pieces_to_sell > pieces_in_stock:
            # Need to break a package to get more pieces
            if packages_to_sell < packages_in_stock:
                # Break one more package
                packages_to_sell += 1
                pieces_to_sell = pieces_to_sell - product.pieces_per_package
            else:
                # Not enough stock even after using all packages
                return {
                    "error": "Not enough stock",
                    "requested": quantity,
                    "available": total_available
                }
        
        # Ensure pieces_to_sell is non-negative (shouldn't happen, but safety check)
        if pieces_to_sell < 0:
            # This means we broke a package but didn't need all pieces
            # Adjust: reduce packages and increase pieces
            packages_to_sell -= 1
            pieces_to_sell += product.pieces_per_package
        
        # Select price based on customer type (all prices are per piece now)
        if customer.customer_type == CustomerType.WHOLESALE:
            price_per_piece = product.wholesale_price or 0
        elif customer.customer_type == CustomerType.RETAIL:
            price_per_piece = product.retail_price or 0
        else:  # REGULAR
            price_per_piece = product.regular_price or 0
        
        # Validate price
        if price_per_piece is None or price_per_piece <= 0:
            return {
                "error": f"Product {product.name} has no valid price for customer type {customer.customer_type.value}",
                "product_id": product_id,
                "customer_type": customer.customer_type.value
            }
        
        # Calculate subtotal - all pieces use the same price per piece
        # Packages and pieces are for inventory tracking only
        subtotal = quantity * price_per_piece
        
        # For backward compatibility, we still return package_price and piece_price
        # but they're calculated from piece price for inventory tracking
        # The actual sale uses price_per_piece for all pieces
        package_price_calc = product.pieces_per_package * price_per_piece  # For display only
        piece_price_calc = price_per_piece
        
        return {
            "product_id": product.id,
            "product_name": product.name,
            "requested_quantity": quantity,
            "packages_to_sell": packages_to_sell,
            "pieces_to_sell": pieces_to_sell,
            "package_price": package_price_calc,  # For display/inventory tracking
            "piece_price": piece_price_calc,  # Actual price per piece
            "subtotal": subtotal,
            "customer_type": customer.customer_type.value
        }
    
    @staticmethod
    def deduct_inventory(
        db: Session,
        product_id: int,
        packages: int,
        pieces: int,
        user_id: Optional[int] = None,
        user_name: str = "System",
        user_type: str = "system",
        action: str = "inventory_deducted",
        reason: Optional[str] = None,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None
    ) -> bool:
        """
        Deduct inventory from warehouse with audit logging.
        Returns True if successful, False if not enough stock.
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return False
        
        # Validate inputs
        if packages < 0 or pieces < 0:
            return False
        
        # Refresh to get latest data
        db.refresh(product)
        
        # Validate product fields
        if product.pieces_per_package is None or product.pieces_per_package <= 0:
            return False
        
        # Ensure stock fields are not None
        if product.packages_in_stock is None:
            product.packages_in_stock = 0
        if product.pieces_in_stock is None:
            product.pieces_in_stock = 0
        
        # Store before state for audit
        quantity_before = product.total_pieces
        
        # Check if enough packages
        if packages > product.packages_in_stock:
            return False
        
        # Check if enough pieces
        if pieces > product.pieces_in_stock:
            # Try to break a package
            if packages < product.packages_in_stock:
                # Break one package
                product.packages_in_stock -= 1
                product.pieces_in_stock += product.pieces_per_package
            else:
                return False
        
        # Deduct inventory
        product.packages_in_stock -= packages
        product.pieces_in_stock -= pieces
        
        # Ensure non-negative
        if product.packages_in_stock < 0 or product.pieces_in_stock < 0:
            db.rollback()
            return False
        
        # Get after state
        quantity_after = product.total_pieces
        
        db.commit()
        
        # Log audit
        try:
            AuditService.log_inventory_change(
                db=db,
                action=action,
                product_id=product_id,
                quantity_before=quantity_before,
                quantity_after=quantity_after,
                packages_change=-packages,
                pieces_change=-pieces,
                user_id=user_id,
                user_name=user_name,
                user_type=user_type,
                reason=reason,
                reference_id=reference_id,
                reference_type=reference_type
            )
        except Exception as e:
            # Don't fail the operation if audit logging fails
            print(f"Warning: Failed to log audit: {e}")
        
        return True
    
    @staticmethod
    def add_inventory(
        db: Session,
        product_id: int,
        packages: int,
        pieces: int,
        user_id: Optional[int] = None,
        user_name: str = "System",
        user_type: str = "system",
        action: str = "inventory_added",
        reason: Optional[str] = None,
        reference_id: Optional[int] = None,
        reference_type: Optional[str] = None
    ) -> bool:
        """
        Add inventory to warehouse with audit logging.
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return False
        
        # Validate inputs
        if packages < 0 or pieces < 0:
            return False
        
        db.refresh(product)
        quantity_before = product.total_pieces
        
        # Ensure stock fields are not None
        if product.packages_in_stock is None:
            product.packages_in_stock = 0
        if product.pieces_in_stock is None:
            product.pieces_in_stock = 0
        
        # Add inventory
        product.packages_in_stock += packages
        product.pieces_in_stock += pieces
        
        quantity_after = product.total_pieces
        db.commit()
        
        # Log audit
        try:
            AuditService.log_inventory_change(
                db=db,
                action=action,
                product_id=product_id,
                quantity_before=quantity_before,
                quantity_after=quantity_after,
                packages_change=packages,
                pieces_change=pieces,
                user_id=user_id,
                user_name=user_name,
                user_type=user_type,
                reason=reason,
                reference_id=reference_id,
                reference_type=reference_type
            )
        except Exception as e:
            print(f"Warning: Failed to log audit: {e}")
        
        return True
