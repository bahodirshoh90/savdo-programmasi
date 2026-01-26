"""
SQLAlchemy Database Models
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class CustomerType(enum.Enum):
    """Customer type enumeration"""
    WHOLESALE = "wholesale"  # Ulgurji
    RETAIL = "retail"  # Dona
    REGULAR = "regular"  # Oddiy


class OrderStatus(enum.Enum):
    """Order status enumeration"""
    PENDING = "pending"  # Kutilmoqda
    PROCESSING = "processing"  # Jarayonda
    COMPLETED = "completed"  # Tugallangan
    CANCELLED = "cancelled"  # Bekor qilingan
    RETURNED = "returned"  # Qaytarilgan


class PaymentMethod(enum.Enum):
    """Payment method enumeration"""
    CASH = "cash"  # Naqd
    CARD = "card"  # Plastik karta
    BANK_TRANSFER = "bank_transfer"  # Hisob raqam
    DEBT = "debt"  # Olinadigan (qarz)


# Association table for Role-Permission many-to-many relationship
role_permission = Table(
    'role_permission',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)


class Role(Base):
    """Role model for RBAC"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, nullable=False, default=False)  # System roles cannot be deleted
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    permissions = relationship("Permission", secondary=role_permission, back_populates="roles")
    sellers = relationship("Seller", back_populates="role")


class Permission(Base):
    """Permission model for RBAC"""
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), nullable=False, unique=True)  # e.g., "products.view", "products.create"
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)  # e.g., "products", "customers", "sales"
    description = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    roles = relationship("Role", secondary=role_permission, back_populates="permissions")


class Category(Base):
    """Product Category model"""
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)  # Icon name for UI
    display_order = Column(Integer, nullable=False, default=0)  # For sorting
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    products = relationship("Product", back_populates="category_obj")


class Product(Base):
    """Product model"""
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    item_number = Column(String(100), nullable=True, index=True)  # Mahsulot kodi/nomeri
    barcode = Column(String(100), nullable=True, unique=True)
    
    # Brend va yetkazib beruvchi
    brand = Column(String(100), nullable=True, index=True)  # Brend nomi
    category = Column(String(100), nullable=True, index=True)  # Kategoriya (legacy - for backward compatibility)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)  # New category reference
    supplier = Column(String(200), nullable=True)  # Kimdan kelgan (yetkazib beruvchi)
    received_date = Column(DateTime(timezone=True), nullable=True)  # Qachon kelgan
    
    # Rasm (ixtiyoriy)
    image_url = Column(String(500), nullable=True)  # Mahsulot rasmi URL yoki path
    
    # Ombordagi joylashuv (ombor/joy)
    location = Column(String(200), nullable=True)  # Qaysi omborda yoki joyda turgani
    
    # 1 qopdagi dona soni
    pieces_per_package = Column(Integer, nullable=False, default=1)
    
    # Kelgan narx (purchase/cost price)
    cost_price = Column(Float, nullable=False, default=0.0)  # 1 dona uchun kelgan narx
    
    # Narxlar - mijoz turiga qarab (har bir mijoz turi uchun bitta narx - dona uchun)
    wholesale_price = Column(Float, nullable=False, default=0.0)  # Ulgurji mijoz narxi (dona uchun)
    retail_price = Column(Float, nullable=False, default=0.0)  # Dona mijoz narxi (dona uchun)
    regular_price = Column(Float, nullable=False, default=0.0)  # Oddiy mijoz narxi (dona uchun)
    
    # Ombordagi miqdorlar
    packages_in_stock = Column(Integer, nullable=False, default=0)
    pieces_in_stock = Column(Integer, nullable=False, default=0)
    
    # Computed property
    @property
    def total_pieces(self):
        """Calculate total pieces in stock"""
        # Ensure pieces_per_package is at least 1 to avoid division by zero
        pieces_per_package = self.pieces_per_package if self.pieces_per_package and self.pieces_per_package > 0 else 1
        packages_in_stock = self.packages_in_stock if self.packages_in_stock is not None else 0
        pieces_in_stock = self.pieces_in_stock if self.pieces_in_stock is not None else 0
        return (packages_in_stock * pieces_per_package) + pieces_in_stock
    
    @property
    def total_value(self):
        """Calculate total inventory value (using average price)"""
        total = self.total_pieces
        if total == 0:
            return 0.0
        # Use average of all three prices
        avg_price = (self.wholesale_price + self.retail_price + self.regular_price) / 3
        return total * avg_price
    
    @property
    def total_value_cost(self):
        """Calculate total inventory value using cost price"""
        return self.total_pieces * (self.cost_price or 0.0)
    
    @property
    def total_value_wholesale(self):
        """Calculate total inventory value using wholesale price"""
        return self.total_pieces * (self.wholesale_price or 0.0)
    
    @property
    def last_sold_date(self):
        """Get the last sale date for this product"""
        if not self.sale_items or len(self.sale_items) == 0:
            return None
        try:
            # Get the most recent sale item's sale date
            last_sale_item = max(self.sale_items, key=lambda x: x.sale.created_at if x.sale else None)
            if last_sale_item and last_sale_item.sale:
                return last_sale_item.sale.created_at
        except (ValueError, AttributeError):
            pass
        return None
    
    @property
    def days_since_last_sale(self):
        """Calculate days since last sale"""
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        if not self.last_sold_date:
            # If never sold, use created_at date
            if self.created_at:
                # Make both datetimes timezone-aware
                if self.created_at.tzinfo is None:
                    # If created_at is naive, assume UTC
                    created_at_aware = self.created_at.replace(tzinfo=timezone.utc)
                else:
                    created_at_aware = self.created_at
                days = (now - created_at_aware).days
            else:
                days = 999  # Very old
            return days
        
        # Make last_sold_date timezone-aware if needed
        if self.last_sold_date.tzinfo is None:
            last_sold_aware = self.last_sold_date.replace(tzinfo=timezone.utc)
        else:
            last_sold_aware = self.last_sold_date
        
        days = (now - last_sold_aware).days
        return days
    
    @property
    def is_slow_moving(self):
        """Check if product is slow moving (not sold for 30+ days)"""
        return self.days_since_last_sale >= 30
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    sale_items = relationship("SaleItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    inventory_transactions = relationship("InventoryTransaction", back_populates="product")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    favorited_by = relationship("Favorite", back_populates="product")
    reviews = relationship("ProductReview", back_populates="product", cascade="all, delete-orphan")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    category_obj = relationship("Category", back_populates="products")


class ProductImage(Base):
    """Product images (multiple images per product)"""
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    display_order = Column(Integer, nullable=False, default=0)  # Order for display
    is_primary = Column(Boolean, nullable=False, default=False)  # Primary image flag
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    product = relationship("Product", back_populates="images")


class ProductReview(Base):
    """Product reviews and ratings"""
    __tablename__ = "product_reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    customer_name = Column(String(200), nullable=False)  # Cached name for display
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=True)
    is_verified_purchase = Column(Boolean, nullable=False, default=False)
    helpful_count = Column(Integer, nullable=False, default=0)
    is_approved = Column(Boolean, nullable=False, default=True)  # Admin approval
    is_deleted = Column(Boolean, nullable=False, default=False)  # Soft delete
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="reviews")


class Customer(Base):
    """Customer model"""
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=True)
    address = Column(String(500), nullable=True)
    customer_type = Column(Enum(CustomerType), nullable=False, default=CustomerType.RETAIL)
    notes = Column(Text, nullable=True)
    
    # Authentication fields
    username = Column(String(100), nullable=True, unique=True, index=True)  # Login uchun username
    password_hash = Column(String(255), nullable=True)  # Parol hash
    
    # Debt management
    debt_balance = Column(Float, nullable=False, default=0.0)  # Joriy qarz balansi
    debt_limit = Column(Float, nullable=True)  # Qarz limiti (NULL = cheksiz)
    debt_due_date = Column(DateTime(timezone=True), nullable=True)  # Qarz muddati (ixtiyoriy)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    sales = relationship("Sale", back_populates="customer")
    orders = relationship("Order", back_populates="customer")
    debt_history = relationship("DebtHistory", back_populates="customer")
    search_history = relationship("SearchHistory", back_populates="customer")
    device_tokens = relationship("CustomerDeviceToken", back_populates="customer", cascade="all, delete-orphan")
    # Referral system relationships
    referals_sent = relationship(
        "Referal",
        foreign_keys="Referal.referrer_id",
        back_populates="referrer",
        cascade="all, delete-orphan",
    )
    referals_received = relationship(
        "Referal",
        foreign_keys="Referal.referred_id",
        back_populates="referred",
    )
    # Loyalty program relationship (one account per customer)
    loyalty_points = relationship(
        "LoyaltyPoint",
        back_populates="customer",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Seller(Base):
    """Seller model"""
    __tablename__ = "sellers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True, unique=True, index=True)
    username = Column(String(100), nullable=True, unique=True, index=True)  # Login uchun username
    password_hash = Column(String(255), nullable=True)  # Parol hash
    image_url = Column(String(500), nullable=True)  # Sotuvchi rasmi URL yoki path
    is_active = Column(Boolean, nullable=False, default=True)
    
    # RBAC: Role assignment
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    
    # GPS location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    last_location_update = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="sellers")
    sales = relationship("Sale", back_populates="seller", foreign_keys="Sale.seller_id")
    orders = relationship("Order", back_populates="seller")


class Sale(Base):
    """Sale model"""
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    total_amount = Column(Float, nullable=False, default=0.0)
    
    # Payment method
    payment_method = Column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.CASH)
    
    # Payment details
    payment_amount = Column(Float, nullable=True)  # Mijoz to'lagan summa
    excess_action = Column(String(20), nullable=True)  # 'return' (qaytarish) yoki 'debt' (qarzga qo'shish)
    
    # Admin approval
    requires_admin_approval = Column(Boolean, nullable=False, default=False)  # Admin ruxsati kerakmi
    admin_approved = Column(Boolean, nullable=True)  # Admin ruxsati berildimi (None = kutilmoqda)
    approved_by = Column(Integer, ForeignKey("sellers.id"), nullable=True)  # Kim ruxsat berdi
    approved_at = Column(DateTime(timezone=True), nullable=True)  # Qachon ruxsat berildi
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    seller = relationship("Seller", back_populates="sales", foreign_keys=[seller_id])
    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    approver = relationship("Seller", foreign_keys=[approved_by], viewonly=True)


class SaleItem(Base):
    """Sale item model"""
    __tablename__ = "sale_items"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    # Requested and actual sold quantities
    requested_quantity = Column(Integer, nullable=False)  # Jami so'ralgan dona soni
    packages_sold = Column(Integer, nullable=False, default=0)  # Sotilgan qop soni
    pieces_sold = Column(Integer, nullable=False, default=0)  # Sotilgan dona soni
    
    # Prices at time of sale
    package_price = Column(Float, nullable=False)
    piece_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    
    # Relationships
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")


class Order(Base):
    """Order model (from mobile app)"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.PENDING)
    total_amount = Column(Float, nullable=False, default=0.0)
    
    # Payment method (specified by customer when creating order)
    payment_method = Column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.CASH)
    
    # Offline support
    is_offline = Column(Boolean, nullable=False, default=False)
    synced_at = Column(DateTime(timezone=True), nullable=True)
    
    # Delivery location (for map selection)
    delivery_address = Column(String(500), nullable=True)  # Text address
    delivery_latitude = Column(Float, nullable=True)  # GPS latitude
    delivery_longitude = Column(Float, nullable=True)  # GPS longitude
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    seller = relationship("Seller", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """Order item model"""
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    # Requested and actual sold quantities
    requested_quantity = Column(Integer, nullable=False)
    packages_sold = Column(Integer, nullable=False, default=0)
    pieces_sold = Column(Integer, nullable=False, default=0)
    
    # Prices at time of order
    package_price = Column(Float, nullable=False)
    piece_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class InventoryTransaction(Base):
    """Inventory transaction log"""
    __tablename__ = "inventory_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    transaction_type = Column(String(50), nullable=False)  # sale, purchase, adjustment, etc.
    
    packages_change = Column(Integer, nullable=False)  # Can be negative
    pieces_change = Column(Integer, nullable=False)  # Can be negative
    
    # Reference to related entity
    reference_id = Column(Integer, nullable=True)  # sale_id, order_id, etc.
    reference_type = Column(String(50), nullable=True)  # sale, order, etc.
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="inventory_transactions")


class AuditLog(Base):
    """Audit log for inventory changes"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Who made the change
    user_id = Column(Integer, ForeignKey("sellers.id"), nullable=True)  # NULL if admin/system
    user_name = Column(String(200), nullable=False)  # Cache user name for historical records
    user_type = Column(String(50), nullable=False, default="seller")  # seller, admin, system
    
    # What changed
    action = Column(String(100), nullable=False)  # sale_created, order_cancelled, inventory_adjusted, etc.
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)  # NULL if not product-related
    product_name = Column(String(200), nullable=True)  # Cache product name
    
    # Change details
    quantity_before = Column(Integer, nullable=True)  # Total pieces before
    quantity_after = Column(Integer, nullable=True)  # Total pieces after
    quantity_change = Column(Integer, nullable=False, default=0)  # Net change (can be negative)
    packages_change = Column(Integer, nullable=False, default=0)
    pieces_change = Column(Integer, nullable=False, default=0)
    
    # Why (reason/description)
    reason = Column(Text, nullable=True)  # User-provided reason for manual changes
    
    # Reference
    reference_id = Column(Integer, nullable=True)  # sale_id, order_id, etc.
    reference_type = Column(String(50), nullable=True)  # sale, order, adjustment, etc.
    
    # Additional data as JSON
    extra_data = Column(Text, nullable=True)  # JSON string for additional info
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    product = relationship("Product")
    user = relationship("Seller", foreign_keys=[user_id])


class DebtHistory(Base):
    """Debt history for customers"""
    __tablename__ = "debt_history"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False)
    
    # Transaction details
    transaction_type = Column(String(50), nullable=False)  # payment, debt_added, debt_paid, order_payment
    amount = Column(Float, nullable=False)  # Can be positive (payment) or negative (debt added)
    balance_before = Column(Float, nullable=False)  # Balance before transaction
    balance_after = Column(Float, nullable=False)  # Balance after transaction
    
    # Reference
    reference_id = Column(Integer, nullable=True)  # sale_id, order_id, etc.
    reference_type = Column(String(50), nullable=True)  # sale, order, manual, etc.
    
    # Notes
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("sellers.id"), nullable=True)  # Admin/seller who made the change
    created_by_name = Column(String(200), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    customer = relationship("Customer", back_populates="debt_history")
    creator = relationship("Seller", foreign_keys=[created_by])


class HelpRequest(Base):
    """Help request from customer app"""
    __tablename__ = "help_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer_name = Column(String(200), nullable=True)
    username = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    issue_type = Column(String(50), nullable=True)  # login, password, other, order, product
    status = Column(String(20), nullable=False, default="pending")  # pending, resolved, closed
    resolved_by = Column(Integer, ForeignKey("sellers.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)  # Admin notes
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    customer = relationship("Customer")
    resolver = relationship("Seller", foreign_keys=[resolved_by])


class Favorite(Base):
    """Favorite products for customers"""
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    customer = relationship("Customer")
    product = relationship("Product")
    
    # Unique constraint: one customer can favorite a product only once
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class CustomerProductTag(Base):
    """Personal product tags/categories per customer"""
    __tablename__ = "customer_product_tags"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    tag = Column(String(100), nullable=False, index=True)  # Tag name / personal category

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    customer = relationship("Customer")
    product = relationship("Product")

    # One customer can assign a given tag to a product only once
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class Settings(Base):
    """Application settings model (single row)"""
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True, default=1)  # Always 1, single row
    
    # Store/Company information
    store_name = Column(String(200), nullable=True, default="Do'kon")
    store_address = Column(String(500), nullable=True)
    store_phone = Column(String(50), nullable=True)
    store_email = Column(String(100), nullable=True)
    store_inn = Column(String(50), nullable=True)  # INN/STIR
    store_tin = Column(String(50), nullable=True)  # Tax ID
    
    # Logo
    logo_url = Column(String(500), nullable=True)  # Path to logo image
    
    # Receipt settings
    receipt_footer_text = Column(Text, nullable=True, default="Xaridingiz uchun rahmat!")
    receipt_show_logo = Column(Boolean, nullable=False, default=True)
    
    # Work schedule for location tracking
    work_start_time = Column(String(10), nullable=True, default="09:00")  # Format: "HH:MM"
    work_end_time = Column(String(10), nullable=True, default="18:00")  # Format: "HH:MM"
    work_days = Column(String(20), nullable=True, default="1,2,3,4,5,6,7")  # Comma-separated: 1=Monday, 7=Sunday
    
    # Notification settings
    notify_new_sale = Column(Boolean, nullable=False, default=True)  # Yangi sotuv bildirishnomasi
    notify_low_stock = Column(Boolean, nullable=False, default=True)  # Kam qolgan mahsulotlar
    notify_debt_limit = Column(Boolean, nullable=False, default=True)  # Qarz limiti oshganlar
    notify_daily_report = Column(Boolean, nullable=False, default=True)  # Kunlik hisobotlar

    # Customer app feature toggles
    enable_referals = Column(Boolean, nullable=False, default=False)
    enable_loyalty = Column(Boolean, nullable=False, default=False)
    enable_price_alerts = Column(Boolean, nullable=False, default=False)
    enable_favorites = Column(Boolean, nullable=False, default=False)
    enable_tags = Column(Boolean, nullable=False, default=False)
    enable_reviews = Column(Boolean, nullable=False, default=False)
    enable_location_selection = Column(Boolean, nullable=False, default=False)
    enable_offline_orders = Column(Boolean, nullable=False, default=False)

    # Customer app configuration
    referal_bonus_points = Column(Integer, nullable=False, default=100)
    referal_bonus_percent = Column(Float, nullable=False, default=5.0)
    loyalty_points_per_sum = Column(Float, nullable=False, default=0.01)
    loyalty_point_value = Column(Float, nullable=False, default=1.0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Banner(Base):
    """Advertisement banner model"""
    __tablename__ = "banners"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=True)  # Banner sarlavhasi (ixtiyoriy)
    image_url = Column(String(500), nullable=False)  # Rasm URL
    link_url = Column(String(500), nullable=True)  # Link URL (ixtiyoriy)
    is_active = Column(Boolean, nullable=False, default=True)  # Faollik holati
    display_order = Column(Integer, nullable=False, default=0)  # Ko'rsatish tartibi
    rotation_interval = Column(Integer, nullable=False, default=3000)  # Almashish vaqti (millisekundlarda, default 3 soniya)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PriceAlert(Base):
    """Price alert model for customers to get notified when product price drops"""
    __tablename__ = "price_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    # Alert conditions
    target_price = Column(Float, nullable=False)  # Price threshold to trigger alert
    is_active = Column(Boolean, nullable=False, default=True)  # Whether alert is active
    notified = Column(Boolean, nullable=False, default=False)  # Whether notification was sent
    notified_at = Column(DateTime(timezone=True), nullable=True)  # When notification was sent
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    customer = relationship("Customer")
    product = relationship("Product")
    
    # Unique constraint: one customer can have one alert per product
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class OtpCode(Base):
    """One-time password codes for phone/email verification"""
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    code = Column(String(10), nullable=False)
    purpose = Column(String(50), nullable=False, default="phone_verification")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    customer = relationship("Customer")

    __table_args__ = (
        {'sqlite_autoincrement': True},
    )


class CustomerDeviceToken(Base):
    """Device token for push notifications (Expo Push Token)"""
    __tablename__ = "customer_device_tokens"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    token = Column(String(500), nullable=False, unique=True, index=True)  # Expo push token
    device_id = Column(String(200), nullable=True)  # Device identifier (optional)
    platform = Column(String(50), nullable=True)  # "ios", "android", "web"
    is_active = Column(Boolean, nullable=False, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer", back_populates="device_tokens")


class SearchHistory(Base):
    """Search history for customers"""
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    search_query = Column(String(500), nullable=False)
    result_count = Column(Integer, nullable=True)  # Number of results found
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    customer = relationship("Customer", back_populates="search_history")


class Conversation(Base):
    """Chat conversation between customer and admin"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=True, index=True)  # Admin/seller handling the conversation
    subject = Column(String(200), nullable=True)  # Conversation subject/title
    status = Column(String(20), nullable=False, default="open")  # open, closed, resolved
    is_customer_archived = Column(Boolean, nullable=False, default=False)
    is_admin_archived = Column(Boolean, nullable=False, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_message_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Relationships
    customer = relationship("Customer")
    seller = relationship("Seller")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    """Individual chat message in a conversation"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_type = Column(String(20), nullable=False)  # "customer" or "admin"
    sender_id = Column(Integer, nullable=False)  # customer_id or seller_id depending on sender_type
    sender_name = Column(String(200), nullable=False)  # Cached sender name for display
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


class Referal(Base):
    """Referal/Invite system model"""
    __tablename__ = "referals"
    
    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)  # Who invited
    referred_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)  # Who was invited (null if not registered yet)
    referal_code = Column(String(20), nullable=False, unique=True, index=True)  # Unique referal code
    phone = Column(String(20), nullable=True)  # Phone number of invited person (if not registered yet)
    status = Column(String(20), nullable=False, default="pending")  # pending, registered, completed
    bonus_given = Column(Boolean, nullable=False, default=False)  # Whether bonus was given to referrer
    bonus_amount = Column(Float, nullable=True, default=0)  # Bonus amount given
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    referrer = relationship("Customer", foreign_keys=[referrer_id], back_populates="referals_sent")
    referred = relationship("Customer", foreign_keys=[referred_id], back_populates="referals_received")


class LoyaltyPoint(Base):
    """Loyalty points/bonus system model"""
    __tablename__ = "loyalty_points"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    points = Column(Integer, nullable=False, default=0)  # Current points balance
    total_earned = Column(Integer, nullable=False, default=0)  # Total points ever earned
    total_spent = Column(Integer, nullable=False, default=0)  # Total points ever spent
    vip_level = Column(String(20), nullable=False, default="bronze")  # bronze, silver, gold, platinum
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="loyalty_points")
    transactions = relationship("LoyaltyTransaction", back_populates="loyalty_account", cascade="all, delete-orphan")


class LoyaltyTransaction(Base):
    """Loyalty points transaction history"""
    __tablename__ = "loyalty_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    loyalty_point_id = Column(Integer, ForeignKey("loyalty_points.id"), nullable=False, index=True)
    transaction_type = Column(String(20), nullable=False)  # earned, spent, expired, bonus
    points = Column(Integer, nullable=False)  # Positive for earned, negative for spent
    description = Column(String(500), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)  # Related order if applicable
    referal_id = Column(Integer, ForeignKey("referals.id"), nullable=True)  # Related referal if applicable
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # When points expire (if applicable)
    
    # Relationships
    loyalty_account = relationship("LoyaltyPoint", back_populates="transactions")
    order = relationship("Order")
    referal = relationship("Referal")


class ProductVariant(Base):
    """Product variants (size, color, etc.)"""
    __tablename__ = "product_variants"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    variant_type = Column(String(50), nullable=False)  # size, color, material, etc.
    variant_value = Column(String(100), nullable=False)  # XL, Red, Cotton, etc.
    sku = Column(String(100), nullable=True, unique=True)  # Stock Keeping Unit
    price_modifier = Column(Float, nullable=True, default=0)  # Price difference from base product
    stock_quantity = Column(Integer, nullable=True)  # Stock for this variant
    is_default = Column(Boolean, nullable=False, default=False)  # Is this the default variant?
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="variants")

