// utils/tokenUtils.ts - COMPLETE VERSION WITH REFRESH
import { AuthService } from '../services/AuthService';
import { Alert } from 'react-native';

interface TokenCheckOptions {
  showAlert?: boolean;
  alertTitle?: string;
  alertMessage?: string;
  onAuthError?: () => void;
  attemptRefresh?: boolean; // 👈 NEW option
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
    // ✅ Get a valid token (will auto-refresh if needed)
    const token = await this.getValidToken();
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
   * Get a valid token (auto-refresh if expired)
   */
  static async getValidToken(): Promise<string | null> {
    let token = await this.getAccessToken();
    
    if (!token) {
      return null;
    }

    // Check if token is expired (optional - can rely on 401 responses)
    if (this.isTokenExpired(token)) {
      console.log('🔑 Token expired, attempting refresh...');
      token = await this.refreshToken();
    }

    return token;
  }

  /**
   * Check if token is expired (client-side estimation)
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expiry;
    } catch {
      return false; // If can't decode, assume not expired
    }
  }

  /**
   * Refresh the access token
   */
  static async refreshToken(): Promise<string | null> {
    try {
      const newToken = await AuthService.refreshAccessToken();
      if (newToken) {
        console.log('✅ Token refreshed successfully');
        return newToken;
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
    }
    return null;
  }

  /**
   * Check if user has a valid token (with optional refresh)
   */
  static async checkToken(options: TokenCheckOptions = {}): Promise<boolean> {
    const {
      showAlert = true,
      alertTitle = 'Session Expired',
      alertMessage = 'Please log in again',
      onAuthError,
      attemptRefresh = true // 👈 Default to true
    } = options;

    try {
      // Try to get a valid token (will refresh if needed)
      let token = await this.getAccessToken();
      
      if (!token) {
        this.handleNoToken(showAlert, alertTitle, alertMessage, onAuthError);
        return false;
      }

      // Check if token is expired and attempt refresh if enabled
      if (attemptRefresh && this.isTokenExpired(token)) {
        console.log('🔄 Token expired, attempting refresh...');
        token = await this.refreshToken();
        
        if (!token) {
          this.handleNoToken(showAlert, alertTitle, alertMessage, onAuthError);
          return false;
        }
      }
      
      console.log('✅ TokenUtils: Valid token found');
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
   * Handle no token case
   */
  private static handleNoToken(
    showAlert: boolean,
    alertTitle: string,
    alertMessage: string,
    onAuthError?: () => void
  ) {
    console.warn('🔐 TokenUtils: No valid token available');
    
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