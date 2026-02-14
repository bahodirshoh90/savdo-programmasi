import os
from sqlalchemy.orm import Session
from database import SessionLocal
try:
    from .sale_service import SaleService
    from .product_service import ProductService
    from .debt_service import DebtService
except ImportError:
    from sale_service import SaleService
    from product_service import ProductService
    from debt_service import DebtService
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN') or 'TOKENNI_BU_YERGA_QO`YING'
ADMIN_CHAT_IDS = [int(x) for x in (os.getenv('ADMIN_CHAT_IDS') or '').split(',') if x.strip().isdigit()]

def get_stats_text():
    db: Session = SessionLocal()
    try:
        stats = SaleService.get_statistics(db)
        inventory = ProductService.get_inventory_total_value(db)
        total_debt = DebtService.get_total_debt(db)
        text = (
            f"📊 Umumiy statistika (barcha vaqt):\n"
            f"Sotuvlar soni: {stats['total_sales']}\n"
            f"Umumiy summa: {stats['total_amount']:,} so'm\n"
            f"Umumiy foyda: {stats['total_profit']:,} so'm\n"
            f"O'rtacha sotuv: {stats['average_sale']:,} so'm\n"
            f"\n"
            f"🗃 Ombordagi mahsulotlar qiymati: {inventory['total_value_by_cost']:,} so'm (kelgan narx)\n"
            f"🗃 Ombordagi mahsulotlar qiymati: {inventory['total_value_by_wholesale']:,} so'm (ulgurji narx)\n"
            f"\n"
            f"💸 Jami qarzdorlik: {total_debt:,} so'm\n"
        )
        return text
    finally:
        db.close()

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = get_stats_text()
    await update.message.reply_text(text)
