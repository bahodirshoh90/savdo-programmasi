"""
Pydantic Schemas for Request/Response Models
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from models import CustomerType, OrderStatus, PaymentMethod


# ==================== PRODUCT SCHEMAS ====================

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    barcode: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    supplier: Optional[str] = Field(None, max_length=200)
    received_date: Optional[datetime] = None
    image_url: Optional[str] = Field(None, max_length=500)  # Ixtiyoriy rasm
    location: Optional[str] = Field(None, max_length=200)  # Ombordagi joylashuv
    pieces_per_package: int = Field(..., gt=0)
    cost_price: float = Field(0.0, ge=0)  # Kelgan narx (1 dona uchun)
    # Narxlar - mijoz turiga qarab (dona uchun)
    wholesale_price: float = Field(0.0, ge=0)  # Ulgurji mijoz narxi (dona uchun)
    retail_price: float = Field(0.0, ge=0)  # Dona mijoz narxi (dona uchun)
    regular_price: float = Field(0.0, ge=0)  # Oddiy mijoz narxi (dona uchun)
    packages_in_stock: int = Field(0, ge=0)
    pieces_in_stock: int = Field(0, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    barcode: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    supplier: Optional[str] = Field(None, max_length=200)
    received_date: Optional[datetime] = None
    image_url: Optional[str] = Field(None, max_length=500)  # Ixtiyoriy rasm
    location: Optional[str] = Field(None, max_length=200)  # Ombordagi joylashuv
    pieces_per_package: Optional[int] = Field(None, gt=0)
    cost_price: Optional[float] = Field(None, ge=0)  # Kelgan narx (1 dona uchun)
    # Narxlar - mijoz turiga qarab (dona uchun)
    wholesale_price: Optional[float] = Field(None, ge=0)  # Ulgurji mijoz narxi
    retail_price: Optional[float] = Field(None, ge=0)  # Dona mijoz narxi
    regular_price: Optional[float] = Field(None, ge=0)  # Oddiy mijoz narxi
    packages_in_stock: Optional[int] = Field(None, ge=0)
    pieces_in_stock: Optional[int] = Field(None, ge=0)


class ProductResponse(ProductBase):
    id: int
    total_pieces: int
    total_value: Optional[float] = None
    total_value_cost: Optional[float] = None
    total_value_wholesale: Optional[float] = None
    last_sold_date: Optional[datetime] = None  # Oxirgi sotilgan sana
    days_since_last_sale: Optional[int] = None  # Oxirgi sotilganidan beri kunlar
    is_slow_moving: Optional[bool] = None  # Uzoq vaqt sotilmagan (30+ kun)
    product_url: Optional[str] = None  # Mahsulot URL'i (customer app uchun)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== CUSTOMER SCHEMAS ====================

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    customer_type: CustomerType = Field(default=CustomerType.RETAIL)
    notes: Optional[str] = None
    debt_limit: Optional[float] = Field(None, ge=0)  # Qarz limiti
    debt_due_date: Optional[datetime] = None  # Qarz muddati
    username: Optional[str] = Field(None, max_length=100)  # Login uchun username


class CustomerCreate(CustomerBase):
    password: Optional[str] = Field(None, min_length=4)  # Parol (sign up uchun)


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    customer_type: Optional[CustomerType] = None
    notes: Optional[str] = None
    debt_limit: Optional[float] = Field(None, ge=0)  # Qarz limiti
    debt_due_date: Optional[datetime] = None  # Qarz muddati
    username: Optional[str] = Field(None, min_length=3, max_length=100)  # Login uchun username
    password: Optional[str] = Field(None, min_length=4)  # Parol (yangilash uchun)


class CustomerResponse(CustomerBase):
    id: int
    debt_balance: float = 0.0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DebtHistoryResponse(BaseModel):
    id: int
    customer_id: int
    transaction_type: str
    amount: float
    balance_before: float
    balance_after: float
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== SELLER SCHEMAS ====================

class SellerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    username: Optional[str] = Field(None, max_length=100)
    image_url: Optional[str] = Field(None, max_length=500)


class SellerCreate(SellerBase):
    password: Optional[str] = Field(None, min_length=6, max_length=100)  # Parol (ixtiyoriy)
    role_id: Optional[int] = None


class SellerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=100)
    username: Optional[str] = Field(None, max_length=100)
    image_url: Optional[str] = Field(None, max_length=500)
    password: Optional[str] = Field(None, min_length=6, max_length=100)  # Yangi parol
    is_active: Optional[bool] = None
    role_id: Optional[int] = None


# Authentication schemas
class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    success: bool
    seller_id: Optional[int] = None
    seller_name: Optional[str] = None
    token: Optional[str] = None
    permissions: List[str] = []
    message: Optional[str] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = None


class SellerResponse(SellerBase):
    id: int
    is_active: bool
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_location_update: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== ROLE SCHEMAS ====================

class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    category: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: List[int] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(RoleBase):
    id: int
    is_system: bool
    permissions: List[PermissionResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


# ==================== SALE SCHEMAS ====================

class SaleItemCreate(BaseModel):
    product_id: int
    requested_quantity: int = Field(..., gt=0)


class SaleCreate(BaseModel):
    seller_id: int
    customer_id: int
    items: List[SaleItemCreate] = Field(..., min_items=1)
    payment_method: Optional[str] = "cash"  # cash, card, bank_transfer
    payment_amount: Optional[float] = None  # Mijoz bergan summa
    excess_action: Optional[str] = None  # 'return' yoki 'debt' (bergan summa ko'p bo'lsa)
    requires_admin_approval: Optional[bool] = False  # Admin ruxsati kerakmi


class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    requested_quantity: int
    packages_sold: int
    pieces_sold: int
    package_price: float
    piece_price: float
    subtotal: float
    
    class Config:
        from_attributes = True


class SaleUpdate(BaseModel):
    customer_id: Optional[int] = None
    items: Optional[List[SaleItemCreate]] = None
    payment_method: Optional[str] = None


class SaleResponse(BaseModel):
    id: int
    seller_id: int
    customer_id: Optional[int] = None
    customer_name: str
    seller_name: str
    total_amount: float
    payment_method: str
    payment_amount: Optional[float] = None
    excess_action: Optional[str] = None
    requires_admin_approval: bool = False
    admin_approved: Optional[bool] = None
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    items: List[SaleItemResponse]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== ORDER SCHEMAS ====================

class OrderItemCreate(BaseModel):
    product_id: int
    requested_quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    seller_id: int
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_items=1)
    is_offline: bool = Field(default=False)


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    requested_quantity: int
    packages_sold: int
    pieces_sold: int
    package_price: float
    piece_price: float
    subtotal: float
    
    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    seller_id: int
    customer_id: Optional[int] = None
    customer_name: str
    seller_name: str
    status: OrderStatus
    total_amount: float
    items: List[OrderItemResponse]
    is_offline: bool
    synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== CALCULATION SCHEMAS ====================

class SaleCalculationResponse(BaseModel):
    """Response schema for sale calculation"""
    product_id: int
    product_name: str
    requested_quantity: int
    packages_to_sell: int
    pieces_to_sell: int
    package_price: float
    piece_price: float
    subtotal: float
    customer_type: str


# ==================== SETTINGS SCHEMAS ====================

class SettingsBase(BaseModel):
    """Base settings schema"""
    store_name: Optional[str] = None
    store_address: Optional[str] = None
    store_phone: Optional[str] = None
    store_email: Optional[str] = None
    store_inn: Optional[str] = None
    store_tin: Optional[str] = None
    logo_url: Optional[str] = None
    receipt_footer_text: Optional[str] = None
    receipt_show_logo: bool = True
    work_start_time: Optional[str] = None  # Format: "HH:MM"
    work_end_time: Optional[str] = None  # Format: "HH:MM"
    work_days: Optional[str] = None  # Comma-separated: "1,2,3,4,5,6,7" (1=Monday, 7=Sunday)
    notify_new_sale: bool = True  # Yangi sotuv bildirishnomasi
    notify_low_stock: bool = True  # Kam qolgan mahsulotlar
    notify_debt_limit: bool = True  # Qarz limiti oshganlar
    notify_daily_report: bool = True  # Kunlik hisobotlar


class SettingsUpdate(SettingsBase):
    """Settings update schema"""
    pass


class SettingsResponse(SettingsBase):
    """Settings response schema"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== BANNER SCHEMAS ====================

class BannerBase(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    image_url: str = Field(..., max_length=500)
    link_url: Optional[str] = Field(None, max_length=500)
    is_active: bool = Field(default=True)
    display_order: int = Field(default=0, ge=0)


class BannerCreate(BannerBase):
    """Banner creation schema"""
    pass


class BannerUpdate(BaseModel):
    """Banner update schema"""
    title: Optional[str] = Field(None, max_length=200)
    image_url: Optional[str] = Field(None, max_length=500)
    link_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    display_order: Optional[int] = Field(None, ge=0)


class BannerResponse(BannerBase):
    """Banner response schema"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

