"""
Pydantic Schemas for Request/Response Models
"""
from pydantic import BaseModel, Field
try:
    from pydantic import field_validator
except ImportError:
    # Pydantic v1 compatibility
    from pydantic import validator as field_validator
from typing import List, Optional, Dict
from datetime import datetime
from models import CustomerType, OrderStatus, PaymentMethod


# ==================== PRODUCT SCHEMAS ====================

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    item_number: Optional[str] = Field(None, max_length=100, description="Mahsulot kodi/nomeri")
    barcode: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100, description="Kategoriya (legacy)")
    category_id: Optional[int] = Field(None, description="Kategoriya ID")
    supplier: Optional[str] = Field(None, max_length=200)
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        """Keep non-empty category strings, convert empty strings to None"""
        if v is None:
            return None
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v
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
    item_number: Optional[str] = Field(None, max_length=100, description="Mahsulot kodi/nomeri")
    barcode: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100, description="Kategoriya (legacy)")
    category_id: Optional[int] = Field(None, description="Kategoriya ID")
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


class ProductImageResponse(BaseModel):
    id: int
    product_id: int
    image_url: str
    display_order: int
    is_primary: bool
    created_at: Optional[datetime] = None


class ProductImageCreate(BaseModel):
    product_id: int
    image_url: str
    display_order: Optional[int] = 0
    is_primary: Optional[bool] = False


class ProductReviewResponse(BaseModel):
    id: int
    product_id: int
    customer_id: Optional[int] = None
    customer_name: str
    rating: int  # 1-5
    comment: Optional[str] = None
    is_verified_purchase: bool
    helpful_count: int
    is_approved: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class ProductReviewCreate(BaseModel):
    product_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = Field(None, max_length=2000)


class ProductReviewUpdate(BaseModel):
    helpful: Optional[bool] = None  # Mark as helpful/unhelpful


class ProductResponse(ProductBase):
    id: int
    total_pieces: int
    total_value: Optional[float] = None
    total_value_cost: Optional[float] = None
    total_value_wholesale: Optional[float] = None
    images: Optional[List[ProductImageResponse]] = []
    last_sold_date: Optional[datetime] = None  # Oxirgi sotilgan sana
    days_since_last_sale: Optional[int] = None  # Oxirgi sotilganidan beri kunlar
    is_slow_moving: Optional[bool] = None  # Uzoq vaqt sotilmagan (30+ kun)
    product_url: Optional[str] = None  # Mahsulot URL'i (customer app uchun)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ==================== CATEGORY SCHEMAS ====================

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)
    display_order: int = Field(0, ge=0)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=100)
    display_order: Optional[int] = Field(None, ge=0)


class CategoryResponse(CategoryBase):
    id: int
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


class CustomerStatsResponse(BaseModel):
    """Customer statistics for dashboard (orders & sales)"""
    customer_id: int
    total_orders: int
    completed_orders: int
    cancelled_orders: int
    pending_orders: int
    total_sales_amount: float
    total_paid_amount: float
    total_debt_amount: float
    average_order_amount: float
    last_order_date: Optional[datetime] = None
    last_sale_date: Optional[datetime] = None
    
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


class SendOtpRequest(BaseModel):
    """Request to send OTP to a customer's phone"""
    phone: str = Field(..., min_length=5, max_length=50, description="Customer phone number")


class VerifyOtpRequest(BaseModel):
    """Request to verify OTP code for a customer's phone"""
    phone: str = Field(..., min_length=5, max_length=50, description="Customer phone number")
    code: str = Field(..., min_length=3, max_length=10, description="OTP code")


class SocialLoginRequest(BaseModel):
    """Request body for social login (Google/Facebook) from mobile app"""
    provider: str = Field(..., min_length=2, max_length=50, description="Auth provider: google, facebook")
    phone: Optional[str] = Field(None, max_length=50, description="Customer phone number (used to link account)")
    name: Optional[str] = Field(None, max_length=200, description="Customer display name from social profile")


class ScanCodeRequest(BaseModel):
    """Request to scan QR code or barcode"""
    code: str = Field(..., min_length=1, max_length=200, description="Scanned QR code or barcode value")


class DeviceTokenRequest(BaseModel):
    """Request to register/update device token for push notifications"""
    token: str = Field(..., min_length=1, max_length=500, description="Expo push token")
    device_id: Optional[str] = Field(None, max_length=200, description="Device identifier")
    platform: Optional[str] = Field(None, max_length=50, description="Platform: ios, android, web")


class SendNotificationRequest(BaseModel):
    """Request to send notification to customers"""
    customer_ids: Optional[List[int]] = Field(None, description="Specific customer IDs (if None, sends to all)")
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=500)
    data: Optional[Dict] = Field(None, description="Additional data payload")


# ==================== CHAT/SUPPORT SCHEMAS ====================

class ChatMessageCreate(BaseModel):
    """Request to create a chat message"""
    conversation_id: Optional[int] = Field(None, description="Existing conversation ID (if None, creates new)")
    message: str = Field(..., min_length=1, max_length=5000, description="Message text")
    subject: Optional[str] = Field(None, max_length=200, description="Subject for new conversation")


class ChatMessageResponse(BaseModel):
    """Chat message response"""
    id: int
    conversation_id: int
    sender_type: str  # "customer" or "admin"
    sender_id: int
    sender_name: str
    message: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Conversation response"""
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    seller_id: Optional[int] = None
    seller_name: Optional[str] = None
    subject: Optional[str] = None
    status: str
    is_customer_archived: bool
    is_admin_archived: bool
    unread_count: int = 0
    last_message: Optional[ChatMessageResponse] = None
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    """List of conversations with pagination"""
    conversations: List[ConversationResponse]
    total: int
    skip: int
    limit: int


class ChatMessageListResponse(BaseModel):
    """List of messages in a conversation"""
    messages: List[ChatMessageResponse]
    conversation: ConversationResponse
    total: int
    skip: int
    limit: int


# ==================== SEARCH HISTORY SCHEMAS ====================

class SearchHistoryCreate(BaseModel):
    """Request to create search history"""
    search_query: str = Field(..., min_length=1, max_length=500)
    result_count: Optional[int] = Field(None, ge=0, description="Number of results found")


class SearchHistoryResponse(BaseModel):
    """Search history response"""
    id: int
    customer_id: Optional[int]
    search_query: str
    result_count: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


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


# ==================== REFERAL SCHEMAS ====================

class ReferalCreate(BaseModel):
    phone: Optional[str] = Field(None, max_length=20, description="Taklif qilingan telefon raqami")
    
class ReferalResponse(BaseModel):
    id: int
    referrer_id: int
    referred_id: Optional[int]
    referal_code: str
    phone: Optional[str]
    status: str
    bonus_given: bool
    bonus_amount: Optional[float]
    created_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ReferalListResponse(BaseModel):
    referals_sent: List[ReferalResponse]
    referals_received: List[ReferalResponse]
    my_referal_code: str
    total_referals: int
    total_bonus_earned: float


# ==================== LOYALTY SCHEMAS ====================

class LoyaltyPointResponse(BaseModel):
    id: int
    customer_id: int
    points: int
    total_earned: int
    total_spent: int
    vip_level: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LoyaltyTransactionResponse(BaseModel):
    id: int
    loyalty_point_id: int
    transaction_type: str
    points: int
    description: Optional[str]
    order_id: Optional[int]
    referal_id: Optional[int]
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class LoyaltyTransactionCreate(BaseModel):
    transaction_type: str = Field(..., description="earned, spent, expired, bonus")
    points: int
    description: Optional[str] = None
    order_id: Optional[int] = None
    referal_id: Optional[int] = None


# ==================== PRODUCT VARIANT SCHEMAS ====================

class ProductVariantCreate(BaseModel):
    variant_type: str = Field(..., max_length=50, description="size, color, material, etc.")
    variant_value: str = Field(..., max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    price_modifier: Optional[float] = Field(0, description="Price difference from base product")
    stock_quantity: Optional[int] = None
    is_default: bool = False

class ProductVariantUpdate(BaseModel):
    variant_type: Optional[str] = None
    variant_value: Optional[str] = None
    sku: Optional[str] = None
    price_modifier: Optional[float] = None
    stock_quantity: Optional[int] = None
    is_default: Optional[bool] = None

class ProductVariantResponse(BaseModel):
    id: int
    product_id: int
    variant_type: str
    variant_value: str
    sku: Optional[str]
    price_modifier: Optional[float]
    stock_quantity: Optional[int]
    is_default: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== ONLINE PAYMENT SCHEMAS ====================

class PaymentInitiateRequest(BaseModel):
    order_id: int
    payment_method: str = Field(..., description="click, payme, uzcard")
    amount: float

class PaymentInitiateResponse(BaseModel):
    payment_id: str
    payment_url: Optional[str] = None
    merchant_id: Optional[str] = None
    transaction_id: Optional[str] = None
    status: str

class PaymentVerifyRequest(BaseModel):
    payment_id: str
    transaction_id: Optional[str] = None

class PaymentVerifyResponse(BaseModel):
    success: bool
    order_id: int
    amount: float
    payment_method: str
    transaction_id: Optional[str] = None
    status: str
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
    payment_method: Optional[str] = Field(default="cash")  # cash, card, debt (olinadigan)
    delivery_address: Optional[str] = Field(None, max_length=500)  # Text address
    delivery_latitude: Optional[float] = Field(None)  # GPS latitude
    delivery_longitude: Optional[float] = Field(None)  # GPS longitude


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
    # Use plain string for status in API responses to avoid Enum/DB case issues
    status: str
    total_amount: float
    payment_method: Optional[str] = None  # Payment method (cash, card, debt, bank_transfer)
    items: List[OrderItemResponse]
    is_offline: bool
    synced_at: Optional[datetime] = None
    delivery_address: Optional[str] = None  # Text address
    delivery_latitude: Optional[float] = None  # GPS latitude
    delivery_longitude: Optional[float] = None  # GPS longitude
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
    enable_referals: bool = True
    enable_loyalty: bool = True
    enable_price_alerts: bool = True
    enable_favorites: bool = True
    enable_tags: bool = True
    enable_reviews: bool = True
    referal_bonus_points: int = 100
    referal_bonus_percent: float = 5.0
    loyalty_points_per_sum: float = 0.01
    loyalty_point_value: float = 1.0
    enable_location_selection: bool = True
    enable_offline_orders: bool = True


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
    rotation_interval: int = Field(default=3000, ge=1000, le=30000)  # Almashish vaqti (millisekundlarda, 1-30 soniya)


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
    rotation_interval: Optional[int] = Field(None, ge=1000, le=30000)  # Almashish vaqti (millisekundlarda)


class BannerResponse(BannerBase):
    """Banner response schema"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== PRICE ALERT SCHEMAS ====================

class PriceAlertBase(BaseModel):
    product_id: int = Field(..., description="Product ID")
    target_price: float = Field(..., gt=0, description="Target price to trigger alert")


class PriceAlertCreate(PriceAlertBase):
    """Price alert creation schema"""
    pass


class PriceAlertUpdate(BaseModel):
    """Price alert update schema"""
    target_price: Optional[float] = Field(None, gt=0)
    is_active: Optional[bool] = None


class PriceAlertResponse(BaseModel):
    """Price alert response schema"""
    id: int
    customer_id: int
    product_id: int
    product_name: Optional[str] = None
    product_image_url: Optional[str] = None
    current_price: Optional[float] = None
    target_price: float
    is_active: bool
    notified: bool
    notified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ==================== PERSONAL PRODUCT TAG SCHEMAS ====================

class ProductTagBase(BaseModel):
    product_id: int = Field(..., description="Product ID")
    tag: str = Field(..., min_length=1, max_length=100, description="Personal tag/category name")


class ProductTagCreate(ProductTagBase):
    """Create personal product tag"""
    pass


class ProductTagResponse(BaseModel):
    """Personal product tag response schema"""
    id: int
    customer_id: int
    product_id: int
    tag: str
    created_at: datetime

    class Config:
        from_attributes = True

