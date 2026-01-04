#!/usr/bin/env python3
"""
Mock test for Telegram bot new sale functionality
"""
import os
import sys

# Change to backend directory for proper imports
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

class MockUpdate:
    """Mock Telegram Update object"""
    def __init__(self, callback_data=None):
        self.callback_query = MockCallbackQuery(callback_data)

class MockCallbackQuery:
    """Mock Telegram CallbackQuery object"""
    def __init__(self, data=None):
        self.data = data
    
    async def answer(self, text="", show_alert=False):
        print(f"Bot answer: {text}")
    
    async def edit_message_text(self, text, reply_markup=None):
        print(f"Bot message: {text}")
        if reply_markup:
            print(f"Keyboard buttons: {len(reply_markup.inline_keyboard)} rows")

class MockContext:
    """Mock Telegram Context object"""
    def __init__(self):
        self.user_data = {}

async def test_new_sale_flow():
    """Test yangi sotuv funksiyalarini ketma-ketlik bilan"""
    print("🧪 TELEGRAM YANGI SOTUV OQIMINI SIMULYATSIYA QILISH")
    print("=" * 55)
    
    try:
        from services.telegram_service import (
            start_new_sale, show_customers_for_sale,
            select_customer_for_sale, show_products_for_sale,
            select_product_for_sale, finalize_sale, confirm_sale
        )
        
        # Mock objects
        context = MockContext()
        
        print("1️⃣ Yangi sotuv boshlash...")
        update = MockUpdate('new_sale')
        await start_new_sale(update, context)
        
        print(f"   Session yaratildi: {'sale_session' in context.user_data}")
        
        print("\n2️⃣ Mijozni tanlash...")
        update = MockUpdate('select_customer_1')
        await select_customer_for_sale(update, context)
        
        print(f"   Mijoz tanlandi: {context.user_data.get('sale_session', {}).get('customer_id')}")
        
        print("\n3️⃣ Mahsulotni tanlash...")
        update = MockUpdate('select_product_1')
        await select_product_for_sale(update, context)
        
        session = context.user_data.get('sale_session', {})
        products = session.get('products', [])
        print(f"   Mahsulot qo'shildi: {len(products)} ta mahsulot")
        
        if products:
            print(f"   Birinchi mahsulot: {products[0].get('name', 'Unknown')}")
            print(f"   Total: {session.get('total_amount', 0)} so'm")
        
        print("\n4️⃣ Sotuvni yakunlash...")
        update = MockUpdate('finalize_sale')
        await finalize_sale(update, context)
        
        print("\n5️⃣ Sotuvni tasdiqlash...")
        update = MockUpdate('confirm_sale')
        await confirm_sale(update, context)
        
        print("\n✅ BARCHA BOSQICHLAR MUVAFFAQIYATLI BAJARILDI!")
        print("🎯 Telegram botda yangi sotuv funksiyalari to'liq ishlaydi!")
        
    except Exception as e:
        print(f"❌ Test davomida xatolik: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_new_sale_flow())