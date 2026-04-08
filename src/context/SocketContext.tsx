// context/SocketContext.tsx - COMPLETE FIXED WITH BETTER RECONNECTION

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';
import { AuthService } from '../services/AuthService';
import { AppState, Platform } from 'react-native';

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
  const joinedGroupsRef = useRef<Set<string>>(new Set());
  const isConnectingRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);

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

  // ✅ Function to re-join all previously joined groups with delay
  const rejoinGroups = useCallback(async () => {
    if (!socket?.connected) {
      console.log('⚠️ Cannot rejoin groups - socket not connected');
      return false;
    }

    // Wait a moment for socket to fully register
    await new Promise(resolve => setTimeout(resolve, 500));

    const groups = Array.from(joinedGroupsRef.current);
    if (groups.length === 0) {
      console.log('📭 No groups to rejoin');
      return true;
    }

    console.log(`🔄 Rejoining ${groups.length} groups:`, groups);
    
    // Emit join events with a small delay between each
    for (const groupId of groups) {
      socket.emit('join-group', groupId);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return true;
  }, [socket]);

  // ✅ Connect socket function with improved reconnection
  const connectSocket = async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('⚠️ Socket connection already in progress, skipping');
      return;
    }

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

      isConnectingRef.current = true;
      console.log(`🔌 Socket: Connecting to ${API_BASE_URL}`);
      setConnectionStats(prev => ({ ...prev, attempts: prev.attempts + 1, lastError: undefined }));
      
      const socketInstance = io(API_BASE_URL, {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity, // ✅ Keep trying forever
        reconnectionDelay: 1000,
        reconnectionDelayMax: 15000, // ✅ Max 15 seconds
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
          isConnectingRef.current = false;
        }
      }, 15000);

      socketInstance.on('connect', async () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Socket connected:', socketInstance.id);
        setIsConnected(true);
        setConnectionStats(prev => ({ ...prev, lastError: undefined }));
        isConnectingRef.current = false;
        
        // ✅ Wait a moment for registration
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // ✅ Re-join groups after successful connection
        await rejoinGroups();
        
        // ✅ Re-register all event listeners
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
        
        // Clear any pending reconnect timeouts
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

      socketInstance.on('reconnect', async (attemptNumber) => {
        console.log(`✅ Socket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
        isConnectingRef.current = false;
        
        // ✅ Wait for registration
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // ✅ Re-join groups after reconnection
        await rejoinGroups();
      });

      socketInstance.on('reconnect_failed', () => {
        console.log('❌ Socket reconnection failed');
        setConnectionStats(prev => ({ ...prev, lastError: 'Reconnection failed' }));
        isConnectingRef.current = false;
        
        // Try manual reconnect after delay
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
      isConnectingRef.current = false;
    }
  };

  // ✅ Manual reconnect function
  const reconnect = async () => {
    console.log('🔄 Manual reconnect requested');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    isConnectingRef.current = false;
    
    if (socket) {
      // Force disconnect and reconnect
      socket.disconnect();
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      socket.connect();
    } else {
      await connectSocket();
    }
  };

  // ✅ Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App came to foreground, checking socket connection...');
        
        // App came to foreground - check and reconnect if needed
        if (socket && !socket.connected) {
          console.log('🔄 Socket disconnected while app was in background, reconnecting...');
          await new Promise(resolve => setTimeout(resolve, 500));
          socket.connect();
        } else if (!socket) {
          await connectSocket();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [socket]);

  // ✅ Network connectivity check (optional)
  useEffect(() => {
    // Simple network check - attempt reconnect on network regain
    let onlineCheckInterval: ReturnType<typeof setInterval> | null = null;
    
    const checkOnlineStatus = async () => {
      // You can implement a network check here if needed
      // For now, just log
      console.log('🌐 Checking network status...');
    };
    
    onlineCheckInterval = setInterval(checkOnlineStatus, 60000); // Check every minute
    
    return () => {
      if (onlineCheckInterval) clearInterval(onlineCheckInterval);
    };
  }, []);

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
            // console.log('🏓 Socket health check OK');
          }
        });
      } else if (socket && !socket.connected) {
        console.log('⚠️ Socket not connected, attempting to reconnect...');
        socket.connect();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      cleanup();
    };
  }, []);

  // ✅ Listen for token refresh events
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

    // Check token validity periodically
    const tokenCheckInterval = setInterval(async () => {
      const token = await AuthService.getAccessToken();
      if (!token && socket?.connected) {
        console.log('⚠️ Token missing while socket connected, reconnecting...');
        socket.disconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
        socket.connect();
      }
    }, 60000);

    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, [socket]);

  // Join a group
  const joinGroup = useCallback((groupId: string) => {
    joinedGroupsRef.current.add(groupId);
    
    if (socket?.connected) {
      socket.emit('join-group', groupId);
      console.log(`👥 Joined group: ${groupId}`);
    } else {
      console.log(`⚠️ Socket not connected, group ${groupId} queued for rejoin`);
      // Attempt to reconnect if socket is disconnected
      if (socket && !socket.connected) {
        socket.connect();
      } else if (!socket) {
        connectSocket();
      }
    }
  }, [socket]);

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