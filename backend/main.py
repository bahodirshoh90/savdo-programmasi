"""
FastAPI Backend for Inventory and Sales Management System
"""
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
from datetime import datetime, timedelta
import json
import os
from utils import get_uzbekistan_now, to_uzbekistan_time

from database import SessionLocal, engine, init_db
from models import Base, Product, Seller, Sale, SaleItem, Order
from schemas import (
    ProductCreate, ProductUpdate, ProductResponse,
    CustomerCreate, CustomerUpdate, CustomerResponse,
    SaleCreate, SaleResponse, SaleItemCreate,
    SellerCreate, SellerUpdate, SellerResponse,
    OrderCreate, OrderResponse, OrderItemCreate,
    LocationUpdate, RoleCreate, RoleUpdate, RoleResponse, PermissionResponse,
    DebtHistoryResponse, LoginRequest, LoginResponse,
    SettingsUpdate, SettingsResponse
)
from services import (
    ProductService, CustomerService, SaleService,
    SellerService, OrderService, CalculationService,
    PDFService, ExcelService, BarcodeService, RoleService
)
from services.settings_service import SettingsService
from services.audit_service import AuditService
from services.debt_service import DebtService
from services.auth_service import AuthService
from websocket_manager import ConnectionManager
from auth import PERMISSIONS, require_permission, get_seller_from_header

# Create database tables
Base.metadata.create_all(bind=engine)

# Migrate Settings table to add work schedule columns if they don't exist
try:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('settings')]
    
    with engine.connect() as conn:
        if 'work_start_time' not in columns:
            conn.execute(text("ALTER TABLE settings ADD COLUMN work_start_time VARCHAR(10)"))
            conn.execute(text("UPDATE settings SET work_start_time = '09:00' WHERE work_start_time IS NULL"))
            conn.commit()
        
        if 'work_end_time' not in columns:
            conn.execute(text("ALTER TABLE settings ADD COLUMN work_end_time VARCHAR(10)"))
            conn.execute(text("UPDATE settings SET work_end_time = '18:00' WHERE work_end_time IS NULL"))
            conn.commit()
        
        if 'work_days' not in columns:
            conn.execute(text("ALTER TABLE settings ADD COLUMN work_days VARCHAR(20)"))
            conn.execute(text("UPDATE settings SET work_days = '1,2,3,4,5,6,7' WHERE work_days IS NULL"))
            conn.commit()
        
        # Migrate sellers table to add image_url column if it doesn't exist
        sellers_columns = [col['name'] for col in inspector.get_columns('sellers')]
        if 'image_url' not in sellers_columns:
            conn.execute(text("ALTER TABLE sellers ADD COLUMN image_url VARCHAR(500)"))
            conn.commit()
except Exception as e:
    print(f"Warning: Could not migrate database: {e}")
    # Continue anyway - the code will handle missing columns gracefully

app = FastAPI(title="Inventory & Sales Management API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://uztoysshop.uz",
        "https://savdo.uztoysshop.uz",
        "http://localhost:3000",
        "http://localhost:8000",
        "capacitor://localhost",
        "ionic://localhost",
    ],  # Production domains + localhost for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
manager = ConnectionManager()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==================== PRODUCTS ====================

@app.post("/api/products/upload-image")
async def upload_product_image(file: UploadFile = File(...)):
    """Upload product image file"""
    import os
    import uuid
    from pathlib import Path
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Faqat rasm fayllari qabul qilinadi (jpg, png, gif, webp)")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "products")
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Return URL
    image_url = f"/uploads/products/{unique_filename}"
    return {"url": image_url, "filename": unique_filename}


@app.post("/api/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product"""
    created = ProductService.create_product(db, product)
    # Convert to response with computed properties
    product_dict = {
        "id": created.id,
        "name": created.name,
        "barcode": created.barcode,
        "brand": created.brand,
        "supplier": created.supplier,
        "received_date": created.received_date,
        "image_url": created.image_url,
        "location": created.location,
        "pieces_per_package": created.pieces_per_package,
        "cost_price": max(0.0, created.cost_price or 0.0),  # Ensure cost_price is >= 0
        "wholesale_price": max(0.0, created.wholesale_price or 0.0),
        "retail_price": max(0.0, created.retail_price or 0.0),
        "regular_price": max(0.0, created.regular_price or 0.0),
        "packages_in_stock": max(0, created.packages_in_stock or 0),
        "pieces_in_stock": max(0, created.pieces_in_stock or 0),
        "total_pieces": created.total_pieces,
        "total_value": created.total_value,
        "total_value_cost": created.total_value_cost,
        "total_value_wholesale": created.total_value_wholesale,
        "last_sold_date": None,
        "days_since_last_sale": None,
        "is_slow_moving": False,
        "created_at": created.created_at,
        "updated_at": created.updated_at
    }
    return ProductResponse.model_validate(product_dict)


@app.get("/api/products", response_model=List[ProductResponse])
def get_products(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    min_stock: int = 0,
    brand: Optional[str] = None,
    supplier: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all products with optional search and filtering"""
    products = ProductService.get_products(db, skip=skip, limit=limit, search=search, 
                                      low_stock_only=low_stock_only, min_stock=min_stock,
                                      brand=brand, supplier=supplier, location=location)
    # Convert to response with computed properties
    result = []
    for p in products:
        try:
            # Safely get computed properties
            last_sold = None
            days_since = None
            is_slow = False
            try:
                last_sold = p.last_sold_date
                days_since = p.days_since_last_sale
                is_slow = p.is_slow_moving
            except Exception as e:
                # If computed properties fail, use defaults
                print(f"Warning: Error computing properties for product {p.id}: {e}")
            
            product_dict = {
                "id": p.id,
                "name": p.name,
                "barcode": p.barcode,
                "brand": p.brand,
                "supplier": p.supplier,
                "received_date": p.received_date,
                "image_url": p.image_url,
                "location": p.location,
                "pieces_per_package": p.pieces_per_package,
                "cost_price": max(0.0, p.cost_price or 0.0),  # Ensure cost_price is >= 0
                "wholesale_price": max(0.0, p.wholesale_price or 0.0),
                "retail_price": max(0.0, p.retail_price or 0.0),
                "regular_price": max(0.0, p.regular_price or 0.0),
                "packages_in_stock": max(0, p.packages_in_stock or 0),
                "pieces_in_stock": max(0, p.pieces_in_stock or 0),
                "total_pieces": p.total_pieces,
                "total_value": p.total_value,
                "total_value_cost": p.total_value_cost,
                "total_value_wholesale": p.total_value_wholesale,
                "last_sold_date": last_sold,
                "days_since_last_sale": days_since,
                "is_slow_moving": is_slow,
                "created_at": p.created_at,
                "updated_at": p.updated_at
            }
            result.append(ProductResponse.model_validate(product_dict))
        except Exception as e:
            print(f"Error processing product {p.id}: {e}")
            # Continue with next product instead of failing completely
            continue
    return result


@app.get("/api/products/count")
def get_products_count(
    search: Optional[str] = None,
    low_stock_only: bool = False,
    min_stock: int = 0,
    brand: Optional[str] = None,
    supplier: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get total count of products matching filters"""
    count = ProductService.get_products_count(
        db,
        search=search,
        low_stock_only=low_stock_only,
        min_stock=min_stock,
        brand=brand,
        supplier=supplier,
        location=location
    )
    return {"count": count}


# Export endpoint must come BEFORE /api/products/{product_id} to avoid route conflict
@app.get("/api/products/export")
def export_products(db: Session = Depends(get_db)):
    """Export products to Excel file"""
    try:
        file_path = ExcelService.export_products(db)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=500, detail="Export fayli yaratilmadi")
        filename = os.path.basename(file_path)
        return FileResponse(
            file_path, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export xatosi: {str(e)}")


@app.get("/api/products/low-stock", response_model=List[ProductResponse])
def get_low_stock_products(min_stock: int = 10, db: Session = Depends(get_db)):
    """Get products with low stock"""
    products = ProductService.get_products(db, skip=0, limit=1000, low_stock_only=True, min_stock=min_stock)
    # Convert to response with computed properties
    result = []
    for p in products:
        try:
            last_sold = None
            days_since = None
            is_slow = False
            try:
                last_sold = p.last_sold_date
                days_since = p.days_since_last_sale
                is_slow = p.is_slow_moving
            except Exception as e:
                print(f"Warning: Error computing properties for product {p.id}: {e}")
            
            product_dict = {
                "id": p.id,
                "name": p.name,
                "barcode": p.barcode,
                "brand": p.brand,
                "supplier": p.supplier,
                "received_date": p.received_date,
                "image_url": p.image_url,
                "location": p.location,
                "pieces_per_package": p.pieces_per_package,
                "cost_price": p.cost_price,
                "wholesale_price": p.wholesale_price,
                "retail_price": p.retail_price,
                "regular_price": p.regular_price,
                "packages_in_stock": p.packages_in_stock if p.packages_in_stock is not None else 0,
                "pieces_in_stock": p.pieces_in_stock if p.pieces_in_stock is not None else 0,
                "total_pieces": p.total_pieces,
                "total_value": p.total_value,
                "total_value_cost": p.total_value_cost,
                "total_value_wholesale": p.total_value_wholesale,
                "last_sold_date": last_sold,
                "days_since_last_sale": days_since,
                "is_slow_moving": is_slow,
                "created_at": p.created_at,
                "updated_at": p.updated_at
            }
            result.append(ProductResponse.model_validate(product_dict))
        except Exception as e:
            print(f"Error processing product {p.id}: {e}")
            continue
    return result


@app.post("/api/products/bulk-delete")
def bulk_delete_products(product_ids: List[int], db: Session = Depends(get_db)):
    """Delete multiple products at once"""
    deleted = 0
    for product_id in product_ids:
        if ProductService.delete_product(db, product_id):
            deleted += 1
    return {"message": f"Deleted {deleted} out of {len(product_ids)} products", "deleted": deleted}


@app.get("/api/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get a specific product"""
    from sqlalchemy.orm import joinedload
    product = db.query(Product).options(joinedload(Product.sale_items)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Safely get computed properties
    try:
        last_sold = product.last_sold_date
        days_since = product.days_since_last_sale
        is_slow = product.is_slow_moving
    except Exception as e:
        print(f"Warning: Error computing properties for product {product.id}: {e}")
        last_sold = None
        days_since = None
        is_slow = False
    
    # Convert to response with computed properties
    product_dict = {
        "id": product.id,
        "name": product.name,
        "barcode": product.barcode,
        "brand": product.brand,
        "supplier": product.supplier,
        "received_date": product.received_date,
        "image_url": product.image_url,
        "location": product.location,
        "pieces_per_package": product.pieces_per_package,
        "cost_price": max(0.0, product.cost_price or 0.0),  # Ensure cost_price is >= 0
        "wholesale_price": max(0.0, product.wholesale_price or 0.0),
        "retail_price": max(0.0, product.retail_price or 0.0),
        "regular_price": max(0.0, product.regular_price or 0.0),
        "packages_in_stock": max(0, product.packages_in_stock or 0),
        "pieces_in_stock": max(0, product.pieces_in_stock or 0),
        "total_pieces": product.total_pieces,
        "total_value": product.total_value,
        "total_value_cost": product.total_value_cost,
        "total_value_wholesale": product.total_value_wholesale,
        "last_sold_date": last_sold,
        "days_since_last_sale": days_since,
        "is_slow_moving": is_slow,
        "created_at": product.created_at,
        "updated_at": product.updated_at
    }
    return ProductResponse.model_validate(product_dict)


@app.put("/api/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db)):
    """Update a product"""
    from sqlalchemy.orm import joinedload
    updated = ProductService.update_product(db, product_id, product)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    # Reload with relationships for computed properties
    product_full = db.query(Product).options(joinedload(Product.sale_items)).filter(Product.id == product_id).first()
    
    # Safely get computed properties
    try:
        last_sold = product_full.last_sold_date
        days_since = product_full.days_since_last_sale
        is_slow = product_full.is_slow_moving
    except Exception as e:
        print(f"Warning: Error computing properties for product {product_full.id}: {e}")
        last_sold = None
        days_since = None
        is_slow = False
    
    # Convert to response with computed properties
    product_dict = {
        "id": product_full.id,
        "name": product_full.name,
        "barcode": product_full.barcode,
        "brand": product_full.brand,
        "supplier": product_full.supplier,
        "received_date": product_full.received_date,
        "image_url": product_full.image_url,
        "location": product_full.location,
        "pieces_per_package": product_full.pieces_per_package,
        "cost_price": max(0.0, product_full.cost_price or 0.0),  # Ensure cost_price is >= 0
        "wholesale_price": max(0.0, product_full.wholesale_price or 0.0),
        "retail_price": max(0.0, product_full.retail_price or 0.0),
        "regular_price": max(0.0, product_full.regular_price or 0.0),
        "packages_in_stock": max(0, product_full.packages_in_stock or 0),
        "pieces_in_stock": max(0, product_full.pieces_in_stock or 0),
        "total_pieces": product_full.total_pieces,
        "total_value": product_full.total_value,
        "total_value_cost": product_full.total_value_cost,
        "total_value_wholesale": product_full.total_value_wholesale,
        "last_sold_date": last_sold,
        "days_since_last_sale": days_since,
        "is_slow_moving": is_slow,
        "created_at": product_full.created_at,
        "updated_at": product_full.updated_at
    }
    return ProductResponse.model_validate(product_dict)


@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product"""
    success = ProductService.delete_product(db, product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}


@app.get("/api/products/{product_id}/barcode")
def get_product_barcode(product_id: int, db: Session = Depends(get_db)):
    """Get barcode/QR code for a product"""
    product = ProductService.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return BarcodeService.get_barcode_data(product_id, product.barcode)


# ==================== CUSTOMERS ====================

@app.post("/api/customers", response_model=CustomerResponse)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer"""
    return CustomerService.create_customer(db, customer)


@app.get("/api/customers", response_model=List[CustomerResponse])
def get_customers(
    customer_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all customers, optionally filtered by type and search"""
    try:
        customers = CustomerService.get_customers(db, customer_type=customer_type, skip=skip, limit=limit, search=search)
        # Convert to response format with proper serialization
        result = []
        for customer in customers:
            try:
                # Ensure debt_balance is properly set
                customer_dict = {
                    "id": customer.id,
                    "name": customer.name,
                    "phone": customer.phone,
                    "address": customer.address,
                    "customer_type": customer.customer_type.value if hasattr(customer.customer_type, 'value') else str(customer.customer_type),
                    "notes": customer.notes,
                    "debt_balance": customer.debt_balance if customer.debt_balance is not None else 0.0,
                    "debt_limit": customer.debt_limit,
                    "debt_due_date": customer.debt_due_date,
                    "created_at": customer.created_at,
                    "updated_at": customer.updated_at
                }
                result.append(CustomerResponse.model_validate(customer_dict))
            except Exception as e:
                print(f"Error processing customer {customer.id}: {e}")
                # Continue with next customer
                continue
        return result
    except Exception as e:
        print(f"Error in get_customers endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise


@app.get("/api/customers/count")
def get_customers_count(
    customer_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get total count of customers"""
    count = CustomerService.get_customers_count(db, customer_type=customer_type, search=search)
    return {"count": count}


@app.get("/api/customers/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Get a specific customer"""
    customer = CustomerService.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@app.put("/api/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, customer: CustomerUpdate, db: Session = Depends(get_db)):
    """Update a customer"""
    updated = CustomerService.update_customer(db, customer_id, customer)
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    return updated


@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """Delete a customer"""
    try:
        success = CustomerService.delete_customer(db, customer_id)
        if not success:
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"message": "Customer deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting customer: {str(e)}")


# ==================== SALES ====================

@app.post("/api/sales", response_model=SaleResponse)
async def create_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    """Create a new sale with automatic package/piece calculation"""
    sale_result = SaleService.create_sale(db, sale)
    
    # Notify admin panel via WebSocket
    await manager.broadcast({
        "type": "new_sale",
        "data": {
            "id": sale_result.id,
            "seller_id": sale_result.seller_id,
            "customer_id": sale_result.customer_id,
            "total_amount": sale_result.total_amount,
            "created_at": to_uzbekistan_time(sale_result.created_at).isoformat() if sale_result.created_at else None
        }
    })
    
    return SaleService.sale_to_response(sale_result)


@app.get("/api/sales", response_model=List[SaleResponse])
def get_sales(
    seller_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all sales, optionally filtered"""
    sales = SaleService.get_sales(
        db, 
        seller_id=seller_id, 
        customer_id=customer_id, 
        start_date=start_date,
        end_date=end_date,
        status=status,
        skip=skip, 
        limit=limit
    )
    return [SaleService.sale_to_response(sale) for sale in sales]


@app.get("/api/sales/count")
def get_sales_count(
    seller_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get total count of sales matching filters"""
    count = SaleService.get_sales_count(
        db,
        seller_id=seller_id,
        customer_id=customer_id,
        start_date=start_date,
        end_date=end_date,
        status=status
    )
    return {"count": count}


@app.get("/api/sales/{sale_id}", response_model=SaleResponse)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    """Get a specific sale"""
    sale = SaleService.get_sale(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return SaleService.sale_to_response(sale)


@app.get("/api/sales/pending", response_model=List[SaleResponse])
def get_pending_sales(db: Session = Depends(get_db)):
    """Get all sales pending admin approval"""
    from sqlalchemy.orm import joinedload
    from models import Sale, SaleItem
    sales = db.query(Sale).options(
        joinedload(Sale.customer),
        joinedload(Sale.seller),
        joinedload(Sale.approver),
        joinedload(Sale.items).joinedload(SaleItem.product)
    ).filter(
        Sale.requires_admin_approval == True,
        Sale.admin_approved == None
    ).order_by(Sale.created_at.desc()).all()
    return [SaleService.sale_to_response(sale, db) for sale in sales]


@app.post("/api/sales/{sale_id}/approve")
async def approve_sale(
    sale_id: int,
    approved: str = Form("true"),  # Accept as string first
    admin_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Approve or reject a sale (requires admin permissions)"""
    try:
        # Convert string to boolean
        approved_bool = approved.lower() in ("true", "1", "yes", "on")
        
        result = SaleService.approve_sale(db, sale_id, admin_id, approved_bool)
        if not result:
            raise HTTPException(status_code=404, detail="Sale not found")
        
        # Notify via WebSocket
        await manager.broadcast({
            "type": "sale_approved" if approved_bool else "sale_rejected",
            "data": {
                "id": result.id,
                "seller_id": result.seller_id,
                "customer_id": result.customer_id,
                "approved": approved_bool,
                "approved_by": admin_id
            }
        })
        
        return {
            "success": True,
            "message": f"Sotuv {'tasdiqlandi' if approved_bool else 'rad etildi'}",
            "sale": SaleService.sale_to_response(result)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/sales/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: int,
    sale_update: dict,
    db: Session = Depends(get_db)
):
    """Update an existing sale"""
    from schemas import SaleUpdate, SaleItemCreate
    try:
        # Convert items to SaleItemCreate objects if present
        items = None
        if sale_update.get("items"):
            items = [{"product_id": item["product_id"], "requested_quantity": item["requested_quantity"]} 
                    for item in sale_update.get("items", [])]
        
        updated_sale = SaleService.update_sale(
            db,
            sale_id,
            customer_id=sale_update.get("customer_id"),
            items=items,
            payment_method=sale_update.get("payment_method")
        )
        if not updated_sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        return SaleService.sale_to_response(updated_sale)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/sales/{sale_id}")
def delete_sale(sale_id: int, db: Session = Depends(get_db)):
    """Cancel/Delete a sale (return items to inventory)"""
    from services.calculation_service import CalculationService
    from models import SaleItem
    
    sale = SaleService.get_sale(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    try:
        seller = sale.seller
        
        # Return all items to inventory
        for item in sale.items:
            CalculationService.add_inventory(
                db,
                item.product_id,
                item.packages_sold,
                item.pieces_sold,
                user_id=sale.seller_id,
                user_name=seller.name if seller else "System",
                user_type="admin",
                action="sale_cancelled",
                reason=f"Sotuv #{sale.id} bekor qilindi",
                reference_id=sale.id,
                reference_type="sale"
            )
        
        # Delete sale items
        db.query(SaleItem).filter(SaleItem.sale_id == sale_id).delete()
        
        # Delete sale
        db.delete(sale)
        db.commit()
        
        return {"message": "Sale cancelled successfully", "sale_id": sale_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ==================== SETTINGS ====================

@app.get("/api/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Get application settings"""
    try:
        settings = SettingsService.get_settings(db)
        if not settings:
            raise HTTPException(status_code=500, detail="Settings not found")
        
        # Build response dict manually to handle missing fields gracefully
        response_data = {
            "id": settings.id,
            "store_name": settings.store_name,
            "store_address": settings.store_address,
            "store_phone": settings.store_phone,
            "store_email": settings.store_email,
            "store_inn": settings.store_inn,
            "store_tin": settings.store_tin,
            "logo_url": settings.logo_url,
            "receipt_footer_text": settings.receipt_footer_text,
            "receipt_show_logo": settings.receipt_show_logo,
            "created_at": settings.created_at,
            "updated_at": settings.updated_at,
        }
        
        # Add work schedule fields if they exist
        if hasattr(settings, 'work_start_time'):
            response_data["work_start_time"] = settings.work_start_time
        if hasattr(settings, 'work_end_time'):
            response_data["work_end_time"] = settings.work_end_time
        if hasattr(settings, 'work_days'):
            response_data["work_days"] = settings.work_days
        
        return SettingsResponse(**response_data)
    except Exception as e:
        print(f"Error getting settings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error loading settings: {str(e)}")


@app.put("/api/settings", response_model=SettingsResponse)
def update_settings(settings_update: SettingsUpdate, db: Session = Depends(get_db)):
    """Update application settings"""
    settings = SettingsService.update_settings(db, settings_update)
    return SettingsResponse.model_validate(settings)


@app.post("/api/sellers/{seller_id}/upload-image")
async def upload_seller_image(seller_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload seller profile image"""
    import os
    import uuid
    from pathlib import Path
    
    # Verify seller exists
    seller = SellerService.get_seller(db, seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Faqat rasm fayllari qabul qilinadi (jpg, png, gif, webp)")
    
    # Generate unique filename
    unique_filename = f"seller_{seller_id}_{uuid.uuid4()}{file_ext}"
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "sellers")
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Update seller image_url
    image_url = f"/uploads/sellers/{unique_filename}"
    seller.image_url = image_url
    db.commit()
    
    return {"url": image_url, "filename": unique_filename}


@app.post("/api/settings/upload-logo")
async def upload_logo(file: UploadFile = File(...)):
    """Upload logo image file"""
    import os
    import uuid
    from pathlib import Path
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Faqat rasm fayllari qabul qilinadi (jpg, png, gif, webp, svg)")
    
    # Generate unique filename
    unique_filename = f"logo_{uuid.uuid4()}{file_ext}"
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "settings")
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Return URL
    logo_url = f"/uploads/settings/{unique_filename}"
    return {"url": logo_url, "filename": unique_filename}


@app.get("/api/sales/{sale_id}/receipt")
def get_sale_receipt(sale_id: int, db: Session = Depends(get_db)):
    """Generate PDF receipt for a sale"""
    sale = SaleService.get_sale(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    pdf_path = PDFService.generate_receipt(db, sale_id)
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"receipt_{sale_id}.pdf")


@app.get("/api/customers/{customer_id}/sales-history", response_model=List[SaleResponse])
def get_customer_sales_history(
    customer_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get sales history for a specific customer"""
    # Verify customer exists
    customer = CustomerService.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    sales = SaleService.get_sales(db, customer_id=customer_id, skip=skip, limit=limit)
    return [SaleService.sale_to_response(sale) for sale in sales]


@app.get("/api/sellers/{seller_id}/sales-history", response_model=List[SaleResponse])
def get_seller_sales_history(
    seller_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get sales history for a specific seller"""
    from models import Seller
    # Verify seller exists
    seller = db.query(Seller).filter(Seller.id == seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    sales = SaleService.get_sales(db, seller_id=seller_id, skip=skip, limit=limit)
    return [SaleService.sale_to_response(sale) for sale in sales]


# ==================== AUTHENTICATION ====================

@app.post("/api/auth/login", response_model=LoginResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login seller"""
    result = AuthService.login(db, credentials.username, credentials.password)
    
    # If login failed, return error response
    if not result.get("success"):
        return LoginResponse(
            success=False,
            seller_id=None,
            seller_name=None,
            token=None,
            permissions=[],
            message=result.get("message", "Noto'g'ri login yoki parol")
        )
    
    return LoginResponse(
        success=result["success"],
        seller_id=result.get("seller_id"),
        seller_name=result.get("seller_name"),
        token=result.get("token"),
        permissions=result.get("permissions", []),
        message=result.get("message"),
        role_id=result.get("role_id"),
        role_name=result.get("role_name")
    )


@app.get("/api/auth/me")
def get_current_seller(
    seller: Optional[Seller] = Depends(get_seller_from_header),
    db: Session = Depends(get_db)
):
    """Get current logged-in seller info"""
    if not seller:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from auth import get_seller_permissions
    permissions = get_seller_permissions(db, seller)
    
    return {
        "id": seller.id,
        "name": seller.name,
        "username": seller.username,
        "phone": seller.phone,
        "email": seller.email,
        "image_url": seller.image_url,
        "role_id": seller.role_id,
        "role_name": seller.role.name if seller.role else None,
        "permissions": permissions,
        "is_active": seller.is_active
    }


# ==================== SELLERS ====================

@app.post("/api/sellers", response_model=SellerResponse)
def create_seller(seller: SellerCreate, db: Session = Depends(get_db)):
    """Create a new seller"""
    from schemas import SellerResponse
    created = SellerService.create_seller(db, seller)
    db.refresh(created)
    return SellerResponse(
        id=created.id,
        name=created.name,
        username=created.username,
        phone=created.phone,
        email=created.email,
        image_url=created.image_url,
        is_active=created.is_active,
        role_id=created.role_id,
        role_name=created.role.name if created.role else None,
        latitude=created.latitude,
        longitude=created.longitude,
        last_location_update=created.last_location_update,
        created_at=created.created_at,
        updated_at=created.updated_at
    )


@app.get("/api/sellers", response_model=List[SellerResponse])
def get_sellers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all sellers"""
    from schemas import SellerResponse
    sellers = SellerService.get_sellers(db, skip=skip, limit=limit)
    return [
        SellerResponse(
            id=s.id,
            name=s.name,
            username=s.username,
            phone=s.phone,
            email=s.email,
            image_url=s.image_url,
            is_active=s.is_active,
            role_id=s.role_id,
            role_name=s.role.name if s.role else None,
            latitude=s.latitude,
            longitude=s.longitude,
            last_location_update=s.last_location_update,
            created_at=s.created_at,
            updated_at=s.updated_at
        )
        for s in sellers
    ]


@app.get("/api/sellers/{seller_id}", response_model=SellerResponse)
def get_seller(seller_id: int, db: Session = Depends(get_db)):
    """Get a specific seller"""
    from schemas import SellerResponse
    seller = SellerService.get_seller(db, seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return SellerResponse(
        id=seller.id,
        name=seller.name,
        username=seller.username,
        phone=seller.phone,
        email=seller.email,
        image_url=seller.image_url,
        is_active=seller.is_active,
        role_id=seller.role_id,
        role_name=seller.role.name if seller.role else None,
        latitude=seller.latitude,
        longitude=seller.longitude,
        last_location_update=seller.last_location_update,
        created_at=seller.created_at,
        updated_at=seller.updated_at
    )


@app.put("/api/sellers/{seller_id}", response_model=SellerResponse)
def update_seller(seller_id: int, seller: SellerUpdate, db: Session = Depends(get_db)):
    """Update a seller"""
    from schemas import SellerResponse
    updated = SellerService.update_seller(db, seller_id, seller)
    if not updated:
        raise HTTPException(status_code=404, detail="Seller not found")
    return SellerResponse(
        id=updated.id,
        name=updated.name,
        username=updated.username,
        phone=updated.phone,
        email=updated.email,
        image_url=updated.image_url,
        is_active=updated.is_active,
        role_id=updated.role_id,
        role_name=updated.role.name if updated.role else None,
        latitude=updated.latitude,
        longitude=updated.longitude,
        last_location_update=updated.last_location_update,
        created_at=updated.created_at,
        updated_at=updated.updated_at
    )


@app.get("/api/locations/sellers")
def get_sellers_locations(
    x_seller_id: Optional[int] = Header(None, alias="X-Seller-ID"),
    only_work_hours: bool = False,  # Filter by work hours
    db: Session = Depends(get_db)
):
    """Get sellers' current locations
    - If X-Seller-ID header is provided: return only that seller's location (for mobile app)
    - If no header: return all sellers' locations (for admin panel)
    - If only_work_hours=True: only return locations updated during work hours
    """
    # If seller ID is provided in header (mobile app), return only that seller's location
    if x_seller_id:
        seller = db.query(Seller).filter(Seller.id == x_seller_id, Seller.is_active == True).first()
        if not seller:
            return []
        
        if seller.latitude is None or seller.longitude is None:
            return []
        
        return [{
            "id": seller.id,
            "name": seller.name,
            "latitude": seller.latitude,
            "longitude": seller.longitude,
            "last_update": to_uzbekistan_time(seller.last_location_update).isoformat() if seller.last_location_update else None
        }]
    
    # Otherwise, return all sellers' locations (admin panel)
    return SellerService.get_all_locations(db, only_within_work_hours=only_work_hours)


@app.post("/api/sellers/{seller_id}/location")
def update_seller_location(seller_id: int, location: LocationUpdate, db: Session = Depends(get_db)):
    """Update seller GPS location (only during work hours if work schedule is set)"""
    from services.settings_service import SettingsService
    
    # Validate coordinates
    if not (-90 <= location.latitude <= 90):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90")
    if not (-180 <= location.longitude <= 180):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
    
    # Check if within work hours
    if not SettingsService.is_within_work_hours(db):
        # Don't update location if outside work hours
        return {"message": "Location update skipped (outside work hours)", "updated": False}
    
    SellerService.update_location(db, seller_id, location.latitude, location.longitude)
    return {"message": "Location updated successfully", "updated": True}


@app.delete("/api/sellers/{seller_id}/location")
def clear_seller_location(seller_id: int, db: Session = Depends(get_db)):
    """Clear (delete) seller GPS location"""
    success = SellerService.clear_location(db, seller_id)
    if not success:
        raise HTTPException(status_code=404, detail="Seller not found")
    return {"message": "Location cleared successfully"}


@app.get("/api/sellers/{seller_id}/permissions")
def get_seller_permissions(seller_id: int, db: Session = Depends(get_db)):
    """Get all permissions for a seller"""
    seller = SellerService.get_seller(db, seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return SellerService.get_seller_permissions(db, seller_id)


# ==================== ROLES & PERMISSIONS ====================

@app.get("/api/roles", response_model=List[RoleResponse])
def get_roles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all roles"""
    roles = RoleService.get_roles(db, skip=skip, limit=limit)
    return [RoleService.role_to_response(role) for role in roles]


@app.get("/api/roles/{role_id}", response_model=RoleResponse)
def get_role(role_id: int, db: Session = Depends(get_db)):
    """Get a specific role"""
    role = RoleService.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return RoleService.role_to_response(role)


@app.post("/api/roles", response_model=RoleResponse)
def create_role(role: RoleCreate, db: Session = Depends(get_db)):
    """Create a new role"""
    created = RoleService.create_role(db, role)
    return RoleService.role_to_response(created)


@app.put("/api/roles/{role_id}", response_model=RoleResponse)
def update_role(role_id: int, role: RoleUpdate, db: Session = Depends(get_db)):
    """Update a role"""
    updated = RoleService.update_role(db, role_id, role)
    if not updated:
        raise HTTPException(status_code=404, detail="Role not found")
    return RoleService.role_to_response(updated)


@app.delete("/api/roles/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db)):
    """Delete a role"""
    success = RoleService.delete_role(db, role_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete role (system role or in use)")
    return {"message": "Role deleted successfully"}


@app.get("/api/permissions")
def get_all_permissions(db: Session = Depends(get_db)):
    """Get all available permissions"""
    from schemas import PermissionResponse
    permissions = RoleService.get_all_permissions(db)
    return [PermissionResponse(
        id=p.id,
        code=p.code,
        name=p.name,
        category=p.category,
        description=p.description
    ) for p in permissions]


@app.get("/api/permissions/list")
def get_permissions_list():
    """Get list of all permission codes and names"""
    return {
        "permissions": [
            {"code": code, "name": name}
            for code, name in PERMISSIONS.items()
        ]
    }


# ==================== ORDERS ====================

@app.post("/api/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """Create a new order (from mobile app)"""
    # Check customer debt limit before creating order
    from models import Customer
    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    if customer:
        # Calculate approximate order total (rough estimate)
        total = sum(item.requested_quantity * 1000 for item in order.items)
        can_take, error = DebtService.check_debt_limit(db, order.customer_id, additional_debt=total)
        if not can_take:
            raise HTTPException(status_code=400, detail=error)
    
    order_result = OrderService.create_order(db, order)
    
    # Reload with relations for WebSocket notification
    from sqlalchemy.orm import joinedload
    from models import OrderItem
    
    db.refresh(order_result)
    order_with_relations = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.seller),
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(Order.id == order_result.id).first()
    
    # Notify admin panel via WebSocket
    await manager.broadcast({
        "type": "new_order",
        "data": OrderService.order_to_response(order_with_relations)
    })
    
    return OrderService.order_to_response(order_with_relations)


@app.get("/api/orders", response_model=List[OrderResponse])
def get_orders(
    status: Optional[str] = None,
    seller_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all orders"""
    orders = OrderService.get_orders(db, status=status, seller_id=seller_id, skip=skip, limit=limit)
    return [OrderService.order_to_response(order) for order in orders]


@app.get("/api/orders/count")
def get_orders_count(
    status: Optional[str] = None,
    seller_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get total count of orders matching filters"""
    count = OrderService.get_orders_count(db, status=status, seller_id=seller_id)
    return {"count": count}


@app.put("/api/orders/{order_id}/status")
async def update_order_status(order_id: int, status_data: dict, db: Session = Depends(get_db)):
    """Update order status (pending -> processing -> completed, or cancel/return)"""
    status = status_data.get('status')
    if not status:
        raise HTTPException(status_code=400, detail="status field is required")
    
    order = OrderService.update_status(db, order_id, status)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order_response = OrderService.order_to_response(order)
    
    # Notify via WebSocket
    await manager.broadcast({
        "type": "order_status_update",
        "data": {"order_id": order_id, "status": status}
    })
    
    return order_response


@app.post("/api/orders/{order_id}/payment")
async def process_order_payment(
    order_id: int,
    payment_amount: float = Form(...),
    allow_debt: bool = Form(False),
    db: Session = Depends(get_db)
):
    """Process order payment with debt handling"""
    from models import Order
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Faqat 'pending' holatdagi buyurtmalar uchun to'lov qabul qilinadi")
    
    # Get seller info for audit
    seller = db.query(Seller).filter(Seller.id == order.seller_id).first()
    seller_name = seller.name if seller else "System"
    
    try:
        # Process payment
        result = DebtService.process_order_payment(
            db=db,
            customer_id=order.customer_id,
            order_amount=order.total_amount,
            payment_amount=payment_amount,
            order_id=order_id,
            allow_debt=allow_debt,
            created_by=order.seller_id,
            created_by_name=seller_name
        )
        
        # Update order status to completed
        order.status = "completed"
        db.commit()
        
        return {
            "success": True,
            "message": "To'lov muvaffaqiyatli amalga oshirildi",
            "payment_details": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== DEBT MANAGEMENT ====================

@app.get("/api/customers/{customer_id}/debt-history", response_model=List[DebtHistoryResponse])
def get_customer_debt_history(
    customer_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get debt history for a customer"""
    from models import DebtHistory
    history = DebtService.get_debt_history(db, customer_id, skip=skip, limit=limit)
    return [DebtHistoryResponse.model_validate(h) for h in history]


@app.post("/api/customers/{customer_id}/add-debt")
def add_customer_debt(
    customer_id: int,
    amount: float = Form(...),
    reason: str = Form(...),
    db: Session = Depends(get_db)
):
    """Manually add debt to customer"""
    # Check debt limit
    can_take, error = DebtService.check_debt_limit(db, customer_id, additional_debt=amount)
    if not can_take:
        raise HTTPException(status_code=400, detail=error)
    
    history = DebtService.add_debt(
        db=db,
        customer_id=customer_id,
        amount=amount,
        reason=reason,
        created_by_name="Admin"
    )
    
    return {"success": True, "message": "Qarz qo'shildi", "history": DebtHistoryResponse.from_orm(history)}


@app.post("/api/customers/{customer_id}/pay-debt")
def pay_customer_debt(
    customer_id: int,
    amount: float = Form(...),
    reason: str = Form(...),
    db: Session = Depends(get_db)
):
    """Pay customer debt"""
    history = DebtService.pay_debt(
        db=db,
        customer_id=customer_id,
        amount=amount,
        reason=reason,
        created_by_name="Admin"
    )
    
    return {"success": True, "message": "Qarz to'landi", "history": DebtHistoryResponse.model_validate(history)}


@app.get("/api/debt/total")
def get_total_debt(db: Session = Depends(get_db)):
    """Get total debt of all customers"""
    total = DebtService.get_total_debt(db)
    return {"total_debt": total}


# ==================== CALCULATIONS ====================

@app.post("/api/calculate-sale")
def calculate_sale(
    product_id: int,
    quantity: int,
    customer_id: int,
    db: Session = Depends(get_db)
):
    """Calculate sale breakdown (packages + pieces) and price"""
    result = CalculationService.calculate_sale(db, product_id, quantity, customer_id)
    if not result:
        raise HTTPException(status_code=404, detail="Product or customer not found")
    return result


# ==================== STATISTICS ====================

@app.get("/api/statistics")
def get_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    seller_id: Optional[int] = None,
    period: Optional[str] = None,  # daily, monthly, yearly
    db: Session = Depends(get_db)
):
    """Get detailed sales statistics with payment methods and profit"""
    from datetime import datetime, timedelta
    
    # Auto-set date range based on period if not provided
    if not start_date or not end_date:
        now = get_uzbekistan_now()
        if period == "daily":
            end_date = now.isoformat()
            start_date = (now - timedelta(days=1)).isoformat()
        elif period == "monthly":
            end_date = now.isoformat()
            start_date = (now - timedelta(days=30)).isoformat()
        elif period == "yearly":
            end_date = now.isoformat()
            start_date = (now - timedelta(days=365)).isoformat()
    
    stats = SaleService.get_statistics(db, start_date, end_date, seller_id=seller_id)
    
    # Add inventory statistics
    inventory_stats = ProductService.get_inventory_total_value(db)
    stats["inventory"] = inventory_stats
    
    # Add total debt statistics
    total_debt = DebtService.get_total_debt(db)
    stats["total_debt"] = total_debt
    
    return stats


@app.get("/api/inventory/value")
def get_inventory_value(db: Session = Depends(get_db)):
    """Get total inventory value"""
    return ProductService.get_inventory_total_value(db)


# ==================== AUDIT LOGS ====================

@app.get("/api/audit-logs")
def get_audit_logs(
    product_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get audit logs with filters"""
    logs = AuditService.get_audit_logs(
        db, product_id=product_id, user_id=user_id, action=action,
        start_date=start_date, end_date=end_date, skip=skip, limit=limit
    )
    return [AuditService.audit_log_to_dict(log) for log in logs]


@app.get("/api/audit-logs/count")
def get_audit_logs_count(
    product_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get count of audit logs"""
    count = AuditService.get_audit_logs_count(
        db, product_id=product_id, user_id=user_id, action=action,
        start_date=start_date, end_date=end_date
    )
    return {"count": count}


@app.delete("/api/audit-logs")
def delete_audit_logs(
    product_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    older_than_days: Optional[int] = None,
    delete_all: bool = False,
    db: Session = Depends(get_db)
):
    """Delete audit logs with filters. If delete_all=True, deletes all logs (use with caution)."""
    try:
        # Delete with filters or all
        deleted_count = AuditService.delete_audit_logs(
            db,
            product_id=product_id,
            user_id=user_id,
            action=action,
            start_date=start_date,
            end_date=end_date,
            older_than_days=older_than_days,
            delete_all=delete_all
        )
        
        return {
            "success": True,
            "message": f"{deleted_count} ta audit log o'chirildi",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audit loglarni o'chirishda xatolik: {str(e)}")


# ==================== EXCEL IMPORT/EXPORT ====================

@app.post("/api/products/import")
async def import_products(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import products from Excel file"""
    import os
    import tempfile
    
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Faqat Excel fayllari qabul qilinadi (.xlsx, .xls)")
    
    # Save uploaded file temporarily
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, f"import_{datetime.now().timestamp()}_{file.filename}")
    
    with open(temp_file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    try:
        # Import products
        result = ExcelService.import_products(db, temp_file_path)
        
        # Clean up temp file
        os.remove(temp_file_path)
        
        error_message = ""
        if result.get("errors"):
            error_message = f"\nXatolar ({len(result['errors'])} ta):\n" + "\n".join(result['errors'][:10])
            if len(result['errors']) > 10:
                error_message += f"\n... va yana {len(result['errors']) - 10} ta xato"
        
        return {
            "success": True,
            "message": f"{result['imported']} ta mahsulot muvaffaqiyatli import qilindi.{error_message}",
            "imported": result['imported'],
            "errors_count": len(result.get("errors", []))
        }
    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=400, detail=f"Import xatosi: {str(e)}")


@app.get("/api/sales/export")
def export_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Export sales to Excel file"""
    file_path = ExcelService.export_sales(db, start_date, end_date)
    filename = os.path.basename(file_path)
    return FileResponse(
        file_path, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename
    )


# ==================== OFFLINE SYNC ====================

@app.post("/api/offline/sync")
async def sync_offline_orders(orders: List[OrderCreate], db: Session = Depends(get_db)):
    """Sync offline orders from mobile app"""
    synced_orders = []
    errors = []
    
    for order_data in orders:
        try:
            # Create order with offline flag
            order_dict = order_data.dict()
            order_dict['is_offline'] = True
            order_create = OrderCreate(**order_dict)
            order_result = OrderService.create_order(db, order_create)
            
            # Mark as synced
            order_result.synced_at = get_uzbekistan_now()
            order_result.is_offline = False
            db.commit()
            db.refresh(order_result)
            
            order_response = OrderService.order_to_response(order_result)
            synced_orders.append(order_response)
            
            # Notify via WebSocket
            await manager.broadcast({
                "type": "new_order",
                "data": order_response
            })
        except Exception as e:
            errors.append({
                "order": order_data.dict(),
                "error": str(e)
            })
    
    return {
        "synced": len(synced_orders),
        "errors": len(errors),
        "orders": synced_orders,
        "error_details": errors
    }


# ==================== WEBSOCKET ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back or process message
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ==================== ADMIN PANEL ====================

@app.get("/", response_class=HTMLResponse)
async def root():
    """Redirect to admin panel"""
    return await admin_panel()

@app.get("/admin", response_class=HTMLResponse)
@app.get("/admin/", response_class=HTMLResponse)
async def admin_panel():
    """Serve admin panel HTML"""
    import os
    admin_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "admin_panel", "index.html")
    if os.path.exists(admin_path):
        with open(admin_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    else:
        return HTMLResponse(content="<h1>Admin panel not found</h1>", status_code=404)


@app.get("/seller", response_class=HTMLResponse)
@app.get("/seller/", response_class=HTMLResponse)
async def seller_panel():
    """Serve seller panel HTML"""
    import os
    seller_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "seller_panel", "index.html")
    if os.path.exists(seller_path):
        with open(seller_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    else:
        return HTMLResponse(content="<h1>Seller panel not found</h1>", status_code=404)


# Static files directories
admin_static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "admin_panel", "static")
seller_static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "seller_panel", "static")

# Mount static files FIRST (before routes)
if os.path.exists(admin_static_dir):
    try:
        app.mount("/static", StaticFiles(directory=admin_static_dir), name="static")
        print(f"✓ Admin static files mounted: {admin_static_dir}")
    except Exception as e:
        print(f"⚠ Warning: Could not mount admin static files: {e}")

if os.path.exists(seller_static_dir):
    try:
        app.mount("/seller/static", StaticFiles(directory=seller_static_dir), name="seller-static")
        print(f"✓ Seller static files mounted: {seller_static_dir}")
    except Exception as e:
        print(f"⚠ Warning: Could not mount seller static files: {e}")

# Fallback static file endpoints (if mount doesn't work)
@app.get("/static/{file_path:path}")
async def serve_admin_static(file_path: str):
    """Serve admin panel static files (fallback)"""
    import os
    file_full_path = os.path.join(admin_static_dir, file_path)
    if os.path.exists(file_full_path) and os.path.isfile(file_full_path):
        # Security check
        if not os.path.abspath(file_full_path).startswith(os.path.abspath(admin_static_dir)):
            raise HTTPException(status_code=403, detail="Forbidden")
        return FileResponse(file_full_path)
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/seller/static/{file_path:path}")
async def serve_seller_static(file_path: str):
    """Serve seller panel static files (fallback)"""
    import os
    file_full_path = os.path.join(seller_static_dir, file_path)
    if os.path.exists(file_full_path) and os.path.isfile(file_full_path):
        # Security check
        if not os.path.abspath(file_full_path).startswith(os.path.abspath(seller_static_dir)):
            raise HTTPException(status_code=403, detail="Forbidden")
        return FileResponse(file_full_path)
    raise HTTPException(status_code=404, detail="File not found")

# Mount uploads directory
uploads_base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(os.path.join(uploads_base_dir, "products"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_base_dir), name="uploads")


# ==================== INITIALIZE ====================

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()


if __name__ == "__main__":
    # Use 0.0.0.0 to bind to all interfaces, but access via localhost or 127.0.0.1 in browser
    uvicorn.run(app, host="0.0.0.0", port=8000)
