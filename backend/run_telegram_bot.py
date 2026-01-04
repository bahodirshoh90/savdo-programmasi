"""
Telegram Bot ishga tushirish skripti
"""
import sys
import os

# Backend papkani path ga qo'shamiz
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Module sifatida ishga tushirish
if __name__ == "__main__":
    from services import telegram_service
    telegram_service.main()
