#!/usr/bin/env python3
"""
Test script to send weekly report immediately
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.telegram_service import send_scheduled_weekly_report

async def test_report():
    print("📊 Haftalik hisobotni test qilyapman...")
    try:
        await send_scheduled_weekly_report()
        print("✅ Hisobot muvaffaqiyatli yuborildi!")
    except Exception as e:
        print(f"❌ Xatolik: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_report())
