"""
Push Notification Service for Customer App
Uses Expo Push Notification API
"""
import os
import requests
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from models import CustomerDeviceToken, Customer


class NotificationService:
    """Service for sending push notifications via Expo Push API"""
    
    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
    
    @staticmethod
    def send_notification(
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        sound: str = "default",
        priority: str = "default"
    ) -> Dict:
        """
        Send push notification to multiple Expo push tokens
        
        Args:
            tokens: List of Expo push tokens
            title: Notification title
            body: Notification body/message
            data: Optional data payload (dict)
            sound: Sound to play (default: "default")
            priority: Priority level ("default" or "high")
        
        Returns:
            Dict with success status and response data
        """
        if not tokens:
            return {"success": False, "error": "No tokens provided"}
        
        messages = []
        for token in tokens:
            message = {
                "to": token,
                "sound": sound,
                "title": title,
                "body": body,
                "priority": priority,
                "data": data or {}
            }
            messages.append(message)
        
        try:
            headers = {
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json"
            }
            
            payload = messages[0] if len(messages) == 1 else messages
            response = requests.post(
                NotificationService.EXPO_PUSH_URL,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                # Check for errors in individual messages
                errors = []
                if "data" in result:
                    data_items = result["data"]
                    if isinstance(data_items, dict):
                        data_items = [data_items]
                    for item in data_items:
                        if "status" in item and item["status"] == "error":
                            errors.append(item.get("message", "Unknown error"))
                
                if errors:
                    return {
                        "success": False,
                        "error": "; ".join(errors),
                        "response": result
                    }
                
                return {"success": True, "response": result}
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}",
                    "response": None
                }
        except Exception as e:
            return {"success": False, "error": str(e), "response": None}
    
    @staticmethod
    def get_customer_tokens(db: Session, customer_id: int) -> List[str]:
        """Get all active push tokens for a customer"""
        tokens = db.query(CustomerDeviceToken).filter(
            CustomerDeviceToken.customer_id == customer_id,
            CustomerDeviceToken.is_active == True
        ).all()
        return [token.token for token in tokens]
    
    @staticmethod
    def send_to_customer(
        db: Session,
        customer_id: int,
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> Dict:
        """Send notification to a specific customer"""
        tokens = NotificationService.get_customer_tokens(db, customer_id)
        if not tokens:
            return {"success": False, "error": "No active tokens for customer"}
        
        return NotificationService.send_notification(tokens, title, body, data)
    
    @staticmethod
    def send_to_all_customers(
        db: Session,
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> Dict:
        """Send notification to all customers with active tokens"""
        tokens = db.query(CustomerDeviceToken.token).filter(
            CustomerDeviceToken.is_active == True
        ).all()
        
        token_list = [token[0] for token in tokens]
        if not token_list:
            return {"success": False, "error": "No active tokens found"}
        
        return NotificationService.send_notification(token_list, title, body, data)
    
    @staticmethod
    def send_order_status_update(
        db: Session,
        customer_id: int,
        order_id: int,
        status: str,
        order_total: Optional[float] = None
    ) -> Dict:
        """Send order status update notification"""
        status_messages = {
            "pending": "Buyurtmangiz qabul qilindi",
            "processing": "Buyurtmangiz tayyorlanmoqda",
            "completed": "Buyurtmangiz tayyor!",
            "cancelled": "Buyurtmangiz bekor qilindi",
            "returned": "Buyurtmangiz qaytarildi"
        }
        
        title = "Buyurtma holati o'zgardi"
        body = status_messages.get(status, f"Buyurtma holati: {status}")
        
        if status == "completed" and order_total:
            body += f"\nJami: {order_total:,.0f} so'm"
        
        data = {
            "type": "order_status",
            "order_id": order_id,
            "status": status
        }
        
        return NotificationService.send_to_customer(db, customer_id, title, body, data)
    
    @staticmethod
    def send_new_product_notification(
        db: Session,
        product_id: int,
        product_name: str
    ) -> Dict:
        """Send new product notification to all customers"""
        title = "Yangi mahsulot!"
        body = f"{product_name} qo'shildi"
        
        data = {
            "type": "new_product",
            "product_id": product_id
        }
        
        return NotificationService.send_to_all_customers(db, title, body, data)
    
    @staticmethod
    def send_price_alert(
        db: Session,
        customer_id: int,
        product_id: int,
        product_name: str,
        old_price: float,
        new_price: float
    ) -> Dict:
        """Send price drop alert notification"""
        discount = old_price - new_price
        discount_percent = (discount / old_price) * 100 if old_price > 0 else 0
        
        title = "Narx tushdi! 🎉"
        body = f"{product_name}\nEski narx: {old_price:,.0f} so'm\nYangi narx: {new_price:,.0f} so'm\nChegirma: {discount_percent:.0f}%"
        
        data = {
            "type": "price_alert",
            "product_id": product_id,
            "old_price": old_price,
            "new_price": new_price
        }
        
        return NotificationService.send_to_customer(db, customer_id, title, body, data)
    
    @staticmethod
    def send_promotion_notification(
        db: Session,
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> Dict:
        """Send promotion/discount notification to all customers"""
        notification_data = data or {}
        notification_data["type"] = "promotion"
        
        return NotificationService.send_to_all_customers(db, title, body, notification_data)
