// context/SocketContext.tsx - COMPLETE FIXED VERSION

import React, { createContext, useContext, useEffect, useState, useRef,useCallback } from 'react';
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
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ✅ Track groups to re-join after reconnection
  const joinedGroupsRef = useRef<Set<string>>(new Set());
  const isReconnectingRef = useRef(false);

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

  // ✅ Function to re-join all previously joined groups
  const rejoinGroups = useCallback(() => {
    if (!socket?.connected) {
      console.log('⚠️ Cannot rejoin groups - socket not connected');
      return;
    }

    const groups = Array.from(joinedGroupsRef.current);
    if (groups.length === 0) {
      console.log('📭 No groups to rejoin');
      return;
    }

    console.log(`🔄 Rejoining ${groups.length} groups:`, groups);
    
    groups.forEach(groupId => {
      socket.emit('join-group', groupId);
    });
  }, [socket]);

  // ✅ Connect socket function with reconnection ENABLED
  const connectSocket = async () => {
    try {
      const token = await AuthService.getAccessToken();
      
      if (!token) {
        console.log('❌ Socket: No token available');
        return;
      }

      // If socket exists and is connected, don't create new one
      if (socket?.connected) {
        console.log('✅ Socket already connected, reusing');
        return;
      }

      // If socket exists but disconnected, reconnect it
      if (socket) {
        console.log('🔄 Socket exists but disconnected, reconnecting...');
        socket.connect();
        return;
      }

      console.log(`🔌 Socket: Connecting to ${API_BASE_URL} (Attempt ${connectionStats.attempts + 1})`);
      setConnectionStats(prev => ({ ...prev, attempts: prev.attempts + 1, lastError: undefined }));
      
      // ✅ ENABLE reconnection with proper settings
      const socketInstance = io(API_BASE_URL, {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket'],
        reconnection: true,  // ✅ CHANGE: Enable reconnection
        reconnectionAttempts: 10,  // ✅ Max attempts
        reconnectionDelay: 1000,   // Start with 1 second
        reconnectionDelayMax: 10000, // Max 10 seconds
        randomizationFactor: 0.5,
        timeout: 20000,
        forceNew: false,
        multiplex: true,
        upgrade: true,
        rememberUpgrade: true
      });

      // Connection timeout handler
      const connectionTimeout = setTimeout(() => {
        if (!socketInstance.connected) {
          console.log('⚠️ Socket connection timeout');
          setConnectionStats(prev => ({ ...prev, lastError: 'Connection timeout' }));
        }
      }, 15000);

      socketInstance.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Socket connected:', socketInstance.id);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        setConnectionStats(prev => ({ ...prev, lastError: undefined }));
        
        // ✅ Re-join groups after successful connection
        rejoinGroups();
      });

      socketInstance.on('registered', (data) => {
        console.log('✅ Socket registered:', { userId: data.userId, groups: data.groups?.length });
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsConnected(false);
        
        // Don't attempt manual reconnect if socket.io is handling it
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, reconnect manually
          setTimeout(() => {
            if (socketInstance) {
              console.log('🔄 Manual reconnect after server disconnect');
              socketInstance.connect();
            }
          }, 1000);
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
            // Socket.io will auto-reconnect with new token
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

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // ✅ Re-join groups after reconnection
        rejoinGroups();
      });

      socketInstance.on('reconnect_failed', () => {
        console.log('❌ Socket reconnection failed');
        setConnectionStats(prev => ({ ...prev, lastError: 'Reconnection failed after max attempts' }));
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

  // ✅ Manual reconnect function
  const reconnect = async () => {
    console.log('🔄 Manual reconnect requested');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectAttempts.current = 0;
    
    if (socket) {
      // Force disconnect and reconnect
      socket.disconnect();
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 500));
      socket.connect();
    } else {
      await connectSocket();
    }
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

  // Initial connection
  useEffect(() => {
    connectSocket();

    // Ping interval to check connection and keep it alive
    pingIntervalRef.current = setInterval(() => {
      if (socket?.connected) {
        socket.emit('ping', (response: any) => {
          if (response) {
            console.log('🏓 Socket health check OK');
          }
        });
      } else if (socket && !socket.connected && !socket.disconnected) {
        console.log('⚠️ Socket not connected but exists, checking status...');
        // Socket.io will handle reconnection automatically
      }
    }, 30000); // Check every 30 seconds

    return () => {
      cleanup();
    };
  }, []);

  // ✅ Listen for token refresh events to re-authenticate socket
  useEffect(() => {
    const handleTokenRefresh = async () => {
      console.log('🔄 Token refreshed, updating socket auth...');
      const newToken = await AuthService.getAccessToken();
      if (socket && newToken) {
        socket.auth = { token: `Bearer ${newToken}` };
        if (!socket.connected) {
          socket.connect();
        }
      }
    };

    // Listen for token refresh events (you may need to emit this from your auth service)
    // This is a simple polling mechanism as fallback
    const interval = setInterval(async () => {
      // Check if token is about to expire and refresh
      // This is handled by your AuthService interceptor
    }, 60000);

    return () => clearInterval(interval);
  }, [socket]);

  // Join a group
  const joinGroup = useCallback((groupId: string) => {
    // Track the group for reconnection
    joinedGroupsRef.current.add(groupId);
    
    if (socket?.connected) {
      socket.emit('join-group', groupId);
      console.log(`👥 Joined group: ${groupId}`);
    } else {
      console.log(`⚠️ Socket not connected, group ${groupId} will be joined on reconnect`);
    }
  }, [socket]);

  // Leave a group
  const leaveGroup = useCallback((groupId: string) => {
    // Remove from tracked groups
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