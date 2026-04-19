// In SocketAuthBridge.tsx - Simpler version without isAuthenticated
import { useEffect } from 'react';
import { setSocketLoginCallback, setSocketLogoutCallback } from '../services/AuthService';
import { useSocket } from '../context/SocketContext';

export const SocketAuthBridge = () => {
  const socket = useSocket();

  useEffect(() => {
    console.log('🔌 Setting up SocketAuthBridge callbacks');
    
    setSocketLoginCallback(async () => {
      console.log('🔐 Login callback triggered, calling notifyLogin...');
      await socket.notifyLogin();
    });
    
    setSocketLogoutCallback(() => {
      console.log('🚪 Logout callback triggered, calling notifyLogout...');
      socket.notifyLogout();
    });
    
    // ✅ Hot reload recovery - check if socket should be connected
    const timeoutId = setTimeout(() => {
      // Check if there's a user token (meaning user should be authenticated)
      const checkAndReconnect = async () => {
        const token = await import('../services/AuthService').then(m => m.AuthService.getAccessToken());
        if (token && socket.isNetworkAvailable && !socket.isConnected) {
          console.log('🔄 Hot reload recovery - reconnecting socket...');
          socket.reconnect();
        }
      };
      checkAndReconnect();
    }, 500);
    
    return () => {
      setSocketLoginCallback(null);
      setSocketLogoutCallback(null);
      clearTimeout(timeoutId);
    };
  }, [socket]);

  return null;
};