"""
FastAPI Backend for Inventory and Sales Management System
"""
import sys
import os
# Add services directory to path for absolute imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services'))

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Header, Request, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
from datetime import datetime, timedelta
import json
import os
from utils import get_uzbekistan_now, to_uzbekistan_time

from database import SessionLocal, engine, init_db
from models import Base, Product, ProductImage, ProductReview, Seller, Sale, SaleItem, Order, Customer, Banner, HelpRequest, Favorite, PriceAlert, CustomerProductTag, OtpCode, CustomerDeviceToken, Conversation, ChatMessage, SearchHistory, Referal, LoyaltyPoint, LoyaltyTransaction, ProductVariant, Category, Role
from schemas import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductImageResponse, ProductImageCreate,
    ProductReviewResponse, ProductReviewCreate, ProductReviewUpdate,
    CustomerCreate, CustomerUpdate, CustomerResponse, CustomerStatsResponse,
    SaleCreate, SaleResponse, SaleItemCreate,
    SellerCreate, SellerUpdate, SellerResponse,
    OrderCreate, OrderResponse, OrderItemCreate,
    LocationUpdate, RoleCreate, RoleUpdate, RoleResponse, PermissionResponse,
    DebtHistoryResponse, LoginRequest, LoginResponse,
    SendOtpRequest, VerifyOtpRequest, SocialLoginRequest, ScanCodeRequest,
    DeviceTokenRequest, SendNotificationRequest,
    ChatMessageCreate, ChatMessageResponse, ConversationResponse,
    ConversationListResponse, ChatMessageListResponse,
    SearchHistoryCreate, SearchHistoryResponse,
    SettingsUpdate, SettingsResponse,
    BannerCreate, BannerUpdate, BannerResponse,
    PriceAlertCreate, PriceAlertUpdate, PriceAlertResponse,
    ProductTagCreate, ProductTagResponse,
    ReferalCreate, ReferalResponse, ReferalListResponse,
    LoyaltyPointResponse, LoyaltyTransactionResponse, LoyaltyTransactionCreate,
    ProductVariantCreate, ProductVariantUpdate, ProductVariantResponse,
    PaymentInitiateRequest, PaymentInitiateResponse, PaymentVerifyRequest, PaymentVerifyResponse,
    CategoryCreate, CategoryUpdate, CategoryResponse,
)
from services import (
    ProductService, CustomerService, SaleService,
    SellerService, OrderService, CalculationService,
    PDFService, ExcelService, BarcodeService, RoleService,
    NotificationService
)
from services.settings_service import SettingsService
from services.audit_service import AuditService
from services.debt_service import DebtService
from services.auth_service import AuthService
from websocket_manager import ConnectionManager
from auth import PERMISSIONS, require_permission, get_seller_from_header
from customer_auth import get_customer_from_header

# Create database tables
Base.metadata.create_all(bind=engine)

# Migrate Settings table to add work schedule columns if they don't exist
try:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    
    # Use begin() for proper transaction handling in SQLAlchemy 2.0
    with engine.begin() as conn:
        # Check if settings table exists
        try:
            columns = [col['name'] for col in inspector.get_columns('settings')]
        except Exception:
            columns = []
        
        if 'work_start_time' not in columns:
            conn.execute(text("ALTER TABLE settings ADD COLUMN work_start_time VARCHAR(10)"))
            conn.execute(text("UPDATE settings SET work_start_time = '09:00' WHERE work_start_time IS NULL"))
        
        if 'work_end_time' not in columns:
            conn.execute(text("ALTER TABLE settings ADD COLUMN work_end_time VARCHAR(10)"))
            conn.execute(text("UPDATE settings SET work_end_time = '18:00' WHERE work_end_time IS NULL"))
        
        if 'work_days' not in columns:
            conn.execute(text("ALTER TABLE settings ADD COLUMN work_days VARCHAR(20)"))
            conn.execute(text("UPDATE settings SET work_days = '1,2,3,4,5,6,7' WHERE work_days IS NULL"))
        
        # Migrate sellers table to add image_url column if it doesn't exist
        try:
            sellers_columns = [col['name'] for col in inspector.get_columns('sellers')]
        except Exception:
            sellers_columns = []
        if 'image_url' not in sellers_columns:
            conn.execute(text("ALTER TABLE sellers ADD COLUMN image_url VARCHAR(500)"))
        
        # Migrate customers table to add username and password_hash columns if they don't exist
        try:
            try:
                customers_columns = [col['name'] for col in inspector.get_columns('customers')]
            except Exception:
                customers_columns = []
            
            # Add username column (without UNIQUE constraint first, then create index)
            if 'username' not in customers_columns:
                print("Adding username column to customers table...")
                # SQLite doesn't support adding UNIQUE column directly, so we:
                # 1. Add column without constraint
                conn.execute(text("ALTER TABLE customers ADD COLUMN username VARCHAR(100)"))
                print("✓ Added username column")
                
                # 2. Create unique index (allows NULL values, only enforces uniqueness for non-NULL)
                try:
                    # Check if index already exists
                    index_exists = conn.execute(text("""
                        SELECT name FROM sqlite_master 
                        WHERE type='index' AND name='ix_customers_username'
                    """)).fetchone()
                    
                    if not index_exists:
                        conn.execute(text("""
                            CREATE UNIQUE INDEX ix_customers_username 
                            ON customers(username) 
                            WHERE username IS NOT NULL
                        """))
                        print("✓ Created unique index on username")
                    else:
                        print("✓ Unique index on username already exists")
                except Exception as idx_error:
                    print(f"Warning: Could not create unique index on username: {idx_error}")
            
            # Add password_hash column
            if 'password_hash' not in customers_columns:
                print("Adding password_hash column to customers table...")
                conn.execute(text("ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255)"))
                print("✓ Added password_hash column")
        except Exception as e:
            print(f"Warning: Error migrating customers table: {e}")
            import traceback
            traceback.print_exc()
        
        # Migrate products table to add category column if it doesn't exist
        try:
            try:
                products_columns = [col['name'] for col in inspector.get_columns('products')]
            except Exception:
                products_columns = []
            if 'category' not in products_columns:
                print("Adding category column to products table...")
                conn.execute(text("ALTER TABLE products ADD COLUMN category VARCHAR(100)"))
                print("✓ Added category column to products table")
        except Exception as e:
            print(f"Warning: Error migrating products table (category): {e}")
            import traceback
            traceback.print_exc()
        
        # Migrate banners table to add rotation_interval column if it doesn't exist
        try:
            try:
                banners_columns = [col['name'] for col in inspector.get_columns('banners')]
            except Exception:
                banners_columns = []
            if 'rotation_interval' not in banners_columns:
                conn.execute(text("ALTER TABLE banners ADD COLUMN rotation_interval INTEGER NOT NULL DEFAULT 3000"))
                print("✓ Added rotation_interval column to banners table")
        except Exception as e:
            print(f"Warning: Error migrating banners table: {e}")
        
        # Migrate products table to add item_number column if it doesn't exist
        try:
            try:
                products_columns = [col['name'] for col in inspector.get_columns('products')]
            except Exception:
                products_columns = []
            if 'item_number' not in products_columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN item_number VARCHAR(100)"))
                print("✓ Added item_number column to products table")
        except Exception as e:
            print(f"Warning: Error migrating products table (item_number): {e}")
        
        # Migrate products table to add category_id column if it doesn't exist
        try:
            try:
                products_columns = [col['name'] for col in inspector.get_columns('products')]
            except Exception:
                products_columns = []
            if 'category_id' not in products_columns:
                print("Adding category_id column to products table...")
                conn.execute(text("ALTER TABLE products ADD COLUMN category_id INTEGER"))
                # Create index for better performance
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_products_category_id ON products(category_id)"))
                except Exception as idx_error:
                    print(f"Warning: Could not create index on category_id: {idx_error}")
                print("✓ Added category_id column to products table")
            else:
                print("✓ category_id column already exists in products table")
        except Exception as e:
            print(f"Warning: Error migrating products table (category_id): {e}")
            import traceback
            traceback.print_exc()
except Exception as e:
    print(f"Warning: Could not migrate database: {e}")
    import traceback
    traceback.print_exc()
    # Continue anyway - the code will handle missing columns gracefully

app = FastAPI(title="Inventory & Sales Management API", version="1.0.0")

# Exception handlers to ensure all errors return JSON
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensure HTTPException returns JSON"""
    print(f"[HTTP EXCEPTION HANDLER] Status: {exc.status_code}, Detail: {exc.detail}")
    print(f"[HTTP EXCEPTION HANDLER] Request URL: {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "status_code": 422}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    import traceback
    error_details = traceback.format_exc()
    print(f"[GENERAL EXCEPTION HANDLER] Exception type: {type(exc).__name__}")
    print(f"[GENERAL EXCEPTION HANDLER] Exception message: {str(exc)}")
    print(f"[GENERAL EXCEPTION HANDLER] Traceback:\n{error_details}")
    print(f"[GENERAL EXCEPTION HANDLER] Request URL: {request.url}")
    print(f"[GENERAL EXCEPTION HANDLER] Request method: {request.method}")
    
    # If it's already an HTTPException, use its detail
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "status_code": exc.status_code}
        )
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "status_code": 500}
    )

# CORS middleware - Allow all origins for development, specific for production
# Get allowed origins from environment variable or use defaults
import os
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

# Always include production domain and common localhost ports
base_origins = [
    "https://uztoysavdo.uz",
    "https://www.uztoysavdo.uz",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8081",
        "http://localhost:19006",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:19006",
        "capacitor://localhost",
        "ionic://localhost",
]

if allowed_origins_env:
    # Parse comma-separated list from environment
    env_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
    # Merge with base origins (avoid duplicates)
    allowed_origins = list(set(base_origins + env_origins))
elif is_production:
    # Production: include production domain and localhost for development/testing
    allowed_origins = base_origins
else:
    # Development: allow all common origins
    allowed_origins = base_origins

# For development or when ALLOW_CORS_ALL is set, use wildcard
allow_cors_all = os.getenv("ALLOW_CORS_ALL", "false").lower() == "true"
if allow_cors_all or (not is_production and not allowed_origins_env):
    # Use wildcard for easier development/testing
    allowed_origins = ["*"]
    allow_credentials = False  # Cannot use credentials with wildcard
else:
    allow_credentials = True

print(f"[CORS] Allowed origins: {allowed_origins}")
print(f"[CORS] Allow credentials: {allow_credentials}")
print(f"[CORS] Is production: {is_production}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Seller-ID", "Authorization", "Content-Type", "X-Customer-ID"],
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


# ==================== CATEGORIES ====================

@app.get("/api/categories", response_model=List[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """Get all categories"""
    categories = db.query(Category).order_by(Category.display_order, Category.name).offset(skip).limit(limit).all()
    return categories


@app.get("/api/categories/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific category"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")
    return category


def is_admin_seller(db: Session, seller: Seller) -> bool:
    """Check if seller is an admin (has admin role or admin permissions)"""
    if not seller:
        return False
    
    # If seller has role_id, load the role with permissions
    if seller.role_id:
        from sqlalchemy.orm import joinedload
        seller_with_role = db.query(Seller).options(joinedload(Seller.role)).filter(Seller.id == seller.id).first()
        if seller_with_role and seller_with_role.role:
            # Check if role name contains "admin", "direktor", or "director"
            if seller_with_role.role.name:
                role_name_lower = seller_with_role.role.name.lower()
                if 'admin' in role_name_lower or 'direktor' in role_name_lower or 'director' in role_name_lower:
                    return True
            
            # Check if seller has any admin permission
            from auth import has_permission
            admin_permissions = ["admin.sellers", "admin.roles", "admin.permissions", "admin.settings"]
            for perm_code in admin_permissions:
                if has_permission(db, seller_with_role, perm_code):
                    return True
    
    # Fallback: check if seller has role relationship loaded
    if hasattr(seller, 'role') and seller.role:
        # Check if role name contains "admin"
        if seller.role.name:
            role_name_lower = seller.role.name.lower()
            if 'admin' in role_name_lower or 'direktor' in role_name_lower or 'director' in role_name_lower:
                return True
        
        # Check if seller has any admin permission
        from auth import has_permission
        admin_permissions = ["admin.sellers", "admin.roles", "admin.permissions", "admin.settings"]
        for perm_code in admin_permissions:
            if has_permission(db, seller, perm_code):
                return True
    
    # Additional check: if seller can access admin panel (has admin permissions via role)
    try:
        from auth import has_permission
        # Check if seller has any admin permission directly
        admin_permissions = ["admin.sellers", "admin.roles", "admin.permissions", "admin.settings"]
        for perm_code in admin_permissions:
            if has_permission(db, seller, perm_code):
                return True
    except Exception as e:
        print(f"[is_admin_seller] Error checking permissions: {e}")
    
    return False

@app.post("/api/categories", response_model=CategoryResponse)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Create a new category"""
    if not seller:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if seller has products.create permission OR is an admin
    from auth import has_permission
    has_products_create = has_permission(db, seller, "products.create")
    is_admin = is_admin_seller(db, seller)
    
    # Debug logging
    print(f"[CREATE CATEGORY] Seller ID: {seller.id}, Name: {seller.name}")
    print(f"[CREATE CATEGORY] Has products.create: {has_products_create}, Is admin: {is_admin}")
    if seller.role_id:
        role = db.query(Role).filter(Role.id == seller.role_id).first()
        if role:
            print(f"[CREATE CATEGORY] Role: {role.name}")
            # If role name contains admin, allow access
            if role.name and ('admin' in role.name.lower() or 'direktor' in role.name.lower() or 'director' in role.name.lower()):
                print(f"[CREATE CATEGORY] Allowing access based on role name")
                is_admin = True
    
    # Allow if seller has products.create OR is admin OR has admin role
    if not has_products_create and not is_admin:
        print(f"[CREATE CATEGORY] Permission denied for seller {seller.id}")
        raise HTTPException(
            status_code=403,
            detail="Permission denied: products.create permission or admin access required"
        )
    
    print(f"[CREATE CATEGORY] Permission granted for seller {seller.id}")
    # Check if category with same name already exists
    existing = db.query(Category).filter(Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu nomdagi kategoriya allaqachon mavjud")
    
    db_category = Category(
        name=category.name,
        description=category.description,
        icon=category.icon,
        display_order=category.display_order or 0
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@app.put("/api/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Update a category"""
    if not seller:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if seller has products.update permission OR is an admin
    from auth import has_permission
    has_products_update = has_permission(db, seller, "products.update")
    is_admin = is_admin_seller(db, seller)
    
    if not has_products_update and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: products.update permission or admin access required"
        )
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")
    
    if category.name is not None:
        # Check if another category with same name exists
        existing = db.query(Category).filter(Category.name == category.name, Category.id != category_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bu nomdagi kategoriya allaqachon mavjud")
        db_category.name = category.name
    
    if category.description is not None:
        db_category.description = category.description
    if category.icon is not None:
        db_category.icon = category.icon
    if category.display_order is not None:
        db_category.display_order = category.display_order
    
    db_category.updated_at = datetime.now()
    db.commit()
    db.refresh(db_category)
    return db_category


@app.delete("/api/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Delete a category"""
    if not seller:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if seller has products.delete permission OR is an admin
    from auth import has_permission
    has_products_delete = has_permission(db, seller, "products.delete")
    is_admin = is_admin_seller(db, seller)
    
    if not has_products_delete and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: products.delete permission or admin access required"
        )
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")
    
    # Check if category has products
    product_count = db.query(Product).filter(Product.category_id == category_id).count()
    if product_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Bu kategoriyada {product_count} ta mahsulot mavjud. Avval mahsulotlarni boshqa kategoriyaga ko'chiring yoki kategoriyani o'chiring."
        )
    
    db.delete(db_category)
    db.commit()
    return {"message": "Kategoriya muvaffaqiyatli o'chirildi"}


# ==================== PRODUCTS ====================

@app.post("/api/products/upload-image")
async def upload_product_image_temporary(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Upload product image file (for new products - doesn't require product_id)"""
    # Check permission but allow if seller is authenticated (even without explicit permission)
    # This allows image upload before product creation
    if not seller:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Optional: Check if seller has permission (but don't block if they don't)
    # The actual product creation will check permission
    try:
        from auth import has_permission
        if not has_permission(db, seller, "products.create"):
            # Log warning but allow upload (permission will be checked on product creation)
            print(f"[UPLOAD IMAGE] Warning: Seller {seller.id} doesn't have products.create permission, but allowing upload")
    except Exception as e:
        print(f"[UPLOAD IMAGE] Error checking permission: {e}")
        # Continue anyway - permission will be checked on product creation
    import os
    import uuid
    from pathlib import Path
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    
    # If filename is empty, generate one based on content type
    if not file.filename:
        # Determine extension from content type
        ext = ".jpg"  # default
        if file.content_type == "image/png":
            ext = ".png"
        elif file.content_type == "image/gif":
            ext = ".gif"
        elif file.content_type == "image/webp":
            ext = ".webp"
        file.filename = f"upload_{uuid.uuid4()}{ext}"
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Faqat rasm fayllari qabul qilinadi (jpg, png, gif, webp)")
    
    try:
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "products")
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, unique_filename)

        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Return image URL (without updating product - will be saved when product is created)
        image_url = f"/uploads/products/{unique_filename}"
        return {"url": image_url, "filename": unique_filename, "success": True}
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error uploading product image: {e}")
        print(f"Traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Rasm yuklashda xatolik: {str(e)}")


@app.post("/api/products/{product_id}/upload-image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.update"))
):
    """Upload product image file and update existing product"""
    import os
    import uuid
    from pathlib import Path
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    
    # If filename is empty, generate one based on content type
    if not file.filename:
        # Determine extension from content type
        ext = ".jpg"  # default
        if file.content_type == "image/png":
            ext = ".png"
        elif file.content_type == "image/gif":
            ext = ".gif"
        elif file.content_type == "image/webp":
            ext = ".webp"
        file.filename = f"upload_{uuid.uuid4()}{ext}"
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Faqat rasm fayllari qabul qilinadi (jpg, png, gif, webp)")
    
    try:
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "products")
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Update product image_url
        image_url = f"/uploads/products/{unique_filename}"
        product.image_url = image_url
        db.commit()
        db.refresh(product)
        
        return {"url": image_url, "filename": unique_filename, "success": True}
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Error uploading product image: {e}")
        print(f"Traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Rasm yuklashda xatolik: {str(e)}")


@app.post("/api/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate, 
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.create"))
):
    """Create a new product"""
    try:
        # Log received data for debugging
        try:
            product_dict = product.model_dump() if hasattr(product, 'model_dump') else product.dict()
            print(f"[CREATE PRODUCT] Received data: {json.dumps(product_dict, indent=2, default=str)}")
            print(f"[CREATE PRODUCT] Category in received data: '{product_dict.get('category')}'")
            print(f"[CREATE PRODUCT] Category type in received data: {type(product_dict.get('category'))}")
        except Exception as log_error:
            print(f"[CREATE PRODUCT] Error logging product data: {log_error}")
            import traceback
            traceback.print_exc()

        # Validate pieces_per_package before creating
        if product.pieces_per_package is None or product.pieces_per_package <= 0:
            error_msg = f"pieces_per_package 0 dan katta bo'lishi kerak. Olingan qiymat: {product.pieces_per_package}"
            print(f"[CREATE PRODUCT] Validation error: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)

        # Validate prices are not negative
        if product.cost_price is not None and product.cost_price < 0:
            raise HTTPException(status_code=400, detail="Narx manfiy bo'lishi mumkin emas (cost_price)")
        if product.wholesale_price is not None and product.wholesale_price < 0:
            raise HTTPException(status_code=400, detail="Narx manfiy bo'lishi mumkin emas (wholesale_price)")
        if product.retail_price is not None and product.retail_price < 0:
            raise HTTPException(status_code=400, detail="Narx manfiy bo'lishi mumkin emas (retail_price)")
        if product.regular_price is not None and product.regular_price < 0:
            raise HTTPException(status_code=400, detail="Narx manfiy bo'lishi mumkin emas (regular_price)")

        print(f"[CREATE PRODUCT] Calling ProductService.create_product...")
        print(f"[CREATE PRODUCT] Product category before service call: '{product.category}'")
        print(f"[CREATE PRODUCT] Product category type: {type(product.category)}")
        print(f"[CREATE PRODUCT] Product category is None: {product.category is None}")
        print(f"[CREATE PRODUCT] Product category == '': {product.category == ''}")
        created = ProductService.create_product(db, product)
        print(f"[CREATE PRODUCT] Product created with ID: {created.id}")
        print(f"[CREATE PRODUCT] Product category after creation: '{created.category}'")
        print(f"[CREATE PRODUCT] Product category after creation is None: {created.category is None}")

        # Ensure computed properties are available
        # Refresh to get all database-computed values
        db.refresh(created)

        # Calculate computed properties safely
        try:
            total_pieces = created.total_pieces
        except Exception:
            total_pieces = (created.packages_in_stock or 0) * (created.pieces_per_package or 1) + (created.pieces_in_stock or 0)

        try:
            total_value = created.total_value
        except Exception:
            avg_price = ((created.wholesale_price or 0.0) + (created.retail_price or 0.0) + (created.regular_price or 0.0)) / 3
            total_value = total_pieces * avg_price

        try:
            total_value_cost = created.total_value_cost
        except Exception:
            total_value_cost = total_pieces * (created.cost_price or 0.0)

        try:
            total_value_wholesale = created.total_value_wholesale
        except Exception:
            total_value_wholesale = total_pieces * (created.wholesale_price or 0.0)

        try:
            last_sold_date = created.last_sold_date
        except Exception:
            last_sold_date = None

        try:
            days_since_last_sale = created.days_since_last_sale
        except Exception:
            days_since_last_sale = None

        try:
            is_slow_moving = created.is_slow_moving
        except Exception:
            is_slow_moving = False

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions as-is (they will be handled by exception handler)
        print(f"[CREATE PRODUCT] HTTPException raised: {http_exc.detail}")
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        error_msg = f"Mahsulot yaratishda xatolik: {str(e)}"
        print(f"[CREATE PRODUCT] ERROR: {error_msg}")
        print(f"[CREATE PRODUCT] Traceback:\n{error_details}")
        # Raise HTTPException - it will be caught by exception handler and returned as JSON
        raise HTTPException(status_code=500, detail=error_msg)
    
    # Convert to response with computed properties
    # Ensure created_at and updated_at are set (SQLite may not set server_default immediately)
    now = datetime.now()
    if created.created_at is None:
        created.created_at = now
        db.commit()
        db.refresh(created)
    if created.updated_at is None:
        created.updated_at = now
        db.commit()
        db.refresh(created)
    
    product_dict = {
        "id": created.id,
        "name": created.name,
        "item_number": created.item_number,
        "barcode": created.barcode,
        "category": created.category,
        "brand": created.brand,
        "supplier": created.supplier,
        "received_date": created.received_date,
        "image_url": created.image_url,
        "location": created.location,
        "pieces_per_package": created.pieces_per_package or 1,
        "cost_price": max(0.0, created.cost_price or 0.0),
        "wholesale_price": max(0.0, created.wholesale_price or 0.0),
        "retail_price": max(0.0, created.retail_price or 0.0),
        "regular_price": max(0.0, created.regular_price or 0.0),
        "packages_in_stock": max(0, created.packages_in_stock or 0),
        "pieces_in_stock": max(0, created.pieces_in_stock or 0),
        "total_pieces": total_pieces,
        "total_value": total_value,
        "total_value_cost": total_value_cost,
        "total_value_wholesale": total_value_wholesale,
        "last_sold_date": last_sold_date,
        "days_since_last_sale": days_since_last_sale,
        "is_slow_moving": is_slow_moving,
        "product_url": f"/product/{created.id}",  # Customer app uchun URL
        "created_at": created.created_at or now,
        "updated_at": created.updated_at or now
    }
    
    # Try to create ProductResponse
    try:
        print(f"[CREATE PRODUCT] Creating ProductResponse from dict...")
        print(f"[CREATE PRODUCT] product_dict keys: {list(product_dict.keys())}")
        # Try Pydantic v2 first
        try:
            response_obj = ProductResponse.model_validate(product_dict)
            print(f"[CREATE PRODUCT] ProductResponse created successfully (v2)")
            
            # Broadcast new product via WebSocket
            try:
                await manager.broadcast({
                    "type": "new_product",
                    "data": product_dict
                })
                print(f"[CREATE PRODUCT] WebSocket broadcast sent for product {created.id}")
            except Exception as ws_error:
                print(f"[CREATE PRODUCT] WebSocket broadcast error: {ws_error}")
            
            # Send push notification to all customers
            try:
                NotificationService.send_new_product_notification(
                    db, created.id, created.name
                )
                print(f"[CREATE PRODUCT] Push notification sent for product {created.id}")
            except Exception as notif_error:
                print(f"[CREATE PRODUCT] Push notification error: {notif_error}")
            
            return response_obj
        except AttributeError:
            # Fallback to Pydantic v1
            try:
                response_obj = ProductResponse.from_orm(created)
                print(f"[CREATE PRODUCT] ProductResponse created successfully (v1 from_orm)")
                return response_obj
            except Exception as e1:
                print(f"[CREATE PRODUCT] from_orm failed: {e1}")
                import traceback
                print(f"[CREATE PRODUCT] from_orm traceback: {traceback.format_exc()}")
                # Try constructing directly
                try:
                    response_obj = ProductResponse(**product_dict)
                    print(f"[CREATE PRODUCT] ProductResponse created successfully (direct)")
                    
                    # Broadcast new product via WebSocket
                    try:
                        await manager.broadcast({
                            "type": "new_product",
                            "data": product_dict
                        })
                        print(f"[CREATE PRODUCT] WebSocket broadcast sent for product {created.id}")
                    except Exception as ws_error:
                        print(f"[CREATE PRODUCT] WebSocket broadcast error: {ws_error}")
                    
                    return response_obj
                except Exception as e2:
                    print(f"[CREATE PRODUCT] Direct construction failed: {e2}")
                    import traceback
                    print(f"[CREATE PRODUCT] Direct construction traceback: {traceback.format_exc()}")
                    # Raise HTTPException instead of returning dict - this ensures JSON response
                    raise HTTPException(
                        status_code=500, 
                        detail=f"ProductResponse yaratishda xatolik: {str(e2)}"
                    )
    except HTTPException:
        # Re-raise HTTPExceptions
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[CREATE PRODUCT] ERROR creating ProductResponse: {e}")
        print(f"[CREATE PRODUCT] Traceback:\n{error_details}")
        # Try constructing directly one more time
        try:
            response_obj = ProductResponse(**product_dict)
            print(f"[CREATE PRODUCT] ProductResponse created on retry")
            
            # Broadcast new product via WebSocket
            try:
                await manager.broadcast({
                    "type": "new_product",
                    "data": product_dict
                })
                print(f"[CREATE PRODUCT] WebSocket broadcast sent for product {created.id}")
            except Exception as ws_error:
                print(f"[CREATE PRODUCT] WebSocket broadcast error: {ws_error}")
            
            # Send push notification to all customers
            try:
                NotificationService.send_new_product_notification(
                    db, created.id, created.name
                )
                print(f"[CREATE PRODUCT] Push notification sent for product {created.id}")
            except Exception as notif_error:
                print(f"[CREATE PRODUCT] Push notification error: {notif_error}")
            
            return response_obj
        except Exception as retry_error:
            print(f"[CREATE PRODUCT] Retry also failed: {retry_error}")
            import traceback
            print(f"[CREATE PRODUCT] Retry traceback: {traceback.format_exc()}")
            # Raise HTTPException instead of returning dict - this ensures JSON response
            raise HTTPException(
                status_code=500, 
                detail=f"ProductResponse yaratishda xatolik: {str(retry_error)}"
            )


@app.get("/api/products", response_model=List[ProductResponse])
def get_products(
    skip: int = 0, 
    limit: int = Query(100, le=1000, ge=1),
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
    sort_order: Optional[str] = 'desc',
    db: Session = Depends(get_db),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Get all products with optional search, filtering, and sorting"""
    products = ProductService.get_products(db, skip=skip, limit=limit, search=search, 
                                      low_stock_only=low_stock_only, min_stock=min_stock,
                                      brand=brand, category=category, supplier=supplier, location=location,
                                      sort_by=sort_by, sort_order=sort_order)
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
                "item_number": p.item_number,
                "barcode": p.barcode,
                "category": p.category,
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
                "product_url": f"/product/{p.id}",  # Customer app uchun URL
                "packages_in_stock": max(0, p.packages_in_stock or 0),
                "pieces_in_stock": max(0, p.pieces_in_stock or 0),
                "total_pieces": p.total_pieces,
                "total_value": p.total_value,
                "total_value_cost": p.total_value_cost,
                "total_value_wholesale": p.total_value_wholesale,
                "last_sold_date": last_sold,
                "days_since_last_sale": days_since,
                "is_slow_moving": is_slow,
                "created_at": p.created_at if p.created_at is not None else datetime.now(),
                "updated_at": p.updated_at if p.updated_at is not None else datetime.now()
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
    category: Optional[str] = None,
    supplier: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Get total count of products matching filters"""
    count = ProductService.get_products_count(
        db,
        search=search,
        low_stock_only=low_stock_only,
        min_stock=min_stock,
        brand=brand,
        category=category,
        supplier=supplier,
        location=location
    )
    return {"count": count}


# Export endpoint must come BEFORE /api/products/{product_id} to avoid route conflict
@app.get("/api/products/export")
def export_products(
    db: Session = Depends(get_db),
    seller: Seller = Depends(get_seller_from_header)
):
    """Export products to Excel file"""
    if not seller:
        raise HTTPException(status_code=401, detail="Authentication required")
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
                "item_number": p.item_number,
                "barcode": p.barcode,
                "category": p.category,
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
                "created_at": p.created_at if p.created_at is not None else datetime.now(),
                "updated_at": p.updated_at if p.updated_at is not None else datetime.now()
            }
            result.append(ProductResponse.model_validate(product_dict))
        except Exception as e:
            print(f"Error processing product {p.id}: {e}")
            continue
    return result


@app.post("/api/products/bulk-delete")
def bulk_delete_products(
    product_ids: List[int], 
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.delete"))
):
    """Delete multiple products at once (requires products.delete permission)"""
    if not product_ids:
        raise HTTPException(status_code=400, detail="Mahsulot ID'lari ko'rsatilmagan")
    
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
        "item_number": product.item_number,
        "barcode": product.barcode,
        "category": product.category,
        "brand": product.brand,
        "supplier": product.supplier,
        "received_date": product.received_date,
        "image_url": product.image_url,
        "location": product.location,
        "pieces_per_package": product.pieces_per_package,
        "cost_price": max(0.0, product.cost_price or 0.0),  # Ensure cost_price is >= 0
        "product_url": f"/product/{product.id}",  # Customer app uchun URL
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
        "created_at": product.created_at if product.created_at is not None else datetime.now(),
        "updated_at": product.updated_at if product.updated_at is not None else datetime.now()
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
        "item_number": product_full.item_number,
        "barcode": product_full.barcode,
        "category": product_full.category,
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
def delete_product(
    product_id: int, 
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.delete"))
):
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


@app.post("/api/products/scan")
def scan_product_code(request: ScanCodeRequest, db: Session = Depends(get_db)):
    """
    Scan QR code or barcode to find product.
    Supports:
    - Barcode: Direct barcode match
    - QR Code: PRODUCT_{id}_{name} format or product ID
    - Deep link: product/{id} format
    """
    from models import Product
    code = request.code.strip()
    
    if not code:
        raise HTTPException(status_code=400, detail="Kod bo'sh bo'lishi mumkin emas")
    
    # Try to find by barcode first
    product = db.query(Product).filter(Product.barcode == code).first()
    if product:
        return {
            "success": True,
            "product": ProductService.product_to_response(product),
            "match_type": "barcode"
        }
    
    # Try to parse QR code format: PRODUCT_{id}_{name}
    if code.startswith("PRODUCT_"):
        try:
            parts = code.split("_", 2)
            if len(parts) >= 2:
                product_id = int(parts[1])
                product = ProductService.get_product(db, product_id)
                if product:
                    return {
                        "success": True,
                        "product": ProductService.product_to_response(product),
                        "match_type": "qr_code"
                    }
        except (ValueError, IndexError):
            pass
    
    # Try to parse deep link format: product/{id} or /product/{id}
    import re
    product_match = re.search(r'product[/_](\d+)', code, re.IGNORECASE)
    if product_match:
        try:
            product_id = int(product_match.group(1))
            product = ProductService.get_product(db, product_id)
            if product:
                return {
                    "success": True,
                    "product": ProductService.product_to_response(product),
                    "match_type": "deep_link"
                }
        except ValueError:
            pass
    
    # Try direct product ID
    try:
        product_id = int(code)
        product = ProductService.get_product(db, product_id)
        if product:
            return {
                "success": True,
                "product": ProductService.product_to_response(product),
                "match_type": "product_id"
            }
    except ValueError:
        pass
    
    # Not found
    raise HTTPException(
        status_code=404,
        detail=f"Ushbu kod bo'yicha mahsulot topilmadi: {code}"
    )


# ==================== PRODUCT IMAGES ====================

@app.post("/api/products/{product_id}/images", response_model=ProductImageResponse)
async def add_product_image(
    product_id: int,
    file: UploadFile = File(...),
    display_order: int = Form(0),
    is_primary: bool = Form(False),
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.update"))
):
    """Add an additional image to a product"""
    import os
    import uuid
    from pathlib import Path
    from models import ProductImage
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    
    if not file.filename:
        ext = ".jpg"
        if file.content_type == "image/png":
            ext = ".png"
        elif file.content_type == "image/gif":
            ext = ".gif"
        elif file.content_type == "image/webp":
            ext = ".webp"
        file.filename = f"upload_{uuid.uuid4()}{ext}"
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Faqat rasm fayllari qabul qilinadi")
    
    try:
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "products")
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # If this is marked as primary, unset other primary images
        if is_primary:
            db.query(ProductImage).filter(
                ProductImage.product_id == product_id,
                ProductImage.is_primary == True
            ).update({"is_primary": False})
        
        # Create ProductImage record
        image_url = f"/uploads/products/{unique_filename}"
        product_image = ProductImage(
            product_id=product_id,
            image_url=image_url,
            display_order=display_order,
            is_primary=is_primary
        )
        
        db.add(product_image)
        db.commit()
        db.refresh(product_image)
        
        return {
            "id": product_image.id,
            "product_id": product_image.product_id,
            "image_url": product_image.image_url,
            "display_order": product_image.display_order,
            "is_primary": product_image.is_primary,
            "created_at": product_image.created_at
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.print_exc()
        print(f"Error uploading product image: {e}")
        raise HTTPException(status_code=500, detail=f"Rasm yuklashda xatolik: {str(e)}")


@app.get("/api/products/{product_id}/images", response_model=List[ProductImageResponse])
def get_product_images(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get all images for a product"""
    from models import ProductImage
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    
    images = db.query(ProductImage).filter(
        ProductImage.product_id == product_id
    ).order_by(ProductImage.display_order.asc(), ProductImage.created_at.asc()).all()
    
    return [
        {
            "id": img.id,
            "product_id": img.product_id,
            "image_url": img.image_url,
            "display_order": img.display_order,
            "is_primary": img.is_primary,
            "created_at": img.created_at
        }
        for img in images
    ]


@app.post("/api/products/{product_id}/images/from-url", response_model=ProductImageResponse)
def add_product_image_from_url(
    product_id: int,
    image_data: ProductImageCreate,
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.update"))
):
    """Add product image from URL (for images already uploaded)"""
    from models import ProductImage
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    
    # Verify product_id matches
    if image_data.product_id != product_id:
        raise HTTPException(status_code=400, detail="product_id mos kelmayapti")
    
    try:
        # If this is marked as primary, unset other primary images
        if image_data.is_primary:
            db.query(ProductImage).filter(
                ProductImage.product_id == product_id,
                ProductImage.is_primary == True
            ).update({"is_primary": False})
        
        # Create ProductImage record
        product_image = ProductImage(
            product_id=product_id,
            image_url=image_data.image_url,
            display_order=image_data.display_order or 0,
            is_primary=image_data.is_primary or False
        )
        
        db.add(product_image)
        db.commit()
        db.refresh(product_image)
        
        return {
            "id": product_image.id,
            "product_id": product_image.product_id,
            "image_url": product_image.image_url,
            "display_order": product_image.display_order,
            "is_primary": product_image.is_primary,
            "created_at": product_image.created_at
        }
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Error creating product image from URL: {e}")
        print(f"Traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Rasm yaratishda xatolik: {str(e)}")


@app.delete("/api/products/{product_id}/images/{image_id}")
def delete_product_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.update"))
):
    """Delete a product image"""
    import os
    from models import ProductImage
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    
    product_image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id
    ).first()
    
    if not product_image:
        raise HTTPException(status_code=404, detail="Rasm topilmadi")
    
    try:
        # Delete physical file
        if product_image.image_url:
            file_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                product_image.image_url.lstrip('/')
            )
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Delete database record
        db.delete(product_image)
        db.commit()
        
        return {"success": True, "message": "Rasm o'chirildi"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting product image: {e}")
        raise HTTPException(status_code=500, detail=f"Rasmni o'chirishda xatolik: {str(e)}")


@app.put("/api/products/{product_id}/images/{image_id}", response_model=ProductImageResponse)
def update_product_image(
    product_id: int,
    image_id: int,
    display_order: Optional[int] = Body(None),
    is_primary: Optional[bool] = Body(None),
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.update"))
):
    """Update product image (order or primary status)"""
    from models import ProductImage
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    
    product_image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id
    ).first()
    
    if not product_image:
        raise HTTPException(status_code=404, detail="Rasm topilmadi")
    
    try:
        # If setting as primary, unset other primary images
        if is_primary is not None and is_primary:
            db.query(ProductImage).filter(
                ProductImage.product_id == product_id,
                ProductImage.id != image_id,
                ProductImage.is_primary == True
            ).update({"is_primary": False})
        
        if display_order is not None:
            product_image.display_order = display_order
        if is_primary is not None:
            product_image.is_primary = is_primary
        
        db.commit()
        db.refresh(product_image)
        
        return {
            "id": product_image.id,
            "product_id": product_image.product_id,
            "image_url": product_image.image_url,
            "display_order": product_image.display_order,
            "is_primary": product_image.is_primary,
            "created_at": product_image.created_at
        }
    except Exception as e:
        db.rollback()
        print(f"Error updating product image: {e}")
        raise HTTPException(status_code=500, detail=f"Rasmni yangilashda xatolik: {str(e)}")


# ==================== PRODUCT REVIEWS ====================

@app.post("/api/products/{product_id}/reviews", response_model=ProductReviewResponse)
def create_product_review(
    product_id: int,
    review: ProductReviewCreate,
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID")
):
    """Create a product review/rating"""
    from models import ProductReview
    
    # Verify product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    
    # Get customer info
    customer_name = "Anonim mijoz"
    is_verified = False
    
    if customer_id:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if customer:
            customer_name = customer.name
            # Check if customer has purchased this product (verified purchase)
            from models import Order, OrderItem
            orders = db.query(Order).filter(
                Order.customer_id == customer_id,
                Order.status == "completed"
            ).join(OrderItem).filter(
                OrderItem.product_id == product_id
            ).all()
            is_verified = len(orders) > 0
    
    # Check if customer already reviewed this product
    if customer_id:
        existing_review = db.query(ProductReview).filter(
            ProductReview.product_id == product_id,
            ProductReview.customer_id == customer_id,
            ProductReview.is_deleted == False
        ).first()
        if existing_review:
            raise HTTPException(status_code=400, detail="Bu mahsulotga allaqachon baho berilgan")
    
    try:
        product_review = ProductReview(
            product_id=product_id,
            customer_id=customer_id,
            customer_name=customer_name,
            rating=review.rating,
            comment=review.comment,
            is_verified_purchase=is_verified
        )
        
        db.add(product_review)
        db.commit()
        db.refresh(product_review)
        
        return {
            "id": product_review.id,
            "product_id": product_review.product_id,
            "customer_id": product_review.customer_id,
            "customer_name": product_review.customer_name,
            "rating": product_review.rating,
            "comment": product_review.comment,
            "is_verified_purchase": product_review.is_verified_purchase,
            "helpful_count": product_review.helpful_count,
            "is_approved": product_review.is_approved,
            "created_at": product_review.created_at,
            "updated_at": product_review.updated_at
        }
    except Exception as e:
        db.rollback()
        print(f"Error creating product review: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Baholash yozishda xatolik: {str(e)}")


@app.get("/api/products/{product_id}/reviews", response_model=List[ProductReviewResponse])
def get_product_reviews(
    product_id: int,
    skip: int = 0,
    limit: int = 50,
    sort_by: Optional[str] = "created_at",  # created_at, rating, helpful
    sort_order: Optional[str] = "desc",
    db: Session = Depends(get_db)
):
    """Get all reviews for a product"""
    from models import ProductReview
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    
    query = db.query(ProductReview).filter(
        ProductReview.product_id == product_id,
        ProductReview.is_deleted == False,
        ProductReview.is_approved == True
    )
    
    # Sort
    if sort_by == "rating":
        if sort_order == "desc":
            query = query.order_by(ProductReview.rating.desc(), ProductReview.created_at.desc())
        else:
            query = query.order_by(ProductReview.rating.asc(), ProductReview.created_at.desc())
    elif sort_by == "helpful":
        if sort_order == "desc":
            query = query.order_by(ProductReview.helpful_count.desc(), ProductReview.created_at.desc())
        else:
            query = query.order_by(ProductReview.helpful_count.asc(), ProductReview.created_at.desc())
    else:  # created_at
        if sort_order == "desc":
            query = query.order_by(ProductReview.created_at.desc())
        else:
            query = query.order_by(ProductReview.created_at.asc())
    
    reviews = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "product_id": r.product_id,
            "customer_id": r.customer_id,
            "customer_name": r.customer_name,
            "rating": r.rating,
            "comment": r.comment,
            "is_verified_purchase": r.is_verified_purchase,
            "helpful_count": r.helpful_count,
            "is_approved": r.is_approved,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        }
        for r in reviews
    ]


@app.post("/api/products/{product_id}/reviews/{review_id}/helpful")
def mark_review_helpful(
    product_id: int,
    review_id: int,
    helpful: bool = Body(True),
    db: Session = Depends(get_db)
):
    """Mark a review as helpful or not helpful"""
    from models import ProductReview
    
    product_review = db.query(ProductReview).filter(
        ProductReview.id == review_id,
        ProductReview.product_id == product_id,
        ProductReview.is_deleted == False
    ).first()
    
    if not product_review:
        raise HTTPException(status_code=404, detail="Baholash topilmadi")
    
    try:
        if helpful:
            product_review.helpful_count += 1
        else:
            product_review.helpful_count = max(0, product_review.helpful_count - 1)
        
        db.commit()
        db.refresh(product_review)
        
        return {
            "success": True,
            "helpful_count": product_review.helpful_count,
            "message": "Baholash foydali deb belgilandi" if helpful else "Baholash foydali emas deb belgilandi"
        }
    except Exception as e:
        db.rollback()
        print(f"Error marking review as helpful: {e}")
        raise HTTPException(status_code=500, detail=f"Xatolik: {str(e)}")


@app.get("/api/products/{product_id}/rating-summary")
def get_product_rating_summary(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get rating summary (average, count, distribution) for a product"""
    from models import ProductReview
    from sqlalchemy import func
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    
    reviews = db.query(ProductReview).filter(
        ProductReview.product_id == product_id,
        ProductReview.is_deleted == False,
        ProductReview.is_approved == True
    ).all()
    
    if not reviews:
        return {
            "average_rating": 0.0,
            "total_reviews": 0,
            "rating_distribution": {
                "5": 0,
                "4": 0,
                "3": 0,
                "2": 0,
                "1": 0
            }
        }
    
    total_rating = sum(r.rating for r in reviews)
    average_rating = total_rating / len(reviews)
    
    rating_distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
    for review in reviews:
        rating_distribution[str(review.rating)] += 1
    
    return {
        "average_rating": round(average_rating, 1),
        "total_reviews": len(reviews),
        "rating_distribution": rating_distribution
    }


# ==================== SEARCH HISTORY ====================

@app.post("/api/search-history", response_model=SearchHistoryResponse)
def create_search_history(
    search: SearchHistoryCreate,
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID")
):
    """Save a search query to history"""
    from models import SearchHistory
    
    # Don't save empty queries
    if not search.search_query or not search.search_query.strip():
        raise HTTPException(status_code=400, detail="Qidiruv so'rovi bo'sh bo'lishi mumkin emas")
    
    try:
        # Check if same search exists recently (within last hour) to avoid duplicates
        from datetime import datetime, timedelta, timezone
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        
        existing = db.query(SearchHistory).filter(
            SearchHistory.customer_id == customer_id,
            SearchHistory.search_query.ilike(search.search_query.strip()),
            SearchHistory.created_at >= one_hour_ago
        ).first()
        
        if existing:
            # Update existing record timestamp
            existing.created_at = datetime.now(timezone.utc)
            existing.result_count = search.result_count
            db.commit()
            db.refresh(existing)
            return {
                "id": existing.id,
                "customer_id": existing.customer_id,
                "search_query": existing.search_query,
                "result_count": existing.result_count,
                "created_at": existing.created_at
            }
        
        # Create new search history entry
        search_history = SearchHistory(
            customer_id=customer_id,
            search_query=search.search_query.strip(),
            result_count=search.result_count
        )
        
        db.add(search_history)
        db.commit()
        db.refresh(search_history)
        
        return {
            "id": search_history.id,
            "customer_id": search_history.customer_id,
            "search_query": search_history.search_query,
            "result_count": search_history.result_count,
            "created_at": search_history.created_at
        }
    except Exception as e:
        db.rollback()
        print(f"Error creating search history: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Qidiruv tarixini saqlashda xatolik: {str(e)}")


@app.get("/api/search-history", response_model=List[SearchHistoryResponse])
def get_search_history(
    limit: int = Query(20, le=50, ge=1),
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Get recent search history for customer"""
    from models import SearchHistory
    
    # Convert customer_id from header string to int
    customer_id = None
    if x_customer_id:
        try:
            customer_id = int(x_customer_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    if not customer_id:
        return []
    
    try:
        query = db.query(SearchHistory).filter(
            SearchHistory.customer_id == customer_id
        ).order_by(SearchHistory.created_at.desc()).limit(limit)
        
        history = query.all()
        
        return [
            {
                "id": h.id,
                "customer_id": h.customer_id,
                "search_query": h.search_query,
                "result_count": h.result_count,
                "created_at": h.created_at
            }
            for h in history
        ]
    except Exception as e:
        print(f"Error getting search history: {e}")
        return []


@app.delete("/api/search-history/{history_id}")
def delete_search_history(
    history_id: int,
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID")
):
    """Delete a search history entry"""
    from models import SearchHistory
    
    search_history = db.query(SearchHistory).filter(
        SearchHistory.id == history_id,
        SearchHistory.customer_id == customer_id
    ).first()
    
    if not search_history:
        raise HTTPException(status_code=404, detail="Qidiruv tarixi topilmadi")
    
    try:
        db.delete(search_history)
        db.commit()
        return {"success": True, "message": "Qidiruv tarixi o'chirildi"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting search history: {e}")
        raise HTTPException(status_code=500, detail=f"Qidiruv tarixini o'chirishda xatolik: {str(e)}")


@app.delete("/api/search-history")
def clear_search_history(
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID")
):
    """Clear all search history for customer"""
    from models import SearchHistory
    
    try:
        db.query(SearchHistory).filter(
            SearchHistory.customer_id == customer_id
        ).delete()
        db.commit()
        return {"success": True, "message": "Barcha qidiruv tarixi o'chirildi"}
    except Exception as e:
        db.rollback()
        print(f"Error clearing search history: {e}")
        raise HTTPException(status_code=500, detail=f"Qidiruv tarixini tozalashda xatolik: {str(e)}")


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
                    "username": customer.username,  # Include username field
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


@app.get("/api/customers/{customer_id}/stats", response_model=CustomerStatsResponse)
def get_customer_stats(customer_id: int, db: Session = Depends(get_db)):
    """Get statistics for a specific customer (orders & sales)"""
    # Ensure customer exists
    customer = CustomerService.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    stats = CustomerService.get_customer_stats(db, customer_id)
    return stats


@app.put("/api/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: int, customer: CustomerUpdate, db: Session = Depends(get_db)):
    """Update a customer"""
    # Get old customer data to check if customer_type changed
    old_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    old_customer_type = old_customer.customer_type if old_customer else None
    
    updated = CustomerService.update_customer(db, customer_id, customer)
    if not updated:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # If customer type changed, notify customer app via WebSocket
    if old_customer_type and customer.customer_type and old_customer_type != customer.customer_type:
        try:
            await manager.send_to_customer(customer_id, {
                "type": "customer_type_changed",
                "customer_id": customer_id,
                "old_type": old_customer_type,
                "new_type": customer.customer_type
            })
            print(f"[WebSocket] Notified customer {customer_id} about type change: {old_customer_type} -> {customer.customer_type}")
        except Exception as e:
            print(f"[WebSocket] Error notifying customer {customer_id}: {e}")
    
    return CustomerService.customer_to_response(updated)


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
        import traceback
        print(f"Error deleting customer {customer_id}: {str(e)}")
        traceback.print_exc()
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


# Export endpoint must come BEFORE /api/sales/{sale_id} to avoid route conflict
@app.get("/api/sales/export")
def export_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    seller: Seller = Depends(get_seller_from_header)
):
    """Export sales to Excel file"""
    if not seller:
        raise HTTPException(status_code=401, detail="Authentication required")
    file_path = ExcelService.export_sales(db, start_date, end_date)
    filename = os.path.basename(file_path)
    return FileResponse(
        file_path, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename
    )


@app.get("/api/sales/{sale_id}", response_model=SaleResponse)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    """Get a specific sale"""
    sale = SaleService.get_sale(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return SaleService.sale_to_response(sale)


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
def update_settings(
    settings_update: SettingsUpdate, 
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("admin.settings"))
):
    """Update application settings (Admin only)"""
    settings = SettingsService.update_settings(db, settings_update)
    return SettingsResponse.model_validate(settings)


@app.post("/api/sellers/{seller_id}/upload-image")
async def upload_seller_image(
    seller_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("admin.sellers"))
):
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
    
    # If filename is empty, generate one based on content type
    if not file.filename:
        ext = ".jpg"  # default
        if file.content_type == "image/png":
            ext = ".png"
        elif file.content_type == "image/gif":
            ext = ".gif"
        elif file.content_type == "image/webp":
            ext = ".webp"
        file.filename = f"seller_{seller_id}_{uuid.uuid4()}{ext}"
    
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
async def upload_logo(
    file: UploadFile = File(...),
    seller: Seller = Depends(require_permission("admin.settings"))
):
    """Upload logo image file (Admin only)"""
    import os
    import uuid
    from pathlib import Path
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}
    
    # If filename is empty, generate one based on content type
    if not file.filename:
        ext = ".png"  # default for logo
        if file.content_type == "image/jpeg" or file.content_type == "image/jpg":
            ext = ".jpg"
        elif file.content_type == "image/gif":
            ext = ".gif"
        elif file.content_type == "image/webp":
            ext = ".webp"
        elif file.content_type == "image/svg+xml":
            ext = ".svg"
        file.filename = f"logo_{uuid.uuid4()}{ext}"
    
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
def get_sale_receipt(
    sale_id: int,
    db: Session = Depends(get_db),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Generate PDF receipt for a sale"""
    # Receipt uchun autentifikatsiya shart emas (admin panel va sotuvchilar uchun)
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

@app.post("/api/auth/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login seller or customer (tries customer first, then seller)"""
    # Try customer login first
    customer_result = AuthService.login_customer(db, credentials.username, credentials.password)
    
    if customer_result.get("success"):
        # Customer login successful
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "token": customer_result.get("token"),
                "user": customer_result.get("user"),
                "customer_id": customer_result.get("customer_id"),
                "user_type": "customer"
            }
        )
    
    # Try seller login if customer login failed
    seller_result = AuthService.login(db, credentials.username, credentials.password)
    
    if seller_result.get("success"):
        # Seller login successful
        return LoginResponse(
            success=seller_result["success"],
            seller_id=seller_result.get("seller_id"),
            seller_name=seller_result.get("seller_name"),
            token=seller_result.get("token"),
            permissions=seller_result.get("permissions", []),
            message=seller_result.get("message"),
            role_id=seller_result.get("role_id"),
            role_name=seller_result.get("role_name")
        )
    
    # Both failed
    return JSONResponse(
        status_code=401,
        content={
            "success": False,
            "detail": "Noto'g'ri login yoki parol"
        }
    )


@app.post("/api/auth/send-otp")
def send_otp(request: SendOtpRequest, db: Session = Depends(get_db)):
    """Send OTP code to customer's phone (code is logged in server for testing)"""
    from models import Customer
    phone = request.phone.strip()

    if not phone:
        raise HTTPException(status_code=400, detail="Telefon raqamni kiriting")

    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Ushbu telefon raqam bo'yicha mijoz topilmadi")

    # Generate 4-digit OTP code
    import random
    code = f"{random.randint(1000, 9999)}"

    # Set expiry time (5 minutes from now)
    expires_at = get_uzbekistan_now() + timedelta(minutes=5)

    otp = OtpCode(
        customer_id=customer.id,
        code=code,
        purpose="phone_verification",
        expires_at=expires_at,
    )
    db.add(otp)
    db.commit()
    db.refresh(otp)

    # Log OTP code for testing instead of sending SMS
    print("======================================")
    print("=== OTP KODI YUBORILDI (TEST REJIM) ===")
    print(f"Mijoz ID: {customer.id}")
    print(f"Telefon: {customer.phone}")
    print(f"OTP kod: {code}")
    print(f"Amal qilish muddati: {expires_at}")
    print("======================================")

    return {
        "success": True,
        "message": "Tasdiqlash kodi telefon raqamingizga yuborildi (test rejimida server logida ko'rinadi).",
    }


@app.post("/api/auth/verify-otp")
def verify_otp(request: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Verify OTP code for customer's phone"""
    from models import Customer
    phone = request.phone.strip()
    code = request.code.strip()

    if not phone or not code:
        raise HTTPException(status_code=400, detail="Telefon raqam va kodni kiriting")

    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Ushbu telefon raqam bo'yicha mijoz topilmadi")

    # Get latest unused OTP for this customer
    otp = (
        db.query(OtpCode)
        .filter(
            OtpCode.customer_id == customer.id,
            OtpCode.is_used == False,
            OtpCode.purpose == "phone_verification",
        )
        .order_by(OtpCode.created_at.desc())
        .first()
    )

    if not otp:
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi topilmadi yoki allaqachon ishlatilgan")

    now = get_uzbekistan_now()
    if now > otp.expires_at:
        otp.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi eskirgan. Iltimos, yangi kod oling")

    if otp.code != code:
        raise HTTPException(status_code=400, detail="Tasdiqlash kodi noto'g'ri")

    # Mark OTP as used
    otp.is_used = True
    db.commit()

    # Generate token for login (similar to social-login)
    token = AuthService.generate_token()

    # Return token and user data for login
    user_payload = {
        "customer_id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
    }

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "token": token,
            "user": user_payload,
            "customer_id": customer.id,
            "user_type": "customer",
            "message": "Telefon raqami muvaffaqiyatli tasdiqlandi va kirildi.",
        },
    )


# ==================== PUSH NOTIFICATIONS ====================

@app.post("/api/notifications/register-token")
def register_device_token(
    request: DeviceTokenRequest,
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID")
):
    """Register or update device token for push notifications"""
    if not customer_id:
        raise HTTPException(status_code=401, detail="Mijoz ID talab qilinadi")
    
    # Check if token already exists
    existing_token = db.query(CustomerDeviceToken).filter(
        CustomerDeviceToken.token == request.token
    ).first()
    
    if existing_token:
        # Update existing token
        existing_token.customer_id = customer_id
        existing_token.device_id = request.device_id
        existing_token.platform = request.platform
        existing_token.is_active = True
        db.commit()
        db.refresh(existing_token)
        return {
            "success": True,
            "message": "Token yangilandi",
            "token_id": existing_token.id
        }
    else:
        # Create new token
        device_token = CustomerDeviceToken(
            customer_id=customer_id,
            token=request.token,
            device_id=request.device_id,
            platform=request.platform,
            is_active=True
        )
        db.add(device_token)
        db.commit()
        db.refresh(device_token)
        return {
            "success": True,
            "message": "Token ro'yxatdan o'tkazildi",
            "token_id": device_token.id
        }


@app.delete("/api/notifications/unregister-token")
def unregister_device_token(
    token: str = Query(..., description="Device token to unregister"),
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID")
):
    """Unregister device token"""
    if not customer_id:
        raise HTTPException(status_code=401, detail="Mijoz ID talab qilinadi")
    
    device_token = db.query(CustomerDeviceToken).filter(
        CustomerDeviceToken.token == token,
        CustomerDeviceToken.customer_id == customer_id
    ).first()
    
    if not device_token:
        raise HTTPException(status_code=404, detail="Token topilmadi")
    
    device_token.is_active = False
    db.commit()
    
    return {"success": True, "message": "Token o'chirildi"}


@app.post("/api/notifications/send")
def send_notification(
    request: SendNotificationRequest,
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("notifications.send"))
):
    """Send push notification to customers (admin only)"""
    if request.customer_ids:
        # Send to specific customers
        results = []
        for customer_id in request.customer_ids:
            result = NotificationService.send_to_customer(
                db, customer_id, request.title, request.body, request.data
            )
            results.append({"customer_id": customer_id, **result})
        return {"success": True, "results": results}
    else:
        # Send to all customers
        result = NotificationService.send_to_all_customers(
            db, request.title, request.body, request.data
        )
        return result


@app.post("/api/auth/social-login")
def social_login(request: SocialLoginRequest, db: Session = Depends(get_db)):
    """
    Social login for customers (Google/Facebook).
    NOTE: Actual Google/Facebook token verification is handled on mobile side.
    Backend only links/creates customer by phone and returns same shape as /api/auth/login (customer branch).
    """
    from models import Customer

    provider = (request.provider or "").strip().lower()
    if provider not in ("google", "facebook"):
        raise HTTPException(status_code=400, detail="Noto'g'ri provider. Faqat 'google' yoki 'facebook' qo'llab-quvvatlanadi")

    phone = (request.phone or "").strip()
    name = (request.name or "").strip() or "Social foydalanuvchi"

    if not phone:
        raise HTTPException(status_code=400, detail="Telefon raqam talab qilinadi (social login uchun)")

    # Try to find existing customer by phone
    customer = db.query(Customer).filter(Customer.phone == phone).first()

    # If not found, create new customer with default type
    if not customer:
        try:
            customer_create = CustomerCreate(
                name=name,
                phone=phone,
            )
            customer = CustomerService.create_customer(db, customer_create)
        except Exception as e:
            print(f"[SOCIAL_LOGIN] Error creating customer: {e}")
            raise HTTPException(status_code=400, detail="Mijoz yaratishda xatolik")

    # Generate token (reuse AuthService)
    token = AuthService.generate_token()

    # Log for debugging
    print("======================================")
    print("=== SOCIAL LOGIN (TEST) ===")
    print(f"Provider: {provider}")
    print(f"Customer ID: {customer.id}")
    print(f"Name: {customer.name}")
    print(f"Phone: {customer.phone}")
    print("======================================")

    user_payload = {
        "customer_id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
    }

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "token": token,
            "user": user_payload,
            "customer_id": customer.id,
            "user_type": "customer",
            "provider": provider,
        },
    )


@app.post("/api/help-requests")
async def create_help_request(
    request_data: dict = Body(...),
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Create a help request from customer app (sent to admin)"""
    from models import Settings, Customer, HelpRequest
    
    # Try to get customer info from database if customer_id provided
    customer_id = None
    customer_name = 'Noma\'lum'
    customer_username = 'Noma\'lum'
    customer_phone = 'Noma\'lum'
    
    if x_customer_id:
        try:
            customer_id = int(x_customer_id)
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if customer:
                customer_name = customer.name or 'Noma\'lum'
                customer_username = customer.username or 'Noma\'lum'
                customer_phone = customer.phone or 'Noma\'lum'
        except (ValueError, Exception) as e:
            print(f"Error fetching customer: {e}")
    
    # Override with request data if provided
    customer_username = request_data.get('username', customer_username)
    customer_phone = request_data.get('phone', customer_phone)
    message = request_data.get('message', '')
    issue_type = request_data.get('issue_type', 'other')  # login, password, other, order, product
    
    if not message.strip():
        raise HTTPException(status_code=400, detail="Xabar matnini kiriting")
    
    # Save help request to database
    help_request = HelpRequest(
        customer_id=customer_id,
        customer_name=customer_name,
        username=customer_username,
        phone=customer_phone,
        message=message,
        issue_type=issue_type,
        status="pending"
    )
    db.add(help_request)
    db.commit()
    db.refresh(help_request)
    
    print(f"[Help Request] Saved to database with ID {help_request.id}")
    
    # Format help request message
    help_message = f"""
=== YORDAM SO'ROVI ===
ID: {help_request.id}
Vaqt: {get_uzbekistan_now().strftime('%Y-%m-%d %H:%M:%S')}
Mijoz ID: {customer_id or 'Noma\'lum'}
Mijoz ismi: {customer_name}
Mijoz username: {customer_username}
Telefon: {customer_phone}
Muammo turi: {issue_type}
Xabar: {message}
"""
    
    # Try to send via WebSocket to admin panel (if admin is online)
    try:
        await manager.broadcast({
            "type": "help_request",
            "data": {
                "id": help_request.id,
                "customer_id": customer_id,
                "customer_name": customer_name,
                "username": customer_username,
                "phone": customer_phone,
                "message": message,
                "issue_type": issue_type,
                "status": "pending",
                "timestamp": get_uzbekistan_now().isoformat()
            }
        })
        print(f"[Help Request] WebSocket notification sent for customer {customer_id}")
    except Exception as e:
        print(f"Error broadcasting help request: {e}")
        import traceback
        traceback.print_exc()
        # Continue even if WebSocket fails - request is saved in database
    
    # Log to console
    print("=" * 50)
    print(help_message)
    print("=" * 50)
    
    return {
        "success": True,
        "message": "Yordam so'rovi yuborildi. Admin tez orada siz bilan bog'lanadi.",
        "request_id": help_request.id
    }


@app.get("/api/help-requests")
def get_help_requests(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Get help requests (admin only)"""
    from models import HelpRequest
    from sqlalchemy import desc
    
    if not seller:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    query = db.query(HelpRequest)
    
    if status:
        query = query.filter(HelpRequest.status == status)
    
    if customer_id:
        query = query.filter(HelpRequest.customer_id == customer_id)
    
    total = query.count()
    requests = query.order_by(desc(HelpRequest.created_at)).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "requests": [
            {
                "id": req.id,
                "customer_id": req.customer_id,
                "customer_name": req.customer_name,
                "username": req.username,
                "phone": req.phone,
                "message": req.message,
                "issue_type": req.issue_type,
                "status": req.status,
                "resolved_by": req.resolved_by,
                "resolved_at": to_uzbekistan_time(req.resolved_at).isoformat() if req.resolved_at else None,
                "notes": req.notes,
                "created_at": to_uzbekistan_time(req.created_at).isoformat() if req.created_at else None,
                "updated_at": to_uzbekistan_time(req.updated_at).isoformat() if req.updated_at else None
            }
            for req in requests
        ]
    }


@app.put("/api/help-requests/{request_id}")
def update_help_request(
    request_id: int,
    request_data: dict = Body(...),
    db: Session = Depends(get_db),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Update help request status (admin only)"""
    from models import HelpRequest
    
    if not seller:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    help_request = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not help_request:
        raise HTTPException(status_code=404, detail="Help request not found")
    
    status = request_data.get('status')
    notes = request_data.get('notes')
    
    if status:
        help_request.status = status
        if status in ['resolved', 'closed']:
            help_request.resolved_by = seller.id
            help_request.resolved_at = get_uzbekistan_now()
    
    if notes is not None:
        help_request.notes = notes
    
    db.commit()
    db.refresh(help_request)
    
    return {
        "id": help_request.id,
        "status": help_request.status,
        "notes": help_request.notes,
        "resolved_by": help_request.resolved_by,
        "resolved_at": to_uzbekistan_time(help_request.resolved_at).isoformat() if help_request.resolved_at else None
    }


# ==================== CHAT/SUPPORT ====================

@app.get("/api/conversations", response_model=ConversationListResponse)
def get_conversations(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID"),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Get conversations list (for customer or admin)"""
    from models import Conversation, ChatMessage
    
    query = db.query(Conversation)
    
    # Filter by customer or admin
    if customer_id:
        # Customer view: only their conversations, not archived
        query = query.filter(
            Conversation.customer_id == customer_id,
            Conversation.is_customer_archived == False
        )
    elif seller:
        # Admin view: all conversations, optionally filter by status
        if status:
            query = query.filter(Conversation.status == status)
        query = query.filter(Conversation.is_admin_archived == False)
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Order by last message time
    query = query.order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
    
    total = query.count()
    conversations = query.offset(skip).limit(limit).all()
    
    # Build response with unread count and last message
    conversation_responses = []
    for conv in conversations:
        # Get unread count
        unread_query = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conv.id,
            ChatMessage.is_read == False
        )
        if customer_id:
            unread_query = unread_query.filter(ChatMessage.sender_type == "admin")
        elif seller:
            unread_query = unread_query.filter(ChatMessage.sender_type == "customer")
        
        unread_count = unread_query.count()
        
        # Get last message
        last_message = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conv.id
        ).order_by(ChatMessage.created_at.desc()).first()
        
        last_message_response = None
        if last_message:
            last_message_response = ChatMessageResponse(
                id=last_message.id,
                conversation_id=last_message.conversation_id,
                sender_type=last_message.sender_type,
                sender_id=last_message.sender_id,
                sender_name=last_message.sender_name,
                message=last_message.message,
                is_read=last_message.is_read,
                read_at=last_message.read_at,
                created_at=last_message.created_at
            )
        
        # Get customer and seller names
        customer_name = conv.customer.name if conv.customer else None
        seller_name = conv.seller.name if conv.seller else None
        
        conversation_responses.append(ConversationResponse(
            id=conv.id,
            customer_id=conv.customer_id,
            customer_name=customer_name,
            seller_id=conv.seller_id,
            seller_name=seller_name,
            subject=conv.subject,
            status=conv.status,
            is_customer_archived=conv.is_customer_archived,
            is_admin_archived=conv.is_admin_archived,
            unread_count=unread_count,
            last_message=last_message_response,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            last_message_at=conv.last_message_at
        ))
    
    return ConversationListResponse(
        conversations=conversation_responses,
        total=total,
        skip=skip,
        limit=limit
    )


@app.get("/api/conversations/{conversation_id}/messages", response_model=ChatMessageListResponse)
def get_conversation_messages(
    conversation_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID"),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Get messages in a conversation"""
    from models import Conversation, ChatMessage
    
    # Verify conversation exists and user has access
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if customer_id and conversation.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get messages
    messages_query = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.created_at.asc())
    
    total = messages_query.count()
    messages = messages_query.offset(skip).limit(limit).all()
    
    # Mark messages as read
    if customer_id:
        # Mark admin messages as read
        db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.sender_type == "admin",
            ChatMessage.is_read == False
        ).update({
            "is_read": True,
            "read_at": get_uzbekistan_now()
        })
    elif seller:
        # Mark customer messages as read
        db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.sender_type == "customer",
            ChatMessage.is_read == False
        ).update({
            "is_read": True,
            "read_at": get_uzbekistan_now()
        })
    db.commit()
    
    # Build response
    message_responses = [
        ChatMessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_type=msg.sender_type,
            sender_id=msg.sender_id,
            sender_name=msg.sender_name,
            message=msg.message,
            is_read=msg.is_read,
            read_at=msg.read_at,
            created_at=msg.created_at
        )
        for msg in messages
    ]
    
    # Get conversation details
    customer_name = conversation.customer.name if conversation.customer else None
    seller_name = conversation.seller.name if conversation.seller else None
    
    conversation_response = ConversationResponse(
        id=conversation.id,
        customer_id=conversation.customer_id,
        customer_name=customer_name,
        seller_id=conversation.seller_id,
        seller_name=seller_name,
        subject=conversation.subject,
        status=conversation.status,
        is_customer_archived=conversation.is_customer_archived,
        is_admin_archived=conversation.is_admin_archived,
        unread_count=0,  # Already marked as read
        last_message=None,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        last_message_at=conversation.last_message_at
    )
    
    return ChatMessageListResponse(
        messages=message_responses,
        conversation=conversation_response,
        total=total,
        skip=skip,
        limit=limit
    )


@app.post("/api/conversations/{conversation_id}/messages", response_model=ChatMessageResponse)
async def send_message(
    conversation_id: int,
    message_data: ChatMessageCreate,
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID"),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Send a message in a conversation"""
    from models import Conversation, ChatMessage, Customer
    
    # Get or create conversation
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify access
    if customer_id and conversation.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Determine sender
    if customer_id:
        sender_type = "customer"
        sender_id = customer_id
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        sender_name = customer.name if customer else "Mijoz"
    elif seller:
        sender_type = "admin"
        sender_id = seller.id
        sender_name = seller.name
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Create message
    chat_message = ChatMessage(
        conversation_id=conversation_id,
        sender_type=sender_type,
        sender_id=sender_id,
        sender_name=sender_name,
        message=message_data.message,
        is_read=False
    )
    
    # If admin sends first message, assign conversation to admin
    if seller and not conversation.seller_id:
        conversation.seller_id = seller.id
    
    # Update conversation
    conversation.last_message_at = get_uzbekistan_now()
    conversation.status = "open"  # Reopen if closed
    
    db.add(chat_message)
    db.commit()
    db.refresh(chat_message)
    
    # Send WebSocket notification
    try:
        if customer_id:
            # Notify admin
            await manager.broadcast({
                "type": "new_chat_message",
                "data": {
                    "conversation_id": conversation_id,
                    "customer_id": customer_id,
                    "message": {
                        "id": chat_message.id,
                        "sender_type": sender_type,
                        "sender_name": sender_name,
                        "message": message_data.message,
                        "created_at": chat_message.created_at.isoformat()
                    }
                }
            })
        elif seller:
            # Notify customer
            await manager.send_to_customer(conversation.customer_id, {
                "type": "new_chat_message",
                "data": {
                    "conversation_id": conversation_id,
                    "message": {
                        "id": chat_message.id,
                        "sender_type": sender_type,
                        "sender_name": sender_name,
                        "message": message_data.message,
                        "created_at": chat_message.created_at.isoformat()
                    }
                }
            })
    except Exception as e:
        print(f"Error sending WebSocket notification: {e}")
    
    return ChatMessageResponse(
        id=chat_message.id,
        conversation_id=chat_message.conversation_id,
        sender_type=chat_message.sender_type,
        sender_id=chat_message.sender_id,
        sender_name=chat_message.sender_name,
        message=chat_message.message,
        is_read=chat_message.is_read,
        read_at=chat_message.read_at,
        created_at=chat_message.created_at
    )


@app.post("/api/conversations", response_model=ConversationResponse)
async def create_conversation(
    message_data: ChatMessageCreate,
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID")
):
    """Create a new conversation (customer only)"""
    from models import Conversation, ChatMessage, Customer
    
    if not customer_id:
        raise HTTPException(status_code=401, detail="Customer authentication required")
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Create conversation
    conversation = Conversation(
        customer_id=customer_id,
        subject=message_data.subject or "Yangi suhbat",
        status="open"
    )
    
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    # Create first message
    chat_message = ChatMessage(
        conversation_id=conversation.id,
        sender_type="customer",
        sender_id=customer_id,
        sender_name=customer.name or "Mijoz",
        message=message_data.message,
        is_read=False
    )
    
    conversation.last_message_at = get_uzbekistan_now()
    
    db.add(chat_message)
    db.commit()
    db.refresh(chat_message)
    
    # Notify admin via WebSocket
    try:
        await manager.broadcast({
            "type": "new_conversation",
            "data": {
                "conversation_id": conversation.id,
                "customer_id": customer_id,
                "customer_name": customer.name,
                "subject": conversation.subject,
                "message": message_data.message
            }
        })
    except Exception as e:
        print(f"Error sending WebSocket notification: {e}")
    
    return ConversationResponse(
        id=conversation.id,
        customer_id=conversation.customer_id,
        customer_name=customer.name,
        seller_id=conversation.seller_id,
            seller_name=None,
        subject=conversation.subject,
        status=conversation.status,
        is_customer_archived=conversation.is_customer_archived,
        is_admin_archived=conversation.is_admin_archived,
        unread_count=0,
        last_message=None,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        last_message_at=conversation.last_message_at
    )


@app.put("/api/conversations/{conversation_id}/archive")
def archive_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    customer_id: Optional[int] = Header(None, alias="X-Customer-ID"),
    seller: Optional[Seller] = Depends(get_seller_from_header)
):
    """Archive a conversation"""
    from models import Conversation
    
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if customer_id:
        if conversation.customer_id != customer_id:
            raise HTTPException(status_code=403, detail="Access denied")
        conversation.is_customer_archived = True
    elif seller:
        conversation.is_admin_archived = True
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    db.commit()
    
    return {"success": True, "message": "Conversation archived"}


@app.put("/api/conversations/{conversation_id}/status")
def update_conversation_status(
    conversation_id: int,
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("orders.update"))
):
    """Update conversation status (admin only)"""
    from models import Conversation
    
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if status not in ["open", "closed", "resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    conversation.status = status
    db.commit()
    
    return {"success": True, "message": f"Conversation status updated to {status}"}


@app.post("/api/auth/reset-password")
def reset_password(
    request: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Reset customer password by username or phone"""
    from models import Customer
    from services.auth_service import AuthService
    
    username_or_phone = request.get('username_or_phone', '').strip() if isinstance(request, dict) else ''
    new_password = request.get('new_password', '').strip() if isinstance(request, dict) else ''
    
    if not username_or_phone:
        raise HTTPException(status_code=400, detail="Foydalanuvchi nomi yoki telefon raqamni kiriting")
    
    if not new_password or len(new_password) < 4:
        raise HTTPException(status_code=400, detail="Yangi parol kamida 4 belgi bo'lishi kerak")
    
    # Find customer by username or phone
    customer = db.query(Customer).filter(
        (Customer.username == username_or_phone) | 
        (Customer.phone == username_or_phone)
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Bu foydalanuvchi nomi yoki telefon raqam bilan mijoz topilmadi"
        )
    
    # Update password
    customer.password_hash = AuthService.hash_password(new_password)
    db.commit()
    db.refresh(customer)
    
    return {
        "success": True,
        "message": "Parol muvaffaqiyatli o'zgartirildi",
        "customer_id": customer.id
    }


@app.get("/api/auth/me")
def get_current_user(
    seller: Optional[Seller] = Depends(get_seller_from_header),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID"),
    db: Session = Depends(get_db)
):
    """Get current logged-in user info (seller or customer)"""
    # Try customer first if X-Customer-ID header is present
    if x_customer_id:
        try:
            customer_id_int = int(x_customer_id)
            customer = db.query(Customer).filter(Customer.id == customer_id_int).first()
            if customer:
                return {
                    "id": customer.id,
                    "name": customer.name,
                    "username": customer.username,
                    "phone": customer.phone,
                    "address": customer.address,
                    "customer_type": customer.customer_type.value if customer.customer_type else None,
                    "debt_balance": customer.debt_balance or 0.0,
                    "user_type": "customer"
                }
        except (ValueError, TypeError) as e:
            print(f"Error parsing customer_id from header: {e}")
    
    # Fallback to seller
    if seller:
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
            "is_active": seller.is_active,
            "user_type": "seller"
        }
    
    raise HTTPException(status_code=401, detail="Not authenticated")


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


@app.delete("/api/sellers/{seller_id}")
def delete_seller(
    seller_id: int,
    seller: Seller = Depends(get_seller_from_header),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a seller - only for admin"""
    from services.auth_service import AuthService
    
    # Check if current user is admin
    if not seller or not seller.role:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Check if user has admin permissions (sellers.delete permission)
    try:
        from auth import get_seller_permissions as get_permissions
        permissions = get_permissions(db, seller)
        # permissions is List[str] (permission codes)
        permission_codes = permissions if isinstance(permissions, list) else []
    except Exception as e:
        print(f"Error getting permissions: {e}")
        permission_codes = []
    
    # Check role name (case-insensitive)
    role_name_lower = (seller.role.name or '').lower() if seller.role else ''
    has_admin_role = role_name_lower in ['admin', 'super admin', 'direktor', 'director']
    
    has_delete_permission = 'sellers.delete' in permission_codes or 'admin' in permission_codes
    
    if not (has_delete_permission or has_admin_role):
        raise HTTPException(
            status_code=403, 
            detail=f"Permission denied: sellers.delete required. Current role: {seller.role.name if seller.role else 'None'}, Permissions: {permission_codes}"
        )
    
    deleted = SellerService.delete_seller(db, seller_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Seller not found")
    
    return {"success": True, "message": "Sotuvchi o'chirildi"}


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
    try:
        print(f"[CREATE ORDER] Received order request: customer_id={order.customer_id}, seller_id={order.seller_id}, items={len(order.items)}")
        print(f"[CREATE ORDER] Payment method: {order.payment_method}")
        print(f"[CREATE ORDER] Order data: {order.dict()}")

        # Check customer debt limit before creating order
        from models import Customer
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer not found (ID: {order.customer_id})")

        # Check debt limit only if payment method is debt
        if order.payment_method and order.payment_method.lower() == 'debt':
            print(f"[CREATE ORDER] Payment method is debt, checking debt limit...")
            # Calculate approximate order total (rough estimate)
            total = sum(item.requested_quantity * 1000 for item in order.items)
            can_take, error = DebtService.check_debt_limit(db, order.customer_id, additional_debt=total)
            if not can_take:
                print(f"[CREATE ORDER] Debt limit check failed: {error}")
                raise HTTPException(status_code=400, detail=error)
            print(f"[CREATE ORDER] Debt limit check passed")

        print(f"[CREATE ORDER] Creating order via OrderService...")
        order_result = OrderService.create_order(db, order)
        print(f"[CREATE ORDER] Order created successfully: order_id={order_result.id}")

        # Reload with relations for WebSocket notification
        from sqlalchemy.orm import joinedload
        from models import OrderItem

        db.refresh(order_result)
        order_with_relations = db.query(Order).options(
            joinedload(Order.customer),
            joinedload(Order.seller),
            joinedload(Order.items).joinedload(OrderItem.product)
        ).filter(Order.id == order_result.id).first()

        if not order_with_relations:
            raise HTTPException(status_code=500, detail="Order created but could not be reloaded")

        print(f"[CREATE ORDER] Converting order to response...")
        order_response = OrderService.order_to_response(order_with_relations)
        print(f"[CREATE ORDER] Order response created successfully")

        # Notify admin panel via WebSocket
        try:
            await manager.broadcast({
                "type": "new_order",
                "data": order_response
            })
            print(f"[CREATE ORDER] WebSocket notification sent")
        except Exception as ws_error:
            print(f"[CREATE ORDER] WebSocket notification error: {ws_error}")
            # Don't fail the request if WebSocket fails

        return order_response
    except HTTPException:
        raise
    except ValueError as ve:
        # Convert ValueError to HTTPException with 400 status
        error_msg = str(ve)
        print(f"[CREATE ORDER] ValueError converted to HTTPException: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        print(f"[CREATE ORDER] Error creating order: {e}")
        import traceback
        traceback.print_exc()
        error_msg = f"Error creating order: {str(e)}"
        raise HTTPException(status_code=500, detail=error_msg)


@app.get("/api/orders", response_model=List[OrderResponse])
def get_orders(
    status: Optional[str] = None,
    seller_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all orders (can filter by status, seller_id, customer_id, or date range)"""
    try:
        from datetime import datetime
        # Convert empty string to None for status filter
        status_filter = status if status and status.strip() else None
        
        # Debug logging
        print(f"[GET_ORDERS] Request params: status={status_filter}, seller_id={seller_id}, customer_id={customer_id}, skip={skip}, limit={limit}")
        
        # IMPORTANT:
        # Don't apply status filter at database level (Enum/SQLite case issues),
        # instead load by seller/customer and filter by status in Python.
        
        # Get orders with basic filters (without status)
        orders = OrderService.get_orders(db, status=None, seller_id=seller_id, customer_id=customer_id, skip=skip, limit=limit)
        
        print(f"[GET_ORDERS] Found {len(orders)} orders from database")
        
        # Apply status filter in Python (case-insensitive, robust against DB enum storage)
        if status_filter:
            status_normalized = str(status_filter).lower().strip()
            filtered_by_status = []
            for order in orders:
                raw_status = getattr(order, "status", None)
                # Order.status may be Enum or str; handle both
                if raw_status is None:
                    continue
                if hasattr(raw_status, "value"):
                    value = str(raw_status.value).lower()
                else:
                    value = str(raw_status).lower()
                
                if value == status_normalized:
                    filtered_by_status.append(order)
            
            print(f"[GET_ORDERS] After Python status filter '{status_normalized}': {len(filtered_by_status)} orders")
            orders = filtered_by_status
        
        # Apply date filters if provided
        if start_date or end_date:
            filtered_orders = []
            for order in orders:
                order_date = order.created_at
                # Handle timezone-aware and naive datetime
                if isinstance(order_date, datetime):
                    # Convert to UTC if timezone-aware
                    if order_date.tzinfo is not None:
                        from utils import UZBEKISTAN_TZ
                        # Convert to Uzbekistan timezone for comparison
                        order_date_uz = order_date.astimezone(UZBEKISTAN_TZ)
                    else:
                        order_date_uz = order_date
                    
                    # Parse filter dates
                    if start_date:
                        try:
                            start_str = start_date.replace('Z', '+00:00') if 'Z' in start_date else start_date
                            if '+' not in start_str and 'Z' not in start_str:
                                start = datetime.fromisoformat(start_str)
                                if start.tzinfo is None:
                                    from utils import UZBEKISTAN_TZ
                                    start = start.replace(tzinfo=UZBEKISTAN_TZ)
                            else:
                                start = datetime.fromisoformat(start_str)
                                # Convert to Uzbekistan timezone
                                from utils import UZBEKISTAN_TZ
                                start = start.astimezone(UZBEKISTAN_TZ)
                            
                            if order_date_uz < start:
                                continue
                        except (ValueError, AttributeError) as e:
                            print(f"Warning: Invalid start_date format '{start_date}': {e}")
                    
                    if end_date:
                        try:
                            end_str = end_date.replace('Z', '+00:00') if 'Z' in end_date else end_date
                            if '+' not in end_str and 'Z' not in end_str:
                                end = datetime.fromisoformat(end_str)
                                if end.tzinfo is None:
                                    from utils import UZBEKISTAN_TZ
                                    # Set end time to end of day
                                    end = end.replace(hour=23, minute=59, second=59, tzinfo=UZBEKISTAN_TZ)
                                else:
                                    end = end.replace(hour=23, minute=59, second=59)
                            else:
                                end = datetime.fromisoformat(end_str)
                                # Convert to Uzbekistan timezone
                                from utils import UZBEKISTAN_TZ
                                end = end.astimezone(UZBEKISTAN_TZ)
                                end = end.replace(hour=23, minute=59, second=59)
                            
                            if order_date_uz > end:
                                continue
                        except (ValueError, AttributeError) as e:
                            print(f"Warning: Invalid end_date format '{end_date}': {e}")
                    
                    filtered_orders.append(order)
                else:
                    # If not a datetime, include it
                    filtered_orders.append(order)
            
            orders = filtered_orders
        # Build simple dict responses using service helper
        response_list = []
        for order in orders:
            try:
                data = OrderService.order_to_response(order)
                # Normalize status to lowercase string for frontend
                raw_status = data.get("status")
                if raw_status is not None:
                    if hasattr(raw_status, "value"):
                        data["status"] = str(raw_status.value).lower()
                    else:
                        data["status"] = str(raw_status).lower()
                else:
                    data["status"] = "pending"
                response_list.append(data)
            except Exception as e:
                print(f"Error building order response for order {getattr(order, 'id', 'unknown')}: {e}")
                import traceback
                traceback.print_exc()
                continue

        return response_list
    except Exception as e:
        print(f"Error in get_orders endpoint: {e}")
        import traceback
        traceback.print_exc()
        # Return empty list instead of raising error to prevent 500
        # Log the error for debugging but don't crash the endpoint
        return []


@app.get("/api/orders/count")
def get_orders_count(
    status: Optional[str] = None,
    seller_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get total count of orders matching filters"""
    count = OrderService.get_orders_count(db, status=status, seller_id=seller_id, customer_id=customer_id)
    return {"count": count}


@app.get("/api/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Get a specific order by ID"""
    from sqlalchemy.orm import joinedload
    from models import Order, OrderItem
    
    order = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.seller),
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return OrderService.order_to_response(order)


@app.put("/api/orders/{order_id}/status")
async def update_order_status(
    order_id: int, 
    status: Optional[str] = None,
    status_data: Optional[dict] = None,
    db: Session = Depends(get_db)
):
    """Update order status (pending -> processing -> completed, or cancel/return)
    Supports both query parameter (?status=processing) and request body ({"status": "processing"})
    """
    # Support both query parameter and body
    if not status and status_data:
        status = status_data.get('status')
    if not status:
        raise HTTPException(status_code=400, detail="status field is required")
    
    # Normalize status string
    status = str(status).lower().strip()
    print(f"[UPDATE_ORDER_STATUS] Updating order {order_id} to status: '{status}'")
    order = OrderService.update_status(db, order_id, status)
    if not order:
        print(f"[UPDATE_ORDER_STATUS] Order {order_id} not found")
        raise HTTPException(status_code=404, detail="Order not found")
    
    print(f"[UPDATE_ORDER_STATUS] Order {order_id} updated successfully, new status: {order.status}")
    order_response = OrderService.order_to_response(order)
    print(f"[UPDATE_ORDER_STATUS] Order response prepared, status in response: {order_response.get('status')}")
    
    # Status name mapping for user-friendly messages
    status_names = {
        "pending": "Kutilmoqda",
        "processing": "Jarayonda",
        "completed": "Bajarildi",
        "cancelled": "Bekor qilindi",
        "returned": "Qaytarildi"
    }
    
    # Notify admin panel via WebSocket (broadcast)
    await manager.broadcast({
        "type": "order_status_update",
        "data": {
            "order_id": order_id,
            "status": status,
            "status_name": status_names.get(status, status),
            "customer_id": order.customer_id
        }
    })
    
    # Notify specific customer via WebSocket (personal notification)
    if order.customer_id:
        try:
            await manager.send_to_customer(order.customer_id, {
                "type": "order_status_update",
                "data": {
                    "order_id": order_id,
                    "status": status,
                    "status_name": status_names.get(status, status),
                    "message": f"Buyurtma #{order_id} holati o'zgardi: {status_names.get(status, status)}"
                }
            })
            print(f"[Order Status Update] Notification sent to customer {order.customer_id} for order {order_id}")
        except Exception as e:
            print(f"[Order Status Update] Error sending notification to customer {order.customer_id}: {e}")
    
    # Send push notification to customer
    if order.customer_id:
        try:
            NotificationService.send_order_status_update(
                db, order.customer_id, order_id, status, order.total_amount
            )
        except Exception as e:
            print(f"[Order Status Update] Error sending push notification: {e}")
    
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
    
    from models import OrderStatus
    if order.status not in [OrderStatus.PENDING, OrderStatus.PROCESSING]:
        raise HTTPException(status_code=400, detail="Faqat 'pending' yoki 'processing' holatdagi buyurtmalar uchun to'lov qabul qilinadi")
    
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
        
        # Update order status to completed using OrderService
        # Note: OrderService.update_status expects lowercase status, but will convert to enum
        from services.order_service import OrderService
        updated_order = OrderService.update_status(db, order_id, "completed")
        
        # Notify customer via WebSocket about payment completion
        if updated_order and updated_order.customer_id:
            try:
                status_names = {
                    "completed": "Bajarildi"
                }
                await manager.send_to_customer(updated_order.customer_id, {
                    "type": "order_status_update",
                    "data": {
                        "order_id": order_id,
                        "status": "completed",
                        "status_name": status_names.get("completed", "completed"),
                        "message": f"Buyurtma #{order_id} to'lov qilindi va bajarildi: {status_names.get('completed', 'completed')}"
                    }
                })
                print(f"[Order Payment] Notification sent to customer {updated_order.customer_id} for order {order_id} completion")
            except Exception as e:
                print(f"[Order Payment] Error sending notification to customer {updated_order.customer_id}: {e}")
        
        # Also broadcast to admin panel
        await manager.broadcast({
            "type": "order_status_update",
            "data": {
                "order_id": order_id,
                "status": "completed",
                "status_name": "Bajarildi",
                "customer_id": updated_order.customer_id if updated_order else None
            }
        })
        
        # Refresh order to get updated status
        db.refresh(order)
        
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
    
    try:
        # Auto-set date range based on period if not provided
        if not start_date or not end_date:
            now = get_uzbekistan_now()
            if period == "daily":
                # Kunlik: Bugungi kun (00:00:00 dan hozirgacha)
                start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
                end_date = now.isoformat()
                start_date = start_of_day.isoformat()
            elif period == "monthly":
                # Oylik: Hozirgi oy boshidan hozirgacha
                start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                end_date = now.isoformat()
                start_date = start_of_month.isoformat()
            elif period == "yearly":
                # Yillik: Hozirgi yil boshidan hozirgacha
                start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
                end_date = now.isoformat()
                start_date = start_of_year.isoformat()
            else:
                # Default: Oxirgi 30 kun (agar period belgilanmagan bo'lsa)
                if not start_date:
                    start_date = (now - timedelta(days=30)).isoformat()
                if not end_date:
                    end_date = now.isoformat()

        # Get sales statistics first
        try:
            stats = SaleService.get_statistics(db, start_date, end_date, seller_id=seller_id)
        except Exception as stats_error:
            import traceback
            error_details = traceback.format_exc()
            print(f"[STATISTICS] Error getting sales statistics: {stats_error}")
            print(f"[STATISTICS] Traceback:\n{error_details}")
            # Return empty stats if there's an error
            stats = {
                "total_sales": 0,
                "total_amount": 0.0,
                "total_profit": 0.0,
                "average_sale": 0.0,
                "daily_stats": {},
                "top_products": [],
                "top_customers": [],
                "payment_methods": {}
            }

        # Add order statistics (online orders)
        from models import Order, OrderStatus
        from sqlalchemy import func

        # Filter orders by date range if provided
        orders_query = db.query(Order)
        if start_date:
            try:
                # Handle different date formats
                start_str = start_date.replace('Z', '+00:00') if 'Z' in start_date else start_date
                # If no timezone info, assume UTC and convert
                if '+' not in start_str and 'Z' not in start_str and start_str[-1] != 'Z':
                    # Naive datetime, assume it's in Uzbekistan timezone
                    start = datetime.fromisoformat(start_str)
                    if start.tzinfo is None:
                        from utils import UZBEKISTAN_TZ
                        start = start.replace(tzinfo=UZBEKISTAN_TZ)
                else:
                    start = datetime.fromisoformat(start_str)
                orders_query = orders_query.filter(Order.created_at >= start)
            except (ValueError, AttributeError) as e:
                print(f"Warning: Invalid start_date format '{start_date}': {e}")
        if end_date:
            try:
                # Handle different date formats
                end_str = end_date.replace('Z', '+00:00') if 'Z' in end_date else end_date
                # If no timezone info, assume UTC and convert
                if '+' not in end_str and 'Z' not in end_str and end_str[-1] != 'Z':
                    # Naive datetime, assume it's in Uzbekistan timezone
                    end = datetime.fromisoformat(end_str)
                    if end.tzinfo is None:
                        from utils import UZBEKISTAN_TZ
                        end = end.replace(tzinfo=UZBEKISTAN_TZ)
                else:
                    end = datetime.fromisoformat(end_str)
                orders_query = orders_query.filter(Order.created_at <= end)
            except (ValueError, AttributeError) as e:
                print(f"Warning: Invalid end_date format '{end_date}': {e}")
        if seller_id:
            orders_query = orders_query.filter(Order.seller_id == seller_id)
        
        # Count online vs offline orders
        total_orders = orders_query.count()
        online_orders_count = orders_query.filter(Order.is_offline == False).count()
        offline_orders_count = orders_query.filter(Order.is_offline == True).count()
        
        # Get orders by status
        orders_by_status = {}
        for status in OrderStatus:
            status_count = orders_query.filter(Order.status == status).count()
            if status_count > 0:
                orders_by_status[status.value] = status_count
        
        try:
            # Get total amount of completed orders
            completed_orders = orders_query.filter(Order.status == OrderStatus.COMPLETED).all()
            total_orders_amount = sum(order.total_amount for order in completed_orders) if completed_orders else 0
            
            # Get online orders amount (completed)
            online_completed_orders = orders_query.filter(
                Order.is_offline == False
            ).filter(
                Order.status == OrderStatus.COMPLETED
            ).all()
            online_orders_amount = sum(order.total_amount for order in online_completed_orders) if online_completed_orders else 0
            
            stats["orders"] = {
                "total_orders": total_orders,
                "online_orders_count": online_orders_count,
                "offline_orders_count": offline_orders_count,
                "orders_by_status": orders_by_status,
                "total_orders_amount": total_orders_amount,
                "online_orders_amount": online_orders_amount
            }
        except Exception as e:
            print(f"Error getting order statistics: {e}")
            import traceback
            traceback.print_exc()
            # Return empty order stats if there's an error
            stats["orders"] = {
                "total_orders": 0,
                "online_orders_count": 0,
                "offline_orders_count": 0,
                "orders_by_status": {},
                "total_orders_amount": 0,
                "online_orders_amount": 0
            }
        
        try:
            # Add inventory statistics
            inventory_stats = ProductService.get_inventory_total_value(db)
            stats["inventory"] = inventory_stats
        except Exception as e:
            print(f"Error getting inventory statistics: {e}")
            stats["inventory"] = {"total_value": 0, "total_packages": 0, "total_pieces": 0}

        try:
            # Add total debt statistics
            total_debt = DebtService.get_total_debt(db)
            stats["total_debt"] = total_debt
        except Exception as e:
            print(f"Error getting debt statistics: {e}")
            stats["total_debt"] = 0

        return stats
    except Exception as e:
        print(f"Error in get_statistics: {e}")
        import traceback
        traceback.print_exc()
        # Return empty stats instead of raising exception to prevent frontend errors
        return {
            "total_sales": 0,
            "total_amount": 0.0,
            "total_profit": 0.0,
            "average_sale": 0.0,
            "daily_stats": {},
            "top_products": [],
            "top_customers": [],
            "payment_methods": {},
            "orders": {
                "total_orders": 0,
                "online_orders_count": 0,
                "offline_orders_count": 0,
                "orders_by_status": {},
                "total_orders_amount": 0,
                "online_orders_amount": 0
            },
            "inventory": {"total_value": 0, "total_packages": 0, "total_pieces": 0},
            "total_debt": 0
        }


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


# ==================== FAVORITES ====================

@app.get("/api/favorites")
def get_favorites(
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Get favorite products for a customer"""
    # Get customer_id from header if not provided
    if not customer_id and x_customer_id:
        try:
            customer_id = int(x_customer_id)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required")
    
    favorites = db.query(Favorite).filter(
        Favorite.customer_id == customer_id
    ).order_by(Favorite.created_at.desc()).all()
    
    # Get product details
    from sqlalchemy.orm import joinedload
    products = []
    for fav in favorites:
        product = db.query(Product).options(
            joinedload(Product.sale_items)
        ).filter(Product.id == fav.product_id).first()
        if product:
            products.append(ProductService.product_to_response(product))
    
    return {
        "total": len(products),
        "favorites": products
    }


@app.post("/api/favorites")
def add_favorite(
    request_data: dict = Body(...),
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Add a product to favorites"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID is required")
    
    try:
        customer_id = int(x_customer_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    # Get product_id from request data
    product_id = request_data.get('product_id')
    if not product_id:
        raise HTTPException(status_code=400, detail="product_id is required")
    
    try:
        product_id = int(product_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid product_id")
    
    # Check if product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already favorited
    existing = db.query(Favorite).filter(
        Favorite.customer_id == customer_id,
        Favorite.product_id == product_id
    ).first()
    
    if existing:
        return {"success": True, "message": "Mahsulot allaqachon sevimlilar ro'yxatida", "favorite_id": existing.id}
    
    # Create favorite
    favorite = Favorite(
        customer_id=customer_id,
        product_id=product_id
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    
    return {"success": True, "message": "Mahsulot sevimlilar ro'yxatiga qo'shildi", "favorite_id": favorite.id}


@app.delete("/api/favorites/{product_id}")
def remove_favorite(
    product_id: int,
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Remove a product from favorites"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID is required")
    
    try:
        customer_id = int(x_customer_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    favorite = db.query(Favorite).filter(
        Favorite.customer_id == customer_id,
        Favorite.product_id == product_id
    ).first()
    
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    db.delete(favorite)
    db.commit()
    
    return {"success": True, "message": "Mahsulot sevimlilar ro'yxatidan olib tashlandi"}


@app.get("/api/favorites/check/{product_id}")
def check_favorite(
    product_id: int,
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Check if a product is favorited by customer"""
    if not x_customer_id:
        return {"is_favorite": False}
    
    try:
        customer_id = int(x_customer_id)
    except (ValueError, TypeError):
        return {"is_favorite": False}
    
    favorite = db.query(Favorite).filter(
        Favorite.customer_id == customer_id,
        Favorite.product_id == product_id
    ).first()
    
    return {"is_favorite": favorite is not None}


# ==================== PERSONAL PRODUCT TAGS ====================

@app.get("/api/product-tags", response_model=List[ProductTagResponse])
def get_product_tags(
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Get all personal product tags for the current customer"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID is required")

    try:
        customer_id = int(x_customer_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid customer ID")

    tags = db.query(CustomerProductTag).filter(
        CustomerProductTag.customer_id == customer_id
    ).order_by(
        CustomerProductTag.tag.asc(),
        CustomerProductTag.created_at.desc()
    ).all()

    return tags


@app.post("/api/product-tags", response_model=ProductTagResponse)
def add_product_tag(
    tag_data: ProductTagCreate,
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Add a personal tag/category to a product for the current customer"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID is required")

    try:
        customer_id = int(x_customer_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid customer ID")

    # Normalize tag (strip spaces)
    tag_normalized = tag_data.tag.strip()
    if not tag_normalized:
        raise HTTPException(status_code=400, detail="Tag cannot be empty")

    # Check product exists
    product = db.query(Product).filter(Product.id == tag_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if same tag already exists for this product & customer
    existing = db.query(CustomerProductTag).filter(
        CustomerProductTag.customer_id == customer_id,
        CustomerProductTag.product_id == tag_data.product_id,
        CustomerProductTag.tag == tag_normalized,
    ).first()

    if existing:
        return existing

    tag_obj = CustomerProductTag(
        customer_id=customer_id,
        product_id=tag_data.product_id,
        tag=tag_normalized,
    )
    db.add(tag_obj)
    db.commit()
    db.refresh(tag_obj)

    return tag_obj


@app.delete("/api/product-tags/{tag_id}")
def delete_product_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Delete a personal tag assignment from a product for the current customer"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID is required")

    try:
        customer_id = int(x_customer_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid customer ID")

    tag = db.query(CustomerProductTag).filter(
        CustomerProductTag.id == tag_id,
        CustomerProductTag.customer_id == customer_id,
    ).first()

    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    db.delete(tag)
    db.commit()

    return {"success": True, "message": "Tag deleted successfully"}


# ==================== PRICE ALERT ENDPOINTS ====================

@app.get("/api/price-alerts", response_model=List[PriceAlertResponse])
async def get_price_alerts(
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Get all price alerts for the customer"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID required")
    
    try:
        customer_id = int(x_customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    alerts = db.query(PriceAlert).filter(
        PriceAlert.customer_id == customer_id
    ).order_by(PriceAlert.created_at.desc()).all()
    
    # Enrich with product information
    result = []
    for alert in alerts:
        product = db.query(Product).filter(Product.id == alert.product_id).first()
        if product:
            # Get customer price based on customer type
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            current_price = product.regular_price
            if customer and customer.customer_type:
                if customer.customer_type.value == "wholesale":
                    current_price = product.wholesale_price
                elif customer.customer_type.value == "retail":
                    current_price = product.retail_price
            
            result.append({
                "id": alert.id,
                "customer_id": alert.customer_id,
                "product_id": alert.product_id,
                "product_name": product.name,
                "product_image_url": product.image_url,
                "current_price": current_price,
                "target_price": alert.target_price,
                "is_active": alert.is_active,
                "notified": alert.notified,
                "notified_at": alert.notified_at,
                "created_at": alert.created_at,
                "updated_at": alert.updated_at,
            })
    
    return result


@app.post("/api/price-alerts", response_model=PriceAlertResponse)
async def create_price_alert(
    alert: PriceAlertCreate,
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Create a new price alert"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID required")
    
    try:
        customer_id = int(x_customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    # Check if product exists
    product = db.query(Product).filter(Product.id == alert.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if alert already exists
    existing = db.query(PriceAlert).filter(
        PriceAlert.customer_id == customer_id,
        PriceAlert.product_id == alert.product_id,
        PriceAlert.is_active == True
    ).first()
    
    if existing:
        # Update existing alert
        existing.target_price = alert.target_price
        existing.notified = False
        existing.notified_at = None
        db.commit()
        db.refresh(existing)
        alert_obj = existing
    else:
        # Create new alert
        alert_obj = PriceAlert(
            customer_id=customer_id,
            product_id=alert.product_id,
            target_price=alert.target_price,
            is_active=True,
            notified=False
        )
        db.add(alert_obj)
        db.commit()
        db.refresh(alert_obj)
    
    # Get current price
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    current_price = product.regular_price
    if customer and customer.customer_type:
        if customer.customer_type.value == "wholesale":
            current_price = product.wholesale_price
        elif customer.customer_type.value == "retail":
            current_price = product.retail_price
    
    return {
        "id": alert_obj.id,
        "customer_id": alert_obj.customer_id,
        "product_id": alert_obj.product_id,
        "product_name": product.name,
        "product_image_url": product.image_url,
        "current_price": current_price,
        "target_price": alert_obj.target_price,
        "is_active": alert_obj.is_active,
        "notified": alert_obj.notified,
        "notified_at": alert_obj.notified_at,
        "created_at": alert_obj.created_at,
        "updated_at": alert_obj.updated_at,
    }


@app.put("/api/price-alerts/{alert_id}", response_model=PriceAlertResponse)
async def update_price_alert(
    alert_id: int,
    alert_update: PriceAlertUpdate,
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Update a price alert"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID required")
    
    try:
        customer_id = int(x_customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    alert = db.query(PriceAlert).filter(
        PriceAlert.id == alert_id,
        PriceAlert.customer_id == customer_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Price alert not found")
    
    if alert_update.target_price is not None:
        alert.target_price = alert_update.target_price
        alert.notified = False  # Reset notification status when price changes
        alert.notified_at = None
    
    if alert_update.is_active is not None:
        alert.is_active = alert_update.is_active
    
    db.commit()
    db.refresh(alert)
    
    # Get product and current price
    product = db.query(Product).filter(Product.id == alert.product_id).first()
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    current_price = product.regular_price if product else None
    if customer and customer.customer_type and product:
        if customer.customer_type.value == "wholesale":
            current_price = product.wholesale_price
        elif customer.customer_type.value == "retail":
            current_price = product.retail_price
    
    return {
        "id": alert.id,
        "customer_id": alert.customer_id,
        "product_id": alert.product_id,
        "product_name": product.name if product else None,
        "product_image_url": product.image_url if product else None,
        "current_price": current_price,
        "target_price": alert.target_price,
        "is_active": alert.is_active,
        "notified": alert.notified,
        "notified_at": alert.notified_at,
        "created_at": alert.created_at,
        "updated_at": alert.updated_at,
    }


@app.delete("/api/price-alerts/{alert_id}")
async def delete_price_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID")
):
    """Delete a price alert"""
    if not x_customer_id:
        raise HTTPException(status_code=401, detail="Customer ID required")
    
    try:
        customer_id = int(x_customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    alert = db.query(PriceAlert).filter(
        PriceAlert.id == alert_id,
        PriceAlert.customer_id == customer_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Price alert not found")
    
    db.delete(alert)
    db.commit()
    
    return {"message": "Price alert deleted successfully"}


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


@app.get("/api/statistics/export")
def export_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    format: str = "excel",  # excel or pdf
    db: Session = Depends(get_db),
    seller: Seller = Depends(get_seller_from_header)
):
    """Export statistics to Excel or PDF file"""
    if not seller:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        if format.lower() == "pdf":
            # Export statistics as PDF
            stats = SaleService.get_statistics(db, start_date, end_date)
            file_path = PDFService.export_statistics(stats, start_date, end_date)
            filename = os.path.basename(file_path)
            return FileResponse(
                file_path, 
                media_type="application/pdf",
                filename=filename
            )
        else:
            # Export statistics as Excel
            file_path = ExcelService.export_statistics(db, start_date, end_date)
            filename = os.path.basename(file_path)
            return FileResponse(
                file_path, 
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                filename=filename
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export xatosi: {str(e)}")


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
async def websocket_endpoint(websocket: WebSocket, customer_id: Optional[int] = None):
    """WebSocket endpoint for real-time updates
    Supports customer_id query parameter for personal notifications
    Example: ws://host/ws?customer_id=123
    """
    # Try to get customer_id from query parameters
    if customer_id is None:
        try:
            query_params = dict(websocket.query_params)
            if 'customer_id' in query_params:
                customer_id = int(query_params['customer_id'])
        except (ValueError, KeyError):
            customer_id = None
    
    await manager.connect(websocket, customer_id=customer_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back or process message (ping/pong for keepalive)
            try:
                message = json.loads(data)
                if message.get('type') == 'ping':
                    await websocket.send_text(json.dumps({'type': 'pong'}))
            except json.JSONDecodeError:
                # If not JSON, just echo back
                await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/api/websocket/broadcast")
async def broadcast_message(message: dict):
    """Broadcast message to all WebSocket clients"""
    await manager.broadcast(message)
    return {"status": "broadcasted", "message": message}


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
        print(f"[OK] Admin static files mounted: {admin_static_dir}")
    except Exception as e:
        print(f"[WARNING] Could not mount admin static files: {e}")

if os.path.exists(seller_static_dir):
    try:
        app.mount("/seller/static", StaticFiles(directory=seller_static_dir), name="seller-static")
        print(f"[OK] Seller static files mounted: {seller_static_dir}")
    except Exception as e:
        print(f"[WARNING] Could not mount seller static files: {e}")

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


# ==================== BANNERS API ====================

@app.get("/api/banners", response_model=List[BannerResponse])
def get_banners(is_active: Optional[bool] = None, db: Session = Depends(get_db)):
    """Get all banners (optionally filtered by is_active)"""
    try:
        query = db.query(Banner)
        if is_active is not None:
            query = query.filter(Banner.is_active == is_active)
        banners = query.order_by(Banner.display_order.asc(), Banner.created_at.desc()).all()
        
        # Convert to response and ensure rotation_interval has a default value
        result = []
        for banner in banners:
            banner_dict = {
                "id": banner.id,
                "title": banner.title,
                "image_url": banner.image_url,
                "link_url": banner.link_url,
                "is_active": banner.is_active,
                "display_order": banner.display_order,
                "rotation_interval": getattr(banner, 'rotation_interval', 3000),  # Default 3000 if column doesn't exist yet
                "created_at": banner.created_at,
                "updated_at": banner.updated_at
            }
            result.append(BannerResponse.model_validate(banner_dict))
        return result
    except Exception as e:
        print(f"Error loading banners: {e}")
        import traceback
        traceback.print_exc()
        # Return empty list instead of error
        return []


@app.get("/api/banners/{banner_id}", response_model=BannerResponse)
def get_banner(banner_id: int, db: Session = Depends(get_db)):
    """Get a specific banner by ID"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    return BannerResponse.model_validate(banner)


@app.post("/api/banners", response_model=BannerResponse)
def create_banner(
    banner: BannerCreate,
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("admin.settings"))
):
    """Create a new banner (admin only)"""
    db_banner = Banner(**banner.dict())
    db.add(db_banner)
    db.commit()
    db.refresh(db_banner)
    return BannerResponse.model_validate(db_banner)


@app.put("/api/banners/{banner_id}", response_model=BannerResponse)
def update_banner(
    banner_id: int,
    banner: BannerUpdate,
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("admin.settings"))
):
    """Update a banner (admin only)"""
    db_banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not db_banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    update_data = banner.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_banner, field, value)
    
    db.commit()
    db.refresh(db_banner)
    return BannerResponse.model_validate(db_banner)


@app.delete("/api/banners/{banner_id}")
def delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("admin.settings"))
):
    """Delete a banner (admin only)"""
    db_banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not db_banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    db.delete(db_banner)
    db.commit()
    return {"success": True, "message": "Banner deleted"}


@app.post("/api/banners/{banner_id}/upload-image")
async def upload_banner_image(
    banner_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("admin.settings"))
):
    """Upload banner image (admin only)"""
    import uuid
    from pathlib import Path
    
    # Verify banner exists
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Faqat rasm fayllari qabul qilinadi (jpg, png, gif, webp)")
    
    # Generate unique filename
    unique_filename = f"banner_{banner_id}_{uuid.uuid4()}{file_ext}"
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "banners")
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Update banner image_url
    image_url = f"/uploads/banners/{unique_filename}"
    banner.image_url = image_url
    db.commit()
    
    return {"url": image_url, "filename": unique_filename}


# ==================== INITIALIZE ====================

# ==================== REFERAL ENDPOINTS ====================

@app.get("/api/referals/my-code", response_model=dict)
def get_my_referal_code(
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID"),
    db: Session = Depends(get_db)
):
    customer_id = get_customer_from_header(x_customer_id)
    """Get customer's referal code"""
    from models import Referal, Customer
    import secrets
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if customer already has a referal code
    existing_referal = db.query(Referal).filter(
        Referal.referrer_id == customer_id
    ).first()
    
    if existing_referal:
        return {
            "referal_code": existing_referal.referal_code,
            "total_referals": db.query(Referal).filter(Referal.referrer_id == customer_id).count(),
            "total_bonus": sum([r.bonus_amount or 0 for r in db.query(Referal).filter(Referal.referrer_id == customer_id).all()])
        }
    
    # Generate new referal code
    referal_code = f"REF{customer.id}{secrets.token_hex(3).upper()}"
    
    # Create referal record
    new_referal = Referal(
        referrer_id=customer_id,
        referal_code=referal_code,
        status="pending"
    )
    db.add(new_referal)
    db.commit()
    
    return {
        "referal_code": referal_code,
        "total_referals": 0,
        "total_bonus": 0
    }


@app.post("/api/referals/invite", response_model=dict)
def invite_friend(
    referal_data: ReferalCreate,
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID"),
    db: Session = Depends(get_db)
):
    customer_id = get_customer_from_header(x_customer_id)
    """Invite a friend using referal code"""
    from models import Referal, Customer
    
    # Get customer's referal code
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    existing_referal = db.query(Referal).filter(
        Referal.referrer_id == customer_id
    ).first()
    
    if not existing_referal:
        raise HTTPException(status_code=400, detail="Referal code not found. Please generate one first.")
    
    # Check if phone already invited
    if referal_data.phone:
        existing_invite = db.query(Referal).filter(
            Referal.referrer_id == customer_id,
            Referal.phone == referal_data.phone
        ).first()
        
        if existing_invite:
            raise HTTPException(status_code=400, detail="This phone number already invited")
    
    # Create invite
    new_invite = Referal(
        referrer_id=customer_id,
        referal_code=existing_referal.referal_code,
        phone=referal_data.phone,
        status="pending"
    )
    db.add(new_invite)
    db.commit()
    
    return {
        "success": True,
        "message": "Do'st taklif qilindi",
        "referal_code": existing_referal.referal_code
    }


@app.get("/api/referals", response_model=ReferalListResponse)
def get_referals(
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID"),
    db: Session = Depends(get_db)
):
    customer_id = get_customer_from_header(x_customer_id)
    """Get all referals (sent and received)"""
    from models import Referal
    
    referals_sent = db.query(Referal).filter(Referal.referrer_id == customer_id).all()
    referals_received = db.query(Referal).filter(Referal.referred_id == customer_id).all()
    
    my_referal_code = ""
    existing_referal = db.query(Referal).filter(Referal.referrer_id == customer_id).first()
    if existing_referal:
        my_referal_code = existing_referal.referal_code
    
    total_bonus = sum([r.bonus_amount or 0 for r in referals_sent])
    
    return ReferalListResponse(
        referals_sent=[ReferalResponse.model_validate(r) for r in referals_sent],
        referals_received=[ReferalResponse.model_validate(r) for r in referals_received],
        my_referal_code=my_referal_code,
        total_referals=len(referals_sent),
        total_bonus_earned=total_bonus
    )


# ==================== LOYALTY ENDPOINTS ====================

@app.get("/api/loyalty/points", response_model=LoyaltyPointResponse)
def get_loyalty_points(
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID"),
    db: Session = Depends(get_db)
):
    customer_id = get_customer_from_header(x_customer_id)
    """Get customer's loyalty points"""
    from models import LoyaltyPoint, Customer
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    loyalty = db.query(LoyaltyPoint).filter(LoyaltyPoint.customer_id == customer_id).first()
    
    if not loyalty:
        # Create new loyalty account
        loyalty = LoyaltyPoint(
            customer_id=customer_id,
            points=0,
            total_earned=0,
            total_spent=0,
            vip_level="bronze"
        )
        db.add(loyalty)
        db.commit()
        db.refresh(loyalty)
    
    return LoyaltyPointResponse.model_validate(loyalty)


@app.get("/api/loyalty/transactions", response_model=List[LoyaltyTransactionResponse])
def get_loyalty_transactions(
    skip: int = 0,
    limit: int = 50,
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID"),
    db: Session = Depends(get_db)
):
    customer_id = get_customer_from_header(x_customer_id)
    """Get loyalty transaction history"""
    from models import LoyaltyPoint, LoyaltyTransaction
    
    loyalty = db.query(LoyaltyPoint).filter(LoyaltyPoint.customer_id == customer_id).first()
    if not loyalty:
        return []
    
    transactions = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.loyalty_point_id == loyalty.id
    ).order_by(LoyaltyTransaction.created_at.desc()).offset(skip).limit(limit).all()
    
    return [LoyaltyTransactionResponse.model_validate(t) for t in transactions]


@app.post("/api/loyalty/spend", response_model=dict)
def spend_loyalty_points(
    points: int = Body(..., gt=0),
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID"),
    db: Session = Depends(get_db)
):
    customer_id = get_customer_from_header(x_customer_id)
    """Spend loyalty points"""
    from models import LoyaltyPoint, LoyaltyTransaction
    
    loyalty = db.query(LoyaltyPoint).filter(LoyaltyPoint.customer_id == customer_id).first()
    if not loyalty or loyalty.points < points:
        raise HTTPException(status_code=400, detail="Not enough points")
    
    loyalty.points -= points
    loyalty.total_spent += points
    
    transaction = LoyaltyTransaction(
        loyalty_point_id=loyalty.id,
        transaction_type="spent",
        points=-points,
        description=f"Spent {points} points"
    )
    db.add(transaction)
    db.commit()
    
    return {
        "success": True,
        "remaining_points": loyalty.points,
        "spent_points": points
    }


# ==================== PRODUCT VARIANT ENDPOINTS ====================

@app.get("/api/products/{product_id}/variants", response_model=List[ProductVariantResponse])
def get_product_variants(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get all variants for a product"""
    from models import ProductVariant
    
    variants = db.query(ProductVariant).filter(
        ProductVariant.product_id == product_id
    ).order_by(ProductVariant.is_default.desc(), ProductVariant.created_at.asc()).all()
    
    return [ProductVariantResponse.model_validate(v) for v in variants]


@app.post("/api/products/{product_id}/variants", response_model=ProductVariantResponse)
def create_product_variant(
    product_id: int,
    variant: ProductVariantCreate,
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.create"))
):
    """Create a new product variant"""
    from models import ProductVariant, Product
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # If this is set as default, unset other defaults
    if variant.is_default:
        db.query(ProductVariant).filter(
            ProductVariant.product_id == product_id,
            ProductVariant.is_default == True
        ).update({"is_default": False})
    
    db_variant = ProductVariant(
        product_id=product_id,
        **variant.dict()
    )
    db.add(db_variant)
    db.commit()
    db.refresh(db_variant)
    
    return ProductVariantResponse.model_validate(db_variant)


@app.put("/api/products/{product_id}/variants/{variant_id}", response_model=ProductVariantResponse)
def update_product_variant(
    product_id: int,
    variant_id: int,
    variant: ProductVariantUpdate,
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.update"))
):
    """Update a product variant"""
    from models import ProductVariant
    
    db_variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id
    ).first()
    
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    update_data = variant.dict(exclude_unset=True)
    
    # If setting as default, unset other defaults
    if update_data.get("is_default") == True:
        db.query(ProductVariant).filter(
            ProductVariant.product_id == product_id,
            ProductVariant.id != variant_id,
            ProductVariant.is_default == True
        ).update({"is_default": False})
    
    for field, value in update_data.items():
        setattr(db_variant, field, value)
    
    db.commit()
    db.refresh(db_variant)
    
    return ProductVariantResponse.model_validate(db_variant)


@app.delete("/api/products/{product_id}/variants/{variant_id}")
def delete_product_variant(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    seller: Seller = Depends(require_permission("products.delete"))
):
    """Delete a product variant"""
    from models import ProductVariant
    
    db_variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id,
        ProductVariant.product_id == product_id
    ).first()
    
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    db.delete(db_variant)
    db.commit()
    
    return {"success": True, "message": "Variant deleted"}


# ==================== ONLINE PAYMENT ENDPOINTS ====================

@app.post("/api/payments/initiate", response_model=PaymentInitiateResponse)
def initiate_payment(
    payment_data: PaymentInitiateRequest,
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID"),
    db: Session = Depends(get_db)
):
    customer_id = get_customer_from_header(x_customer_id)
    """Initiate online payment"""
    from models import Order
    import uuid
    
    order = db.query(Order).filter(Order.id == payment_data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Not your order")
    
    # Generate payment ID
    payment_id = str(uuid.uuid4())
    
    # In production, integrate with actual payment gateways (Click, Payme, Uzcard)
    # For now, return mock response
    return PaymentInitiateResponse(
        payment_id=payment_id,
        payment_url=f"https://payment.example.com/pay/{payment_id}",
        merchant_id="test_merchant",
        transaction_id=None,
        status="pending"
    )


@app.post("/api/payments/verify", response_model=PaymentVerifyResponse)
def verify_payment(
    verify_data: PaymentVerifyRequest,
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-ID"),
    db: Session = Depends(get_db)
):
    customer_id = get_customer_from_header(x_customer_id)
    """Verify payment status"""
    from models import Order
    
    # In production, verify with payment gateway
    # For now, return mock response
    return PaymentVerifyResponse(
        success=True,
        order_id=1,  # Should get from payment_id
        amount=0.0,
        payment_method="click",
        transaction_id=verify_data.transaction_id,
        status="completed"
    )


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()


if __name__ == "__main__":
    # Use 0.0.0.0 to bind to all interfaces, but access via localhost or 127.0.0.1 in browser
    uvicorn.run(app, host="0.0.0.0", port=8000)
