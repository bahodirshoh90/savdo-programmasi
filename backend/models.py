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


class Product(Base):
    """Product model"""
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    item_number = Column(String(100), nullable=True, index=True)  # Mahsulot kodi/nomeri
    barcode = Column(String(100), nullable=True, unique=True)
    
    # Brend va yetkazib beruvchi
    brand = Column(String(100), nullable=True, index=True)  # Brend nomi
    category = Column(String(100), nullable=True, index=True)  # Kategoriya
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

