"""
Telegram bildirishnoma tizimini test qilish
"""
import asyncio
import os
from dotenv import load_dotenv
from telegram import Bot

# .env faylni yuklash
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

TELEGRAM_TOKEN = os.getenv('TELEGRAM_TOKEN')
ADMIN_CHAT_IDS = [int(x) for x in (os.getenv('ADMIN_CHAT_IDS') or '').split(',') if x.strip().isdigit()]

print(f"TELEGRAM_TOKEN: {TELEGRAM_TOKEN}")
print(f"ADMIN_CHAT_IDS: {ADMIN_CHAT_IDS}")

async def test_notification():
    """Test bildirishnoma yuborish"""
    if not TELEGRAM_TOKEN:
        print("❌ TELEGRAM_TOKEN topilmadi!")
        return
    
    if not ADMIN_CHAT_IDS:
        print("❌ ADMIN_CHAT_IDS topilmadi!")
        return
    
    bot = Bot(token=TELEGRAM_TOKEN)
    
    text = "🔔 TEST XABARI\n\n"
    text += "Agar bu xabarni ko'rayotgan bo'lsangiz,\n"
    text += "bildirishnoma tizimi to'g'ri ishlayapti! ✅"
    
    for admin_id in ADMIN_CHAT_IDS:
        try:
            print(f"Adminga {admin_id} xabar yuborish...")
            await bot.send_message(chat_id=admin_id, text=text)
            print(f"✅ Admin {admin_id}ga xabar yuborildi!")
        except Exception as e:
            print(f"❌ Admin {admin_id}ga xabar yuborishda xatolik: {e}")

if __name__ == "__main__":
    asyncio.run(test_notification())
