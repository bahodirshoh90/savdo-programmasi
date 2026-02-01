"""
Push Notification Service for Customer App
Uses Expo Push Notification API
"""
import os
import requests
from typing import List, Optional, Dict, Iterable
from sqlalchemy.orm import Session
from models import CustomerDeviceToken, Customer


class NotificationService:
    """Service for sending push notifications via Expo Push API"""
    
    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
    FCM_PUSH_URL = "https://fcm.googleapis.com/fcm/send"
    EXPO_CHUNK_SIZE = 100
    FCM_CHUNK_SIZE = 1000

    @staticmethod
    def _chunk_list(items: List[str], size: int) -> Iterable[List[str]]:
        for i in range(0, len(items), size):
            yield items[i:i + size]

    @staticmethod
    def is_expo_push_token(token: str) -> bool:
        if not token:
            return False
        return token.startswith("ExponentPushToken") or token.startswith("ExpoPushToken")
    
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
            return {"success": False, "error": "No tokens provided", "results": {}}

        expo_tokens = [t for t in tokens if NotificationService.is_expo_push_token(t)]
        fcm_tokens = [t for t in tokens if not NotificationService.is_expo_push_token(t)]

        results: Dict[str, Dict] = {}
        errors: List[str] = []
        provider_success = 0
        provider_total = 0

        if expo_tokens:
            provider_total += 1
            expo_result = NotificationService._send_expo_notifications(
                expo_tokens, title, body, data, sound, priority
            )
            results["expo"] = expo_result
            if expo_result.get("success"):
                provider_success += 1
            else:
                errors.append(expo_result.get("error", "Expo push error"))

        if fcm_tokens:
            provider_total += 1
            fcm_result = NotificationService._send_fcm_notifications(
                fcm_tokens, title, body, data, priority
            )
            results["fcm"] = fcm_result
            if fcm_result.get("success"):
                provider_success += 1
            else:
                errors.append(fcm_result.get("error", "FCM push error"))

        success = provider_success > 0 if provider_total > 0 else False
        warning = "; ".join(errors) if errors and success else None
        error = "; ".join(errors) if errors and not success else None
        return {
            "success": success,
            "error": error,
            "warning": warning,
            "results": results
        }

    @staticmethod
    def _send_expo_notifications(
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict],
        sound: str,
        priority: str
    ) -> Dict:
        """Send notifications to Expo push tokens."""
        if not tokens:
            return {"success": False, "error": "No Expo tokens provided", "response": None}

        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json"
        }

        errors: List[str] = []
        responses: List[Dict] = []

        try:
            for chunk in NotificationService._chunk_list(tokens, NotificationService.EXPO_CHUNK_SIZE):
                messages = [
                    {
                        "to": token,
                        "sound": sound,
                        "title": title,
                        "body": body,
                        "priority": priority,
                        "data": data or {}
                    }
                    for token in chunk
                ]

                response = requests.post(
                    NotificationService.EXPO_PUSH_URL,
                    json=messages if len(messages) > 1 else messages[0],
                    headers=headers,
                    timeout=10
                )

                if response.status_code != 200:
                    errors.append(f"HTTP {response.status_code}: {response.text}")
                    continue

                result = response.json()
                responses.append(result)
                if "data" in result:
                    for item in result["data"]:
                        if item.get("status") == "error":
                            errors.append(item.get("message", "Unknown Expo error"))

            if errors:
                return {"success": False, "error": "; ".join(errors), "response": responses}

            return {"success": True, "response": responses}
        except Exception as e:
            return {"success": False, "error": str(e), "response": None}

    @staticmethod
    def _send_fcm_notifications(
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict],
        priority: str
    ) -> Dict:
        """Send notifications to FCM tokens (Android)."""
        if not tokens:
            return {"success": False, "error": "No FCM tokens provided", "response": None}

        server_key = os.getenv("FCM_SERVER_KEY")
        if not server_key:
            return {
                "success": False,
                "error": "FCM server key is not configured (FCM_SERVER_KEY).",
                "response": None
            }

        headers = {
            "Authorization": f"key={server_key}",
            "Content-Type": "application/json"
        }

        errors: List[str] = []
        responses: List[Dict] = []
        fcm_priority = "high" if priority == "high" else "normal"

        try:
            for chunk in NotificationService._chunk_list(tokens, NotificationService.FCM_CHUNK_SIZE):
                payload = {
                    "registration_ids": chunk,
                    "priority": fcm_priority,
                    "notification": {
                        "title": title,
                        "body": body
                    },
                    "data": data or {}
                }

                response = requests.post(
                    NotificationService.FCM_PUSH_URL,
                    json=payload,
                    headers=headers,
                    timeout=10
                )

                if response.status_code != 200:
                    errors.append(f"HTTP {response.status_code}: {response.text}")
                    continue

                result = response.json()
                responses.append(result)

                if result.get("failure"):
                    for item in result.get("results", []):
                        if item.get("error"):
                            errors.append(item.get("error"))

            if errors:
                return {"success": False, "error": "; ".join(errors), "response": responses}

            return {"success": True, "response": responses}
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
