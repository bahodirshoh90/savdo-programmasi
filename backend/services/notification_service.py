"""
Push Notification Service for Customer App
Uses Expo Push API and Firebase Cloud Messaging HTTP v1
"""
import json
import os
import requests
from typing import List, Optional, Dict, Iterable, Tuple
from sqlalchemy.orm import Session
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleRequest
from models import CustomerDeviceToken, Customer


class NotificationService:
    """Service for sending push notifications via Expo Push API and FCM v1"""
    
    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
    EXPO_CHUNK_SIZE = 100
    FCM_SCOPE = ["https://www.googleapis.com/auth/firebase.messaging"]
    FCM_URL_TEMPLATE = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    FCM_CREDENTIAL_ENV = "FCM_SERVICE_ACCOUNT_FILE"
    _fcm_credentials = None
    _fcm_project_id = None
    _fcm_credentials_path = None

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
    def _resolve_fcm_service_account_path() -> Optional[str]:
        env_path = os.getenv(NotificationService.FCM_CREDENTIAL_ENV) or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if env_path and os.path.exists(env_path):
            return env_path

        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        candidates = [
            os.path.join(backend_dir, "service-account.json"),
            os.path.join(backend_dir, "firebase-service-account.json"),
            os.path.join(backend_dir, "mijozlar-ilovasi-aa82f-e250da954562.json"),
        ]
        for path in candidates:
            if os.path.exists(path):
                return path

        return None

    @staticmethod
    def _load_fcm_credentials() -> Tuple[Optional[service_account.Credentials], Optional[str], Optional[str]]:
        if NotificationService._fcm_credentials and NotificationService._fcm_project_id:
            return NotificationService._fcm_credentials, NotificationService._fcm_project_id, None

        path = NotificationService._resolve_fcm_service_account_path()
        if not path:
            return None, None, (
                "FCM service account file not found. Set FCM_SERVICE_ACCOUNT_FILE or "
                "GOOGLE_APPLICATION_CREDENTIALS to the JSON key path."
            )

        try:
            credentials = service_account.Credentials.from_service_account_file(
                path, scopes=NotificationService.FCM_SCOPE
            )
            project_id = credentials.project_id
            if not project_id:
                with open(path, "r", encoding="utf-8") as file:
                    project_id = json.load(file).get("project_id")

            if not project_id:
                return None, None, "Project ID is missing in the service account file."

            NotificationService._fcm_credentials = credentials
            NotificationService._fcm_project_id = project_id
            NotificationService._fcm_credentials_path = path
            return credentials, project_id, None
        except Exception as exc:
            return None, None, f"FCM credentials error: {exc}"

    @staticmethod
    def _get_fcm_access_token() -> Tuple[Optional[str], Optional[str], Optional[str]]:
        credentials, project_id, error = NotificationService._load_fcm_credentials()
        if error:
            return None, None, error

        if not credentials.valid:
            try:
                credentials.refresh(GoogleRequest())
            except Exception as exc:
                return None, None, f"Unable to refresh FCM access token: {exc}"

        return credentials.token, project_id, None

    @staticmethod
    def _sanitize_fcm_data(data: Optional[Dict]) -> Dict:
        if not data:
            return {}
        sanitized = {}
        for key, value in data.items():
            if value is None:
                continue
            if isinstance(value, (dict, list)):
                sanitized[key] = json.dumps(value, ensure_ascii=True)
            else:
                sanitized[key] = str(value)
        return sanitized
    
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
        """Send notifications to FCM tokens (Android) using HTTP v1."""
        if not tokens:
            return {"success": False, "error": "No FCM tokens provided", "response": None}
        token, project_id, error = NotificationService._get_fcm_access_token()
        if error:
            return {"success": False, "error": error, "response": None}

        url = NotificationService.FCM_URL_TEMPLATE.format(project_id=project_id)
        errors: List[str] = []
        responses: List[Dict] = []
        fcm_priority = "HIGH" if priority == "high" else "NORMAL"
        data_payload = NotificationService._sanitize_fcm_data(data)

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        try:
            for target in tokens:
                message = {
                    "message": {
                        "token": target,
                        "notification": {
                            "title": title,
                            "body": body
                        },
                        "data": data_payload,
                        "android": {
                            "priority": fcm_priority
                        }
                    }
                }

                response = requests.post(url, json=message, headers=headers, timeout=10)

                if response.status_code in (401, 403):
                    # Refresh token and retry once
                    retry_token, _, retry_error = NotificationService._get_fcm_access_token()
                    if retry_error:
                        errors.append(retry_error)
                        continue
                    headers["Authorization"] = f"Bearer {retry_token}"
                    response = requests.post(url, json=message, headers=headers, timeout=10)

                if response.status_code != 200:
                    errors.append(f"HTTP {response.status_code}: {response.text}")
                    continue

                responses.append(response.json())

            if errors:
                return {"success": False, "error": "; ".join(errors), "response": responses}

            return {"success": True, "response": responses}
        except Exception as exc:
            return {"success": False, "error": str(exc), "response": None}
    
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
