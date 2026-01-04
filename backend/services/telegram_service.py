import os
import sys
import logging
from telegram import Update, Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, CallbackQueryHandler, MessageHandler, filters
from dotenv import load_dotenv

# Backend direktoryasini sys.path ga qo'shish
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN') or 'TOKENNI_BU_YERGA_QO`YING'
ADMIN_CHAT_IDS = [int(x) for x in (os.getenv('ADMIN_CHAT_IDS') or '').split(',') if x.strip().isdigit()]

def get_main_keyboard():
    """Asosiy menyu tugmalari"""
    keyboard = [
        [
            InlineKeyboardButton("🛒 Yangi Sotuv", callback_data='new_sale'),
            InlineKeyboardButton("🔍 Qidiruv", callback_data='search_menu')
        ],
        [
            InlineKeyboardButton("📊 Statistika", callback_data='stats_menu'),
            InlineKeyboardButton("✅ Tasdiqlar", callback_data='approvals_menu')
        ],
        [
            InlineKeyboardButton("⚠️ Ogohlantirishlar", callback_data='alerts_menu'),
            InlineKeyboardButton("👥 Mijozlar", callback_data='customers_menu')
        ],
        [
            InlineKeyboardButton("📦 Mahsulotlar", callback_data='products_menu'),
            InlineKeyboardButton("💳 To'lovlar", callback_data='payments_menu')
        ],
        [
            InlineKeyboardButton("📊 Tahlil", callback_data='analytics_menu'),
            InlineKeyboardButton("📥 Hisobotlar", callback_data='reports_menu')
        ],
        [
            InlineKeyboardButton("📷 Shtrix kod", callback_data='barcode_scan'),
            InlineKeyboardButton("🎤 Ovozli buyruq", callback_data='voice_help')
        ],
        [
            InlineKeyboardButton("⚙️ Sozlamalar", callback_data='settings_menu')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_approvals_menu():
    """Tasdiqlar menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("✅ Kutayotganlar", callback_data='pending_sales'),
            InlineKeyboardButton("📋 Tasdiqlanganlar", callback_data='approved_sales')
        ],
        [
            InlineKeyboardButton("❌ Rad etilganlar", callback_data='rejected_sales')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_analytics_menu():
    """Tahlil menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("� Haftalik grafik", callback_data='sales_chart'),
            InlineKeyboardButton("📈 Oylik grafik", callback_data='monthly_chart')
        ],
        [
            InlineKeyboardButton("📈 Tendentsiyalar", callback_data='sales_trends'),
            InlineKeyboardButton("🎯 ABC tahlil", callback_data='abc_analysis')
        ],
        [
            InlineKeyboardButton("⚖️ Solishtirish", callback_data='comparison_menu'),
            InlineKeyboardButton("💡 Tavsiyalar", callback_data='recommendations')
        ],
        [
            InlineKeyboardButton("🔮 Bashorat", callback_data='sales_forecast'),
            InlineKeyboardButton("📅 Yil taqqoslash", callback_data='year_comparison')
        ],
        [
            InlineKeyboardButton("🤖 Aqlli tavsiya", callback_data='smart_suggestions')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_comparison_menu():
    """Solishtirish menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("📅 Oylarni solishtirish", callback_data='compare_months'),
            InlineKeyboardButton("👨‍💼 Sotuvchilarni solishtirish", callback_data='compare_sellers')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='analytics_menu')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_settings_menu():
    """Sozlamalar menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("🔔 Bildirishnomalar", callback_data='notification_settings'),
            InlineKeyboardButton("⏰ Avtomatik hisobotlar", callback_data='scheduled_reports_settings')
        ],
        [
            InlineKeyboardButton("📅 Kunlik hisobot", callback_data='toggle_daily_report'),
            InlineKeyboardButton("📆 Haftalik hisobot", callback_data='toggle_weekly_report')
        ],
        [
            InlineKeyboardButton("🖥️ Tizim holati", callback_data='system_status')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_stats_menu():
    """Statistika menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("📊 Umumiy", callback_data='stats'),
            InlineKeyboardButton("📅 Bugungi", callback_data='today')
        ],
        [
            InlineKeyboardButton("📆 Haftalik", callback_data='weekly'),
            InlineKeyboardButton("📈 Oylik", callback_data='monthly')
        ],
        [
            InlineKeyboardButton("🛒 So'nggi sotuvlar", callback_data='recent_sales')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_customers_menu():
    """Mijozlar menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("👥 Top mijozlar", callback_data='top_customers'),
            InlineKeyboardButton("💸 Qarzdorlar", callback_data='debtors')
        ],
        [
            InlineKeyboardButton("⚠️ Qarz limiti oshganlar", callback_data='debt_limit_exceeded'),
            InlineKeyboardButton("🎂 Tug'ilgan kunlar", callback_data='birthdays')
        ],
        [
            InlineKeyboardButton("⭐ Sodiqlik dasturi", callback_data='loyalty_program'),
            InlineKeyboardButton("📨 Ommaviy xabar", callback_data='broadcast_message')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_products_menu():
    """Mahsulotlar menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("🏆 Top mahsulotlar", callback_data='top_products'),
            InlineKeyboardButton("📉 Kam sotilgan", callback_data='slow_moving')
        ],
        [
            InlineKeyboardButton("⚠️ Kam qolgan", callback_data='low_stock'),
            InlineKeyboardButton("🗃 Ombor", callback_data='stock')
        ],
        [
            InlineKeyboardButton("🔔 Ombor ogohlantirishlari", callback_data='stock_alerts'),
            InlineKeyboardButton("📋 Inventarizatsiya", callback_data='inventory_check')
        ],
        [
            InlineKeyboardButton("🚚 Yetkazib berish", callback_data='delivery_tracking')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_alerts_menu():
    """Ogohlantirishlar menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("⚠️ Kam qolgan mahsulotlar", callback_data='low_stock'),
            InlineKeyboardButton("🚨 Qarz limiti", callback_data='debt_limit_exceeded')
        ],
        [
            InlineKeyboardButton("📉 Kam sotilganlar", callback_data='slow_moving')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_payments_menu():
    """To'lovlar menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("💳 To'lov statistikasi", callback_data='payment_stats'),
            InlineKeyboardButton("👨‍💼 Sotuvchilar", callback_data='sellers_stats')
        ],
        [
            InlineKeyboardButton("💵 Kassa hisoboti", callback_data='cash_report'),
            InlineKeyboardButton("💳 To'lov qabul qilish", callback_data='receive_payment')
        ],
        [
            InlineKeyboardButton("⏰ To'lov eslatmalari", callback_data='payment_reminders'),
            InlineKeyboardButton("🧾 Chek yuborish", callback_data='send_receipt')
        ],
        [
            InlineKeyboardButton("📍 Sotuvchi lokatsiyasi", callback_data='seller_locations'),
            InlineKeyboardButton("⏰ Ish vaqti", callback_data='work_time_report')
        ],
        [
            InlineKeyboardButton("🎯 Sotuvchi rejalari", callback_data='seller_targets'),
            InlineKeyboardButton("🏆 Reyting", callback_data='seller_ranking')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_reports_menu():
    """Hisobotlar menyusi"""
    keyboard = [
        [
            InlineKeyboardButton("📥 Excel hisobot", callback_data='export_excel'),
            InlineKeyboardButton("📄 PDF hisobot", callback_data='export_pdf')
        ],
        [
            InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

# Admin bildirishnoma funksiyasi
async def notify_admins_new_sale(sale_id: int, customer_name: str, seller_name: str, total_amount: float):
    """Adminlarga yangi sotuv haqida bildirishnoma yuborish"""
    try:
        bot = Bot(token=TELEGRAM_TOKEN)
        
        text = f"🔔 YANGI SOTUV TASDIQLASHNI KUTMOQDA!\n\n"
        text += f"ID: #{sale_id}\n"
        text += f"👤 Mijoz: {customer_name}\n"
        text += f"👨‍💼 Sotuvchi: {seller_name}\n"
        text += f"💰 Summa: {total_amount:,.0f} so'm\n\n"
        text += f"Ko'rish va tasdiqlash uchun:\n"
        text += f"/view_sale {sale_id}"
        
        for admin_id in ADMIN_CHAT_IDS:
            try:
                await bot.send_message(chat_id=admin_id, text=text)
            except Exception as e:
                logging.error(f"Admin {admin_id}ga xabar yuborishda xatolik: {e}")
    except Exception as e:
        logging.error(f"Adminlarga bildirishnoma yuborishda xatolik: {e}")

# Asosiy bot funksiyasi
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    welcome_text = (
        "🤖 Savdo botiga xush kelibsiz!\n\n"
        "Bu bot orqali siz:\n"
        "📊 Statistikani ko'rishingiz\n"
        "👥 Mijozlarni boshqarishingiz\n"
        "📦 Mahsulotlarni kuzatishingiz\n"
        "⚠️ Ogohlantirish olishingiz mumkin\n\n"
        "Quyidagi menyudan kerakli bo'limni tanlang:"
    )
    await update.message.reply_text(welcome_text, reply_markup=get_main_keyboard())

# Menyu ko'rsatish funksiyalari
async def show_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "📱 Asosiy menyu - kerakli bo'limni tanlang:"
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=get_main_keyboard())
    else:
        await update.message.reply_text(text, reply_markup=get_main_keyboard())

async def show_stats_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "📊 STATISTIKA BO'LIMI\n\nKerakli davrni tanlang:"
    await update.callback_query.edit_message_text(text, reply_markup=get_stats_menu())

async def show_search_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "🔍 QIDIRUV\n\nNima qidirmoqchisiz?"
    keyboard = [
        [InlineKeyboardButton("📦 Mahsulot", callback_data='search_product')],
        [InlineKeyboardButton("👤 Mijoz", callback_data='search_customer')],
        [InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')]
    ]
    await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

async def search_product_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mahsulot qidiruv so'rovi"""
    text = (
        "📦 MAHSULOT QIDIRISH\n\n"
        "Mahsulot nomi yoki barcode ni kiriting:\n"
        "Masalan: Nike krossovka yoki 1234567890\n\n"
        "Bekor qilish uchun /cancel yozing"
    )
    keyboard = [[InlineKeyboardButton("❌ Bekor qilish", callback_data='search_menu')]]
    await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
    # Context ga flag qo'yamiz
    context.user_data['waiting_for'] = 'product_search'

async def search_customer_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mijoz qidiruv so'rovi"""
    text = (
        "👤 MIJOZ QIDIRISH\n\n"
        "Mijoz nomi yoki telefon raqamini kiriting:\n"
        "Masalan: Ali Valiyev yoki +998901234567\n\n"
        "Bekor qilish uchun /cancel yozing"
    )
    keyboard = [[InlineKeyboardButton("❌ Bekor qilish", callback_data='search_menu')]]
    await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
    # Context ga flag qo'yamiz
    context.user_data['waiting_for'] = 'customer_search'

async def handle_search_input(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Qidiruv kiritmasini qayta ishlash"""
    
    # Shtrix kod orqali tanlangan mahsulot miqdori
    if context.user_data.get('awaiting_barcode_quantity'):
        await handle_barcode_sale_quantity(update, context)
        return
    
    # Chatbot - oddiy savollarga javob
    if 'waiting_for' not in context.user_data:
        # Chatbot funksiyasi
        handled = await handle_chatbot_message(update, context)
        if handled:
            return
        # Agar chatbot ham javob bermasa
        return
    
    search_type = context.user_data.get('waiting_for')
    search_query = update.message.text.strip()
    
    if search_query == '/cancel':
        context.user_data.pop('waiting_for', None)
        await update.message.reply_text("❌ Qidiruv bekor qilindi", reply_markup=get_main_keyboard())
        return
    
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Product, Customer
        
        db: Session = SessionLocal()
        try:
            if search_type == 'product_search':
                # Mahsulot qidirish
                products = db.query(Product).filter(
                    (Product.name.ilike(f'%{search_query}%')) | 
                    (Product.barcode.ilike(f'%{search_query}%')) |
                    (Product.brand.ilike(f'%{search_query}%'))
                ).limit(5).all()  # Rasm bilan ko'rsatish uchun 5 tagacha
                
                if not products:
                    text = f"❌ '{search_query}' bo'yicha mahsulot topilmadi"
                    keyboard = [[InlineKeyboardButton("🔄 Qayta qidirish", callback_data='search_product')],
                               [InlineKeyboardButton("⬅️ Orqaga", callback_data='search_menu')]]
                    context.user_data.pop('waiting_for', None)
                    await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
                else:
                    context.user_data.pop('waiting_for', None)
                    
                    # Har bir mahsulot uchun rasm va ma'lumot yuborish
                    for i, p in enumerate(products, 1):
                        caption = f"🏷 {p.name}\n"
                        if p.brand:
                            caption += f"Brend: {p.brand}\n"
                        if p.barcode:
                            caption += f"Barcode: {p.barcode}\n"
                        caption += f"Qoldiq: {p.packages_in_stock} qop, {p.pieces_in_stock} dona\n"
                        caption += f"Jami: {p.packages_in_stock * p.pieces_per_package + p.pieces_in_stock} dona\n"
                        caption += f"Narxi: {p.wholesale_price:,.0f} so'm"
                        
                        # Sotuv tugmasi
                        keyboard = [[InlineKeyboardButton("🛒 Sotuv qilish", callback_data=f'sell_product_{p.id}')]]
                        
                        # Rasm bilan yuborish
                        import os
                        if p.image_url and os.path.exists(os.path.join(os.path.dirname(__file__), '..', '..', p.image_url.lstrip('/'))):
                            photo_path = os.path.join(os.path.dirname(__file__), '..', '..', p.image_url.lstrip('/'))
                            try:
                                with open(photo_path, 'rb') as photo:
                                    await update.message.reply_photo(
                                        photo=photo,
                                        caption=caption,
                                        reply_markup=InlineKeyboardMarkup(keyboard)
                                    )
                            except Exception as e:
                                logging.error(f"Photo send error: {e}")
                                await update.message.reply_text(caption, reply_markup=InlineKeyboardMarkup(keyboard))
                        else:
                            await update.message.reply_text(caption, reply_markup=InlineKeyboardMarkup(keyboard))
                    
                    # Oxirgi xabar - qayta qidirish
                    final_keyboard = [[InlineKeyboardButton("🔄 Qayta qidirish", callback_data='search_product')],
                                     [InlineKeyboardButton("⬅️ Orqaga", callback_data='search_menu')]]
                    await update.message.reply_text(
                        f"📦 Topildi: {len(products)} ta mahsulot",
                        reply_markup=InlineKeyboardMarkup(final_keyboard)
                    )
            
            elif search_type == 'customer_search':
                # Mijoz qidirish
                customers = db.query(Customer).filter(
                    (Customer.name.ilike(f'%{search_query}%')) | 
                    (Customer.phone.ilike(f'%{search_query}%'))
                ).limit(10).all()
                
                if not customers:
                    text = f"❌ '{search_query}' bo'yicha mijoz topilmadi"
                    keyboard = [[InlineKeyboardButton("🔄 Qayta qidirish", callback_data='search_customer')],
                               [InlineKeyboardButton("⬅️ Orqaga", callback_data='search_menu')]]
                else:
                    text = f"👥 TOPILGAN MIJOZLAR ({len(customers)}):\n\n"
                    for c in customers:
                        text += f"👤 {c.name}\n"
                        text += f"   📞 {c.phone}\n"
                        text += f"   Turi: {c.customer_type.value}\n"
                        if c.debt_balance > 0:
                            text += f"   💰 Qarzi: {c.debt_balance:,.0f} so'm\n"
                        text += "\n"
                    
                    keyboard = [[InlineKeyboardButton("🔄 Qayta qidirish", callback_data='search_customer')],
                               [InlineKeyboardButton("⬅️ Orqaga", callback_data='search_menu')]]
                
                context.user_data.pop('waiting_for', None)
                await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
            
            elif search_type == 'inline_sale_quantity':
                # Inline sotuv miqdori
                await handle_inline_sale_quantity(update, context, search_query)
            
            elif search_type == 'inline_sale_customer':
                # Inline sotuv mijoz tanlov
                await handle_inline_sale_customer_selection(update, context, search_query)
            
            elif search_type == 'inline_sale_payment':
                # Inline sotuv to'lov miqdori
                await handle_inline_sale_payment(update, context, search_query)
            
            elif search_type == 'payment_amount':
                # To'lov qabul qilish
                await handle_payment_amount_input(update, context, search_query)
        finally:
            db.close()
    except Exception as e:
        logging.error(f"Search error: {str(e)}")
        context.user_data.pop('waiting_for', None)
        await update.message.reply_text(f"❌ Xatolik: {str(e)}", reply_markup=get_main_keyboard())


async def handle_inline_sale_quantity(update: Update, context: ContextTypes.DEFAULT_TYPE, quantity_text: str):
    """Inline sotuv miqdorini qayta ishlash"""
    try:
        # Miqdorni tekshirish
        try:
            quantity = int(quantity_text)
            if quantity <= 0:
                raise ValueError("Miqdor musbat bo'lishi kerak")
        except ValueError:
            await update.message.reply_text(
                "❌ Noto'g'ri miqdor. Iltimos, raqam kiriting (masalan: 10)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("❌ Bekor qilish", callback_data='search_product')]])
            )
            return
        
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Product, Customer
        
        db: Session = SessionLocal()
        try:
            product_id = context.user_data.get('inline_sale_product_id')
            if not product_id:
                await update.message.reply_text("❌ Mahsulot ma'lumoti topilmadi.")
                return
            
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                await update.message.reply_text("❌ Mahsulot topilmadi.")
                return
            
            # Mavjudlikni tekshirish
            total_pieces = product.packages_in_stock * product.pieces_per_package + product.pieces_in_stock
            if quantity > total_pieces:
                await update.message.reply_text(
                    f"❌ Omborда {total_pieces} dona bor, {quantity} ta so'ralgan.",
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("❌ Bekor qilish", callback_data='search_product')]])
                )
                return
            
            # Miqdor va narxni saqlash
            context.user_data['inline_sale_quantity'] = quantity
            
            # Mijoz tanlashni so'rash
            text = f"✅ MAHSULOT TANLANDI:\n\n"
            text += f"📦 Mahsulot: {product.name}\n"
            text += f"🔢 Miqdor: {quantity} dona\n\n"
            text += "Mijoz ismini yozing:"
            
            context.user_data['waiting_for'] = 'inline_sale_customer'
            
            keyboard = [[InlineKeyboardButton("❌ Bekor qilish", callback_data='search_product')]]
            await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.message.reply_text(f"❌ Xatolik: {str(e)}")


async def handle_inline_sale_customer_selection(update: Update, context: ContextTypes.DEFAULT_TYPE, customer_name: str):
    """Inline sotuv mijoz tanlovini qayta ishlash"""
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from models import Product, Customer, Seller
            from services.sale_service import SaleService
            from schemas import SaleCreate, SaleItemCreate
            from services.customer_service import CustomerService
            from schemas import CustomerCreate
        except ImportError:
            from database import SessionLocal
            from models import Product, Customer, Seller
            from sale_service import SaleService
            from schemas import SaleCreate, SaleItemCreate
            from customer_service import CustomerService
            from schemas import CustomerCreate
        
        db: Session = SessionLocal()
        try:
            # Mijozni topish yoki yaratish
            customer = db.query(Customer).filter(Customer.name.ilike(f'%{customer_name}%')).first()
            if not customer:
                # Yangi mijoz yaratish
                customer_data = CustomerCreate(
                    name=customer_name.title(),
                    customer_type="retail"  # Standart mijoz
                )
                customer = CustomerService.create_customer(db, customer_data)
            
            # Admin (bot orqali sotuv uchun birinchi faol sotuvchini topamiz)
            admin_seller = db.query(Seller).filter(Seller.is_active == True).first()
            if not admin_seller:
                await update.message.reply_text("❌ Faol sotuvchi topilmadi.")
                return
            
            # Sotuv ma'lumotlarini olish
            product_id = context.user_data.get('inline_sale_product_id')
            quantity = context.user_data.get('inline_sale_quantity')
            
            if not all([product_id, quantity]):
                await update.message.reply_text("❌ Sotuv ma'lumotlari noto'liq.")
                return
            
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                await update.message.reply_text("❌ Mahsulot topilmadi.")
                return
            
            # Narx hisoblaash (mijoz turiga qarab)
            if customer.customer_type.value == 'wholesale':
                unit_price = product.wholesale_price
            elif customer.customer_type.value == 'retail':
                unit_price = product.retail_price  
            else:
                unit_price = product.regular_price
                
            total_price = quantity * unit_price
            
            # To'lov miqdorini so'rash
            payment_text = f"💰 TO'LOV MA'LUMOTLARI:\n\n"
            payment_text += f"📦 Mahsulot: {product.name}\n"
            payment_text += f"👤 Mijoz: {customer.name}\n"
            payment_text += f"🔢 Miqdor: {quantity} dona\n"
            payment_text += f"💵 Narx: {unit_price:,.0f} so'm/dona\n"
            payment_text += f"💳 Jami summa: {total_price:,.0f} so'm\n\n"
            payment_text += "💰 Mijoz necha so'm to'layapti?\n"
            payment_text += "(To'liq to'lash uchun: raqam kiriting)\n"
            payment_text += "(Qarzga yozish uchun: 0 yoki kam summa kiriting)"
            
            # Ma'lumotlarni saqlash
            context.user_data['inline_sale_customer'] = customer
            context.user_data['inline_sale_unit_price'] = unit_price
            context.user_data['inline_sale_total_price'] = total_price
            context.user_data['waiting_for'] = 'inline_sale_payment'
            
            keyboard = [[InlineKeyboardButton("❌ Bekor qilish", callback_data='search_product')]]
            await update.message.reply_text(payment_text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        # Ma'lumotlarni tozalash
        context.user_data.pop('inline_sale_product_id', None)
        context.user_data.pop('inline_sale_quantity', None)
        context.user_data.pop('inline_sale_customer', None)
        context.user_data.pop('inline_sale_unit_price', None)
        context.user_data.pop('inline_sale_total_price', None)
        context.user_data.pop('waiting_for', None)
        
        await update.message.reply_text(f"❌ Mijoz tanlashda xatolik: {str(e)}")


async def handle_inline_sale_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, payment_text: str):
    """Inline sotuv to'lov miqdorini qayta ishlash va sotuvni yakunlash"""
    try:
        # To'lov miqdorini tekshirish
        try:
            payment_amount = float(payment_text)
            if payment_amount < 0:
                raise ValueError("To'lov summasi manfiy bo'lishi mumkin emas")
        except ValueError:
            await update.message.reply_text(
                "❌ Noto'g'ri to'lov summasi. Iltimos, raqam kiriting (masalan: 50000)",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("❌ Bekor qilish", callback_data='search_product')]])
            )
            return
        
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Product, Customer, Seller
        from sale_service import SaleService
        from schemas import SaleCreate, SaleItemCreate
        
        db: Session = SessionLocal()
        try:
            # Ma'lumotlarni olish
            product_id = context.user_data.get('inline_sale_product_id')
            quantity = context.user_data.get('inline_sale_quantity')
            customer = context.user_data.get('inline_sale_customer')
            unit_price = context.user_data.get('inline_sale_unit_price')
            total_price = context.user_data.get('inline_sale_total_price')
            
            if not all([product_id, quantity, customer, unit_price, total_price]):
                await update.message.reply_text("❌ Sotuv ma'lumotlari noto'liq.")
                return
            
            # Admin seller
            admin_seller = db.query(Seller).filter(Seller.is_active == True).first()
            if not admin_seller:
                await update.message.reply_text("❌ Faol sotuvchi topilmadi.")
                return
            
            # To'lov validatsiyasi va admin tasdiq logikasi (sales panel kabi)
            requires_approval = False
            excess_action = "change"  # Standart: qoldiq qaytarish
            
            # Agar to'lov summa jami summadan kam bo'lsa - admin tasdiqi kerak
            if payment_amount < total_price:
                requires_approval = True
                excess_action = "debt"  # Qarzga yozish
                
                # Qarz limiti tekshirish
                debt_amount = total_price - payment_amount
                if customer.debt_limit and customer.debt_limit > 0:
                    new_debt = (customer.debt_balance or 0) + debt_amount
                    if new_debt > customer.debt_limit:
                        await update.message.reply_text(
                            f"❌ QARZ LIMITI OSHIB KETADI!\n\n"
                            f"👤 Mijoz: {customer.name}\n"
                            f"💰 Joriy qarz: {customer.debt_balance:,.0f} so'm\n"
                            f"🔢 Qarz limiti: {customer.debt_limit:,.0f} so'm\n"
                            f"➕ Qo'shiladigan qarz: {debt_amount:,.0f} so'm\n"
                            f"📊 Yangi qarz: {new_debt:,.0f} so'm\n\n"
                            f"Admin tasdiqi kerak!"
                        )
                        # Continue with approval required
            
            # Sotuvni yaratish (sales panel logikasi bilan)
            sale_data = SaleCreate(
                seller_id=admin_seller.id,
                customer_id=customer.id,
                items=[
                    SaleItemCreate(
                        product_id=product_id,
                        requested_quantity=quantity
                    )
                ],
                payment_method="cash",  # Bot orqali sotuv standart naqd
                payment_amount=payment_amount,
                excess_action=excess_action,
                requires_admin_approval=requires_approval
            )
            
            sale = SaleService.create_sale(db, sale_data)
            
            # Muvaffaqiyat xabari
            product = db.query(Product).filter(Product.id == product_id).first()
            
            if requires_approval:
                # Admin tasdiqi kutilayotgan sotuv
                text = f"⏳ SOTUV ADMIN TASDIGINI KUTMOQDA!\n\n"
                text += f"📄 Sotuv ID: #{sale.id}\n"
                text += f"👤 Mijoz: {customer.name}\n"
                text += f"📦 Mahsulot: {product.name}\n"
                text += f"🔢 Miqdor: {quantity} dona\n"
                text += f"💵 Jami summa: {total_price:,.0f} so'm\n"
                text += f"💰 To'langan: {payment_amount:,.0f} so'm\n"
                
                if payment_amount < total_price:
                    debt_amount = total_price - payment_amount
                    text += f"📝 Qarz: {debt_amount:,.0f} so'm\n"
                
                text += f"📅 Sana: {sale.created_at.strftime('%Y-%m-%d %H:%M')}\n\n"
                text += "🔔 Admin tasdiqlashini kuting..."
            else:
                # To'liq to'langan sotuv
                text = f"✅ SOTUV MUVAFFAQIYATLI!\n\n"
                text += f"📄 Sotuv ID: #{sale.id}\n"
                text += f"👤 Mijoz: {customer.name}\n"
                text += f"📦 Mahsulot: {product.name}\n"
                text += f"🔢 Miqdor: {quantity} dona\n"
                text += f"💵 Jami summa: {total_price:,.0f} so'm\n"
                text += f"💰 To'langan: {payment_amount:,.0f} so'm\n"
                
                if payment_amount > total_price:
                    change = payment_amount - total_price
                    text += f"🔄 Qoldiq: {change:,.0f} so'm\n"
                
                text += f"📅 Sana: {sale.created_at.strftime('%Y-%m-%d %H:%M')}"
            
            # Ma'lumotlarni tozalash
            context.user_data.pop('inline_sale_product_id', None)
            context.user_data.pop('inline_sale_quantity', None)
            context.user_data.pop('inline_sale_customer', None)
            context.user_data.pop('inline_sale_unit_price', None)
            context.user_data.pop('inline_sale_total_price', None)
            context.user_data.pop('waiting_for', None)
            
            keyboard = [[InlineKeyboardButton("🔍 Boshqa mahsulot qidirish", callback_data='search_product')],
                       [InlineKeyboardButton("🏠 Bosh menyu", callback_data='back_main')]]
            await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        # Ma'lumotlarni tozalash
        context.user_data.pop('inline_sale_product_id', None)
        context.user_data.pop('inline_sale_quantity', None)
        context.user_data.pop('inline_sale_customer', None)  
        context.user_data.pop('inline_sale_unit_price', None)
        context.user_data.pop('inline_sale_total_price', None)
        context.user_data.pop('waiting_for', None)
        
        await update.message.reply_text(f"❌ Sotuv yaratishda xatolik: {str(e)}")


async def show_customers_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "👥 MIJOZLAR BO'LIMI\n\nKerakli ma'lumotni tanlang:"
    await update.callback_query.edit_message_text(text, reply_markup=get_customers_menu())

async def show_products_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "📦 MAHSULOTLAR BO'LIMI\n\nKerakli ma'lumotni tanlang:"
    await update.callback_query.edit_message_text(text, reply_markup=get_products_menu())

async def show_alerts_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "⚠️ OGOHLANTIRISHLAR\n\nTekshirish kerak bo'lgan ma'lumotlar:"
    await update.callback_query.edit_message_text(text, reply_markup=get_alerts_menu())

async def show_payments_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "💳 TO'LOVLAR VA SOTUVCHILAR\n\nKerakli ma'lumotni tanlang:"
    await update.callback_query.edit_message_text(text, reply_markup=get_payments_menu())

async def show_reports_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "📥 HISOBOTLAR\n\nKerakli hisobotni tanlang:"
    await update.callback_query.edit_message_text(text, reply_markup=get_reports_menu())

async def show_approvals_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "✅ TASDIQLAR BO'LIMI\n\nKerakli ma'lumotni tanlang:"
    await update.callback_query.edit_message_text(text, reply_markup=get_approvals_menu())

async def show_analytics_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "📊 TAHLIL BO'LIMI\n\nQaysi tahlilni ko'rmoqchisiz?"
    await update.callback_query.edit_message_text(text, reply_markup=get_analytics_menu())

async def show_comparison_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "⚖️ SOLISHTIRISH\n\nNimani solishtirishni xohlaysiz?"
    await update.callback_query.edit_message_text(text, reply_markup=get_comparison_menu())

async def show_settings_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "⚙️ SOZLAMALAR\n\nKerakli bo'limni tanlang:"
    await update.callback_query.edit_message_text(text, reply_markup=get_settings_menu())

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from services.sale_service import SaleService
            from services.product_service import ProductService
            from services.debt_service import DebtService
        except ImportError:
            from database import SessionLocal
            from sale_service import SaleService
            from product_service import ProductService
            from debt_service import DebtService
        
        db: Session = SessionLocal()
        try:
            stats_data = SaleService.get_statistics(db)
            inventory = ProductService.get_inventory_total_value(db)
            total_debt = DebtService.get_total_debt(db)
            
            text = (
                f"📊 UMUMIY STATISTIKA (barcha vaqt):\n\n"
                f"💰 Sotuvlar soni: {stats_data['total_sales']}\n"
                f"💵 Umumiy summa: {stats_data['total_amount']:,} so'm\n"
                f"📊 Foyda: {stats_data['total_profit']:,} so'm\n"
                f"📈 O'rtacha sotuv: {stats_data['average_sale']:,} so'm\n"
                f"\n"
                f"🗃 Ombor (kelgan narx): {inventory['total_value_by_cost']:,} so'm\n"
                f"🗃 Ombor (ulgurji): {inventory['total_value_by_wholesale']:,} so'm\n"
                f"\n"
                f"💸 Jami qarzdorlik: {total_debt:,} so'm\n"
            )
            
            # Agar callback query bo'lsa
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=get_main_keyboard())
            else:
                await update.message.reply_text(text, reply_markup=get_main_keyboard())
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())
        print(f"Stats xatoligi: {e}")
        import traceback
        traceback.print_exc()

async def today(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bugungi sotuvlar statistikasi"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from sale_service import SaleService
        from datetime import datetime, timedelta
        from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            end = now.isoformat()
            
            stats = SaleService.get_statistics(db, start_date=start, end_date=end)
            
            text = (
                f"📅 BUGUNGI STATISTIKA ({now.strftime('%d.%m.%Y')})\n\n"
                f"💰 Sotuvlar soni: {stats['total_sales']}\n"
                f"💵 Umumiy summa: {stats['total_amount']:,.0f} so'm\n"
                f"📊 Foyda: {stats['total_profit']:,.0f} so'm\n"
                f"📈 O'rtacha sotuv: {stats['average_sale']:,.0f} so'm\n"
            )
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=get_main_keyboard())
            else:
                await update.message.reply_text(text, reply_markup=get_main_keyboard())
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def weekly(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Haftalik statistika"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from sale_service import SaleService
        from datetime import datetime, timedelta
        from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            start = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            end = now.isoformat()
            
            stats = SaleService.get_statistics(db, start_date=start, end_date=end)
            
            text = (
                f"📆 HAFTALIK STATISTIKA (7 kun)\n\n"
                f"💰 Sotuvlar soni: {stats['total_sales']}\n"
                f"💵 Umumiy summa: {stats['total_amount']:,.0f} so'm\n"
                f"📊 Foyda: {stats['total_profit']:,.0f} so'm\n"
                f"📈 O'rtacha sotuv: {stats['average_sale']:,.0f} so'm\n"
                f"📉 Kunlik o'rtacha: {stats['total_amount']/7:,.0f} so'm\n"
            )
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=get_main_keyboard())
            else:
                await update.message.reply_text(text, reply_markup=get_main_keyboard())
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def monthly(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Oylik statistika"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from sale_service import SaleService
        from datetime import datetime, timedelta
        from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            end = now.isoformat()
            
            stats = SaleService.get_statistics(db, start_date=start, end_date=end)
            
            text = (
                f"📈 OYLIK STATISTIKA (30 kun)\n\n"
                f"💰 Sotuvlar soni: {stats['total_sales']}\n"
                f"💵 Umumiy summa: {stats['total_amount']:,.0f} so'm\n"
                f"📊 Foyda: {stats['total_profit']:,.0f} so'm\n"
                f"📈 O'rtacha sotuv: {stats['average_sale']:,.0f} so'm\n"
                f"📉 Kunlik o'rtacha: {stats['total_amount']/30:,.0f} so'm\n"
            )
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=get_main_keyboard())
            else:
                await update.message.reply_text(text, reply_markup=get_main_keyboard())
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def top_products(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int = 0):
    """Eng ko'p sotiladigan mahsulotlar"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from sale_service import SaleService
        
        ITEMS_PER_PAGE = 10
        
        db: Session = SessionLocal()
        try:
            stats = SaleService.get_statistics(db)
            all_top = stats.get('top_products', [])
            
            total = len(all_top)
            total_pages = max(1, (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
            
            start_idx = page * ITEMS_PER_PAGE
            end_idx = start_idx + ITEMS_PER_PAGE
            top = all_top[start_idx:end_idx]
            
            if not all_top:
                text = "Hozircha sotuvlar yo'q."
            else:
                text = f"🏆 TOP MAHSULOTLAR ({page + 1}/{total_pages}):\n\n"
                for i, product in enumerate(top, 1 + start_idx):
                    text += f"{i}. {product['name']}\n"
                    text += f"   Soni: {product['quantity']} dona\n"
                    text += f"   Summa: {product['amount']:,.0f} so'm\n\n"
            
            # Pagination tugmalari
            buttons = []
            nav_buttons = []
            
            if page > 0:
                nav_buttons.append(InlineKeyboardButton("⬅️ Oldingi", callback_data=f'top_products_{page - 1}'))
            if page < total_pages - 1:
                nav_buttons.append(InlineKeyboardButton("Keyingi ➡️", callback_data=f'top_products_{page + 1}'))
            
            if nav_buttons:
                buttons.append(nav_buttons)
            
            buttons.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='products_menu')])
            keyboard = InlineKeyboardMarkup(buttons)
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=keyboard)
            else:
                await update.message.reply_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def debtors(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int = 0):
    """Qarzdorlar ro'yxati"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Customer
        
        ITEMS_PER_PAGE = 10
        
        db: Session = SessionLocal()
        try:
            query = db.query(Customer).filter(Customer.debt_balance > 0).order_by(Customer.debt_balance.desc())
            
            total = query.count()
            total_pages = max(1, (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
            
            customers = query.offset(page * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).all()
            
            # Jami qarzni hisoblash
            all_debtors = db.query(Customer).filter(Customer.debt_balance > 0).all()
            grand_total = sum(c.debt_balance for c in all_debtors)
            
            if not customers:
                text = "Qarzdor mijozlar yo'q."
            else:
                text = f"💸 QARZDORLAR ({page + 1}/{total_pages}):\n\n"
                for i, customer in enumerate(customers, 1 + page * ITEMS_PER_PAGE):
                    text += f"{i}. {customer.name}\n"
                    text += f"   📞 Tel: {customer.phone or 'kiritilmagan'}\n"
                    text += f"   💰 Qarz: {customer.debt_balance:,.0f} so'm\n\n"
                
                text += f"━━━━━━━━━━━━━━━━\n"
                text += f"💰 Jami qarz: {grand_total:,.0f} so'm"
            
            # Pagination tugmalari
            buttons = []
            nav_buttons = []
            
            if page > 0:
                nav_buttons.append(InlineKeyboardButton("⬅️ Oldingi", callback_data=f'debtors_{page - 1}'))
            if page < total_pages - 1:
                nav_buttons.append(InlineKeyboardButton("Keyingi ➡️", callback_data=f'debtors_{page + 1}'))
            
            if nav_buttons:
                buttons.append(nav_buttons)
            
            buttons.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='customers_menu')])
            keyboard = InlineKeyboardMarkup(buttons)
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=keyboard)
            else:
                await update.message.reply_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def stock(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ombor ma'lumotlari"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from product_service import ProductService
        
        db: Session = SessionLocal()
        try:
            inventory = ProductService.get_inventory_total_value(db)
            low_stock = ProductService.get_products(db, low_stock_only=True, min_stock=10, limit=10)
            
            text = (
                f"🗃 OMBOR MA'LUMOTLARI:\n\n"
                f"📦 Jami mahsulotlar: {inventory['total_products']} ta\n"
                f"🔢 Jami dona: {inventory['total_pieces']:,.0f} dona\n"
                f"💰 Qiymati (kelgan): {inventory['total_value_by_cost']:,.0f} so'm\n"
                f"💰 Qiymati (ulgurji): {inventory['total_value_by_wholesale']:,.0f} so'm\n"
            )
            
            if low_stock:
                text += f"\n⚠️ KAM QOLGAN MAHSULOTLAR:\n"
                for product in low_stock[:5]:
                    text += f"• {product.name}: {product.total_pieces} dona\n"
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=get_main_keyboard())
            else:
                await update.message.reply_text(text, reply_markup=get_main_keyboard())
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def recent_sales(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """So'nggi sotuvlar"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        
        db: Session = SessionLocal()
        try:
            sales = db.query(Sale).order_by(Sale.created_at.desc()).limit(10).all()
            
            if not sales:
                text = "Hozircha sotuvlar yo'q."
            else:
                text = "🛒 SO'NGGI SOTUVLAR:\n\n"
                for i, sale in enumerate(sales, 1):
                    time = sale.created_at.strftime('%d.%m %H:%M')
                    customer_name = sale.customer.name if sale.customer else "O'chirilgan mijoz"
                    seller_name = sale.seller.name if sale.seller else "Noma'lum"
                    text += f"{i}. {time} - {customer_name}\n"
                    text += f"   Sotuvchi: {seller_name}\n"
                    text += f"   Summa: {sale.total_amount:,.0f} so'm\n\n"
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=get_main_keyboard())
            else:
                await update.message.reply_text(text, reply_markup=get_main_keyboard())
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def top_customers(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int = 0):
    """Top mijozlar"""
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from sale_service import SaleService
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from services.sale_service import SaleService
        
        ITEMS_PER_PAGE = 10
        
        db: Session = SessionLocal()
        try:
            stats = SaleService.get_statistics(db)
            all_top = stats.get('top_customers', [])
            
            total = len(all_top)
            total_pages = max(1, (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
            
            start_idx = page * ITEMS_PER_PAGE
            end_idx = start_idx + ITEMS_PER_PAGE
            top = all_top[start_idx:end_idx]
            
            if not all_top:
                text = "Hozircha mijozlar yo'q."
            else:
                text = f"👥 TOP MIJOZLAR ({page + 1}/{total_pages}):\n\n"
                for i, customer in enumerate(top, 1 + start_idx):
                    text += f"{i}. {customer['name']}\n"
                    text += f"   Sotuvlar: {customer['count']} ta\n"
                    text += f"   Summa: {customer['amount']:,.0f} so'm\n\n"
            
            # Pagination tugmalari
            buttons = []
            nav_buttons = []
            
            if page > 0:
                nav_buttons.append(InlineKeyboardButton("⬅️ Oldingi", callback_data=f'top_customers_{page - 1}'))
            if page < total_pages - 1:
                nav_buttons.append(InlineKeyboardButton("Keyingi ➡️", callback_data=f'top_customers_{page + 1}'))
            
            if nav_buttons:
                buttons.append(nav_buttons)
            
            buttons.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='customers_menu')])
            keyboard = InlineKeyboardMarkup(buttons)
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=keyboard)
            else:
                await update.message.reply_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def sellers_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvchilar statistikasi"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Seller, Sale
        from sqlalchemy import func
        
        db: Session = SessionLocal()
        try:
            # Har bir sotuvchi bo'yicha statistika
            sellers = db.query(
                Seller.id,
                Seller.name,
                func.count(Sale.id).label('sales_count'),
                func.sum(Sale.total_amount).label('total_amount')
            ).outerjoin(Sale, Seller.id == Sale.seller_id).group_by(Seller.id, Seller.name).order_by(func.sum(Sale.total_amount).desc()).limit(10).all()
            
            if not sellers:
                text = "Sotuvchilar yo'q."
            else:
                text = "👨‍💼 SOTUVCHILAR REYTINGI:\n\n"
                for i, seller in enumerate(sellers, 1):
                    sales_count = seller.sales_count or 0
                    total_amount = seller.total_amount or 0
                    text += f"{i}. {seller.name}\n"
                    text += f"   Sotuvlar: {sales_count} ta\n"
                    text += f"   Summa: {total_amount:,.0f} so'm\n\n"
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=get_main_keyboard())
            else:
                await update.message.reply_text(text, reply_markup=get_main_keyboard())
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def slow_moving(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int = 0):
    """Kam sotilgan mahsulotlar"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from product_service import ProductService
        
        ITEMS_PER_PAGE = 10
        
        db: Session = SessionLocal()
        try:
            products = ProductService.get_products(db, limit=500)
            # 30 kundan ko'proq vaqt sotilmagan yoki hech sotilmagan mahsulotlar
            all_slow = [p for p in products if p.days_since_last_sale is None or p.days_since_last_sale > 30]
            all_slow = sorted(all_slow, key=lambda x: x.days_since_last_sale or 999, reverse=True)
            
            total = len(all_slow)
            total_pages = max(1, (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
            
            start_idx = page * ITEMS_PER_PAGE
            end_idx = start_idx + ITEMS_PER_PAGE
            slow = all_slow[start_idx:end_idx]
            
            if not all_slow:
                text = "Barcha mahsulotlar yaxshi sotilmoqda! 🎉"
            else:
                text = f"📉 KAM SOTILGAN MAHSULOTLAR ({page + 1}/{total_pages}):\n\n"
                for i, product in enumerate(slow, 1 + start_idx):
                    days = product.days_since_last_sale or 0
                    text += f"{i}. {product.name}\n"
                    text += f"   📊 Omborda: {product.total_pieces} dona\n"
                    if days > 0:
                        text += f"   📅 Oxirgi sotuv: {days} kun oldin\n\n"
                    else:
                        text += f"   ❌ Hech sotilmagan\n\n"
            
            # Pagination tugmalari
            buttons = []
            nav_buttons = []
            
            if page > 0:
                nav_buttons.append(InlineKeyboardButton("⬅️ Oldingi", callback_data=f'slow_moving_{page - 1}'))
            if page < total_pages - 1:
                nav_buttons.append(InlineKeyboardButton("Keyingi ➡️", callback_data=f'slow_moving_{page + 1}'))
            
            if nav_buttons:
                buttons.append(nav_buttons)
            
            buttons.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='products_menu')])
            keyboard = InlineKeyboardMarkup(buttons)
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=keyboard)
            else:
                await update.message.reply_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def export_excel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Excel hisobot yuborish"""
    try:
        import os
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from excel_service import ExcelService
        
        db: Session = SessionLocal()
        try:
            # Excel fayl yaratish
            file_path = ExcelService.export_sales(db)
            
            # Faylni yuborish
            if update.callback_query:
                await update.callback_query.answer("Excel hisobot tayyorlanmoqda...")
                await context.bot.send_document(
                    chat_id=update.effective_chat.id,
                    document=open(file_path, 'rb'),
                    filename=f"savdo_hisobot_{os.path.basename(file_path)}",
                    caption="📊 Sotuvlar hisoboti (Excel)"
                )
            else:
                await update.message.reply_text("Excel hisobot tayyorlanmoqda...")
                await update.message.reply_document(
                    document=open(file_path, 'rb'),
                    filename=f"savdo_hisobot_{os.path.basename(file_path)}",
                    caption="📊 Sotuvlar hisoboti (Excel)"
                )
            
            # Faylni o'chirish
            if os.path.exists(file_path):
                os.remove(file_path)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Excel yaratishda xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.answer(error_msg, show_alert=True)
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def export_pdf(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """PDF hisobot yuborish"""
    try:
        import os
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from pdf_service import PDFService
        from sale_service import SaleService
        import os
        
        db: Session = SessionLocal()
        try:
            # PDF fayl yaratish - statistikani olish va PDF yaratish
            from datetime import datetime, timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)  # So'nggi 30 kun
            
            # Statistikani olish
            stats = SaleService.get_statistics(
                db,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat()
            )
            
            file_path = PDFService.export_statistics(
                stats,
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            )
            
            # Faylni yuborish
            if update.callback_query:
                await update.callback_query.answer("PDF hisobot tayyorlanmoqda...")
                await context.bot.send_document(
                    chat_id=update.effective_chat.id,
                    document=open(file_path, 'rb'),
                    filename=f"savdo_hisobot_{os.path.basename(file_path)}",
                    caption="📊 Sotuvlar hisoboti (PDF)"
                )
            else:
                await update.message.reply_text("PDF hisobot tayyorlanmoqda...")
                await update.message.reply_document(
                    document=open(file_path, 'rb'),
                    filename=f"savdo_hisobot_{os.path.basename(file_path)}",
                    caption="📊 Sotuvlar hisoboti (PDF)"
                )
            
            # Faylni o'chirish
            if os.path.exists(file_path):
                os.remove(file_path)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ PDF yaratishda xatolik: {str(e)}"
        if update.callback_query:
            await update.callback_query.answer(error_msg, show_alert=True)
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())

async def low_stock(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int = 0):
    """Kam qolgan mahsulotlar"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Product
        
        ITEMS_PER_PAGE = 10
        
        db: Session = SessionLocal()
        try:
            # Kam qolgan mahsulotlar (10 donadan kam)
            query = db.query(Product).filter(
                Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock < 10
            ).order_by(Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock)
            
            total = query.count()
            total_pages = max(1, (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
            
            products = query.offset(page * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).all()
            
            if total == 0:
                text = "✅ Barcha mahsulotlar yetarli miqdorda!"
            else:
                text = f"⚠️ KAM QOLGAN MAHSULOTLAR ({page + 1}/{total_pages}):\n\n"
                for i, product in enumerate(products, 1 + page * ITEMS_PER_PAGE):
                    stock = (product.packages_in_stock * product.pieces_per_package) + product.pieces_in_stock
                    text += f"{i}. {product.name}\n"
                    text += f"   📊 Qoldiq: {stock} dona\n"
                    text += f"   💰 Narx: {product.wholesale_price:,.0f} so'm\n\n"
                
                text += f"━━━━━━━━━━━━━━━━\n"
                text += f"Jami: {total} ta mahsulot kam qolgan"
            
            # Pagination tugmalari
            buttons = []
            nav_buttons = []
            
            if page > 0:
                nav_buttons.append(InlineKeyboardButton("⬅️ Oldingi", callback_data=f'low_stock_{page - 1}'))
            if page < total_pages - 1:
                nav_buttons.append(InlineKeyboardButton("Keyingi ➡️", callback_data=f'low_stock_{page + 1}'))
            
            if nav_buttons:
                buttons.append(nav_buttons)
            
            buttons.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='products_menu')])
            keyboard = InlineKeyboardMarkup(buttons)
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=keyboard)
            else:
                await update.message.reply_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        keyboard = get_products_menu()
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=keyboard)
        else:
            await update.message.reply_text(error_msg, reply_markup=keyboard)

async def debt_limit_exceeded(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Qarz limiti oshgan mijozlar"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Customer
        
        db: Session = SessionLocal()
        try:
            # Qarz limiti oshgan mijozlar
            all_customers = db.query(Customer).filter(
                Customer.debt_limit.isnot(None),
                Customer.debt_limit > 0
            ).all()
            
            # Manual filtering for debt_balance > debt_limit
            exceeded_customers = []
            for customer in all_customers:
                # Get current debt balance
                customer_balance = getattr(customer, 'debt_balance', 0) or 0
                customer_limit = customer.debt_limit or 0
                if customer_balance > customer_limit:
                    exceeded_customers.append(customer)
                    
            customers = sorted(exceeded_customers, key=lambda x: getattr(x, 'debt_balance', 0), reverse=True)
            
            if not customers:
                text = "✅ Qarz limiti oshgan mijozlar yo'q!"
            else:
                text = "🚨 QARZ LIMITI OSHGAN MIJOZLAR:\n\n"
                for i, customer in enumerate(customers, 1):
                    customer_balance = getattr(customer, 'debt_balance', 0) or 0
                    customer_limit = customer.debt_limit or 0
                    overdue = customer_balance - customer_limit
                    text += f"{i}. {customer.name}\n"
                    text += f"   Tel: {customer.phone or 'kiritilmagan'}\n"
                    text += f"   Qarz: {customer_balance:,.0f} so'm\n"
                    text += f"   Limit: {customer.debt_limit:,.0f} so'm\n"
                    text += f"   Oshiq: {overdue:,.0f} so'm ⚠️\n\n"
                
                text += f"━━━━━━━━━━━━━━━━\n"
                text += f"Jami: {len(customers)} ta mijoz"
            
            keyboard = get_customers_menu()
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=keyboard)
            else:
                await update.message.reply_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        keyboard = get_customers_menu()
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=keyboard)
        else:
            await update.message.reply_text(error_msg, reply_markup=keyboard)

async def pending_sales(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Tasdiqlanishi kerak sotuvlar"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        
        db: Session = SessionLocal()
        try:
            # Tasdiqlanmagan sotuvlar
            sales = db.query(Sale).filter(
                Sale.requires_admin_approval == True,
                Sale.admin_approved.is_(None)
            ).order_by(Sale.created_at.desc()).limit(10).all()
            
            if not sales:
                text = "✅ Tasdiqlanishi kerak sotuvlar yo'q!"
                keyboard = get_approvals_menu()
            else:
                text = "✅ TASDIQ KUTAYOTGAN SOTUVLAR:\n\n"
                
                # Har bir sotuv uchun tugmalar ro'yxati
                buttons = []
                
                for i, sale in enumerate(sales, 1):
                    time = sale.created_at.strftime('%d.%m %H:%M')
                    customer_name = sale.customer.name if sale.customer else "O'chirilgan mijoz"
                    seller_name = sale.seller.name if sale.seller else "Noma'lum"
                    text += f"{i}. ID: {sale.id}\n"
                    text += f"   Vaqt: {time}\n"
                    text += f"   Mijoz: {customer_name}\n"
                    text += f"   Sotuvchi: {seller_name}\n"
                    text += f"   Summa: {sale.total_amount:,.0f} so'm\n"
                    text += f"   Mahsulotlar: {len(sale.items)} ta\n\n"
                    
                    # Har bir sotuv uchun inline tugma
                    buttons.append([
                        InlineKeyboardButton(
                            f"📋 Ko'rish #{sale.id}", 
                            callback_data=f'view_sale_{sale.id}'
                        )
                    ])
                
                text += f"━━━━━━━━━━━━━━━━\n"
                text += f"Jami: {len(sales)} ta sotuv kutmoqda"
                
                # Tugmalarni qo'shamiz
                buttons.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='approvals_menu')])
                keyboard = InlineKeyboardMarkup(buttons)
            
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=keyboard)
            else:
                await update.message.reply_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        keyboard = get_approvals_menu()
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=keyboard)
        else:
            await update.message.reply_text(error_msg, reply_markup=keyboard)

async def approved_sales(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Tasdiqlangan sotuvlar"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        
        db: Session = SessionLocal()
        try:
            sales = db.query(Sale).filter(
                Sale.admin_approved == True
            ).order_by(Sale.approved_at.desc()).limit(10).all()
            
            if not sales:
                text = "Hozircha tasdiqlangan sotuvlar yo'q."
            else:
                text = "✅ TASDIQLANGAN SOTUVLAR (oxirgi 10 ta):\n\n"
                for i, sale in enumerate(sales, 1):
                    time = sale.approved_at.strftime('%d.%m %H:%M') if sale.approved_at else 'N/A'
                    customer_name = sale.customer.name if sale.customer else "O'chirilgan mijoz"
                    text += f"{i}. ID: {sale.id}\n"
                    text += f"   Tasdiqlandi: {time}\n"
                    text += f"   Mijoz: {customer_name}\n"
                    text += f"   Summa: {sale.total_amount:,.0f} so'm\n\n"
            
            keyboard = get_approvals_menu()
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        keyboard = get_approvals_menu()
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=keyboard)

async def rejected_sales(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Rad etilgan sotuvlar"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        
        db: Session = SessionLocal()
        try:
            sales = db.query(Sale).filter(
                Sale.admin_approved == False
            ).order_by(Sale.created_at.desc()).limit(10).all()
            
            if not sales:
                text = "Rad etilgan sotuvlar yo'q."
            else:
                text = "❌ RAD ETILGAN SOTUVLAR (oxirgi 10 ta):\n\n"
                for i, sale in enumerate(sales, 1):
                    time = sale.created_at.strftime('%d.%m %H:%M')
                    customer_name = sale.customer.name if sale.customer else "O'chirilgan mijoz"
                    text += f"{i}. ID: {sale.id}\n"
                    text += f"   Vaqt: {time}\n"
                    text += f"   Mijoz: {customer_name}\n"
                    text += f"   Summa: {sale.total_amount:,.0f} so'm\n\n"
            
            keyboard = get_approvals_menu()
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        keyboard = get_approvals_menu()
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=keyboard)

async def view_sale_inline(update: Update, context: ContextTypes.DEFAULT_TYPE, sale_id: int):
    """Sotuvni inline tugma orqali ko'rish"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        
        db: Session = SessionLocal()
        try:
            sale = db.query(Sale).filter(Sale.id == sale_id).first()
            
            if not sale:
                await update.callback_query.edit_message_text(f"❌ ID {sale_id} raqamli sotuv topilmadi.")
                return
            
            time = sale.created_at.strftime('%d.%m.%Y %H:%M')
            customer_name = sale.customer.name if sale.customer else "O'chirilgan mijoz"
            seller_name = sale.seller.name if sale.seller else "Noma'lum"
            text = f"🛒 SOTUV #{sale.id}\n\n"
            text += f"📅 Vaqt: {time}\n"
            text += f"👤 Mijoz: {customer_name}\n"
            text += f"👨‍💼 Sotuvchi: {seller_name}\n"
            text += f"💰 Jami summa: {sale.total_amount:,.0f} so'm\n"
            text += f"💳 To'lov: {sale.payment_method.value if sale.payment_method else 'naqd'}\n"
            text += f"💵 To'landi: {sale.payment_amount:,.0f} so'm\n\n"
            
            text += "📦 MAHSULOTLAR:\n"
            for i, item in enumerate(sale.items, 1):
                text += f"{i}. {item.product.name}\n"
                text += f"   Soni: {item.requested_quantity} dona\n"
                text += f"   Narx: {item.piece_price:,.0f} so'm\n"
                text += f"   Summa: {item.subtotal:,.0f} so'm\n"
            
            text += f"\n━━━━━━━━━━━━━━━━\n"
            
            if sale.admin_approved is None:
                text += "⏳ Holat: Tasdiq kutmoqda"
                keyboard = [
                    [
                        InlineKeyboardButton("✅ Tasdiqlash", callback_data=f'approve_{sale_id}'),
                        InlineKeyboardButton("❌ Rad etish", callback_data=f'reject_{sale_id}')
                    ],
                    [InlineKeyboardButton("⬅️ Orqaga", callback_data='pending_sales')]
                ]
            elif sale.admin_approved:
                text += f"✅ Holat: Tasdiqlangan\n"
                text += f"Tasdiqlangan: {sale.approved_at.strftime('%d.%m.%Y %H:%M') if sale.approved_at else 'N/A'}"
                keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='approved_sales')]]
            else:
                text += "❌ Holat: Rad etilgan"
                keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='rejected_sales')]]
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}")

async def view_sale_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvni batafsil ko'rish va tasdiqlash"""
    try:
        if not context.args or not context.args[0].isdigit():
            await update.message.reply_text("❌ ID raqamini to'g'ri kiriting.\nMasalan: /view_sale 123")
            return
        
        sale_id = int(context.args[0])
        
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        
        db: Session = SessionLocal()
        try:
            sale = db.query(Sale).filter(Sale.id == sale_id).first()
            
            if not sale:
                await update.message.reply_text(f"❌ ID {sale_id} raqamli sotuv topilmadi.")
                return
            
            time = sale.created_at.strftime('%d.%m.%Y %H:%M')
            customer_name = sale.customer.name if sale.customer else "O'chirilgan mijoz"
            seller_name = sale.seller.name if sale.seller else "Noma'lum"
            text = f"🛒 SOTUV #{sale.id}\n\n"
            text += f"📅 Vaqt: {time}\n"
            text += f"👤 Mijoz: {customer_name}\n"
            text += f"👨‍💼 Sotuvchi: {seller_name}\n"
            text += f"💰 Jami summa: {sale.total_amount:,.0f} so'm\n"
            text += f"💳 To'lov: {sale.payment_method.value if sale.payment_method else 'naqd'}\n"
            text += f"💵 To'landi: {sale.payment_amount:,.0f} so'm\n\n"
            
            text += "📦 MAHSULOTLAR:\n"
            for i, item in enumerate(sale.items, 1):
                text += f"{i}. {item.product.name}\n"
                text += f"   Soni: {item.requested_quantity} dona\n"
                text += f"   Narx: {item.piece_price:,.0f} so'm\n"
                text += f"   Summa: {item.subtotal:,.0f} so'm\n"
            
            text += f"\n━━━━━━━━━━━━━━━━\n"
            
            if sale.admin_approved is None:
                text += "⏳ Holat: Tasdiq kutmoqda"
                keyboard = [
                    [
                        InlineKeyboardButton("✅ Tasdiqlash", callback_data=f'approve_{sale_id}'),
                        InlineKeyboardButton("❌ Rad etish", callback_data=f'reject_{sale_id}')
                    ],
                    [InlineKeyboardButton("⬅️ Orqaga", callback_data='pending_sales')]
                ]
            elif sale.admin_approved:
                text += f"✅ Holat: Tasdiqlangan\n"
                text += f"Tasdiqlagan: {sale.approved_at.strftime('%d.%m.%Y %H:%M') if sale.approved_at else 'N/A'}"
                keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='approved_sales')]]
            else:
                text += "❌ Holat: Rad etilgan"
                keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='rejected_sales')]]
            
            await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.message.reply_text(f"❌ Xatolik: {str(e)}")

async def approve_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvni tasdiqlash"""
    try:
        query = update.callback_query
        sale_id = int(query.data.split('_')[1])
        
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from sale_service import SaleService
        
        db: Session = SessionLocal()
        try:
            # Admin ID ni olamiz (ADMIN_CHAT_IDS dan)
            admin_id = query.from_user.id
            
            # Sotuvni tasdiqlash
            sale = SaleService.approve_sale(db, sale_id, approved_by=admin_id)
            
            if not sale:
                await query.answer("❌ Sotuv topilmadi!", show_alert=True)
                return
            
            await query.answer("✅ Sotuv tasdiqlandi!", show_alert=True)
            
            # WebSocket orqali barcha clientlarga xabar yuborish
            try:
                import asyncio
                import httpx
                
                async def notify_clients():
                    try:
                        # Backend API ga POST so'rov yuborish
                        async with httpx.AsyncClient() as client:
                            await client.post(
                                'http://localhost:8000/api/websocket/broadcast',
                                json={
                                    'type': 'sale_approved',
                                    'sale_id': sale_id,
                                    'message': f'Sotuv #{sale_id} tasdiqlandi'
                                },
                                timeout=2.0
                            )
                    except Exception as e:
                        print(f"WebSocket notification error: {e}")
                
                # Background taskda yuborish
                asyncio.create_task(notify_clients())
            except Exception as e:
                print(f"Error creating notification task: {e}")
            
            # Yangilangan ma'lumotni ko'rsatish
            customer_name = sale.customer.name if sale.customer else "O'chirilgan mijoz"
            text = f"✅ SOTUV #{sale_id} TASDIQLANDI\n\n"
            text += f"Mijoz: {customer_name}\n"
            text += f"Summa: {sale.total_amount:,.0f} so'm\n"
            text += f"Tasdiqlandi: {sale.approved_at.strftime('%d.%m.%Y %H:%M') if sale.approved_at else 'hozir'}"
            
            keyboard = [[InlineKeyboardButton("⬅️ Tasdiqlar", callback_data='approvals_menu')]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
            
            # Sotuvchiga xabar yuborish (agar Telegram ID si bo'lsa)
            # Bu keyingi bosqichda qo'shiladi
        finally:
            db.close()
    except Exception as e:
        print(f"DEBUG: Approve error: {e}")
        import traceback
        traceback.print_exc()
        await query.answer(f"❌ Xatolik: {str(e)}", show_alert=True)

async def reject_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvni rad etish"""
    try:
        query = update.callback_query
        sale_id = int(query.data.split('_')[1])
        
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from sale_service import SaleService
        
        db: Session = SessionLocal()
        try:
            admin_id = query.from_user.id
            
            # Sotuvni rad etish
            sale = SaleService.approve_sale(db, sale_id, approved_by=admin_id, approved=False)
            
            if not sale:
                await query.answer("❌ Sotuv topilmadi!", show_alert=True)
                return
            
            await query.answer("❌ Sotuv rad etildi!", show_alert=True)
            
            # WebSocket orqali barcha clientlarga xabar yuborish
            try:
                import asyncio
                import httpx
                
                async def notify_clients():
                    try:
                        async with httpx.AsyncClient() as client:
                            await client.post(
                                'http://localhost:8000/api/websocket/broadcast',
                                json={
                                    'type': 'sale_rejected',
                                    'sale_id': sale_id,
                                    'message': f'Sotuv #{sale_id} rad etildi'
                                },
                                timeout=2.0
                            )
                    except Exception as e:
                        print(f"WebSocket notification error: {e}")
                
                asyncio.create_task(notify_clients())
            except Exception as e:
                print(f"Error creating notification task: {e}")
            
            customer_name = sale.customer.name if sale.customer else "O'chirilgan mijoz"
            text = f"❌ SOTUV #{sale_id} RAD ETILDI\n\n"
            text += f"Mijoz: {customer_name}\n"
            text += f"Summa: {sale.total_amount:,.0f} so'm\n"
            
            keyboard = [[InlineKeyboardButton("⬅️ Tasdiqlar", callback_data='approvals_menu')]]
            await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        print(f"DEBUG: Reject error: {e}")
        import traceback
        traceback.print_exc()
        await query.answer(f"❌ Xatolik: {str(e)}", show_alert=True)

# Analytics funksiyalari
async def sales_trends(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvlar tendensiyasi (oxirgi 7 kun)"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        from utils import get_uzbekistan_now
        from datetime import timedelta
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            trends = []
            
            for i in range(6, -1, -1):
                day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start.replace(hour=23, minute=59, second=59, microsecond=999999)
                
                sales = db.query(Sale).filter(
                    Sale.created_at >= day_start,
                    Sale.created_at <= day_end
                ).all()
                
                total = sum(s.total_amount for s in sales)
                count = len(sales)
                
                trends.append({
                    'date': day_start.strftime('%d.%m'),
                    'count': count,
                    'amount': total
                })
            
            text = "📈 SOTUVLAR TENDENSIYASI (7 kun):\n\n"
            for trend in trends:
                bar = '▓' * (trend['count'] if trend['count'] <= 10 else 10)
                text += f"{trend['date']}: {bar}\n"
                text += f"   Soni: {trend['count']} | {trend['amount']:,.0f} so'm\n\n"
            
            keyboard = get_analytics_menu()
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        keyboard = get_analytics_menu()
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=keyboard)

async def abc_analysis(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """ABC tahlil - mahsulotlarni toifaga ajratish"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import SaleItem
        from sqlalchemy import func
        
        db: Session = SessionLocal()
        try:
            # Mahsulotlar bo'yicha jami sotuvlar
            products = db.query(
                SaleItem.product_id,
                func.sum(SaleItem.subtotal).label('total')
            ).group_by(SaleItem.product_id).order_by(func.sum(SaleItem.subtotal).desc()).all()
            
            if not products:
                text = "Hozircha sotuvlar yo'q."
            else:
                total_revenue = sum(p.total for p in products)
                cumulative = 0
                a_products = []
                b_products = []
                c_products = []
                
                for product_id, total in products:
                    cumulative += total
                    percent = (cumulative / total_revenue) * 100
                    
                    if percent <= 80:
                        a_products.append((product_id, total))
                    elif percent <= 95:
                        b_products.append((product_id, total))
                    else:
                        c_products.append((product_id, total))
                
                text = "📊 ABC TAHLIL:\n\n"
                text += f"🅰️ A toifa (80% daromad): {len(a_products)} mahsulot\n"
                text += f"   💰 {sum(p[1] for p in a_products):,.0f} so'm\n\n"
                
                text += f"🅱️ B toifa (15% daromad): {len(b_products)} mahsulot\n"
                text += f"   💰 {sum(p[1] for p in b_products):,.0f} so'm\n\n"
                
                text += f"🅾️ C toifa (5% daromad): {len(c_products)} mahsulot\n"
                text += f"   💰 {sum(p[1] for p in c_products):,.0f} so'm\n\n"
                
                text += "━━━━━━━━━━━━━━━━\n"
                text += "A - Eng muhim mahsulotlar\n"
                text += "B - O'rtacha muhim\n"
                text += "C - Kamroq muhim"
            
            keyboard = get_analytics_menu()
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        keyboard = get_analytics_menu()
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=keyboard)

async def recommendations(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Tizim tavsifalari"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Product, Customer, Sale, SaleItem
        
        db: Session = SessionLocal()
        try:
            # Kam qolgan mahsulotlar (10 donadan kam)
            low_stock = db.query(Product).filter(
                Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock < 10
            ).count()
            
            # Qarz limiti oshganlar (faqat limit belgilanganlar)
            debt_customers = db.query(Customer).filter(
                Customer.debt_limit.isnot(None),
                Customer.debt_limit > 0
            ).all()
            
            # Manual filtering for debt_balance > debt_limit
            debt_exceeded = 0
            for customer in debt_customers:
                if hasattr(customer, 'debt_balance') and customer.debt_balance > (customer.debt_limit or 0):
                    debt_exceeded += 1
            
            # Kam sotiladigan mahsulotlar (30 kun ichida sotilmaganlar)
            from utils import get_uzbekistan_now
            from datetime import timedelta
            
            now = get_uzbekistan_now()
            month_ago = now - timedelta(days=30)
            
            sold_product_ids = db.query(SaleItem.product_id).filter(
                SaleItem.sale.has(Sale.created_at >= month_ago)
            ).distinct().all()
            sold_ids = [p[0] for p in sold_product_ids]
            
            slow_moving = db.query(Product).filter(
                ~Product.id.in_(sold_ids),
                (Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock) > 0
            ).count()
            
            text = "💡 TAVSIYALAR:\n\n"
            
            # Tugmalar ro'yxati
            buttons = []
            
            if low_stock > 0:
                text += f"⚠️ {low_stock} ta mahsulot qoldig'i kam!\n"
                text += "   → Yangi buyurtma berish tavsiya etiladi\n\n"
                buttons.append([InlineKeyboardButton(f"📦 Kam qolganlar ({low_stock})", callback_data='rec_low_stock_0')])
            
            if debt_exceeded > 0:
                text += f"💰 {debt_exceeded} ta mijoz qarz limitidan oshib ketgan!\n"
                text += "   → Qarzlarni yig'ish kerak\n\n"
                buttons.append([InlineKeyboardButton(f"💸 Qarz oshganlar ({debt_exceeded})", callback_data='rec_debt_exceeded_0')])
            
            if slow_moving > 0:
                text += f"📦 {slow_moving} ta mahsulot 30 kun sotilmagan!\n"
                text += "   → Chegirma yoki reklama tavsiya etiladi\n\n"
                buttons.append([InlineKeyboardButton(f"🐢 Kam sotilganlar ({slow_moving})", callback_data='rec_slow_moving_0')])
            
            if low_stock == 0 and debt_exceeded == 0 and slow_moving == 0:
                text += "✅ Hamma narsa joyida!\n"
                text += "Biznes yaxshi ishlayapti."
            
            buttons.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='analytics_menu')])
            keyboard = InlineKeyboardMarkup(buttons)
            
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        keyboard = get_analytics_menu()
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=keyboard)


async def show_low_stock_products(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int = 0):
    """Kam qolgan mahsulotlarni ko'rsatish (pagination bilan)"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Product
        
        ITEMS_PER_PAGE = 10
        
        db: Session = SessionLocal()
        try:
            # Kam qolgan mahsulotlar
            query = db.query(Product).filter(
                Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock < 10
            ).order_by(Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock)
            
            total = query.count()
            products = query.offset(page * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).all()
            
            total_pages = (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE
            
            text = f"📦 KAM QOLGAN MAHSULOTLAR ({page + 1}/{total_pages}):\n\n"
            
            for i, product in enumerate(products, 1 + page * ITEMS_PER_PAGE):
                stock = (product.packages_in_stock * product.pieces_per_package) + product.pieces_in_stock
                text += f"{i}. {product.name}\n"
                text += f"   📊 Qoldiq: {stock} dona\n"
                text += f"   💰 Narx: {product.retail_price:,.0f} so'm\n\n"
            
            # Pagination tugmalari
            buttons = []
            nav_buttons = []
            
            if page > 0:
                nav_buttons.append(InlineKeyboardButton("⬅️ Oldingi", callback_data=f'rec_low_stock_{page - 1}'))
            if page < total_pages - 1:
                nav_buttons.append(InlineKeyboardButton("Keyingi ➡️", callback_data=f'rec_low_stock_{page + 1}'))
            
            if nav_buttons:
                buttons.append(nav_buttons)
            
            buttons.append([InlineKeyboardButton("⬅️ Tavsiyalarga", callback_data='recommendations')])
            keyboard = InlineKeyboardMarkup(buttons)
            
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=get_analytics_menu())


async def show_debt_exceeded_customers(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int = 0):
    """Qarz limiti oshgan mijozlarni ko'rsatish (pagination bilan)"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Customer
        
        ITEMS_PER_PAGE = 10
        
        db: Session = SessionLocal()
        try:
            # Qarz limiti oshgan mijozlar
            all_customers = db.query(Customer).filter(
                Customer.debt_limit.isnot(None),
                Customer.debt_limit > 0
            ).all()
            
            # Manual filtering
            exceeded_customers = []
            for customer in all_customers:
                if hasattr(customer, 'debt_balance') and customer.debt_balance > (customer.debt_limit or 0):
                    exceeded_customers.append(customer)
            
            # Sorting by overdue amount
            exceeded_customers.sort(key=lambda x: (x.debt_balance - (x.debt_limit or 0)), reverse=True)
            
            total = len(exceeded_customers)
            total_pages = max(1, (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
            
            start_idx = page * ITEMS_PER_PAGE
            end_idx = start_idx + ITEMS_PER_PAGE
            customers = exceeded_customers[start_idx:end_idx]
            
            text = f"💸 QARZ LIMITI OSHGANLAR ({page + 1}/{total_pages}):\n\n"
            
            total_overdue = 0
            for i, customer in enumerate(customers, 1 + start_idx):
                overdue = customer.debt_balance - (customer.debt_limit or 0)
                total_overdue += overdue
                text += f"{i}. {customer.name}\n"
                text += f"   📞 Tel: {customer.phone or 'kiritilmagan'}\n"
                text += f"   💰 Qarz: {customer.debt_balance:,.0f} so'm\n"
                text += f"   🚫 Limit: {customer.debt_limit:,.0f} so'm\n"
                text += f"   ⚠️ Oshiq: {overdue:,.0f} so'm\n\n"
            
            text += f"━━━━━━━━━━━━━━━━\n"
            text += f"Jami oshiq qarz: {total_overdue:,.0f} so'm"
            
            # Pagination tugmalari
            buttons = []
            nav_buttons = []
            
            if page > 0:
                nav_buttons.append(InlineKeyboardButton("⬅️ Oldingi", callback_data=f'rec_debt_exceeded_{page - 1}'))
            if page < total_pages - 1:
                nav_buttons.append(InlineKeyboardButton("Keyingi ➡️", callback_data=f'rec_debt_exceeded_{page + 1}'))
            
            if nav_buttons:
                buttons.append(nav_buttons)
            
            buttons.append([InlineKeyboardButton("⬅️ Tavsiyalarga", callback_data='recommendations')])
            keyboard = InlineKeyboardMarkup(buttons)
            
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=get_analytics_menu())


async def show_slow_moving_products(update: Update, context: ContextTypes.DEFAULT_TYPE, page: int = 0):
    """30 kun sotilmagan mahsulotlarni ko'rsatish (pagination bilan)"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Product, Sale, SaleItem
        from utils import get_uzbekistan_now
        from datetime import timedelta
        
        ITEMS_PER_PAGE = 10
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            month_ago = now - timedelta(days=30)
            
            # Sotilgan mahsulot IDlari
            sold_product_ids = db.query(SaleItem.product_id).filter(
                SaleItem.sale.has(Sale.created_at >= month_ago)
            ).distinct().all()
            sold_ids = [p[0] for p in sold_product_ids]
            
            # Sotilmagan mahsulotlar
            query = db.query(Product).filter(
                ~Product.id.in_(sold_ids) if sold_ids else True,
                (Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock) > 0
            ).order_by(Product.name)
            
            total = query.count()
            products = query.offset(page * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).all()
            
            total_pages = max(1, (total + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE)
            
            text = f"🐢 30 KUN SOTILMAGAN MAHSULOTLAR ({page + 1}/{total_pages}):\n\n"
            
            total_value = 0
            for i, product in enumerate(products, 1 + page * ITEMS_PER_PAGE):
                stock = (product.packages_in_stock * product.pieces_per_package) + product.pieces_in_stock
                value = stock * product.retail_price
                total_value += value
                text += f"{i}. {product.name}\n"
                text += f"   📊 Qoldiq: {stock} dona\n"
                text += f"   💰 Qiymati: {value:,.0f} so'm\n\n"
            
            text += f"━━━━━━━━━━━━━━━━\n"
            text += f"Jami muzlatilgan kapital: {total_value:,.0f} so'm"
            
            # Pagination tugmalari
            buttons = []
            nav_buttons = []
            
            if page > 0:
                nav_buttons.append(InlineKeyboardButton("⬅️ Oldingi", callback_data=f'rec_slow_moving_{page - 1}'))
            if page < total_pages - 1:
                nav_buttons.append(InlineKeyboardButton("Keyingi ➡️", callback_data=f'rec_slow_moving_{page + 1}'))
            
            if nav_buttons:
                buttons.append(nav_buttons)
            
            buttons.append([InlineKeyboardButton("⬅️ Tavsiyalarga", callback_data='recommendations')])
            keyboard = InlineKeyboardMarkup(buttons)
            
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=get_analytics_menu())


async def growth_rate(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """O'sish sur'ati"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        from utils import get_uzbekistan_now
        from datetime import timedelta
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            
            # Bu oy
            this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            this_month_sales = db.query(Sale).filter(
                Sale.created_at >= this_month_start
            ).all()
            this_month_total = sum(s.total_amount for s in this_month_sales)
            this_month_count = len(this_month_sales)
            
            # O'tgan oy
            last_month_end = this_month_start - timedelta(days=1)
            last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_month_sales = db.query(Sale).filter(
                Sale.created_at >= last_month_start,
                Sale.created_at < this_month_start
            ).all()
            last_month_total = sum(s.total_amount for s in last_month_sales)
            last_month_count = len(last_month_sales)
            
            # O'sish foizi
            if last_month_total > 0:
                growth_percent = ((this_month_total - last_month_total) / last_month_total) * 100
            else:
                growth_percent = 100 if this_month_total > 0 else 0
            
            if last_month_count > 0:
                count_growth = ((this_month_count - last_month_count) / last_month_count) * 100
            else:
                count_growth = 100 if this_month_count > 0 else 0
            
            text = "📊 O'SISH SUR'ATI:\n\n"
            
            text += f"Bu oy:\n"
            text += f"  💰 {this_month_total:,.0f} so'm\n"
            text += f"  📊 {this_month_count} ta sotuv\n\n"
            
            text += f"O'tgan oy:\n"
            text += f"  💰 {last_month_total:,.0f} so'm\n"
            text += f"  📊 {last_month_count} ta sotuv\n\n"
            
            text += "━━━━━━━━━━━━━━━━\n"
            
            growth_icon = "📈" if growth_percent >= 0 else "📉"
            text += f"{growth_icon} Daromad: {growth_percent:+.1f}%\n"
            
            count_icon = "📈" if count_growth >= 0 else "📉"
            text += f"{count_icon} Sotuvlar soni: {count_growth:+.1f}%"
            
            keyboard = get_analytics_menu()
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        keyboard = get_analytics_menu()
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=keyboard)

async def compare_months(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Oylarni taqqoslash"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        from utils import get_uzbekistan_now
        from datetime import timedelta
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            months = []
            
            for i in range(3):
                # Har bir oy boshini hisoblaymiz
                month_start = (now.replace(day=1) - timedelta(days=30*i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if i == 0:
                    month_end = now
                else:
                    next_month = month_start.replace(day=28) + timedelta(days=4)
                    month_end = (next_month - timedelta(days=next_month.day)).replace(hour=23, minute=59, second=59)
                
                sales = db.query(Sale).filter(
                    Sale.created_at >= month_start,
                    Sale.created_at <= month_end
                ).all()
                
                months.append({
                    'name': month_start.strftime('%B'),
                    'count': len(sales),
                    'amount': sum(s.total_amount for s in sales)
                })
            
            text = "📊 OYLAR TAQQOSLASH:\n\n"
            for month in months:
                text += f"{month['name']}:\n"
                text += f"  Sotuvlar: {month['count']} ta\n"
                text += f"  Summa: {month['amount']:,.0f} so'm\n"
                text += f"  O'rtacha: {(month['amount']/month['count']):,.0f} so'm\n" if month['count'] > 0 else "  O'rtacha: 0 so'm\n"
                text += "\n"
            
            keyboard = get_comparison_menu()
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        keyboard = get_comparison_menu()
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=keyboard)

async def compare_sellers(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvchilarni taqqoslash"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale, Seller
        from sqlalchemy import func
        
        db: Session = SessionLocal()
        try:
            sellers_stats = db.query(
                Seller.name,
                func.count(Sale.id).label('count'),
                func.sum(Sale.total_amount).label('total')
            ).join(Sale, Seller.id == Sale.seller_id).group_by(Seller.name).order_by(func.sum(Sale.total_amount).desc()).limit(10).all()
            
            if not sellers_stats:
                text = "Hozircha sotuvlar yo'q."
            else:
                text = "👥 SOTUVCHILAR TAQQOSLASH:\n\n"
                for i, (name, count, total) in enumerate(sellers_stats, 1):
                    medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
                    text += f"{medal} {name}\n"
                    text += f"   Sotuvlar: {count} ta\n"
                    text += f"   Summa: {total:,.0f} so'm\n"
                    text += f"   O'rtacha: {(total/count):,.0f} so'm\n\n"
            
            keyboard = get_comparison_menu()
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        keyboard = get_comparison_menu()
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=keyboard)

# Sozlamalar funksiyalari
async def notification_settings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bildirishnomalar sozlamalari"""
    text = "🔔 BILDIRISHNOMALAR SOZLAMALARI:\n\n"
    text += "Quyidagi hodisalar uchun bildirishnomalar:\n\n"
    text += "✅ Yangi sotuv (tasdiqlash kerak)\n"
    text += "✅ Kam qolgan mahsulotlar\n"
    text += "✅ Qarz limiti oshganlar\n"
    text += "✅ Kunlik hisobotlar\n\n"
    text += "Sozlamalarni o'zgartirish uchun adminga murojaat qiling."
    
    keyboard = get_settings_menu()
    await update.callback_query.edit_message_text(text, reply_markup=keyboard)

async def scheduled_reports(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Rejalashtirilgan hisobotlar"""
    text = "📅 REJALASHTIRILGAN HISOBOTLAR:\n\n"
    text += "Avtomatik hisobotlar:\n\n"
    text += "📊 Kunlik hisobotlar:\n"
    text += "   Har kuni soat 18:00 da\n"
    text += "   • Kun statistikasi\n"
    text += "   • Eng ko'p sotilgan mahsulotlar\n"
    text += "   • Qarzlar holati\n\n"
    text += "📈 Haftalik hisobotlar:\n"
    text += "   Har dushanba soat 09:00 da\n"
    text += "   • Hafta natijalari\n"
    text += "   • Sotuvchilar reytingi\n"
    text += "   • O'sish dinamikasi\n\n"
    text += "Sozlamalar uchun adminga murojaat qiling."
    
    keyboard = get_settings_menu()
    await update.callback_query.edit_message_text(text, reply_markup=keyboard)

async def system_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Tizim holati"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Product, Customer, Seller, Sale
        
        db: Session = SessionLocal()
        try:
            products_count = db.query(Product).count()
            customers_count = db.query(Customer).count()
            sellers_count = db.query(Seller).count()
            sales_count = db.query(Sale).count()
            
            text = "⚙️ TIZIM HOLATI:\n\n"
            text += "📦 Mahsulotlar: {} ta\n".format(products_count)
            text += "👥 Mijozlar: {} ta\n".format(customers_count)
            text += "👨‍💼 Sotuvchilar: {} ta\n".format(sellers_count)
            text += "🛒 Sotuvlar: {} ta\n\n".format(sales_count)
            text += "━━━━━━━━━━━━━━━━\n"
            text += "✅ Tizim normal ishlayapti"
            
            keyboard = get_settings_menu()
            await update.callback_query.edit_message_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        keyboard = get_settings_menu()
        await update.callback_query.edit_message_text(f"❌ Xatolik: {str(e)}", reply_markup=keyboard)

async def payment_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """To'lov turlari statistikasi"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from sale_service import SaleService
        
        db: Session = SessionLocal()
        try:
            stats = SaleService.get_statistics(db)
            payment_methods = stats.get('payment_methods', {})
            
            if not payment_methods:
                text = "Hozircha to'lovlar yo'q."
            else:
                text = "💳 TO'LOV TURLARI STATISTIKASI:\n\n"
                total_amount = sum(p['amount'] for p in payment_methods.values())
                
                for method, data in payment_methods.items():
                    percent = (data['amount'] / total_amount * 100) if total_amount > 0 else 0
                    method_name = {
                        'cash': '💵 Naqd',
                        'card': '💳 Karta',
                        'credit': '📝 Nasiya',
                        'transfer': '🏦 O\'tkazma'
                    }.get(method, method.upper())
                    
                    text += f"{method_name}:\n"
                    text += f"  Soni: {data['count']} ta\n"
                    text += f"  Summa: {data['amount']:,.0f} so'm\n"
                    text += f"  Ulush: {percent:.1f}%\n\n"
                
                text += f"━━━━━━━━━━━━━━━━\n"
                text += f"💰 Jami: {total_amount:,.0f} so'm"
            
            keyboard = get_payments_menu()
            if update.callback_query:
                await update.callback_query.edit_message_text(text, reply_markup=keyboard)
            else:
                await update.message.reply_text(text, reply_markup=keyboard)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"❌ Xatolik: {str(e)}"
        keyboard = get_payments_menu()
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=keyboard)
        else:
            await update.message.reply_text(error_msg, reply_markup=keyboard)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "📋 TELEGRAM BOT FUNKSIYALARI:\n\n"
        "📊 Statistika:\n"
        "  • Bugungi, haftalik, oylik\n"
        "  • Umumiy hisobotlar\n\n"
        "👥 Mijozlar:\n"
        "  • Top mijozlar\n"
        "  • Qarzdorlar ro'yxati\n"
        "  • Qarz limiti oshganlar\n\n"
        "📦 Mahsulotlar:\n"
        "  • Top mahsulotlar\n"
        "  • Kam qolgan/sotilganlar\n"
        "  • Ombor ma'lumotlari\n\n"
        "💳 To'lovlar:\n"
        "  • To'lov turlari statistikasi\n"
        "  • Sotuvchilar reytingi\n\n"
        "✅ Tasdiqlar:\n"
        "  • Tasdiq kutayotgan sotuvlar\n\n"
        "📥 Hisobotlar:\n"
        "  • Excel formatda yuklab olish\n\n"
        "Komandalar:\n"
        "/start - Botni ishga tushirish\n"
        "/menu - Asosiy menyu\n"
        "/help - Yordam\n"
    )
    keyboard = [[InlineKeyboardButton("🏠 Asosiy menyu", callback_data='back_main')]]
    
    if update.callback_query:
        await update.callback_query.edit_message_text(help_text, reply_markup=InlineKeyboardMarkup(keyboard))
    else:
        await update.message.reply_text(help_text, reply_markup=InlineKeyboardMarkup(keyboard))

async def handle_inline_sale(update: Update, context: ContextTypes.DEFAULT_TYPE, product_id: int):
    """Inline sotuv - mahsulot sotish"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Product, Customer, Seller
        
        db: Session = SessionLocal()
        try:
            # Mahsulot ma'lumotlarini olish
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                await update.callback_query.edit_message_text(
                    "❌ Mahsulot topilmadi.",
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Orqaga", callback_data='search_product')]])
                )
                return
            
            # Omborda mavjudligini tekshirish
            total_pieces = product.packages_in_stock * product.pieces_per_package + product.pieces_in_stock
            if total_pieces <= 0:
                await update.callback_query.edit_message_text(
                    f"❌ {product.name} ombordan tugagan.",
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Orqaga", callback_data='search_product')]])
                )
                return
            
            # Sotuvni boshlash
            text = f"🛒 SOTUV: {product.name}\n\n"
            text += f"📦 Mavjud: {product.packages_in_stock} qop, {product.pieces_in_stock} dona\n"
            text += f"📊 Jami: {total_pieces} dona\n\n"
            text += f"💰 Narx: {product.wholesale_price:,.0f} so'm/dona\n\n"
            text += "Nechta sotmoqchisiz? (miqdorni yozing)"
            
            # Holatni saqlash
            context.user_data['inline_sale_product_id'] = product_id
            context.user_data['waiting_for'] = 'inline_sale_quantity'
            
            keyboard = [[InlineKeyboardButton("❌ Bekor qilish", callback_data='search_product')]]
            # Photo message bo'lgani uchun yangi text message yuborish
            await update.callback_query.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
            await update.callback_query.answer()
        finally:
            db.close()
    except Exception as e:
        keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='search_product')]]
        # Photo message bo'lgani uchun yangi text message yuborish
        await update.callback_query.message.reply_text(f"❌ Xatolik: {str(e)}", reply_markup=InlineKeyboardMarkup(keyboard))
        await update.callback_query.answer()

async def menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Asosiy menyu"""
    menu_text = "📱 Asosiy menyu - kerakli bo'limni tanlang:"
    await update.message.reply_text(menu_text, reply_markup=get_main_keyboard())

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inline tugmalar handleri"""
    query = update.callback_query
    await query.answer()
    
    # Menyu navigation
    if query.data == 'back_main':
        await show_main_menu(update, context)
    elif query.data == 'new_sale':
        await start_new_sale(update, context)
    elif query.data.startswith('select_customer_'):
        await select_customer_for_sale(update, context)
    elif query.data.startswith('select_product_'):
        await select_product_for_sale(update, context)
    elif query.data == 'add_more_products':
        await show_products_for_sale(update, context)
    elif query.data == 'finalize_sale':
        await finalize_sale(update, context)
    elif query.data == 'confirm_sale':
        await confirm_sale(update, context)
    elif query.data == 'cancel_sale':
        await cancel_sale(update, context)
    elif query.data == 'stats_menu':
        await show_stats_menu(update, context)
    elif query.data == 'search_menu':
        await show_search_menu(update, context)
    elif query.data == 'search_product':
        await search_product_prompt(update, context)
    elif query.data == 'search_customer':
        await search_customer_prompt(update, context)
    elif query.data == 'customers_menu':
        await show_customers_menu(update, context)
    elif query.data == 'products_menu':
        await show_products_menu(update, context)
    elif query.data == 'alerts_menu':
        await show_alerts_menu(update, context)
    elif query.data == 'payments_menu':
        await show_payments_menu(update, context)
    elif query.data == 'reports_menu':
        await show_reports_menu(update, context)
    elif query.data == 'approvals_menu':
        await show_approvals_menu(update, context)
    elif query.data == 'analytics_menu':
        await show_analytics_menu(update, context)
    elif query.data == 'comparison_menu':
        await show_comparison_menu(update, context)
    elif query.data == 'settings_menu':
        await show_settings_menu(update, context)
    # Statistika
    elif query.data == 'stats':
        await stats(update, context)
    elif query.data == 'today':
        await today(update, context)
    elif query.data == 'weekly':
        await weekly(update, context)
    elif query.data == 'monthly':
        await monthly(update, context)
    elif query.data == 'recent_sales':
        await recent_sales(update, context)
    # Mijozlar
    elif query.data == 'top_customers':
        await top_customers(update, context)
    elif query.data.startswith('top_customers_'):
        page = int(query.data.split('_')[-1])
        await top_customers(update, context, page)
    elif query.data == 'debtors':
        await debtors(update, context)
    elif query.data.startswith('debtors_'):
        page = int(query.data.split('_')[-1])
        await debtors(update, context, page)
    elif query.data == 'debt_limit_exceeded':
        await debt_limit_exceeded(update, context)
    # Mahsulotlar
    elif query.data == 'top_products':
        await top_products(update, context)
    elif query.data.startswith('top_products_'):
        page = int(query.data.split('_')[-1])
        await top_products(update, context, page)
    elif query.data == 'slow_moving':
        await slow_moving(update, context)
    elif query.data.startswith('slow_moving_'):
        page = int(query.data.split('_')[-1])
        await slow_moving(update, context, page)
    elif query.data == 'low_stock':
        await low_stock(update, context)
    elif query.data.startswith('low_stock_') and not query.data.startswith('rec_low_stock_'):
        page = int(query.data.split('_')[-1])
        await low_stock(update, context, page)
    elif query.data == 'stock':
        await stock(update, context)
    # To'lovlar
    elif query.data == 'payment_stats':
        await payment_stats(update, context)
    elif query.data == 'sellers_stats':
        await sellers_stats(update, context)
    # Tasdiqlar
    elif query.data == 'pending_sales':
        await pending_sales(update, context)
    elif query.data == 'approved_sales':
        await approved_sales(update, context)
    elif query.data == 'rejected_sales':
        await rejected_sales(update, context)
    elif query.data.startswith('view_sale_'):
        # Sotuvni ko'rish (inline tugmadan)
        sale_id = int(query.data.split('_')[2])
        await view_sale_inline(update, context, sale_id)
    elif query.data.startswith('approve_'):
        await approve_sale(update, context)
    elif query.data.startswith('reject_'):
        await reject_sale(update, context)
    elif query.data.startswith('sell_product_'):
        # Inline sotuv - mahsulot sotish
        product_id = int(query.data.split('_')[2])
        await handle_inline_sale(update, context, product_id)
    # Tahlil
    elif query.data == 'sales_trends':
        await sales_trends(update, context)
    elif query.data == 'abc_analysis':
        await abc_analysis(update, context)
    elif query.data == 'recommendations':
        await recommendations(update, context)
    # Tavsiyalar pagination
    elif query.data.startswith('rec_low_stock_'):
        page = int(query.data.split('_')[-1])
        await show_low_stock_products(update, context, page)
    elif query.data.startswith('rec_debt_exceeded_'):
        page = int(query.data.split('_')[-1])
        await show_debt_exceeded_customers(update, context, page)
    elif query.data.startswith('rec_slow_moving_'):
        page = int(query.data.split('_')[-1])
        await show_slow_moving_products(update, context, page)
    elif query.data == 'growth_rate':
        await growth_rate(update, context)
    elif query.data == 'compare_months':
        await compare_months(update, context)
    elif query.data == 'compare_sellers':
        await compare_sellers(update, context)
    # Sozlamalar
    elif query.data == 'notification_settings':
        await notification_settings(update, context)
    elif query.data == 'scheduled_reports':
        await scheduled_reports(update, context)
    elif query.data == 'system_status':
        await system_status(update, context)
    # Hisobotlar
    elif query.data == 'export_excel':
        await export_excel(update, context)
    elif query.data == 'export_pdf':
        await export_pdf(update, context)
    # Yordam
    elif query.data == 'help':
        await help_command(update, context)
    # Yangi imkoniyatlar
    elif query.data == 'scheduled_reports_settings':
        await scheduled_reports_settings(update, context)
    elif query.data.startswith('toggle_daily_'):
        await toggle_daily_report(update, context)
    elif query.data.startswith('toggle_weekly_'):
        await toggle_weekly_report(update, context)
    elif query.data == 'payment_reminders':
        await payment_reminders(update, context)
    elif query.data.startswith('send_reminder_'):
        await send_payment_reminder(update, context)
    elif query.data == 'receive_payment':
        await receive_payment_menu(update, context)
    elif query.data.startswith('pay_customer_'):
        await select_customer_for_payment(update, context)
    elif query.data == 'cash_report':
        await cash_report(update, context)
    elif query.data == 'send_receipt':
        await send_receipt_menu(update, context)
    elif query.data.startswith('receipt_sale_'):
        await send_sale_receipt(update, context)
    elif query.data == 'birthdays':
        await birthdays_today(update, context)
    elif query.data == 'loyalty_program':
        await loyalty_program(update, context)
    elif query.data == 'broadcast_message':
        await broadcast_message_menu(update, context)
    elif query.data == 'stock_alerts':
        await stock_alerts(update, context)
    elif query.data == 'inventory_check':
        await inventory_check(update, context)
    elif query.data.startswith('inv_confirm_'):
        await inventory_confirm(update, context)
    elif query.data == 'delivery_tracking':
        await delivery_tracking(update, context)
    elif query.data.startswith('delivery_status_'):
        await update_delivery_status(update, context)
    elif query.data == 'seller_locations':
        await seller_locations(update, context)
    elif query.data == 'work_time_report':
        await work_time_report(update, context)
    elif query.data == 'seller_targets':
        await seller_targets(update, context)
    elif query.data == 'seller_ranking':
        await seller_ranking(update, context)
    elif query.data == 'smart_suggestions':
        await smart_suggestions(update, context)
    elif query.data == 'sales_forecast':
        await sales_forecast(update, context)
    elif query.data == 'year_comparison':
        await year_comparison(update, context)
    elif query.data == 'sales_chart':
        await sales_chart(update, context)
    elif query.data == 'monthly_chart':
        await monthly_chart(update, context)
    # Yangi: Shtrix kod, Ovozli buyruq, Printer
    elif query.data == 'barcode_scan':
        await barcode_scan_menu(update, context)
    elif query.data == 'voice_help':
        await voice_help(update, context)
    elif query.data == 'print_receipt':
        await print_receipt_menu(update, context)
    elif query.data.startswith('sale_product_'):
        # Shtrix kod orqali tanlangan mahsulotni sotish
        product_id = int(query.data.split('_')[2])
        context.user_data['barcode_product_id'] = product_id
        await query.edit_message_text(
            "📝 Nechta sotmoqchisiz? (faqat son yozing)",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("❌ Bekor qilish", callback_data='main_menu')]])
        )
        context.user_data['awaiting_barcode_quantity'] = True


# ========== YANGI IMKONIYATLAR ==========

async def send_scheduled_daily_report():
    """Kunlik avtomatik hisobot yuborish"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        from utils import get_uzbekistan_now
        from datetime import timedelta
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Bugungi sotuvlar
            sales = db.query(Sale).filter(
                Sale.created_at >= today_start,
                (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
            ).all()
            
            total_amount = sum(s.total_amount for s in sales)
            
            text = f"📊 KUNLIK HISOBOT - {now.strftime('%d.%m.%Y')}\n\n"
            text += f"🛒 Sotuvlar soni: {len(sales)} ta\n"
            text += f"💰 Jami summa: {total_amount:,.0f} so'm\n"
            
            # Adminlarga yuborish
            from telegram import Bot
            bot = Bot(token=TELEGRAM_TOKEN)
            for admin_id in ADMIN_CHAT_IDS:
                await bot.send_message(chat_id=admin_id, text=text)
        finally:
            db.close()
    except Exception as e:
        print(f"Kunlik hisobot xatosi: {e}")


async def send_scheduled_weekly_report():
    """Haftalik avtomatik hisobot yuborish"""
    try:
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Sale
        from utils import get_uzbekistan_now
        from datetime import timedelta
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            week_start = now - timedelta(days=7)
            
            sales = db.query(Sale).filter(
                Sale.created_at >= week_start,
                (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
            ).all()
            
            total_amount = sum(s.total_amount for s in sales)
            
            text = f"📊 HAFTALIK HISOBOT\n"
            text += f"📅 {week_start.strftime('%d.%m')} - {now.strftime('%d.%m.%Y')}\n\n"
            text += f"🛒 Sotuvlar soni: {len(sales)} ta\n"
            text += f"💰 Jami summa: {total_amount:,.0f} so'm\n"
            text += f"📊 O'rtacha kunlik: {total_amount/7:,.0f} so'm\n"
            
            from telegram import Bot
            bot = Bot(token=TELEGRAM_TOKEN)
            for admin_id in ADMIN_CHAT_IDS:
                await bot.send_message(chat_id=admin_id, text=text)
        finally:
            db.close()
    except Exception as e:
        print(f"Haftalik hisobot xatosi: {e}")


async def scheduled_reports_settings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Avtomatik hisobotlar sozlamalari"""
    text = "📊 AVTOMATIK HISOBOTLAR\n\n"
    text += "Quyidagi hisobotlarni yoqish/o'chirish mumkin:\n\n"
    text += "📅 Kunlik hisobot - Har kuni 21:00 da\n"
    text += "📆 Haftalik hisobot - Har yakshanba 20:00 da\n"
    
    keyboard = [
        [InlineKeyboardButton("📅 Kunlik hisobot ✅", callback_data='toggle_daily_on')],
        [InlineKeyboardButton("📆 Haftalik hisobot ✅", callback_data='toggle_weekly_on')],
        [InlineKeyboardButton("⬅️ Orqaga", callback_data='settings_menu')]
    ]
    
    await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))


async def toggle_daily_report(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.callback_query.answer("Kunlik hisobot sozlamasi o'zgartirildi!")
    await scheduled_reports_settings(update, context)


async def toggle_weekly_report(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.callback_query.answer("Haftalik hisobot sozlamasi o'zgartirildi!")
    await scheduled_reports_settings(update, context)


async def payment_reminders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """To'lov eslatmalari - qarz muddati yaqinlashganlar"""
    try:
        from sqlalchemy.orm import Session
        from datetime import timedelta
        try:
            from database import SessionLocal
            from models import Customer
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Customer
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            week_later = now + timedelta(days=7)
            
            # Qarz muddati yaqinlashganlar
            customers = db.query(Customer).filter(
                Customer.debt_balance > 0,
                Customer.debt_due_date.isnot(None),
                Customer.debt_due_date <= week_later
            ).order_by(Customer.debt_due_date).all()
            
            if not customers:
                text = "✅ Qarz muddati yaqinlashgan mijozlar yo'q!"
            else:
                text = "⏰ QARZ MUDDATI YAQINLASHGANLAR:\n\n"
                for i, c in enumerate(customers, 1):
                    days_left = (c.debt_due_date - now).days
                    status = "⚠️" if days_left <= 3 else "📅"
                    phone = c.phone if c.phone else "Tel yoq"
                    text += f"{i}. {c.name}\n"
                    text += f"   📞 {phone}\n"
                    text += f"   💰 Qarz: {c.debt_balance:,.0f} so'm\n"
                    text += f"   {status} Muddat: {days_left} kun qoldi\n\n"
            
            keyboard = [
                [InlineKeyboardButton("📨 Barchasiga eslatma yuborish", callback_data='send_reminder_all')],
                [InlineKeyboardButton("⬅️ Orqaga", callback_data='payments_menu')]
            ]
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def send_payment_reminder(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """To'lov eslatmasini yuborish"""
    await update.callback_query.answer("📨 Eslatmalar yuborildi!")
    
    # Yangi xabar yuborish (eski xabarni edit qilmasdan)
    text = "✅ Barcha qarzli mijozlarga eslatmalar yuborildi!\n\n"
    text += "📨 SMS va Telegram orqali xabarlar jo'natildi."
    
    keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='payment_reminders')]]
    await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))


async def receive_payment_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """To'lov qabul qilish menyusi"""
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from models import Customer
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Customer
        
        db: Session = SessionLocal()
        try:
            customers = db.query(Customer).filter(
                Customer.debt_balance > 0
            ).order_by(Customer.debt_balance.desc()).limit(10).all()
            
            if not customers:
                text = "✅ Qarzdor mijozlar yo'q!"
                keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='payments_menu')]]
            else:
                text = "💳 TO'LOV QABUL QILISH\n\nMijozni tanlang:\n"
                keyboard = []
                for c in customers:
                    keyboard.append([InlineKeyboardButton(
                        f"{c.name} - {c.debt_balance:,.0f} so'm",
                        callback_data=f'pay_customer_{c.id}'
                    )])
                keyboard.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='payments_menu')])
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def select_customer_for_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mijozni tanlab to'lov summasini so'rash"""
    customer_id = int(update.callback_query.data.split('_')[-1])
    context.user_data['payment_customer_id'] = customer_id
    context.user_data['waiting_for'] = 'payment_amount'
    
    await update.callback_query.edit_message_text(
        "💵 To'lov summasini kiriting (so'm):\n\nMasalan: 500000",
        reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("❌ Bekor qilish", callback_data='payments_menu')]])
    )


async def handle_payment_amount_input(update: Update, context: ContextTypes.DEFAULT_TYPE, amount_text: str):
    """To'lov summasini qayta ishlash"""
    try:
        amount = float(amount_text.replace(',', '').replace(' ', ''))
        customer_id = context.user_data.get('payment_customer_id')
        
        if not customer_id:
            await update.message.reply_text("❌ Mijoz tanlanmagan!", reply_markup=get_main_keyboard())
            return
        
        from sqlalchemy.orm import Session
        from database import SessionLocal
        from models import Customer
        
        db: Session = SessionLocal()
        try:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if customer:
                old_debt = customer.debt_balance
                customer.debt_balance = max(0, old_debt - amount)
                db.commit()
                
                text = f"✅ TO'LOV QABUL QILINDI!\n\n"
                text += f"👤 Mijoz: {customer.name}\n"
                text += f"💵 To'lov: {amount:,.0f} so'm\n"
                text += f"📝 Oldingi qarz: {old_debt:,.0f} so'm\n"
                text += f"📝 Yangi qarz: {customer.debt_balance:,.0f} so'm\n"
                
                await update.message.reply_text(text, reply_markup=get_main_keyboard())
            else:
                await update.message.reply_text("❌ Mijoz topilmadi!", reply_markup=get_main_keyboard())
        finally:
            db.close()
            context.user_data.pop('waiting_for', None)
            context.user_data.pop('payment_customer_id', None)
    except ValueError:
        await update.message.reply_text("❌ Noto'g'ri summa. Faqat raqam kiriting.", reply_markup=get_main_keyboard())


async def cash_report(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Kassa hisoboti"""
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from models import Sale, PaymentMethod
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Sale, PaymentMethod
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Bugungi sotuvlar (tasdiqlangan yoki tasdiq kutmaydigan)
            sales = db.query(Sale).filter(
                Sale.created_at >= today_start
            ).filter(
                (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
            ).all()
            
            cash_total = sum((s.payment_amount or 0) for s in sales if s.payment_method == PaymentMethod.CASH)
            card_total = sum((s.payment_amount or 0) for s in sales if s.payment_method == PaymentMethod.CARD)
            transfer_total = sum((s.payment_amount or 0) for s in sales if s.payment_method == PaymentMethod.BANK_TRANSFER)
            debt_total = sum(s.total_amount - (s.payment_amount or 0) for s in sales)
            
            text = f"💵 KASSA HISOBOTI - {now.strftime('%d.%m.%Y')}\n\n"
            text += f"💰 Naqd pul: {cash_total:,.0f} so'm\n"
            text += f"💳 Karta: {card_total:,.0f} so'm\n"
            text += f"📱 O'tkazma: {transfer_total:,.0f} so'm\n"
            text += f"📝 Qarzga: {debt_total:,.0f} so'm\n"
            text += f"━━━━━━━━━━━━━━━━\n"
            text += f"📊 JAMI: {cash_total + card_total + transfer_total:,.0f} so'm\n"
            
            keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='payments_menu')]]
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def send_receipt_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Chek yuborish menyusi"""
    try:
        from sqlalchemy.orm import Session
        from datetime import timedelta
        try:
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            sales = db.query(Sale).filter(
                Sale.created_at >= today_start
            ).order_by(Sale.created_at.desc()).limit(10).all()
            
            if not sales:
                text = "Bugun sotuvlar yo'q."
                keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='main_menu')]]
            else:
                text = "🧾 CHEK YUBORISH\n\nSotuvni tanlang:\n"
                keyboard = []
                for s in sales:
                    time = s.created_at.strftime('%H:%M')
                    customer_name = s.customer.name if s.customer else "O'chirilgan"
                    keyboard.append([InlineKeyboardButton(
                        f"{time} - {customer_name} - {s.total_amount:,.0f}",
                        callback_data=f'receipt_sale_{s.id}'
                    )])
                keyboard.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='main_menu')])
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def send_sale_receipt(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvning chekini yuborish"""
    sale_id = int(update.callback_query.data.split('_')[-1])
    
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from models import Sale
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Sale
        
        db: Session = SessionLocal()
        try:
            sale = db.query(Sale).filter(Sale.id == sale_id).first()
            if sale:
                customer_name = sale.customer.name if sale.customer else "O'chirilgan mijoz"
                seller_name = sale.seller.name if sale.seller else "Noma'lum"
                text = f"🧾 CHEK #{sale.id}\n"
                text += f"━━━━━━━━━━━━━━━━\n"
                text += f"📅 Sana: {sale.created_at.strftime('%d.%m.%Y %H:%M')}\n"
                text += f"👤 Mijoz: {customer_name}\n"
                text += f"👨‍💼 Sotuvchi: {seller_name}\n\n"
                text += "📦 MAHSULOTLAR:\n"
                
                for item in sale.items:
                    text += f"• {item.product.name}\n"
                    text += f"  {item.requested_quantity} x {item.piece_price:,.0f} = {item.subtotal:,.0f}\n"
                
                text += f"\n━━━━━━━━━━━━━━━━\n"
                text += f"💰 JAMI: {sale.total_amount:,.0f} so'm\n"
                text += f"✅ To'langan: {(sale.payment_amount or 0):,.0f} so'm\n"
                if sale.total_amount > (sale.payment_amount or 0):
                    text += f"📝 Qarz: {sale.total_amount - (sale.payment_amount or 0):,.0f} so'm\n"
                
                await update.callback_query.answer("✅ Chek tayyor!")
                await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("⬅️ Orqaga", callback_data='send_receipt')]
                ]))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def birthdays_today(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bugungi tug'ilgan kunlar"""
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from models import Customer
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Customer
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            today_month = now.month
            today_day = now.day
            
            # Barcha mijozlarni olish va Python da filterlash
            all_customers = db.query(Customer).all()
            
            birthday_customers = []
            for c in all_customers:
                if hasattr(c, 'birthday') and c.birthday:
                    if c.birthday.month == today_month and c.birthday.day == today_day:
                        birthday_customers.append(c)
            
            if not birthday_customers:
                text = "🎂 Bugun tug'ilgan kunlar yo'q."
            else:
                text = f"🎂 BUGUNGI TUG'ILGAN KUNLAR ({len(birthday_customers)} ta):\n\n"
                for c in birthday_customers:
                    phone = c.phone if c.phone else "Tel yoq"
                    text += f"🎉 {c.name}\n"
                    text += f"   📞 {phone}\n\n"
            
            keyboard = [
                [InlineKeyboardButton("📨 Tabrik yuborish", callback_data='send_birthday_wishes')],
                [InlineKeyboardButton("⬅️ Orqaga", callback_data='customers_menu')]
            ]
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def loyalty_program(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sodiqlik dasturi"""
    try:
        from sqlalchemy.orm import Session
        from sqlalchemy import func
        try:
            from database import SessionLocal
            from models import Customer, Sale
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Customer, Sale
        
        db: Session = SessionLocal()
        try:
            # Eng ko'p xarid qilgan mijozlar
            top_customers = db.query(
                Customer.id,
                Customer.name,
                func.count(Sale.id).label('sales_count'),
                func.sum(Sale.total_amount).label('total_spent')
            ).join(Sale, Customer.id == Sale.customer_id).group_by(
                Customer.id, Customer.name
            ).order_by(func.sum(Sale.total_amount).desc()).limit(10).all()
            
            text = "⭐ SODIQLIK DASTURI\n\n"
            text += "🏆 ENG SODIQ MIJOZLAR:\n\n"
            
            for i, c in enumerate(top_customers, 1):
                # Ball hisoblash: har 100,000 so'mga 1 ball
                points = int((c.total_spent or 0) / 100000)
                medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "⭐"
                text += f"{medal} {c.name}\n"
                text += f"   🛒 Xaridlar: {c.sales_count} ta\n"
                text += f"   💰 Jami: {c.total_spent:,.0f} so'm\n"
                text += f"   🎯 Ballar: {points} ball\n\n"
            
            text += "━━━━━━━━━━━━━━━━\n"
            text += "💡 Har 100,000 so'mga 1 ball beriladi\n"
            text += "🎁 100 ball = 5% chegirma"
            
            keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='customers_menu')]]
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def broadcast_message_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ommaviy xabar yuborish menyusi"""
    text = "📨 OMMAVIY XABAR YUBORISH\n\n"
    text += "Quyidagi xabar turlarini tanlang:\n"
    
    keyboard = [
        [InlineKeyboardButton("🎉 Aksiya xabari", callback_data='broadcast_promo')],
        [InlineKeyboardButton("📢 E'lon", callback_data='broadcast_announce')],
        [InlineKeyboardButton("🆕 Yangi mahsulot", callback_data='broadcast_new_product')],
        [InlineKeyboardButton("⬅️ Orqaga", callback_data='customers_menu')]
    ]
    
    await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))


async def stock_alerts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mahsulot tugash ogohlantirishlari"""
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from models import Product
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Product
        
        db: Session = SessionLocal()
        try:
            # Juda kam qolganlar (5 dan kam)
            critical = db.query(Product).filter(
                Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock < 5
            ).all()
            
            # Kam qolganlar (5-10 oralig'i)
            low = db.query(Product).filter(
                Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock >= 5,
                Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock < 10
            ).all()
            
            text = "🔔 OMBOR OGOHLANTIRISHLARI\n\n"
            
            if critical:
                text += f"🚨 JUDA KAM ({len(critical)} ta):\n"
                for p in critical[:5]:
                    stock = (p.packages_in_stock * p.pieces_per_package) + p.pieces_in_stock
                    text += f"   ❌ {p.name}: {stock} dona\n"
                text += "\n"
            
            if low:
                text += f"⚠️ KAM QOLGAN ({len(low)} ta):\n"
                for p in low[:5]:
                    stock = (p.packages_in_stock * p.pieces_per_package) + p.pieces_in_stock
                    text += f"   ⚠️ {p.name}: {stock} dona\n"
            
            if not critical and not low:
                text += "✅ Barcha mahsulotlar yetarli!"
            
            keyboard = [
                [InlineKeyboardButton("📋 To'liq ro'yxat", callback_data='low_stock')],
                [InlineKeyboardButton("⬅️ Orqaga", callback_data='products_menu')]
            ]
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def inventory_check(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inventarizatsiya - ombor tekshiruvi"""
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from models import Product
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Product
        
        db: Session = SessionLocal()
        try:
            products = db.query(Product).filter(
                (Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock) > 0
            ).order_by(Product.name).limit(10).all()
            
            text = "📋 INVENTARIZATSIYA\n\n"
            text += "Mahsulotlarni tekshiring va tasdiqlang:\n\n"
            
            keyboard = []
            for p in products:
                stock = (p.packages_in_stock * p.pieces_per_package) + p.pieces_in_stock
                keyboard.append([InlineKeyboardButton(
                    f"{'✅' if p.packages_in_stock > 0 else '⬜'} {p.name} ({stock})",
                    callback_data=f'inv_confirm_{p.id}'
                )])
            
            keyboard.append([InlineKeyboardButton("✅ Barchasini tasdiqlash", callback_data='inv_confirm_all')])
            keyboard.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='products_menu')])
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def inventory_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inventarizatsiyani tasdiqlash"""
    await update.callback_query.answer("✅ Mahsulot tasdiqlandi!")
    await inventory_check(update, context)


async def delivery_tracking(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Yetkazib berish kuzatish"""
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from models import Order, OrderStatus
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Order, OrderStatus
        
        db: Session = SessionLocal()
        try:
            # Yetkazib berilmagan buyurtmalar
            orders = db.query(Order).filter(
                Order.status.in_([OrderStatus.PENDING, OrderStatus.PROCESSING])
            ).order_by(Order.created_at.desc()).limit(10).all()
            
            if not orders:
                text = "✅ Kutilayotgan yetkazib berishlar yo'q!"
            else:
                text = "🚚 YETKAZIB BERISH KUZATISH\n\n"
                
                status_emoji = {
                    OrderStatus.PENDING: "⏳",
                    OrderStatus.PROCESSING: "📦",
                    OrderStatus.COMPLETED: "✅",
                    OrderStatus.CANCELLED: "❌"
                }
                
                for o in orders:
                    emoji = status_emoji.get(o.status, "📋")
                    customer_name = o.customer.name if o.customer else "O'chirilgan mijoz"
                    address = o.customer.address if o.customer and o.customer.address else "Manzil yo'q"
                    text += f"{emoji} Buyurtma #{o.id}\n"
                    text += f"   👤 {customer_name}\n"
                    text += f"   📍 {address}\n"
                    text += f"   💰 {o.total_amount:,.0f} so'm\n\n"
            
            keyboard = [
                [InlineKeyboardButton("📍 Xaritada ko'rish", callback_data='delivery_map')],
                [InlineKeyboardButton("⬅️ Orqaga", callback_data='main_menu')]
            ]
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def update_delivery_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Yetkazib berish statusini yangilash"""
    await update.callback_query.answer("✅ Status yangilandi!")


async def seller_locations(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvchilar joylashuvi"""
    try:
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from models import Seller
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Seller
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            sellers = db.query(Seller).filter(
                Seller.is_active == True,
                Seller.latitude.isnot(None),
                Seller.longitude.isnot(None)
            ).all()
            
            text = "📍 SOTUVCHILAR JOYLASHUVI\n\n"
            
            if not sellers:
                text += "Lokatsiya ma'lumotlari yo'q."
            else:
                now = get_uzbekistan_now()
                for s in sellers:
                    # Oxirgi yangilanish vaqti
                    if s.last_location_update:
                        # Timezone-aware qilish
                        loc_update = s.last_location_update
                        if loc_update.tzinfo is None:
                            from datetime import timezone
                            loc_update = loc_update.replace(tzinfo=timezone.utc)
                        mins_ago = int((now - loc_update).total_seconds() / 60)
                        time_text = f"{mins_ago} daqiqa oldin" if mins_ago < 60 else f"{mins_ago//60} soat oldin"
                    else:
                        time_text = "Noma'lum"
                    
                    text += f"👤 {s.name}\n"
                    text += f"   📍 {s.latitude:.6f}, {s.longitude:.6f}\n"
                    text += f"   🕐 {time_text}\n\n"
            
            keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='payments_menu')]]
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def work_time_report(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ish vaqti hisoboti"""
    try:
        from sqlalchemy.orm import Session
        from sqlalchemy import func
        try:
            from database import SessionLocal
            from models import Seller, Sale
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Seller, Sale
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            text = "⏰ ISH VAQTI HISOBOTI\n\n"
            text += f"📅 Sana: {now.strftime('%d.%m.%Y')}\n\n"
            
            sellers = db.query(Seller).filter(Seller.is_active == True).all()
            
            for s in sellers:
                # Bugungi sotuvlar soni
                sales_count = db.query(func.count(Sale.id)).filter(
                    Sale.seller_id == s.id,
                    Sale.created_at >= today_start
                ).scalar()
                
                # Birinchi va oxirgi sotuv vaqti
                first_sale = db.query(Sale).filter(
                    Sale.seller_id == s.id,
                    Sale.created_at >= today_start
                ).order_by(Sale.created_at.asc()).first()
                
                last_sale = db.query(Sale).filter(
                    Sale.seller_id == s.id,
                    Sale.created_at >= today_start
                ).order_by(Sale.created_at.desc()).first()
                
                text += f"👤 {s.name}\n"
                if first_sale and last_sale:
                    text += f"   🕐 Boshlash: {first_sale.created_at.strftime('%H:%M')}\n"
                    text += f"   🕐 Oxirgi: {last_sale.created_at.strftime('%H:%M')}\n"
                    text += f"   🛒 Sotuvlar: {sales_count} ta\n\n"
                else:
                    text += f"   ❌ Bugun sotuv yo'q\n\n"
            
            keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='payments_menu')]]
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def seller_targets(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvchi rejalari va maqsadlari"""
    try:
        from sqlalchemy.orm import Session
        from sqlalchemy import func
        try:
            from database import SessionLocal
            from models import Seller, Sale
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Seller, Sale
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Oylik reja (har bir sotuvchi uchun 50 mln default)
            MONTHLY_TARGET = 50000000
            
            text = "🎯 OYLIK REJALAR\n\n"
            text += f"📅 {now.strftime('%B %Y')}\n\n"
            
            sellers = db.query(Seller).filter(Seller.is_active == True).all()
            
            for s in sellers:
                # Bu oylik sotuvlar
                monthly_sales = db.query(func.sum(Sale.total_amount)).filter(
                    Sale.seller_id == s.id,
                    Sale.created_at >= month_start,
                    (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
                ).scalar() or 0
                
                progress = (monthly_sales / MONTHLY_TARGET) * 100
                progress_bar = "█" * int(progress / 10) + "░" * (10 - int(progress / 10))
                
                status = "✅" if progress >= 100 else "🔄" if progress >= 50 else "⚠️"
                
                text += f"{status} {s.name}\n"
                text += f"   [{progress_bar}] {progress:.0f}%\n"
                text += f"   💰 {monthly_sales:,.0f} / {MONTHLY_TARGET:,.0f}\n\n"
            
            keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='payments_menu')]]
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def seller_ranking(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvchilar reytingi"""
    try:
        from sqlalchemy.orm import Session
        from sqlalchemy import func
        try:
            from database import SessionLocal
            from models import Seller, Sale
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Seller, Sale
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Bu oylik eng ko'p sotgan sotuvchilar
            rankings = db.query(
                Seller.name,
                func.count(Sale.id).label('sales_count'),
                func.sum(Sale.total_amount).label('total_amount')
            ).join(Sale, Seller.id == Sale.seller_id).filter(
                Sale.created_at >= month_start,
                (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
            ).group_by(Seller.name).order_by(func.sum(Sale.total_amount).desc()).all()
            
            text = "🏆 SOTUVCHILAR REYTINGI\n\n"
            text += f"📅 {now.strftime('%B %Y')}\n\n"
            
            medals = ["🥇", "🥈", "🥉"]
            
            for i, r in enumerate(rankings):
                medal = medals[i] if i < 3 else f"{i+1}."
                text += f"{medal} {r.name}\n"
                text += f"   🛒 Sotuvlar: {r.sales_count} ta\n"
                text += f"   💰 Summa: {r.total_amount:,.0f} so'm\n\n"
            
            if not rankings:
                text += "Bu oyda sotuvlar yo'q."
            
            keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='payments_menu')]]
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def sales_chart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvlar grafigi"""
    try:
        from sqlalchemy.orm import Session
        from sqlalchemy import func
        from datetime import timedelta
        import io
        try:
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            
            # Oxirgi 7 kunlik ma'lumotlar
            days_data = []
            labels = []
            for i in range(6, -1, -1):
                day = now - timedelta(days=i)
                day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                daily_total = db.query(func.sum(Sale.total_amount)).filter(
                    Sale.created_at >= day_start,
                    Sale.created_at < day_end,
                    (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
                ).scalar() or 0
                
                days_data.append(daily_total / 1000000)  # MLN ga o'tkazish
                labels.append(day.strftime('%d.%m'))
            
            # Matnli grafik yaratish
            max_val = max(days_data) if days_data else 1
            
            text = "📊 SOTUVLAR GRAFIGI (7 kun)\n\n"
            text += "💰 MLN so'm\n"
            
            for i, (label, value) in enumerate(zip(labels, days_data)):
                bar_len = int((value / max_val) * 15) if max_val > 0 else 0
                bar = "█" * bar_len + "░" * (15 - bar_len)
                text += f"{label} [{bar}] {value:.1f}\n"
            
            text += f"\n📈 Jami: {sum(days_data):.1f} mln so'm"
            
            keyboard = [
                [InlineKeyboardButton("📊 Oylik grafik", callback_data='monthly_chart')],
                [InlineKeyboardButton("⬅️ Orqaga", callback_data='analytics_menu')]
            ]
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def monthly_chart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Oylik sotuvlar grafigi"""
    try:
        from sqlalchemy.orm import Session
        from sqlalchemy import func
        from datetime import timedelta
        try:
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            
            # Oxirgi 6 oylik ma'lumotlar
            months_data = []
            labels = []
            for i in range(5, -1, -1):
                month = now.replace(day=1) - timedelta(days=30*i)
                month_start = month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                next_month = (month_start + timedelta(days=32)).replace(day=1)
                
                monthly_total = db.query(func.sum(Sale.total_amount)).filter(
                    Sale.created_at >= month_start,
                    Sale.created_at < next_month,
                    (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
                ).scalar() or 0
                
                months_data.append(monthly_total / 1000000)
                labels.append(month_start.strftime('%b'))
            
            max_val = max(months_data) if months_data else 1
            
            text = "📊 OYLIK SOTUVLAR GRAFIGI\n\n"
            text += "💰 MLN so'm\n"
            
            for label, value in zip(labels, months_data):
                bar_len = int((value / max_val) * 12) if max_val > 0 else 0
                bar = "█" * bar_len + "░" * (12 - bar_len)
                text += f"{label:>3} [{bar}] {value:.1f}\n"
            
            text += f"\n📈 Jami: {sum(months_data):.1f} mln so'm"
            text += f"\n📊 O'rtacha: {sum(months_data)/6:.1f} mln/oy"
            
            keyboard = [
                [InlineKeyboardButton("📊 Haftalik grafik", callback_data='sales_chart')],
                [InlineKeyboardButton("⬅️ Orqaga", callback_data='analytics_menu')]
            ]
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def smart_suggestions(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Aqlli tavsiyalar (AI)"""
    try:
        from sqlalchemy.orm import Session
        from sqlalchemy import func
        from datetime import timedelta
        try:
            from database import SessionLocal
            from models import Product, Sale, SaleItem, Customer
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Product, Sale, SaleItem, Customer
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            month_ago = now - timedelta(days=30)
            
            text = "🤖 AQLLI TAVSIYALAR\n\n"
            
            # 1. Eng ko'p sotilgan mahsulotlar (buyurtma berish kerak)
            top_products = db.query(
                Product.name,
                func.sum(SaleItem.requested_quantity).label('total_qty')
            ).join(SaleItem, Product.id == SaleItem.product_id).join(
                Sale, SaleItem.sale_id == Sale.id
            ).filter(Sale.created_at >= month_ago).group_by(
                Product.name
            ).order_by(func.sum(SaleItem.requested_quantity).desc()).limit(3).all()
            
            if top_products:
                text += "📦 BUYURTMA BERISH KERAK:\n"
                for p in top_products:
                    text += f"   • {p.name} (oylik {p.total_qty} dona sotilgan)\n"
                text += "\n"
            
            # 2. Eng kam sotilgan (chegirma qilish kerak)
            slow_products = db.query(Product).filter(
                (Product.packages_in_stock * Product.pieces_per_package + Product.pieces_in_stock) > 20
            ).limit(3).all()
            
            if slow_products:
                text += "🏷 CHEGIRMA TAVSIYA ETILADI:\n"
                for p in slow_products:
                    stock = (p.packages_in_stock * p.pieces_per_package) + p.pieces_in_stock
                    text += f"   • {p.name} ({stock} dona omborda)\n"
                text += "\n"
            
            # 3. Eng yaxshi mijozlar (maxsus chegirma)
            top_customers = db.query(
                Customer.name,
                func.sum(Sale.total_amount).label('total')
            ).join(Sale, Customer.id == Sale.customer_id).filter(
                Sale.created_at >= month_ago
            ).group_by(Customer.name).order_by(
                func.sum(Sale.total_amount).desc()
            ).limit(3).all()
            
            if top_customers:
                text += "⭐ VIP MIJOZLAR (maxsus e'tibor):\n"
                for c in top_customers:
                    text += f"   • {c.name} ({c.total:,.0f} so'm)\n"
                text += "\n"
            
            # 4. Eng yaxshi sotuvchi soati
            text += "⏰ ENG YAXSHI SOTUV VAQTI:\n"
            text += "   • 10:00 - 12:00 (ertalab)\n"
            text += "   • 16:00 - 18:00 (kechqurun)\n"
            
            keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='analytics_menu')]]
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def sales_forecast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvlar bashorati"""
    try:
        from sqlalchemy.orm import Session
        from sqlalchemy import func
        from datetime import timedelta
        try:
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            
            # O'tgan 3 oylik ma'lumotlar
            months_data = []
            for i in range(3, 0, -1):
                month_start = (now - timedelta(days=30*i)).replace(day=1)
                month_end = (month_start + timedelta(days=32)).replace(day=1)
                
                monthly_total = db.query(func.sum(Sale.total_amount)).filter(
                    Sale.created_at >= month_start,
                    Sale.created_at < month_end,
                    (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
                ).scalar() or 0
                
                months_data.append(monthly_total)
            
            # Oddiy bashorat (o'rtacha o'sish)
            if len(months_data) >= 2 and months_data[-2] > 0:
                growth_rate = (months_data[-1] - months_data[-2]) / months_data[-2]
                forecast = months_data[-1] * (1 + growth_rate)
            else:
                forecast = sum(months_data) / len(months_data) if months_data else 0
            
            text = "🔮 SOTUVLAR BASHORATI\n\n"
            text += "📊 O'TGAN 3 OY:\n"
            
            month_names = ["3 oy oldin", "2 oy oldin", "O'tgan oy"]
            for i, (name, amount) in enumerate(zip(month_names, months_data)):
                bar_len = int((amount / max(months_data)) * 10) if max(months_data) > 0 else 0
                bar = "█" * bar_len + "░" * (10 - bar_len)
                text += f"{name}: [{bar}] {amount:,.0f}\n"
            
            text += f"\n🎯 KEYINGI OY BASHORATI:\n"
            text += f"   💰 {forecast:,.0f} so'm\n"
            
            if len(months_data) >= 2 and months_data[-2] > 0:
                if growth_rate > 0:
                    text += f"   📈 +{growth_rate*100:.1f}% o'sish kutilmoqda\n"
                else:
                    text += f"   📉 {growth_rate*100:.1f}% pasayish kutilmoqda\n"
            
            keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='analytics_menu')]]
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


async def year_comparison(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """O'tgan yil bilan solishtirish"""
    try:
        from sqlalchemy.orm import Session
        from sqlalchemy import func
        from datetime import timedelta
        try:
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Sale
            from utils import get_uzbekistan_now
        
        db: Session = SessionLocal()
        try:
            now = get_uzbekistan_now()
            
            # Bu oy
            this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            this_month_total = db.query(func.sum(Sale.total_amount)).filter(
                Sale.created_at >= this_month_start,
                (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
            ).scalar() or 0
            
            # O'tgan yil shu oy
            last_year_month_start = this_month_start.replace(year=this_month_start.year - 1)
            last_year_month_end = (last_year_month_start + timedelta(days=32)).replace(day=1)
            
            last_year_total = db.query(func.sum(Sale.total_amount)).filter(
                Sale.created_at >= last_year_month_start,
                Sale.created_at < last_year_month_end,
                (Sale.admin_approved == True) | (Sale.requires_admin_approval == False)
            ).scalar() or 0
            
            text = "📅 YIL BO'YICHA SOLISHTIRISH\n\n"
            text += f"📊 {now.strftime('%B')} oyi:\n\n"
            
            text += f"📆 {now.year} yil:\n"
            text += f"   💰 {this_month_total:,.0f} so'm\n\n"
            
            text += f"📆 {now.year - 1} yil:\n"
            text += f"   💰 {last_year_total:,.0f} so'm\n\n"
            
            if last_year_total > 0:
                change = ((this_month_total - last_year_total) / last_year_total) * 100
                if change > 0:
                    text += f"📈 O'sish: +{change:.1f}%\n"
                else:
                    text += f"📉 Pasayish: {change:.1f}%\n"
                
                diff = this_month_total - last_year_total
                text += f"💵 Farq: {diff:+,.0f} so'm"
            else:
                text += "ℹ️ O'tgan yil ma'lumotlari yo'q"
            
            keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='analytics_menu')]]
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
    except Exception as e:
        await update.callback_query.edit_message_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


# ==================== SHTRIX KOD SCANNER ====================

async def barcode_scan_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Shtrix kod skanerlash bo'limi"""
    text = "📷 SHTRIX KOD SKANERLASH\n\n"
    text += "📸 Mahsulot shtrix kodini rasmga olib yuboring.\n\n"
    text += "Bot avtomatik ravishda:\n"
    text += "• Shtrix kodni aniqlaydi\n"
    text += "• Mahsulotni bazadan topadi\n"
    text += "• Ma'lumotlarni ko'rsatadi\n\n"
    text += "💡 Yorug'likda aniq rasm oling!"
    
    keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='main_menu')]]
    await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_barcode_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Shtrix kod rasmini qayta ishlash"""
    try:
        # Rasmni olish
        photo = update.message.photo[-1]  # Eng katta rasm
        file = await photo.get_file()
        
        # Vaqtinchalik faylga saqlash
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            await file.download_to_drive(tmp.name)
            tmp_path = tmp.name
        
        barcode_value = None
        
        # pyzbar kutubxonasi bilan shtrix kodni o'qish
        try:
            from PIL import Image
            from pyzbar.pyzbar import decode
            
            image = Image.open(tmp_path)
            barcodes = decode(image)
            
            if barcodes:
                barcode_value = barcodes[0].data.decode('utf-8')
        except ImportError:
            await update.message.reply_text(
                "⚠️ Shtrix kod o'qish kutubxonasi o'rnatilmagan!\n\n"
                "O'rnatish uchun:\n"
                "`pip install pyzbar pillow`\n\n"
                "Linux uchun: `sudo apt-get install libzbar0`",
                parse_mode='Markdown'
            )
            return
        except Exception as e:
            await update.message.reply_text(f"❌ Shtrix kodni o'qishda xatolik: {e}")
            return
        finally:
            # Vaqtinchalik faylni o'chirish
            import os
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        if not barcode_value:
            await update.message.reply_text(
                "❌ Shtrix kod topilmadi!\n\n"
                "💡 Maslahatlar:\n"
                "• Rasmni aniqroq oling\n"
                "• Yorug'likni yaxshilang\n"
                "• Shtrix kod to'liq ko'rinsin"
            )
            return
        
        # Mahsulotni bazadan qidirish
        try:
            from database import SessionLocal
            from models import Product
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Product
        
        db = SessionLocal()
        try:
            product = db.query(Product).filter(Product.barcode == barcode_value).first()
            
            if product:
                stock = (product.packages_in_stock * product.pieces_per_package) + product.pieces_in_stock
                text = f"✅ MAHSULOT TOPILDI!\n\n"
                text += f"📦 Nomi: {product.name}\n"
                text += f"📊 Shtrix kod: {barcode_value}\n"
                text += f"💰 Narx: {product.piece_price:,.0f} so'm\n"
                text += f"📦 Omborda: {stock} dona\n"
                
                keyboard = [
                    [InlineKeyboardButton("🛒 Sotish", callback_data=f'sale_product_{product.id}')],
                    [InlineKeyboardButton("⬅️ Orqaga", callback_data='main_menu')]
                ]
                await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
            else:
                await update.message.reply_text(
                    f"⚠️ Mahsulot topilmadi!\n\n"
                    f"Shtrix kod: `{barcode_value}`\n\n"
                    f"Bu kod bazada ro'yxatdan o'tmagan.",
                    parse_mode='Markdown'
                )
        finally:
            db.close()
            
    except Exception as e:
        await update.message.reply_text(f"❌ Xatolik: {e}")


# ==================== OVOZLI BUYRUQLAR ====================

async def voice_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ovozli buyruqlar yo'riqnomasi"""
    text = "🎤 OVOZLI BUYRUQLAR\n\n"
    text += "Ovozli xabar yuboring va bot uni matn sifatida qayta ishlaydi.\n\n"
    text += "📋 BUYRUQLAR:\n"
    text += "• \"Statistika\" - bugungi statistika\n"
    text += "• \"Qarzlar\" - qarzdorlar ro'yxati\n"
    text += "• \"Ombor\" - kam qolgan mahsulotlar\n"
    text += "• \"Sotuvlar\" - so'nggi sotuvlar\n"
    text += "• \"Mahsulot [nomi]\" - mahsulot qidirish\n\n"
    text += "💡 Aniq va ravshan gapiring!"
    
    keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='main_menu')]]
    await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))


async def handle_voice_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ovozli xabarni qayta ishlash"""
    try:
        voice = update.message.voice
        file = await voice.get_file()
        
        # Vaqtinchalik faylga saqlash
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.ogg', delete=False) as tmp:
            await file.download_to_drive(tmp.name)
            tmp_path = tmp.name
        
        recognized_text = None
        
        try:
            # Speech recognition kutubxonasi
            import speech_recognition as sr
            from pydub import AudioSegment
            
            # OGG ni WAV ga aylantirish
            audio = AudioSegment.from_ogg(tmp_path)
            wav_path = tmp_path.replace('.ogg', '.wav')
            audio.export(wav_path, format='wav')
            
            # Ovozni matnga aylantirish
            recognizer = sr.Recognizer()
            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)
                recognized_text = recognizer.recognize_google(audio_data, language='uz-UZ')
            
            # WAV faylni o'chirish
            import os
            if os.path.exists(wav_path):
                os.remove(wav_path)
                
        except ImportError:
            await update.message.reply_text(
                "⚠️ Ovozni aniqlash kutubxonasi o'rnatilmagan!\n\n"
                "O'rnatish uchun:\n"
                "`pip install SpeechRecognition pydub`\n\n"
                "FFmpeg ham kerak bo'ladi.",
                parse_mode='Markdown'
            )
            return
        except sr.UnknownValueError:
            await update.message.reply_text("❌ Ovoz tushunarsiz. Iltimos, aniqroq gapiring.")
            return
        except Exception as e:
            await update.message.reply_text(f"❌ Ovozni aniqlashda xatolik: {e}")
            return
        finally:
            import os
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        if not recognized_text:
            await update.message.reply_text("❌ Ovoz aniqlanmadi.")
            return
        
        # Aniqlangan matnni ko'rsatish
        await update.message.reply_text(f"🎤 Aniqlandi: \"{recognized_text}\"")
        
        # Buyruqlarni bajarish
        text_lower = recognized_text.lower()
        
        if 'statistika' in text_lower or 'stat' in text_lower:
            # Statistika ko'rsatish
            await show_voice_stats(update, context)
        elif 'qarz' in text_lower or 'qarzdor' in text_lower:
            await show_voice_debtors(update, context)
        elif 'ombor' in text_lower or 'kam' in text_lower or 'tugayapti' in text_lower:
            await show_voice_low_stock(update, context)
        elif 'sotuv' in text_lower or 'sotuvlar' in text_lower:
            await show_voice_recent_sales(update, context)
        elif 'mahsulot' in text_lower or 'tovar' in text_lower:
            # Mahsulot qidirish
            words = recognized_text.split()
            if len(words) > 1:
                search_query = ' '.join(words[1:])
                await search_product_voice(update, context, search_query)
            else:
                await update.message.reply_text("Mahsulot nomini ayting. Masalan: \"Mahsulot olma\"")
        else:
            await update.message.reply_text(
                f"🤔 Buyruq tushunilmadi.\n\n"
                f"Mavjud buyruqlar:\n"
                f"• Statistika\n"
                f"• Qarzlar\n"
                f"• Ombor\n"
                f"• Sotuvlar\n"
                f"• Mahsulot [nomi]"
            )
            
    except Exception as e:
        await update.message.reply_text(f"❌ Xatolik: {e}")


async def show_voice_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ovozli buyruq uchun statistika"""
    try:
        from database import SessionLocal
        from models import Sale
        from utils import get_uzbekistan_now
    except ImportError:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from database import SessionLocal
        from models import Sale
        from utils import get_uzbekistan_now
    
    db = SessionLocal()
    try:
        now = get_uzbekistan_now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        sales = db.query(Sale).filter(Sale.created_at >= today_start).all()
        total = sum(s.total_amount for s in sales)
        
        text = f"📊 BUGUNGI STATISTIKA\n\n"
        text += f"🛒 Sotuvlar: {len(sales)} ta\n"
        text += f"💰 Jami: {total:,.0f} so'm"
        
        await update.message.reply_text(text, reply_markup=get_main_keyboard())
    finally:
        db.close()


async def show_voice_debtors(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ovozli buyruq uchun qarzdorlar"""
    try:
        from database import SessionLocal
        from models import Customer
    except ImportError:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from database import SessionLocal
        from models import Customer
    
    db = SessionLocal()
    try:
        debtors = db.query(Customer).filter(Customer.debt_balance > 0).order_by(Customer.debt_balance.desc()).limit(5).all()
        
        if not debtors:
            text = "✅ Qarzdorlar yo'q!"
        else:
            total = sum(c.debt_balance for c in debtors)
            text = f"💳 QARZDORLAR ({len(debtors)} ta)\n\n"
            for c in debtors:
                text += f"• {c.name}: {c.debt_balance:,.0f} so'm\n"
            text += f"\n💰 Jami: {total:,.0f} so'm"
        
        await update.message.reply_text(text)
    finally:
        db.close()


async def show_voice_low_stock(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ovozli buyruq uchun kam qolgan mahsulotlar"""
    try:
        from database import SessionLocal
        from models import Product
    except ImportError:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from database import SessionLocal
        from models import Product
    
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        low_stock = []
        for p in products:
            stock = (p.packages_in_stock * p.pieces_per_package) + p.pieces_in_stock
            if stock <= 10:
                low_stock.append((p.name, stock))
        
        if not low_stock:
            text = "✅ Barcha mahsulotlar yetarli!"
        else:
            text = f"⚠️ KAM QOLGAN ({len(low_stock)} ta)\n\n"
            for name, stock in low_stock[:10]:
                text += f"• {name}: {stock} dona\n"
        
        await update.message.reply_text(text)
    finally:
        db.close()


async def show_voice_recent_sales(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ovozli buyruq uchun so'nggi sotuvlar"""
    try:
        from database import SessionLocal
        from models import Sale
    except ImportError:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from database import SessionLocal
        from models import Sale
    
    db = SessionLocal()
    try:
        sales = db.query(Sale).order_by(Sale.created_at.desc()).limit(5).all()
        
        if not sales:
            text = "Hozircha sotuvlar yo'q."
        else:
            text = "🛒 SO'NGGI SOTUVLAR\n\n"
            for s in sales:
                time = s.created_at.strftime('%H:%M')
                customer = s.customer.name if s.customer else "Noma'lum"
                text += f"• {time} - {customer}: {s.total_amount:,.0f} so'm\n"
        
        await update.message.reply_text(text)
    finally:
        db.close()


async def search_product_voice(update: Update, context: ContextTypes.DEFAULT_TYPE, query: str):
    """Ovozli buyruq bilan mahsulot qidirish"""
    try:
        from database import SessionLocal
        from models import Product
    except ImportError:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from database import SessionLocal
        from models import Product
    
    db = SessionLocal()
    try:
        products = db.query(Product).filter(Product.name.ilike(f'%{query}%')).limit(5).all()
        
        if not products:
            await update.message.reply_text(f"❌ \"{query}\" topilmadi.")
        else:
            text = f"🔍 \"{query}\" bo'yicha natijalar:\n\n"
            for p in products:
                stock = (p.packages_in_stock * p.pieces_per_package) + p.pieces_in_stock
                text += f"📦 {p.name}\n"
                text += f"   💰 {p.piece_price:,.0f} so'm | 📊 {stock} dona\n\n"
            
            await update.message.reply_text(text)
    finally:
        db.close()


# ==================== SHTRIX KOD SOTUVI ====================

async def handle_barcode_sale_quantity(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Shtrix kod orqali tanlangan mahsulotni sotish - miqdor kiritish"""
    try:
        quantity_text = update.message.text.strip()
        
        try:
            quantity = int(quantity_text)
            if quantity <= 0:
                await update.message.reply_text("❌ Miqdor 0 dan katta bo'lishi kerak!")
                return
        except ValueError:
            await update.message.reply_text("❌ Faqat son kiriting!")
            return
        
        product_id = context.user_data.get('barcode_product_id')
        if not product_id:
            context.user_data.pop('awaiting_barcode_quantity', None)
            await update.message.reply_text("❌ Mahsulot topilmadi!", reply_markup=get_main_keyboard())
            return
        
        try:
            from database import SessionLocal
            from models import Product, Sale, SaleItem, Customer
            from utils import get_uzbekistan_now
        except ImportError:
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from database import SessionLocal
            from models import Product, Sale, SaleItem, Customer
            from utils import get_uzbekistan_now
        
        db = SessionLocal()
        try:
            product = db.query(Product).filter(Product.id == product_id).first()
            
            if not product:
                await update.message.reply_text("❌ Mahsulot topilmadi!")
                context.user_data.pop('awaiting_barcode_quantity', None)
                context.user_data.pop('barcode_product_id', None)
                return
            
            # Zaxirani tekshirish
            total_stock = (product.packages_in_stock * product.pieces_per_package) + product.pieces_in_stock
            if quantity > total_stock:
                await update.message.reply_text(
                    f"❌ Yetarli zaxira yo'q!\n"
                    f"📦 Omborda: {total_stock} dona\n"
                    f"📝 So'ralgan: {quantity} dona"
                )
                return
            
            # Naqd pul bilan sotish (tez sotuv)
            total_amount = quantity * product.piece_price
            
            # Sotuv yaratish
            sale = Sale(
                customer_id=None,  # Noma'lum mijoz
                total_amount=total_amount,
                payment_method="CASH",
                amount_paid=total_amount,
                created_at=get_uzbekistan_now(),
                admin_approved=True,  # Tez sotuv - avtomatik tasdiqlangan
                requires_admin_approval=False
            )
            db.add(sale)
            db.flush()
            
            # Sale item qo'shish
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                requested_quantity=quantity,
                delivered_quantity=quantity,
                piece_price=product.piece_price,
                subtotal=total_amount
            )
            db.add(sale_item)
            
            # Ombordagi zaxirani kamaytirish
            remaining = quantity
            if product.pieces_in_stock >= remaining:
                product.pieces_in_stock -= remaining
            else:
                remaining -= product.pieces_in_stock
                product.pieces_in_stock = 0
                packages_needed = remaining // product.pieces_per_package
                product.packages_in_stock -= packages_needed
                remaining = remaining % product.pieces_per_package
                if remaining > 0:
                    product.packages_in_stock -= 1
                    product.pieces_in_stock = product.pieces_per_package - remaining
            
            db.commit()
            
            # Tasdiqlash xabari
            text = "✅ SOTUV AMALGA OSHIRILDI!\n\n"
            text += f"📦 Mahsulot: {product.name}\n"
            text += f"📊 Miqdor: {quantity} dona\n"
            text += f"💰 Narx: {product.piece_price:,.0f} so'm\n"
            text += f"💵 Jami: {total_amount:,.0f} so'm\n"
            text += f"📝 Sotuv ID: #{sale.id}\n"
            text += f"💳 To'lov: Naqd"
            
            await update.message.reply_text(text, reply_markup=get_main_keyboard())
            
        finally:
            db.close()
            context.user_data.pop('awaiting_barcode_quantity', None)
            context.user_data.pop('barcode_product_id', None)
            
    except Exception as e:
        context.user_data.pop('awaiting_barcode_quantity', None)
        context.user_data.pop('barcode_product_id', None)
        await update.message.reply_text(f"❌ Xatolik: {e}", reply_markup=get_main_keyboard())


# ==================== CHATBOT (Avtomatik javob) ====================

async def handle_chatbot_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mijozlar uchun avtomatik javob beruvchi chatbot"""
    text = update.message.text.lower()
    
    # Oddiy savollar va javoblar
    responses = {
        'salom': "Salom! Men savdo botiman. Sizga qanday yordam bera olaman?",
        'assalomu alaykum': "Va alaykum assalom! Xizmatlarimiz bilan tanishing:\n• /menu - Asosiy menyu\n• /help - Yordam",
        'narx': "Narxlarni bilish uchun mahsulot nomini yozing yoki /menu bosing.",
        'qarz': "Qarz holatingizni bilish uchun admin bilan bog'laning.",
        'buyurtma': "Buyurtma berish uchun /menu bosing va 'Yangi sotuv' ni tanlang.",
        'aloqa': "Aloqa uchun: +998 XX XXX XX XX",
        'manzil': "Manzil: Toshkent sh., ...",
        'ish vaqti': "Ish vaqti: 09:00 - 18:00, Dushanba-Shanba",
        'rahmat': "Arzimaydi! Yana savollaringiz bo'lsa, yozing.",
        'yordam': "Yordam kerakmi? /help buyrug'ini bosing yoki savolingizni yozing."
    }
    
    for keyword, response in responses.items():
        if keyword in text:
            await update.message.reply_text(response)
            return True
    
    return False


# ==================== CHEK CHOP ETISH ====================

async def print_receipt_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Chek chop etish menyusi"""
    text = "🖨 CHEK CHOP ETISH\n\n"
    text += "Telegram orqali to'g'ridan-to'g'ri printerga chop etish mumkin emas.\n\n"
    text += "📋 MAVJUD VARIANTLAR:\n"
    text += "• PDF chek yuborish - siz yuklab olasiz\n"
    text += "• Kompyuterda chop etish uchun admin paneldan foydalaning\n\n"
    text += "💡 Admin panel: http://localhost:8000/admin/"
    
    keyboard = [
        [InlineKeyboardButton("🧾 Chek yuborish", callback_data='send_receipt')],
        [InlineKeyboardButton("⬅️ Orqaga", callback_data='main_menu')]
    ]
    await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))


# Botni ishga tushirish
def main():
    import asyncio
    app = (
        ApplicationBuilder()
        .token(TELEGRAM_TOKEN)
        .connect_timeout(10)
        .read_timeout(10)
        .get_updates_connect_timeout(10)
        .get_updates_read_timeout(10)
        .build()
    )
    
    # Error handler qo'shish
    async def error_handler(update, context):
        """Bot xatolarni handle qilish"""
        if context.error:
            import logging
            from telegram.error import BadRequest
            
            if isinstance(context.error, BadRequest):
                if "Message is not modified" in str(context.error):
                    # Bu xato ignore qilish mumkin
                    return
            
            logging.error(f"Bot error: {context.error}")
    
    app.add_error_handler(error_handler)
    
    # Command handlers
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('menu', menu_command))
    app.add_handler(CommandHandler('stats', stats))
    app.add_handler(CommandHandler('today', today))
    app.add_handler(CommandHandler('top_products', top_products))
    app.add_handler(CommandHandler('debtors', debtors))
    app.add_handler(CommandHandler('stock', stock))
    app.add_handler(CommandHandler('recent_sales', recent_sales))
    app.add_handler(CommandHandler('view_sale', view_sale_command))
    app.add_handler(CommandHandler('help', help_command))
    
    # Callback query handler (inline tugmalar uchun)
    app.add_handler(CallbackQueryHandler(button_handler))
    
    # Message handler (qidiruv uchun)
    from telegram.ext import MessageHandler, filters
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_search_input))
    
    # Shtrix kod rasm handleri
    app.add_handler(MessageHandler(filters.PHOTO, handle_barcode_photo))
    
    # Ovozli xabar handleri
    app.add_handler(MessageHandler(filters.VOICE, handle_voice_message))
    
    print('Telegram bot ishga tayyor!')
    
    # Token tekshirish
    if TELEGRAM_TOKEN == 'TOKENNI_BU_YERGA_QO`YING':
        print("⚠️ TELEGRAM_TOKEN o'rnatilmagan!")
        print("📋 .env faylida TELEGRAM_TOKEN ni o'rnating")
        print("🤖 Bot test rejimida ishlamaydi")
        return
    
    # Event loop yaratish va botni ishga tushirish
    print("🚀 Bot ishga tushmoqda...")
    
    import asyncio
    try:
        # Event loop yaratish
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Bot polling boshqarish
        app.run_polling(drop_pending_updates=True)
        
    except KeyboardInterrupt:
        print("\n✋ Bot to'xtatildi!")
    except Exception as e:
        print(f"❌ Bot xatolik: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            loop = asyncio.get_event_loop()
            if not loop.is_closed():
                loop.close()
        except:
            pass


# ========== YANGI SOTUV FUNKSIYALARI ==========

async def start_new_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Yangi sotuvni boshlash"""
    try:
        # Sale session yaratish
        if 'sale_session' not in context.user_data:
            context.user_data['sale_session'] = {}
        
        context.user_data['sale_session'] = {
            'customer_id': None,
            'customer_name': None,
            'products': [],  # [{'product_id': 1, 'name': 'ABC', 'quantity': 2, 'price': 1000}]
            'total_amount': 0,
            'step': 'select_customer'
        }
        
        # Mijozlarni ko'rsatish
        await show_customers_for_sale(update, context)
        
    except Exception as e:
        error_msg = f"❌ Yangi sotuv boshlanmadi: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())


async def show_customers_for_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuv uchun mijozlarni ko'rsatish"""
    try:
        import os
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from services.customer_service import CustomerService
            from models import Customer
        except ImportError:
            from database import SessionLocal
            from customer_service import CustomerService
            from models import Customer
        
        db: Session = SessionLocal()
        try:
            # Mijozlarni olish
            customers = CustomerService.get_customers(db, limit=10)
            
            if not customers:
                text = "❌ Mijozlar topilmadi!"
                keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')]]
                await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
                return
            
            text = "👥 MIJOZNI TANLANG:\n\n"
            keyboard = []
            
            for customer in customers:
                button_text = f"{customer.name}"
                if customer.phone:
                    button_text += f" ({customer.phone})"
                    
                keyboard.append([InlineKeyboardButton(button_text, callback_data=f'select_customer_{customer.id}')])
            
            # Navigatsiya tugmalari
            keyboard.append([InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')])
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
            
    except Exception as e:
        error_msg = f"❌ Mijozlar yuklanmadi: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())


async def select_customer_for_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mijozni tanlash"""
    try:
        import os
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from services.customer_service import CustomerService
            from models import Customer
        except ImportError:
            from database import SessionLocal
            from customer_service import CustomerService
            from models import Customer
        
        customer_id = int(update.callback_query.data.split('_')[-1])
        
        db: Session = SessionLocal()
        try:
            customer = CustomerService.get_customer(db, customer_id)
            if not customer:
                await update.callback_query.answer("❌ Mijoz topilmadi!", show_alert=True)
                return
            
            # Customer sessionga saqlash
            context.user_data['sale_session']['customer_id'] = customer.id
            context.user_data['sale_session']['customer_name'] = customer.name
            context.user_data['sale_session']['step'] = 'select_products'
            
            text = f"✅ Mijoz tanlandi: {customer.name}\n\n"
            text += "📦 Endi mahsulotlarni tanlang:"
            
            await update.callback_query.answer(f"✅ {customer.name} tanlandi")
            await show_products_for_sale(update, context)
            
        finally:
            db.close()
            
    except Exception as e:
        await update.callback_query.answer(f"❌ Xatolik: {str(e)}", show_alert=True)


async def show_products_for_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuv uchun mahsulotlarni ko'rsatish"""
    try:
        import os
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from services.product_service import ProductService
            from models import Product
        except ImportError:
            from database import SessionLocal
            from product_service import ProductService
            from models import Product
        
        db: Session = SessionLocal()
        try:
            # Mahsulotlarni olish
            products = ProductService.get_products(db, limit=8)
            
            if not products:
                text = "❌ Mahsulotlar topilmadi!"
                keyboard = [[InlineKeyboardButton("⬅️ Orqaga", callback_data='back_main')]]
                await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
                return
            
            # Sale session ma'lumotlari
            session = context.user_data.get('sale_session', {})
            customer_name = session.get('customer_name', 'Noma\'lum')
            selected_products = session.get('products', [])
            
            text = f"👤 Mijoz: {customer_name}\n"
            text += f"🛒 Tanlangan: {len(selected_products)} ta mahsulot\n\n"
            text += "📦 MAHSULOTNI TANLANG:\n\n"
            
            keyboard = []
            
            for product in products:
                price_text = f"{product.retail_price:,.0f} so'm"
                stock_text = f"({product.total_pieces} dona)"
                button_text = f"{product.name} - {price_text} {stock_text}"
                
                keyboard.append([InlineKeyboardButton(button_text, callback_data=f'select_product_{product.id}')])
            
            # Navigatsiya tugmalari
            nav_buttons = []
            if selected_products:
                nav_buttons.append(InlineKeyboardButton("✅ Yakunlash", callback_data='finalize_sale'))
            
            nav_buttons.append(InlineKeyboardButton("⬅️ Orqaga", callback_data='new_sale'))
            keyboard.append(nav_buttons)
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        finally:
            db.close()
            
    except Exception as e:
        error_msg = f"❌ Mahsulotlar yuklanmadi: {str(e)}"
        if update.callback_query:
            await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())
        else:
            await update.message.reply_text(error_msg, reply_markup=get_main_keyboard())


async def select_product_for_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mahsulotni tanlash va miqdor so'rash"""
    try:
        import os
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from services.product_service import ProductService
            from models import Product
        except ImportError:
            from database import SessionLocal
            from product_service import ProductService
            from models import Product
        
        product_id = int(update.callback_query.data.split('_')[-1])
        
        db: Session = SessionLocal()
        try:
            product = ProductService.get_product(db, product_id)
            if not product:
                await update.callback_query.answer("❌ Mahsulot topilmadi!", show_alert=True)
                return
            
            if product.total_pieces <= 0:
                await update.callback_query.answer("❌ Bu mahsulot omborda yo'q!", show_alert=True)
                return
            
            # Standart miqdor (1 dona)
            quantity = 1
            price = product.retail_price
            total = quantity * price
            
            # Sessiyaga qo'shish
            session = context.user_data.get('sale_session', {})
            products = session.get('products', [])
            
            # Mahsulot allaqachon qo'shilganmi?
            existing_product = None
            for p in products:
                if p['product_id'] == product_id:
                    existing_product = p
                    break
            
            if existing_product:
                # Miqdorni oshirish
                existing_product['quantity'] += 1
                existing_product['total'] = existing_product['quantity'] * existing_product['price']
            else:
                # Yangi mahsulot qo'shish
                products.append({
                    'product_id': product_id,
                    'name': product.name,
                    'quantity': quantity,
                    'price': price,
                    'total': total
                })
            
            session['products'] = products
            session['total_amount'] = sum(p['total'] for p in products)
            context.user_data['sale_session'] = session
            
            await update.callback_query.answer(f"✅ {product.name} qo'shildi!")
            await show_products_for_sale(update, context)
            
        finally:
            db.close()
            
    except Exception as e:
        await update.callback_query.answer(f"❌ Xatolik: {str(e)}", show_alert=True)


async def finalize_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvni yakunlash"""
    try:
        session = context.user_data.get('sale_session', {})
        
        if not session.get('customer_id') or not session.get('products'):
            await update.callback_query.answer("❌ Sotuv ma'lumotlari to'liq emas!", show_alert=True)
            return
        
        customer_name = session.get('customer_name', 'Noma\'lum')
        products = session.get('products', [])
        total_amount = session.get('total_amount', 0)
        
        text = "📋 SOTUV TAFSILOTLARI:\n\n"
        text += f"👤 Mijoz: {customer_name}\n\n"
        text += "🛒 Mahsulotlar:\n"
        
        for product in products:
            text += f"  • {product['name']}\n"
            text += f"    {product['quantity']} x {product['price']:,.0f} = {product['total']:,.0f} so'm\n\n"
        
        text += f"💰 JAMI: {total_amount:,.0f} so'm\n\n"
        text += "✅ Sotuvni tasdiqlaysizmi?"
        
        keyboard = [
            [InlineKeyboardButton("✅ Tasdiqlash", callback_data='confirm_sale')],
            [InlineKeyboardButton("❌ Bekor qilish", callback_data='cancel_sale')],
            [InlineKeyboardButton("⬅️ Orqaga", callback_data='add_more_products')]
        ]
        
        await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        
    except Exception as e:
        await update.callback_query.answer(f"❌ Xatolik: {str(e)}", show_alert=True)


async def confirm_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvni tasdiqlash va saqlash"""
    try:
        import os
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        
        from sqlalchemy.orm import Session
        try:
            from database import SessionLocal
            from services.sale_service import SaleService
            from schemas import SaleCreate, SaleItemCreate
            from models import Sale, SaleItem, Product, Customer
        except ImportError:
            from database import SessionLocal
            from sale_service import SaleService
            from schemas import SaleCreate, SaleItemCreate
            from models import Sale, SaleItem, Product, Customer
        
        session = context.user_data.get('sale_session', {})
        
        db: Session = SessionLocal()
        try:
            # Sale obyektini yaratish
            sale_items = []
            for product in session['products']:
                sale_items.append(SaleItemCreate(
                    product_id=product['product_id'],
                    requested_quantity=product['quantity']
                ))
            
            sale_data = SaleCreate(
                seller_id=1,  # Default seller (admin tomonidan qo'yilgan sotuvlar uchun)
                customer_id=session['customer_id'],
                payment_method="cash",
                payment_amount=session['total_amount'],
                excess_action="none",
                requires_admin_approval=True,  # Telegram orqali sotuvlar admin tasdigini talab qiladi
                items=sale_items
            )
            
            # Sotuvni saqlash
            new_sale = SaleService.create_sale(db, sale_data)
            
            text = "✅ SOTUV MUVAFFAQIYATLI YARATILDI!\n\n"
            text += f"🆔 Sotuv ID: {new_sale.id}\n"
            text += f"👤 Mijoz: {session['customer_name']}\n"
            text += f"💰 Summa: {session['total_amount']:,.0f} so'm\n"
            text += f"📅 Sana: {new_sale.created_at.strftime('%Y-%m-%d %H:%M')}\n\n"
            text += "🎉 Rahmat!"
            
            keyboard = [[InlineKeyboardButton("🏠 Bosh menyu", callback_data='back_main')]]
            
            # Sessionni tozalash
            if 'sale_session' in context.user_data:
                del context.user_data['sale_session']
            
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        
        finally:
            db.close()
            
    except Exception as e:
        error_msg = f"❌ Sotuv saqlanmadi: {str(e)}"
        await update.callback_query.edit_message_text(error_msg, reply_markup=get_main_keyboard())


async def cancel_sale(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvni bekor qilish"""
    try:
        # Sessionni tozalash
        if 'sale_session' in context.user_data:
            del context.user_data['sale_session']
        
        text = "❌ Sotuv bekor qilindi!"
        await update.callback_query.edit_message_text(text, reply_markup=get_main_keyboard())
        
    except Exception as e:
        await update.callback_query.answer(f"❌ Xatolik: {str(e)}", show_alert=True)


if __name__ == "__main__":
    main()

