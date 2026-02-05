import Constants from 'expo-constants';

// Simple function to get the right backend IP
export const getBackendIP = (): string => {
  // Get Expo's current IP
  const hostUri = Constants.expoConfig?.hostUri;
  
  if (!hostUri) return 'localhost'; // Fallback
  
  const [currentIP] = hostUri.split(':');
  
  // If device is on 192.168.1.x (office WiFi), backend is at 192.168.1.29
  if (currentIP.startsWith('192.168.1.')) {
    return '192.168.1.29';
  }
  
  // If device is on 10.219.65.x (your hotspot), backend is at 10.219.65.2
  if (currentIP.startsWith('10.219.65.')) {
    return '10.219.65.2';
  }
  
  // For any other case, use the same IP
  return currentIP;
};

// Export the full API URL
export const API_BASE_URL = `http://${getBackendIP()}:5000`;

// Log it for debugging
console.log('🌐 Backend URL:', API_BASE_URL);