"""
Script to fix product image_url issues:
- Set 'undefined' and 'null' strings to NULL
- Clean up invalid image URLs
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models import Product
from pathlib import Path

def fix_product_images():
    """Fix product image_url fields"""
    db = SessionLocal()
    try:
        # Get all products
        products = db.query(Product).all()
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "products")
        
        fixed_count = 0
        nullified_count = 0
        
        for product in products:
            image_url = product.image_url
            should_update = False
            
            # Check if image_url is 'undefined', 'null', or empty
            if not image_url or image_url == 'undefined' or image_url == 'null' or image_url.strip() == '':
                product.image_url = None
                should_update = True
                nullified_count += 1
                print(f"Product {product.id} ({product.name}): Set image_url to NULL")
            elif image_url.startswith('/uploads/products/'):
                # Check if file exists
                filename = image_url.replace('/uploads/products/', '')
                file_path = os.path.join(uploads_dir, filename)
                
                if not os.path.exists(file_path):
                    # File doesn't exist, set to NULL
                    product.image_url = None
                    should_update = True
                    nullified_count += 1
                    print(f"Product {product.id} ({product.name}): File not found ({filename}), set to NULL")
                else:
                    fixed_count += 1
                    print(f"Product {product.id} ({product.name}): Image URL OK ({filename})")
            
            if should_update:
                db.commit()
        
        print(f"\n✅ Fixed {fixed_count} products with valid images")
        print(f"✅ Set {nullified_count} products' image_url to NULL")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting product image URL fix...")
    fix_product_images()
    print("Done!")
