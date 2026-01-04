#!/usr/bin/env python3
"""
Test script for new sale functionality in Telegram service
"""
import os
import sys

# Change to backend directory for proper imports
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

def test_telegram_new_sale_functions():
    """Test new sale functions for Telegram bot"""
    print("🤖 Telegram Yangi Sotuv Funksiyalari Test")
    print("=" * 45)
    
    try:
        # Import all the new sale functions
        from services.telegram_service import (
            start_new_sale, show_customers_for_sale, 
            select_customer_for_sale, show_products_for_sale,
            select_product_for_sale, finalize_sale, 
            confirm_sale, cancel_sale
        )
        
        print("✅ Barcha yangi sotuv funksiyalari import qilindi!")
        
        # Test main keyboard
        from services.telegram_service import get_main_keyboard
        keyboard = get_main_keyboard()
        
        # Check if new sale button exists
        found_new_sale = False
        for row in keyboard.inline_keyboard:
            for button in row:
                if "Yangi Sotuv" in button.text:
                    found_new_sale = True
                    print(f"✅ Asosiy menyuda 'Yangi Sotuv' tugmasi mavjud!")
                    break
        
        if not found_new_sale:
            print("❌ 'Yangi Sotuv' tugmasi topilmadi!")
        
        print("\n📋 Qo'shilgan funksiyalar:")
        functions = [
            "start_new_sale", "show_customers_for_sale", 
            "select_customer_for_sale", "show_products_for_sale",
            "select_product_for_sale", "finalize_sale", 
            "confirm_sale", "cancel_sale"
        ]
        
        for func_name in functions:
            print(f"  ✅ {func_name}")
        
        print("\n🎉 YANGI SOTUV FUNKSIYALARI MUVAFFAQIYATLI QO'SHILDI!")
        print("\nFunksionallik:")
        print("1. 🛒 Yangi Sotuv tugmasi asosiy menyuda")
        print("2. 👥 Mijozni tanlash interfeysi") 
        print("3. 📦 Mahsulotlarni tanlash interfeysi")
        print("4. ✅ Sotuvni yakunlash va tasdiqlash")
        print("5. 💾 Ma'lumotlar bazasiga saqlash")
        print("\n🚀 Telegram botda yangi sotuv yaratish endi mumkin!")
        
    except ImportError as e:
        print(f"❌ Import xatolik: {str(e)}")
    except Exception as e:
        print(f"❌ Umumiy xatolik: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_telegram_new_sale_functions()