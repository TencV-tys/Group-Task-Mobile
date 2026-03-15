// utils/tokenUtils.ts - COMPLETE VERSION
import { AuthService } from '../services/AuthService';
import { Alert } from 'react-native';

interface TokenCheckOptions {
  showAlert?: boolean;
  alertTitle?: string;
  alertMessage?: string;
  onAuthError?: () => void;
}

export class TokenUtils {
  
  /**
   * Get access token from AuthService
   */
  static async getAccessToken(): Promise<string | null> {
    return await AuthService.getAccessToken();
  }

  /**
   * Get refresh token from AuthService
   */
  static async getRefreshToken(): Promise<string | null> {
    return await AuthService.getRefreshToken();
  }

  /**
   * Get user from AuthService
   */
  static async getUser(): Promise<any | null> {
    return await AuthService.getCurrentUser();
  }

  /**
   * Get headers with authorization token
   */
  static async getAuthHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const token = await this.getAccessToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  /**
   * Check if user has a valid token
   */
  static async checkToken(options: TokenCheckOptions = {}): Promise<boolean> {
    const {
      showAlert = true,
      alertTitle = 'Session Expired',
      alertMessage = 'Please log in again',
      onAuthError
    } = options;

    try {
      const token = await this.getAccessToken();
      
      if (!token) {
        console.warn('🔐 TokenUtils: No auth token available');
        
        if (showAlert) {
          Alert.alert(
            alertTitle,
            alertMessage,
            [
              { 
                text: 'OK', 
                onPress: () => {
                  if (onAuthError) onAuthError();
                }
              }
            ]
          );
        } else if (onAuthError) {
          onAuthError();
        }
        
        return false;
      }
      
      console.log('✅ TokenUtils: Auth token found');
      return true;
      
    } catch (error) {
      console.error('❌ TokenUtils: Error checking token:', error);
      
      if (showAlert) {
        Alert.alert(
          'Authentication Error',
          'An error occurred while checking authentication'
        );
      }
      
      return false;
    }
  }

  /**
   * Get user ID from stored user data
   */
  static async getUserId(): Promise<string | null> {
    try {
      const user = await this.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('❌ TokenUtils: Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated and optionally redirect to login
   */
  static async requireAuth(navigation: any, options?: TokenCheckOptions): Promise<boolean> {
    const hasToken = await this.checkToken({
      ...options,
      onAuthError: () => {
        navigation.navigate('Login');
        options?.onAuthError?.();
      }
    });
    
    return hasToken;
  }
}