// context/SocketContext.tsx - REACT NATIVE FIXED VERSION (No window)

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/AuthService';
import { AppState } from 'react-native';

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
  notifyLogin: () => Promise<void>;
  notifyLogout: () => void;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionStats, setConnectionStats] = useState({ attempts: 0, lastError: undefined as string | undefined });
  const listenersRef = useRef<Map<string, Function[]>>(new Map());
  const joinedGroupsRef = useRef<Set<string>>(new Set());
  const isConnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // ✅ Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userStr = await SecureStore.getItemAsync('user');
        const token = await AuthService.getAccessToken();
        
        if (userStr && token) {
          const user = JSON.parse(userStr);
          setUserId(user.id);
          setIsAuthenticated(true);
          console.log('✅ User authenticated, socket will connect');
        } else {
          console.log('❌ No user authenticated, socket will not connect');
          setIsAuthenticated(false);
          setUserId(null);
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  // ✅ Function to re-join all previously joined groups
  const rejoinGroups = useCallback(async () => {
    if (!socket?.connected) {
      console.log('⚠️ Cannot rejoin groups - socket not connected');
      return false;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const groups = Array.from(joinedGroupsRef.current);
    if (groups.length === 0) {
      return true;
    }

    console.log(`🔄 Rejoining ${groups.length} groups:`, groups);
    
    for (const groupId of groups) {
      socket.emit('join-group', groupId);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return true;
  }, [socket]);

  // ✅ Connect socket function - ONLY called when authenticated
  const connectSocket = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('❌ Socket: Not authenticated, skipping connection');
      return;
    }
    
    if (isConnectingRef.current) {
      console.log('⚠️ Socket connection already in progress, skipping');
      return;
    }

    try {
      const token = await AuthService.getAccessToken();
      
      if (!token) {
        console.log('❌ Socket: No token available - user not logged in');
        return;
      }

      if (socket?.connected) {
        console.log('✅ Socket already connected, reusing');
        return;
      }

      if (socket) {
        console.log('🔄 Socket exists but disconnected, reconnecting...');
        socket.connect();
        return;
      }

      isConnectingRef.current = true;
      console.log(`🔌 Socket: Connecting to ${API_BASE_URL}`);
      setConnectionStats(prev => ({ ...prev, attempts: prev.attempts + 1, lastError: undefined }));
      
      const socketInstance = io(API_BASE_URL, {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 15000,
        randomizationFactor: 0.5,
        timeout: 20000,
        forceNew: false,
        multiplex: true,
        upgrade: true,
        rememberUpgrade: true
      });

      const connectionTimeout = setTimeout(() => {
        if (!socketInstance.connected) {
          console.log('⚠️ Socket connection timeout');
          setConnectionStats(prev => ({ ...prev, lastError: 'Connection timeout' }));
          isConnectingRef.current = false;
        }
      }, 15000);

    socketInstance.on('connect', async () => {
  clearTimeout(connectionTimeout);
  console.log('✅ Socket connected:', socketInstance.id);
  setIsConnected(true);
  setConnectionStats(prev => ({ ...prev, lastError: undefined }));
  isConnectingRef.current = false;
  
  // ✅ Add a longer delay to ensure socket is fully ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await rejoinGroups();
  
  // Re-register all event listeners
  listenersRef.current.forEach((callbacks, event) => {
    callbacks.forEach(callback => {
      socketInstance.on(event, callback as any);
    });
  });
});

      socketInstance.on('registered', (data) => {
        console.log('✅ Socket registered:', { userId: data.userId, groups: data.groups?.length });
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      socketInstance.on('connect_error', async (error) => {
        console.error('❌ Socket connect error:', error.message);
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        
        if (error.message === 'Invalid token' || error.message === 'Authentication required') {
          console.log('🔄 Token invalid, attempting refresh...');
          const newToken = await AuthService.refreshAccessToken();
          
          if (newToken && socketInstance) {
            socketInstance.auth = { token: `Bearer ${newToken}` };
          } else {
            setConnectionStats(prev => ({ ...prev, lastError: 'Token refresh failed' }));
          }
        } else {
          setConnectionStats(prev => ({ ...prev, lastError: error.message }));
        }
      });

      socketInstance.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Socket reconnect attempt ${attemptNumber}`);
        setConnectionStats(prev => ({ ...prev, attempts: prev.attempts + 1 }));
      });

      socketInstance.on('reconnect', async (attemptNumber) => {
        console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        isConnectingRef.current = false;
        await new Promise(resolve => setTimeout(resolve, 300));
        await rejoinGroups();
      });

      socketInstance.on('reconnect_failed', () => {
        console.log('❌ Socket reconnection failed');
        setConnectionStats(prev => ({ ...prev, lastError: 'Reconnection failed' }));
        isConnectingRef.current = false;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Manual reconnect after failure...');
          socketInstance.connect();
        }, 5000);
      });

      socketInstance.on('error', (error) => {
        console.error('❌ Socket error:', error);
        setConnectionStats(prev => ({ ...prev, lastError: error.message }));
      });

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
      isConnectingRef.current = false;
    }
  }, [isAuthenticated, socket, rejoinGroups]);

  // ✅ Manual reconnect function
  const reconnect = useCallback(async () => {
    console.log('🔄 Manual reconnect requested');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    isConnectingRef.current = false;
    
    if (socket) {
      socket.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      socket.connect();
    } else {
      await connectSocket();
    }
  }, [socket, connectSocket]);

  // ✅ Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App came to foreground, checking socket connection...');
        
        if (isAuthenticated) {
          if (socket && !socket.connected) {
            console.log('🔄 Socket disconnected while app was in background, reconnecting...');
            await new Promise(resolve => setTimeout(resolve, 500));
            socket.connect();
          } else if (!socket) {
            await connectSocket();
          }
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [socket, isAuthenticated, connectSocket]);

  // ✅ Initial connection - ONLY if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔌 User authenticated, initiating socket connection...');
      connectSocket();
    } else {
      console.log('⏳ Waiting for authentication before connecting socket...');
    }
    
    pingIntervalRef.current = setInterval(() => {
      if (isAuthenticated && socket?.connected) {
        socket.emit('ping', (response: any) => {
          if (!response) {
            console.log('⚠️ Socket health check failed');
          }
        });
      } else if (isAuthenticated && socket && !socket.connected) {
        console.log('⚠️ Socket not connected, attempting to reconnect...');
        socket.connect();
      }
    }, 30000);

    return () => {
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
  }, [isAuthenticated, connectSocket, socket]);

  // Join a group
  const joinGroup = useCallback((groupId: string) => {
    joinedGroupsRef.current.add(groupId);
    
    if (socket?.connected) {
      socket.emit('join-group', groupId);
      console.log(`👥 Joined group: ${groupId}`);
    } else {
      console.log(`⚠️ Socket not connected, group ${groupId} queued for rejoin`);
      if (isAuthenticated && socket && !socket.connected) {
        socket.connect();
      } else if (isAuthenticated && !socket) {
        connectSocket();
      }
    }
  }, [socket, isAuthenticated, connectSocket]);

  // Leave a group
  const leaveGroup = useCallback((groupId: string) => {
    joinedGroupsRef.current.delete(groupId);
    
    if (socket?.connected) {
      socket.emit('leave-group', groupId);
      console.log(`🚪 Left group: ${groupId}`);
    }
  }, [socket]);

  // Emit an event
  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn(`⚠️ Socket not connected, cannot emit: ${event}`);
    }
  }, [socket]);

  // Register event listener
  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event)?.push(callback);
    
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  // Remove event listener
  const off = useCallback((event: string, callback?: (data: any) => void) => {
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
  }, [socket]);

  // ✅ Call this after successful login
  const notifyLogin = useCallback(async () => {
    console.log('🔐 User logged in, setting authenticated state...');
    const userStr = await SecureStore.getItemAsync('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserId(user.id);
    }
    setIsAuthenticated(true);
    await connectSocket();
  }, [connectSocket]);

  // ✅ Call this after logout
  const notifyLogout = useCallback(() => {
    console.log('🚪 User logged out, disconnecting socket...');
    if (socket) {
      socket.disconnect();
    }
    setIsAuthenticated(false);
    setUserId(null);
    setSocket(null);
    setIsConnected(false);
    joinedGroupsRef.current.clear();
  }, [socket]);

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
      connectionStats,
      notifyLogin,
      notifyLogout
    }}>
      {children}
    </SocketContext.Provider>
  );
};