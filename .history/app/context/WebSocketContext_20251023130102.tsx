// context/WebSocketContext.tsx
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

// Types
interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp?: string;
  action?: 'created' | 'updated' | 'deleted';
}

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: WebSocketMessage) => void;
  ping: () => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = (): void => {
    try {
      const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001';
      
      ws.current = new WebSocket(WS_URL);
      
      ws.current.onopen = (): void => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      ws.current.onmessage = (event: MessageEvent): void => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message.type);
          setLastMessage(message);
          handleIncomingMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event: CloseEvent): void => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        attemptReconnect();
      };

      ws.current.onerror = (error: Event): void => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      attemptReconnect();
    }
  };

  const attemptReconnect = (): void => {
    const maxAttempts = 5;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    if (reconnectAttempts < maxAttempts) {
      console.log(`🔄 Attempting reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxAttempts})`);
      
      reconnectTimeout.current = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      Alert.alert(
        'Connection Lost',
        'Unable to connect to server. Please check your internet connection and try again.',
        [{ 
          text: 'Retry', 
          onPress: (): void => {
            setReconnectAttempts(0);
            connect();
          }
        }]
      );
    }
  };

  const handleIncomingMessage = (message: WebSocketMessage): void => {
    switch (message.type) {
      case 'INITIAL_DATA':
        console.log('📦 Received initial data');
        break;
      
      case 'PRODUCT_UPDATED':
        console.log('🔄 Product updated:', message.data);
        break;
      
      case 'MOVEMENT_CREATED':
        console.log('📤 Movement created:', message.data);
        break;
      
      case 'ERROR':
        console.error('❌ WebSocket error:', message.message);
        break;
      
      case 'PONG':
        console.log('🏓 Pong received:', message.timestamp);
        break;
      
      default:
        console.log('⚠️ Unknown message type:', message.type);
    }
  };

  const sendMessage = (message: WebSocketMessage): void => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        const messageString = JSON.stringify(message);
        ws.current.send(messageString);
        console.log('📤 Message sent:', message.type);
      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  };

  const ping = (): void => {
    sendMessage({ type: 'PING' });
  };

  const reconnect = (): void => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    setReconnectAttempts(0);
    connect();
  };

  useEffect(() => {
    connect();

    return (): void => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    lastMessage,
    sendMessage,
    ping,
    reconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};