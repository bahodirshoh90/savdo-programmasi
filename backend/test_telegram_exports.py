#!/usr/bin/env python3
"""
Test script for Telegram bot functionality
"""
import os
import sys

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Change to backend directory
os.chdir(backend_dir)

def test_telegram_exports():
    """Test Telegram export functions"""
    print("🤖 Telegram Export Test")
    print("=" * 30)
    
    try:
        # Test Excel export
        print("📊 Testing Excel export...")
        from services.excel_service import ExcelService
        from database import SessionLocal
        
        db = SessionLocal()
        try:
            file_path = ExcelService.export_sales(db)
            if file_path and os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"✅ Excel export SUCCESS: {file_path}")
                print(f"   File size: {file_size} bytes")
                os.remove(file_path)  # Clean up
            else:
                print("❌ Excel export FAILED: No file created")
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Excel export ERROR: {str(e)}")
    
    try:
        # Test PDF export 
        print("\n📄 Testing PDF export...")
        from services.pdf_service import PDFService
        from services.sale_service import SaleService
        from datetime import datetime, timedelta
        from database import SessionLocal
        
        db = SessionLocal()
        try:
            # Get statistics
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
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
            
            if file_path and os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"✅ PDF export SUCCESS: {file_path}")
                print(f"   File size: {file_size} bytes")
                os.remove(file_path)  # Clean up
            else:
                print("❌ PDF export FAILED: No file created")
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ PDF export ERROR: {str(e)}")

    print("\n🏁 Test completed!")

if __name__ == "__main__":
    test_telegram_exports()