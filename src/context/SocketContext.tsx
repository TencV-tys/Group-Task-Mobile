// context/SocketContext.tsx - FIXED TYPES

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/AuthService';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  reconnect: () => Promise<void>;
  connectionStats: { attempts: number; lastError?: string };
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [connectionStats, setConnectionStats] = useState({ attempts: 0, lastError: undefined as string | undefined });
  const listenersRef = useRef<Map<string, Function[]>>(new Map());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  // ✅ FIX: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get user ID from secure store on mount
  useEffect(() => {
    const getUserId = async () => {
      try {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Failed to get user ID:', error);
      }
    };
    getUserId();
  }, []);

  // Connect socket function with optimized settings
  const connectSocket = async () => {
    try {
      const token = await AuthService.getAccessToken();
      
      if (!token) {
        console.log('❌ Socket: No token available');
        return;
      }

      console.log(`🔌 Socket: Connecting to ${API_BASE_URL} (Attempt ${connectionStats.attempts + 1})`);
      setConnectionStats(prev => ({ ...prev, attempts: prev.attempts + 1, lastError: undefined }));
      
      const socketInstance = io(API_BASE_URL, {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket'],
        reconnection: false,
        timeout: 10000,
        forceNew: false,
        multiplex: true,
        upgrade: true,
        rememberUpgrade: true
      });

      // Connection timeout handler
      const connectionTimeout = setTimeout(() => {
        if (!socketInstance.connected) {
          console.log('⚠️ Socket connection timeout');
          socketInstance.disconnect();
          handleReconnect();
        }
      }, 10000);

      socketInstance.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Socket connected:', socketInstance.id);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        setConnectionStats(prev => ({ ...prev, lastError: undefined }));
      });

      socketInstance.on('registered', (data) => {
        console.log('✅ Socket registered:', { userId: data.userId, groups: data.groups?.length });
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsConnected(false);
        
        if (reason !== 'io client disconnect' && reason !== 'transport close') {
          handleReconnect();
        }
      });

      socketInstance.on('connect_error', async (error) => {
        console.error('❌ Socket connect error:', error.message);
        clearTimeout(connectionTimeout);
        
        if (error.message === 'Invalid token' || error.message === 'Authentication required') {
          console.log('🔄 Token invalid, attempting refresh...');
          const newToken = await AuthService.refreshAccessToken();
          
          if (newToken && socketInstance) {
            socketInstance.auth = { token: `Bearer ${newToken}` };
            socketInstance.connect();
          } else {
            setConnectionStats(prev => ({ ...prev, lastError: 'Token refresh failed' }));
            socketInstance.disconnect();
          }
        } else {
          setConnectionStats(prev => ({ ...prev, lastError: error.message }));
        }
      });

      socketInstance.on('error', (error) => {
        console.error('❌ Socket error:', error);
        setConnectionStats(prev => ({ ...prev, lastError: error.message }));
      });

      // Handle all dynamic events
      socketInstance.onAny((event, ...args) => {
        const listeners = listenersRef.current.get(event);
        if (listeners && listeners.length > 0) {
          listeners.forEach(callback => callback(...args));
        }
      });

      setSocket(socketInstance);

    } catch (error: any) {
      console.error('❌ Socket connection error:', error);
      setConnectionStats(prev => ({ ...prev, lastError: error.message }));
    }
  };

  // Handle reconnection with exponential backoff
  const handleReconnect = async () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }

    reconnectAttempts.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 10000);
    
    console.log(`🔄 Reconnecting in ${delay}ms (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        const newToken = await AuthService.refreshAccessToken();
        if (newToken) {
          await connectSocket();
        } else {
          console.log('❌ No token available for reconnection');
        }
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        handleReconnect();
      }
    }, delay);
  };

  // Manual reconnect function
  const reconnect = async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttempts.current = 0;
    if (socket) {
      socket.disconnect();
    }
    await connectSocket();
  };

  // Clean up function
  const cleanup = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
  };

  useEffect(() => {
    connectSocket();

    // Ping interval to check connection
    pingIntervalRef.current = setInterval(() => {
      if (socket?.connected) {
        socket.emit('ping', (response: any) => {
          if (response) {
            console.log('🏓 Socket health check OK');
          }
        });
      }
    }, 60000);

    return () => {
      cleanup();
    };
  }, []);

  // Join a group
  const joinGroup = (groupId: string) => {
    if (socket?.connected) {
      socket.emit('join-group', groupId);
      console.log(`👥 Joined group: ${groupId}`);
    }
  };

  // Leave a group
  const leaveGroup = (groupId: string) => {
    if (socket?.connected) {
      socket.emit('leave-group', groupId);
      console.log(`🚪 Left group: ${groupId}`);
    }
  };

  // Emit an event
  const emit = (event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn(`⚠️ Socket not connected, cannot emit: ${event}`);
    }
  };

  // Register event listener
  const on = (event: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event)?.push(callback);
    
    if (socket) {
      socket.on(event, callback);
    }
  };

  // Remove event listener
  const off = (event: string, callback?: (data: any) => void) => {
    if (callback) {
      const listeners = listenersRef.current.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      if (socket) {
        socket.off(event, callback);
      }
    } else {
      listenersRef.current.delete(event);
      if (socket) {
        socket.removeAllListeners(event);
      }
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      joinGroup,
      leaveGroup,
      emit,
      on,
      off,
      reconnect,
      connectionStats
    }}>
      {children}
    </SocketContext.Provider>
  );
};