/**
 * OASIS × Credit Life Simulator — WebSocket Client Service
 * Maintains a persistent connection to the OASIS backend for real-time updates.
 * Handles reconnection, heartbeat, and event dispatching.
 */

type EventHandler = (data: any) => void;

interface WebSocketEvent {
  type: string;
  data?: any;
  notification_type?: string;
  timestamp?: string;
}

class OasisWebSocketService {
  private ws: WebSocket | null = null;
  private baseUrl: string = 'wss://your-oasis-server.com';
  private userId: number = 0;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;
  private isManualDisconnect: boolean = false;

  /**
   * Configure the WebSocket server URL
   */
  setBaseUrl(url: string) {
    // Convert http(s) to ws(s)
    this.baseUrl = url
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:')
      .replace(/\/$/, '');
  }

  /**
   * Connect to the OASIS WebSocket server
   */
  connect(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      this.userId = userId;
      this.isConnecting = true;
      this.isManualDisconnect = false;

      try {
        const url = `${this.baseUrl}/ws/${userId}`;
        console.log(`[OasisWS] Connecting to ${url}...`);
        
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[OasisWS] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connection_status', { connected: true });
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message: WebSocketEvent = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.warn('[OasisWS] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error: Event) => {
          console.warn('[OasisWS] Error:', error);
          this.isConnecting = false;
          this.emit('connection_status', { connected: false, error: 'WebSocket error' });
        };

        this.ws.onclose = (event: CloseEvent) => {
          console.log(`[OasisWS] Disconnected (code: ${event.code})`);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('connection_status', { connected: false });

          // Auto-reconnect unless manually disconnected
          if (!this.isManualDisconnect) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    console.log('[OasisWS] Disconnected manually');
  }

  /**
   * Subscribe to a specific event type
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Remove a specific event handler
   */
  off(eventType: string, handler: EventHandler) {
    this.handlers.get(eventType)?.delete(handler);
  }

  /**
   * Remove all handlers for an event type
   */
  removeAllListeners(eventType?: string) {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Send a message to the server
   */
  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[OasisWS] Cannot send — not connected');
    }
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ==================== Private Methods ====================

  private handleMessage(message: WebSocketEvent) {
    const { type, data, notification_type } = message;

    switch (type) {
      case 'connected':
        console.log('[OasisWS] Server confirmed connection');
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'new_post':
        this.emit('new_post', data);
        this.emit('feed_update', { type: 'new_post', data });
        break;

      case 'new_comment':
        this.emit('new_comment', data);
        this.emit('feed_update', { type: 'new_comment', data });
        break;

      case 'post_liked':
        this.emit('post_liked', data);
        this.emit('feed_update', { type: 'post_liked', data });
        break;

      case 'notification':
        this.emit('notification', {
          ...data,
          notification_type,
        });
        break;

      default:
        this.emit(type, data);
    }
  }

  private emit(eventType: string, data: any) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.warn(`[OasisWS] Handler error for ${eventType}:`, error);
        }
      });
    }

    // Also emit to wildcard listeners
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler({ type: eventType, data });
        } catch (error) {
          console.warn('[OasisWS] Wildcard handler error:', error);
        }
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // 30 second heartbeat
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[OasisWS] Max reconnect attempts reached');
      this.emit('connection_status', { 
        connected: false, 
        error: 'Max reconnect attempts reached' 
      });
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 second delay
    );

    console.log(`[OasisWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.userId).catch(error => {
        console.warn('[OasisWS] Reconnect failed:', error);
      });
    }, delay);
  }
}

// Singleton instance
export const oasisWebSocket = new OasisWebSocketService();
export default oasisWebSocket;