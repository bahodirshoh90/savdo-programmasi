"""
Product Service
"""
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from sqlalchemy import func
from models import Product
from schemas import ProductCreate, ProductUpdate, ProductResponse


class ProductService:
    """Service for product management"""
    
    @staticmethod
    def create_product(db: Session, product: ProductCreate) -> Product:
        """Create a new product"""
        try:
            # Handle Pydantic v2 (model_dump) and v1 (dict) compatibility
            try:
                product_data = product.model_dump()
            except AttributeError:
                product_data = product.dict()
            
            print(f"[ProductService.create_product] Product data: {product_data}")
            
            # Ensure pieces_per_package is at least 1
            if 'pieces_per_package' not in product_data or product_data['pieces_per_package'] is None:
                product_data['pieces_per_package'] = 1
            elif product_data['pieces_per_package'] <= 0:
                product_data['pieces_per_package'] = 1
            
            # Ensure all required fields have defaults
            if 'cost_price' not in product_data or product_data['cost_price'] is None:
                product_data['cost_price'] = 0.0
            if 'wholesale_price' not in product_data or product_data['wholesale_price'] is None:
                product_data['wholesale_price'] = 0.0
            if 'retail_price' not in product_data or product_data['retail_price'] is None:
                product_data['retail_price'] = 0.0
            if 'regular_price' not in product_data or product_data['regular_price'] is None:
                product_data['regular_price'] = 0.0
            if 'packages_in_stock' not in product_data or product_data['packages_in_stock'] is None:
                product_data['packages_in_stock'] = 0
            if 'pieces_in_stock' not in product_data or product_data['pieces_in_stock'] is None:
                product_data['pieces_in_stock'] = 0
            
            print(f"[ProductService.create_product] Final product data: {product_data}")
            
            db_product = Product(**product_data)
            print(f"[ProductService.create_product] Product object created: {db_product.name}")
            
            db.add(db_product)
            print(f"[ProductService.create_product] Product added to session")
            
            db.commit()
            print(f"[ProductService.create_product] Changes committed")
            
            db.refresh(db_product)
            print(f"[ProductService.create_product] Product refreshed, ID: {db_product.id}")
            
            return db_product
        except Exception as e:
            db.rollback()
            import traceback
            error_details = traceback.format_exc()
            print(f"[ProductService.create_product] ERROR: {str(e)}")
            print(f"[ProductService.create_product] Traceback:\n{error_details}")
            raise e
    
    @staticmethod
    def get_products(
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None,
        low_stock_only: bool = False,
        min_stock: int = 0,
        brand: Optional[str] = None,
        supplier: Optional[str] = None,
        location: Optional[str] = None
    ) -> List[Product]:
        """Get all products with optional search and filtering"""
        from sqlalchemy.orm import joinedload
        
        query = db.query(Product).options(joinedload(Product.sale_items))
        
        # Search by name or barcode
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Product.name.ilike(search_term)) | 
                (Product.barcode.ilike(search_term))
            )
        
        # Filter by brand
        if brand:
            query = query.filter(Product.brand.ilike(f"%{brand}%"))
        
        # Filter by supplier
        if supplier:
            query = query.filter(Product.supplier.ilike(f"%{supplier}%"))
        
        # Filter by location
        if location:
            query = query.filter(Product.location.ilike(f"%{location}%"))
        
        # Filter by low stock
        if low_stock_only:
            # Use func for SQLite compatibility
            from sqlalchemy import case, or_
            total_pieces_expr = func.coalesce(
                func.coalesce(Product.packages_in_stock, 0) * func.coalesce(Product.pieces_per_package, 1) + 
                func.coalesce(Product.pieces_in_stock, 0),
                0
            )
            query = query.having(total_pieces_expr <= min_stock)
            # Note: having() requires group_by, but we want all products, so we use a different approach
            # Instead, filter after loading (less efficient but works)
            # Actually, let's use a subquery or filter in Python after loading
            # For now, let's use a simpler approach with func
            query = query.filter(
                func.coalesce(
                    func.coalesce(Product.packages_in_stock, 0) * func.coalesce(Product.pieces_per_package, 1) + 
                    func.coalesce(Product.pieces_in_stock, 0),
                    0
                ) <= min_stock
            )
        
        # Order by ID descending to show newest first
        query = query.order_by(Product.id.desc())
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def get_products_count(
        db: Session,
        search: Optional[str] = None,
        low_stock_only: bool = False,
        min_stock: int = 0,
        brand: Optional[str] = None,
        supplier: Optional[str] = None,
        location: Optional[str] = None
    ) -> int:
        """Get total count of products matching filters"""
        query = db.query(Product)
        
        # Apply same filters as get_products
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Product.name.ilike(search_term)) | 
                (Product.barcode.ilike(search_term))
            )
        
        if brand:
            query = query.filter(Product.brand.ilike(f"%{brand}%"))
        
        if supplier:
            query = query.filter(Product.supplier.ilike(f"%{supplier}%"))
        
        if location:
            query = query.filter(Product.location.ilike(f"%{location}%"))
        
        if low_stock_only:
            query = query.filter(
                (Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock) <= min_stock
            )
        
        return query.count()
    
    @staticmethod
    def get_product(db: Session, product_id: int) -> Optional[Product]:
        """Get a specific product by ID"""
        return db.query(Product).filter(Product.id == product_id).first()
    
    @staticmethod
    def update_product(db: Session, product_id: int, product: ProductUpdate) -> Optional[Product]:
        """Update a product"""
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if not db_product:
            return None
        
        # Get update data, explicitly handling None values for optional fields
        # Use model_dump instead of dict for Pydantic v2 compatibility
        try:
            # For update, we need to include None values explicitly for location
            update_data = product.model_dump(exclude_unset=True, exclude_none=False)
        except AttributeError:
            # Fallback for Pydantic v1
            update_data = product.dict(exclude_unset=True)
        
        # Handle location separately - always process if present (even if None)
        if 'location' in update_data:
            location_value = update_data['location']
            # If location is empty string or None, set to None
            if location_value == '' or location_value is None:
                db_product.location = None
            else:
                # Trim whitespace and set
                db_product.location = str(location_value).strip()
            # Remove from update_data to avoid duplicate processing
            del update_data['location']
        
        # Handle other optional string fields - convert empty strings to None
        for field in ['brand', 'supplier', 'barcode', 'image_url']:
            if field in update_data:
                if update_data[field] == '':
                    setattr(db_product, field, None)
                else:
                    setattr(db_product, field, update_data[field])
                del update_data[field]
        
        # Apply remaining updates field by field
        for field, value in update_data.items():
            # Only update fields that exist on the model
            if hasattr(db_product, field):
                setattr(db_product, field, value)
        
        db.commit()
        db.refresh(db_product)
        return db_product
    
    @staticmethod
    def delete_product(db: Session, product_id: int) -> bool:
        """Delete a product"""
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if not db_product:
            return False
        
        db.delete(db_product)
        db.commit()
        return True
    
    @staticmethod
    def get_inventory_total_value(db: Session) -> Dict[str, Any]:
        """Calculate total inventory value (using cost price and wholesale price)"""
        products = db.query(Product).all()
        
        total_value_by_cost = 0.0  # Kelgan narx bilan
        total_value_by_wholesale = 0.0  # Ulgurji narx bilan
        total_products = 0
        total_pieces = 0
        total_packages = 0  # Jami qop soni
        
        for product in products:
            packages_in_stock = product.packages_in_stock if product.packages_in_stock is not None else 0
            pieces_in_stock = product.pieces_in_stock if product.pieces_in_stock is not None else 0
            pieces_per_package = product.pieces_per_package if product.pieces_per_package > 0 else 1
            
            # Jami dona soni
            total_pcs = (packages_in_stock * pieces_per_package) + pieces_in_stock
            
            if total_pcs > 0:
                # Kelgan narx bilan hisoblash
                cost_price = product.cost_price if product.cost_price else 0.0
                total_value_by_cost += total_pcs * cost_price
                
                # Ulgurji narx bilan hisoblash
                wholesale_price = product.wholesale_price if product.wholesale_price else 0.0
                total_value_by_wholesale += total_pcs * wholesale_price
                
                total_pieces += total_pcs
            
            # Jami qop soni
            total_packages += packages_in_stock
            total_products += 1
        
        return {
            "total_value_by_cost": total_value_by_cost,  # Kelgan narx bilan
            "total_value_by_wholesale": total_value_by_wholesale,  # Ulgurji narx bilan
            "total_value": total_value_by_wholesale,  # Backward compatibility
            "total_products": total_products,
            "total_pieces": total_pieces,
            "total_packages": total_packages  # Jami qop soni
        }

