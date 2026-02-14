#!/usr/bin/env python3
"""
Simple working Telegram bot launcher with scheduled reports
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from datetime import time
import pytz

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN') or 'TOKENNI_BU_YERGA_QO`YING'

# O'zbekiston timezone
UZBEKISTAN_TZ = pytz.timezone('Asia/Tashkent')

def run_telegram_bot():
    """Simple Telegram bot runner with scheduled jobs"""
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
            get_main_keyboard, send_scheduled_daily_report, send_scheduled_weekly_report
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
        
        # Add scheduled jobs for daily and weekly reports
        job_queue = app.job_queue
        if job_queue:
            # Kunlik hisobot - har kuni 21:00 da O'zbekiston vaqti
            job_queue.run_daily(
                lambda context: context.application.create_task(send_scheduled_daily_report()),
                time=time(hour=21, minute=0, tzinfo=UZBEKISTAN_TZ),
                name='daily_report'
            )
            print("✅ Kunlik hisobot scheduler qo'shildi (21:00 Tashkent)")
            
            # Haftalik hisobot - har yakshanba 20:00 da O'zbekiston vaqti
            job_queue.run_daily(
                lambda context: context.application.create_task(send_scheduled_weekly_report()),
                time=time(hour=20, minute=0, tzinfo=UZBEKISTAN_TZ),
                days=(6,),  # 6 = yakshanba
                name='weekly_report'
            )
            print("✅ Haftalik hisobot scheduler qo'shildi (yakshanba 20:00 Tashkent)")
        else:
            print("⚠️ JobQueue mavjud emas - scheduled reports ishlamaydi")
        
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