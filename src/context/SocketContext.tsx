// context/SocketContext.tsx - UPDATED with new token structure
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/AuthService'; // Import AuthService

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  reconnect: () => Promise<void>;
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
  const listenersRef = useRef<Map<string, Function[]>>(new Map());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

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

  // Connect socket function
  const connectSocket = async () => {
    try {
      // ✅ Use AuthService to get valid token (auto-refreshes if expired)
      const token = await AuthService.getAccessToken();
      
      if (!token) {
        console.log('❌ Socket: No token available');
        return;
      }

      console.log('🔌 Socket: Connecting to', API_BASE_URL);
      
      const socketInstance = io(API_BASE_URL, {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      socketInstance.on('connect', () => {
        console.log('✅ Socket connected:', socketInstance?.id);
        setIsConnected(true);
        reconnectAttempts.current = 0; // Reset on successful connect
      });

      socketInstance.on('registered', (data) => {
        console.log('✅ Socket registered:', data);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsConnected(false);
        
        // Try to reconnect with new token if disconnect was due to auth
        if (reason === 'io server disconnect' || reason === 'transport close') {
          handleReconnect();
        }
      });

      socketInstance.on('connect_error', async (error) => {
        console.error('❌ Socket connect error:', error);
        
        // Handle authentication errors
        if (error.message === 'Invalid token' || error.message === 'Authentication required') {
          console.log('🔄 Token invalid, attempting refresh...');
          const newToken = await AuthService.refreshAccessToken();
          
          if (newToken && socketInstance) {
            // Update auth and reconnect
            socketInstance.auth = { token: `Bearer ${newToken}` };
            socketInstance.connect();
          } else {
            // Can't refresh, stop trying
            socketInstance.disconnect();
          }
        }
      });

      socketInstance.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      // Handle all dynamic events
      socketInstance.onAny((event, ...args) => {
        const listeners = listenersRef.current.get(event);
        if (listeners) {
          listeners.forEach(callback => callback(...args));
        }
      });

      setSocket(socketInstance);

    } catch (error) {
      console.error('❌ Socket connection error:', error);
    }
  };

  // Handle reconnection with token refresh
  const handleReconnect = async () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }

    reconnectAttempts.current++;
    
    try {
      const newToken = await AuthService.refreshAccessToken();
      if (newToken) {
        console.log('🔄 Reconnecting with new token...');
        await connectSocket();
      }
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
    }
  };

  // Manual reconnect function
  const reconnect = async () => {
    if (socket) {
      socket.disconnect();
    }
    await connectSocket();
  };

  useEffect(() => {
    connectSocket();

    // Ping interval to check connection
    const pingInterval = setInterval(() => {
      if (socket?.connected) {
        socket.emit('ping', (response: any) => {
          console.log('🏓 Pong:', response);
        });
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (socket) {
        console.log('🔌 Cleaning up socket connection');
        socket.disconnect();
      }
    };
  }, []); // Empty dependency array - connect once on mount

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
      reconnect
    }}>
      {children}
    </SocketContext.Provider>
  );
};