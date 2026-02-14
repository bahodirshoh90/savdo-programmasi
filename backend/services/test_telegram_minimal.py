#!/usr/bin/env python3
"""
Minimal Telegram bot test
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN') or 'TOKENNI_BU_YERGA_QO`YING'

def test_telegram_bot():
    """Test Telegram bot basic functionality"""
    print("🤖 TELEGRAM BOT TEST")
    print("=" * 30)
    
    if TELEGRAM_TOKEN == 'TOKENNI_BU_YERGA_QO`YING':
        print("❌ TELEGRAM_TOKEN o'rnatilmagan!")
        return
    
    print(f"✅ Token mavjud: {TELEGRAM_TOKEN[:10]}...{TELEGRAM_TOKEN[-5:]}")
    
    try:
        from telegram.ext import ApplicationBuilder, CommandHandler
        
        # Simple bot creation test
        app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
        print("✅ ApplicationBuilder muvaffaqiyatli yaratildi")
        
        # Simple command handler
        async def start_command(update, context):
            await update.message.reply_text('Hello! Bot ishlayapti!')
        
        app.add_handler(CommandHandler('start', start_command))
        print("✅ Command handler qo'shildi")
        
        # Test polling setup
        print("🚀 Bot polling rejimida ishga tushmoqda...")
        print("📱 Telegram'da /start buyrug'ini yuboring!")
        print("⚠️  Bot to'xtatish uchun Ctrl+C bosing")
        
        # Run the bot
        import asyncio
        
        # Create event loop for Windows
        if os.name == 'nt':  # Windows
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        # Start polling
        app.run_polling(drop_pending_updates=True)
        
    except Exception as e:
        print(f"❌ Bot test xatolik: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_telegram_bot()