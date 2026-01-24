/**
 * WebSocket Service for Customer App
 * Handles real-time notifications from server
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

const isWeb = Platform.OS === 'web';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 seconds
    this.listeners = new Map();
    this.isConnecting = false;
    this.customerId = null;
  }

  /**
   * Initialize WebSocket connection
   */
  async connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get customer ID from storage
      const storedCustomerId = await AsyncStorage.getItem('customer_id');
      if (!storedCustomerId) {
        console.log('[WebSocket] No customer ID found, skipping connection');
        this.isConnecting = false;
        return;
      }

      this.customerId = parseInt(storedCustomerId, 10);

      // Build WebSocket URL
      const wsProtocol = API_ENDPOINTS.BASE_URL.startsWith('https') ? 'wss' : 'ws';
      const wsBaseUrl = API_ENDPOINTS.BASE_URL.replace(/^https?:\/\//, '').replace(/\/api$/, '');
      const wsUrl = `${wsProtocol}://${wsBaseUrl}/ws?customer_id=${this.customerId}`;

      console.log('[WebSocket] Connecting to:', wsUrl);

      if (isWeb) {
        // Use native WebSocket for web
        this.ws = new WebSocket(wsUrl);
      } else {
        // For React Native, we might need a library like react-native-websocket
        // For now, we'll use a polyfill or native WebSocket if available
        this.ws = new WebSocket(wsUrl);
      }

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('connected', { customerId: this.customerId });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message);
          
          // Handle ping/pong for keepalive
          if (message.type === 'pong') {
            return;
          }

          // Handle customer_type_changed event
          if (message.type === 'customer_type_changed' && message.customer_id === this.customerId) {
            console.log('[WebSocket] Customer type changed, emitting event');
            this.emit('customer_type_changed', message);
            return;
          }

          // Emit message to listeners
          this.emit(message.type || 'message', message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.isConnecting = false;
        this.emit('disconnected', {});
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[WebSocket] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => {
            this.connect();
          }, this.reconnectDelay);
        } else {
          console.log('[WebSocket] Max reconnection attempts reached');
        }
      };

      // Send ping every 30 seconds to keep connection alive
      this.pingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this.emit('error', error);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send message to server
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, connection not open');
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
