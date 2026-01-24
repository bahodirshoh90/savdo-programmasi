"""
Product Service
"""
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from sqlalchemy import func
from models import Product
from schemas import ProductCreate, ProductUpdate, ProductResponse


def _sort_products(products: List[Product], sort_by: str, sort_order: str = 'desc') -> List[Product]:
    """Sort products by custom criteria"""
    reverse = (sort_order == 'desc')
    
    if sort_by == 'stock':
        # Sort by total_pieces (omborda borlar birinchi)
        # Calculate total_pieces correctly
        def get_total_pieces(p):
            pieces_per_package = p.pieces_per_package if p.pieces_per_package and p.pieces_per_package > 0 else 1
            packages_in_stock = p.packages_in_stock if p.packages_in_stock is not None else 0
            pieces_in_stock = p.pieces_in_stock if p.pieces_in_stock is not None else 0
            return (packages_in_stock * pieces_per_package) + pieces_in_stock
        
        # Sort: omborda borlar birinchi (desc), keyin yo'qlari
        # For desc: positive values first (sorted descending), then zeros
        # For asc: zeros first, then positive values (sorted ascending)
        if reverse:  # desc
            products.sort(key=lambda p: (-get_total_pieces(p) if get_total_pieces(p) > 0 else float('inf')))
        else:  # asc
            products.sort(key=lambda p: (get_total_pieces(p) if get_total_pieces(p) > 0 else -1))
    elif sort_by == 'price_low':
        # Sort by minimum price
        products.sort(key=lambda p: min(
            p.wholesale_price or 0,
            p.retail_price or 0,
            p.regular_price or 0
        ), reverse=reverse)
    elif sort_by == 'price_high':
        # Sort by maximum price
        products.sort(key=lambda p: max(
            p.wholesale_price or 0,
            p.retail_price or 0,
            p.regular_price or 0
        ), reverse=reverse)
    
    return products


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
            print(f"[ProductService.create_product] Category in product_data: {product_data.get('category')}")
            print(f"[ProductService.create_product] Category type: {type(product_data.get('category'))}")
            
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
            
            # Handle optional string fields - convert empty strings to None, but keep non-empty strings
            if 'category' in product_data:
                category_value = product_data['category']
                print(f"[ProductService.create_product] Processing category: {category_value}, type: {type(category_value)}")
                if category_value is None:
                    product_data['category'] = None
                elif category_value == '' or (isinstance(category_value, str) and category_value.strip() == ''):
                    product_data['category'] = None
                elif category_value:
                    product_data['category'] = str(category_value).strip()
                    print(f"[ProductService.create_product] Category after processing: {product_data['category']}")
            else:
                print(f"[ProductService.create_product] Category not in product_data")
            
            if 'brand' in product_data:
                if product_data['brand'] == '' or (isinstance(product_data['brand'], str) and product_data['brand'].strip() == ''):
                    product_data['brand'] = None
                elif product_data['brand']:
                    product_data['brand'] = product_data['brand'].strip()
            
            if 'supplier' in product_data:
                if product_data['supplier'] == '' or (isinstance(product_data['supplier'], str) and product_data['supplier'].strip() == ''):
                    product_data['supplier'] = None
                elif product_data['supplier']:
                    product_data['supplier'] = product_data['supplier'].strip()
            
            if 'item_number' in product_data:
                if product_data['item_number'] == '' or (isinstance(product_data['item_number'], str) and product_data['item_number'].strip() == ''):
                    product_data['item_number'] = None
                elif product_data['item_number']:
                    product_data['item_number'] = product_data['item_number'].strip()
            
            if 'location' in product_data:
                if product_data['location'] == '' or (isinstance(product_data['location'], str) and product_data['location'].strip() == ''):
                    product_data['location'] = None
                elif product_data['location']:
                    product_data['location'] = product_data['location'].strip()
            
            print(f"[ProductService.create_product] Final product data: {product_data}")
            print(f"[ProductService.create_product] Category in final data: {product_data.get('category')}")
            print(f"[ProductService.create_product] Category type in final data: {type(product_data.get('category'))}")
            
            # Get category value before creating Product object
            category_value = product_data.get('category')
            print(f"[ProductService.create_product] Category value from product_data: '{category_value}' (type: {type(category_value)})")
            
            # Process category value
            if category_value is not None:
                if isinstance(category_value, str):
                    category_value = category_value.strip()
                    if category_value == '':
                        category_value = None
                else:
                    category_value = str(category_value).strip() if category_value else None
            else:
                category_value = None
            
            print(f"[ProductService.create_product] Processed category value: '{category_value}'")
            
            # Remove category from product_data to set it explicitly after object creation
            if 'category' in product_data:
                del product_data['category']
            
            # Create Product object without category first
            db_product = Product(**product_data)
            
            # Explicitly set category after object creation
            db_product.category = category_value
            print(f"[ProductService.create_product] Category explicitly set to: '{db_product.category}'")
            
            print(f"[ProductService.create_product] Product object created: {db_product.name}")
            print(f"[ProductService.create_product] Product category after creation: '{db_product.category}'")
            
            db.add(db_product)
            print(f"[ProductService.create_product] Product added to session")
            print(f"[ProductService.create_product] Category before commit: '{db_product.category}'")
            
            db.commit()
            print(f"[ProductService.create_product] Changes committed")
            
            db.refresh(db_product)
            print(f"[ProductService.create_product] Product refreshed, ID: {db_product.id}")
            print(f"[ProductService.create_product] Product category after refresh: '{db_product.category}'")
            
            # Double-check category is saved correctly
            if category_value is not None:
                if db_product.category != category_value:
                    print(f"[ProductService.create_product] WARNING: Category mismatch! Expected: '{category_value}', Got: '{db_product.category}'")
                    # Try to fix it
                    db_product.category = category_value
                    db.commit()
                    db.refresh(db_product)
                    print(f"[ProductService.create_product] Category fixed and re-committed: '{db_product.category}'")
            
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
        category: Optional[str] = None,
        supplier: Optional[str] = None,
        location: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = 'desc'  # 'asc' or 'desc'
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
        
        # Filter by category
        if category:
            query = query.filter(Product.category.ilike(f"%{category}%"))
        
        # Filter by supplier
        if supplier:
            query = query.filter(Product.supplier.ilike(f"%{supplier}%"))
        
        # Filter by location
        if location:
            query = query.filter(Product.location.ilike(f"%{location}%"))
        
        # Apply sorting (before filtering for low_stock)
        if sort_by and sort_by not in ['stock', 'price_low', 'price_high']:
            # SQL-level sorting for simple fields
            if sort_by == 'name':
                order_col = Product.name
            elif sort_by == 'id':
                order_col = Product.id
            elif sort_by == 'brand':
                order_col = Product.brand
            elif sort_by == 'supplier':
                order_col = Product.supplier
            else:
                order_col = Product.id
            
            if sort_order == 'asc':
                query = query.order_by(order_col.asc())
            else:
                query = query.order_by(order_col.desc())
        elif not sort_by:
            # Default: omborda borlar birinchi (stock desc), keyin yo'qlari
            # We'll sort by stock in Python after loading
            query = query.order_by(Product.id.asc())
        
        # For low_stock_only filter, we need to load all products, filter, then paginate
        # This is because SQLite doesn't support complex calculations in WHERE clause
        if low_stock_only:
            # Load all products matching other filters (no pagination yet)
            all_products = query.all()
            
            # Filter by low stock in Python
            filtered_products = []
            for product in all_products:
                total_pieces = (product.packages_in_stock or 0) * (product.pieces_per_package or 1) + (product.pieces_in_stock or 0)
                # Only include products with stock <= min_stock AND stock > 0 (omborda bor)
                # But if min_stock is 0, include only products with stock = 0 (omborda yo'q)
                if min_stock == 0:
                    # "Tugagan" filter - only products with 0 stock
                    if total_pieces == 0:
                        filtered_products.append(product)
                else:
                    # "Kam qolgan" filter - products with stock > 0 but <= min_stock
                    if 0 < total_pieces <= min_stock:
                        filtered_products.append(product)
                
                # Apply price filters
                if min_price is not None or max_price is not None:
                    # Use retail_price as the default price for filtering
                    product_price = product.retail_price or product.regular_price or 0.0
                    if min_price is not None and product_price < min_price:
                        if product in filtered_products:
                            filtered_products.remove(product)
                        continue
                    if max_price is not None and product_price > max_price:
                        if product in filtered_products:
                            filtered_products.remove(product)
                        continue
            
            # Apply custom sorting if needed (for stock and price sorting)
            if sort_by in ['stock', 'price_low', 'price_high']:
                filtered_products = _sort_products(filtered_products, sort_by, sort_order)
            
            # Apply pagination after filtering
            return filtered_products[skip:skip + limit]
        
        # For normal queries, load products first
        # If default sorting (no sort_by), we need to load more to sort by stock
        # Also load more if price filters are applied
        load_limit = limit * 2 if (sort_by in ['stock', 'price_low', 'price_high'] or not sort_by or min_price is not None or max_price is not None) else limit
        products = query.offset(skip).limit(load_limit).all()
        
        # Apply price filters in Python
        if min_price is not None or max_price is not None:
            filtered_by_price = []
            for product in products:
                product_price = product.retail_price or product.regular_price or 0.0
                if min_price is not None and product_price < min_price:
                    continue
                if max_price is not None and product_price > max_price:
                    continue
                filtered_by_price.append(product)
            products = filtered_by_price
        
        # Apply custom sorting if needed (for stock and price sorting)
        if sort_by in ['stock', 'price_low', 'price_high']:
            products = _sort_products(products, sort_by, sort_order)
            return products[:limit]
        
        # Default sorting: omborda borlar birinchi (stock desc), keyin yo'qlari
        if not sort_by:
            products = _sort_products(products, 'stock', 'desc')
            return products[:limit]
        
        return products
    
    @staticmethod
    def get_products_count(
        db: Session,
        search: Optional[str] = None,
        low_stock_only: bool = False,
        min_stock: int = 0,
        brand: Optional[str] = None,
        category: Optional[str] = None,
        supplier: Optional[str] = None,
        location: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None
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
        
        if category:
            query = query.filter(Product.category.ilike(f"%{category}%"))
        
        if supplier:
            query = query.filter(Product.supplier.ilike(f"%{supplier}%"))
        
        if location:
            query = query.filter(Product.location.ilike(f"%{location}%"))
        
        # For count with low_stock_only, we need to load and count in Python (SQLite limitation)
        if low_stock_only:
            all_products = query.all()
            count = 0
            for product in all_products:
                total_pieces = (product.packages_in_stock or 0) * (product.pieces_per_package or 1) + (product.pieces_in_stock or 0)
                # Same logic as get_products
                if min_stock == 0:
                    # "Tugagan" filter - only products with 0 stock
                    if total_pieces == 0:
                        count += 1
                else:
                    # "Kam qolgan" filter - products with stock > 0 but <= min_stock
                    if 0 < total_pieces <= min_stock:
                        count += 1
            return count
        
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

