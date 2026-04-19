// src/components/SocketAuthBridge.tsx
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
    
    return () => {
      setSocketLoginCallback(null);
      setSocketLogoutCallback(null);
    };
  }, [socket]);

  return null;
};