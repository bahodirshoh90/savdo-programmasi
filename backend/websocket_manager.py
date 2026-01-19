"""
WebSocket Connection Manager
"""
from fastapi import WebSocket
from typing import List, Dict, Optional
import json


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        # Store customer_id -> WebSocket mapping for personal notifications
        self.customer_connections: Dict[int, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, customer_id: Optional[int] = None):
        """Accept a new WebSocket connection, optionally associated with a customer_id"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        # If customer_id is provided, store the connection for this customer
        if customer_id is not None:
            if customer_id not in self.customer_connections:
                self.customer_connections[customer_id] = []
            self.customer_connections[customer_id].append(websocket)
            print(f"[WebSocket] Customer {customer_id} connected. Total connections for this customer: {len(self.customer_connections[customer_id])}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Remove from customer_connections if present
        for customer_id, connections in list(self.customer_connections.items()):
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    # Remove customer entry if no connections left
                    del self.customer_connections[customer_id]
                print(f"[WebSocket] Customer {customer_id} disconnected. Remaining connections: {len(self.customer_connections.get(customer_id, []))}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error sending message: {e}")
            self.disconnect(websocket)
    
    async def send_to_customer(self, customer_id: int, message: dict):
        """Send a message to all WebSocket connections for a specific customer"""
        if customer_id not in self.customer_connections:
            print(f"[WebSocket] No connections found for customer {customer_id}")
            return
        
        disconnected = []
        for connection in self.customer_connections[customer_id]:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error sending message to customer {customer_id}: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected WebSocket clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)

