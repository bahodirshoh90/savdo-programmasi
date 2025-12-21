"""
Barcode/QR Code Service
"""
import qrcode
from io import BytesIO
from PIL import Image
import base64
from typing import Optional


class BarcodeService:
    """Service for generating QR codes and barcodes"""
    
    @staticmethod
    def generate_qr_code(data: str, size: int = 200) -> str:
        """Generate QR code as base64 string"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img = img.resize((size, size))
        
        # Convert to base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def generate_product_qr(product_id: int, product_name: str) -> str:
        """Generate QR code for a product"""
        data = f"PRODUCT_{product_id}_{product_name}"
        return BarcodeService.generate_qr_code(data)
    
    @staticmethod
    def get_barcode_data(product_id: int, barcode: Optional[str] = None) -> dict:
        """Get barcode data for a product"""
        if barcode:
            return {
                "barcode": barcode,
                "qr_code": BarcodeService.generate_product_qr(product_id, "")
            }
        else:
            # Generate default barcode
            default_barcode = f"PRD{product_id:06d}"
            return {
                "barcode": default_barcode,
                "qr_code": BarcodeService.generate_product_qr(product_id, "")
            }
