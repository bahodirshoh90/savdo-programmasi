#!/usr/bin/env python3
"""
Simple working Telegram bot launcher
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN') or 'TOKENNI_BU_YERGA_QO`YING'

def run_telegram_bot():
    """Simple Telegram bot runner"""
    print("🤖 TELEGRAM BOT ISHGA TUSHIRISH")
    print("=" * 35)
    
    if TELEGRAM_TOKEN == 'TOKENNI_BU_YERGA_QO`YING':
        print("❌ TELEGRAM_TOKEN o'rnatilmagan!")
        print("📋 .env faylida TELEGRAM_TOKEN ni o'rnating")
        return
    
    print(f"✅ Token mavjud: {TELEGRAM_TOKEN[:10]}...{TELEGRAM_TOKEN[-5:]}")
    
    try:
        # Import all functions from main service
        from telegram_service import (
            start, menu_command, button_handler, handle_search_input,
            get_main_keyboard
        )
        from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, MessageHandler, filters
        
        # Create application
        app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
        print("✅ Application yaratildi")
        
        # Add handlers
        app.add_handler(CommandHandler('start', start))
        app.add_handler(CommandHandler('menu', menu_command))
        app.add_handler(CallbackQueryHandler(button_handler))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_search_input))
        print("✅ Handlers qo'shildi")
        
        # Test main keyboard
        keyboard = get_main_keyboard()
        print(f"✅ Main keyboard yaratildi: {len(keyboard.inline_keyboard)} qator")
        
        # Check for new sale button
        found_new_sale = False
        for row in keyboard.inline_keyboard:
            for button in row:
                if "Yangi Sotuv" in button.text:
                    found_new_sale = True
                    break
        
        if found_new_sale:
            print("✅ 'Yangi Sotuv' tugmasi mavjud!")
        else:
            print("⚠️ 'Yangi Sotuv' tugmasi topilmadi")
        
        print("\n🚀 Bot ishga tushmoqda...")
        print("📱 Telegram'da /start buyrug'ini yuboring!")
        print("⚠️ Bot to'xtatish uchun Ctrl+C bosing\n")
        
        # Run with simple polling - no custom event loop
        import asyncio
        
        def run_bot():
            try:
                app.run_polling(drop_pending_updates=True, close_loop=False)
            except KeyboardInterrupt:
                print("\n✋ Bot to'xtatildi!")
            except Exception as e:
                print(f"❌ Bot xatolik: {str(e)}")
        
        # Run in main thread
        run_bot()
        
    except Exception as e:
        print(f"❌ Bot setup xatolik: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_telegram_bot()