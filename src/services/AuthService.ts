// src/authServices/AuthService.ts - UPDATED for accessToken/refreshToken
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_URL = `${API_BASE_URL}/api/auth/users`;

// Update storeUserData to handle both tokens
const storeUserData = async (userData: any, accessToken?: string, refreshToken?: string) => {
    try {
        // Store user data in AsyncStorage (non-sensitive)
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        if (userData.id) {
            await AsyncStorage.setItem('userId', userData.id);
        }
        
        // ✅ Store access token in SecureStore
        if (accessToken) {
            await SecureStore.setItemAsync('userAccessToken', accessToken);
            console.log('🔐 Access token stored securely');
        }
        
        // ✅ Store refresh token in SecureStore (separate key)
        if (refreshToken) {
            await SecureStore.setItemAsync('userRefreshToken', refreshToken);
            console.log('🔐 Refresh token stored securely');
        }
        
        console.log('✅ User data stored successfully');
    } catch (error) {
        console.error('Error storing user data:', error);
    }
};

export class AuthService {
    static async login(data: {email: string, password: string}) {
        try {
            console.log("🔍 Attempting login...");
            
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {'Content-Type': "application/json"},
                body: JSON.stringify(data),
                credentials: 'include'
            });

            const result = await response.json();
            console.log("🔍 Login response:", result);
            
            // ✅ Handle new response structure
            if (result.success && result.user) {
                await storeUserData(
                    result.user, 
                    result.accessToken,  // ← Changed from result.token
                    result.refreshToken   // ← NEW
                );
                console.log('🔐 Login successful, tokens stored');
            }

            return result;

        } catch (e: any) {
            console.error("Login error:", e);
            return {
                success: false,
                message: "Cannot connect to the server"
            };
        }
    }

    static async signup(data: any) {
        try {
            console.log("🔍 Attempting signup...");
            
            const response = await fetch(`${API_URL}/signup`, {
                method: "POST",
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
                credentials: 'include'
            });

            const result = await response.json();
            console.log("🔍 Signup response:", result);
            
            // ✅ Handle new response structure
            if (result.success && result.user) {
                await storeUserData(
                    result.user, 
                    result.accessToken,  // ← Changed from result.token
                    result.refreshToken   // ← NEW
                );
                console.log('🔐 Signup successful, tokens stored');
            }

            return result;

        } catch (e: any) {
            console.error("Signup error:", e);
            return {
                success: false,
                message: "Cannot connect to the server"
            };
        }
    }

    static async logout() {
        try {
            // Get tokens before clearing
            const accessToken = await this.getAccessToken();
            
            // Clear all storage
            await AsyncStorage.multiRemove(['user', 'userId']);
            await SecureStore.deleteItemAsync('userAccessToken');
            await SecureStore.deleteItemAsync('userRefreshToken');
            
            // Call logout endpoint
            const response = await fetch(`${API_URL}/logout`, {
                method: "POST",
                headers: accessToken ? {
                    'Authorization': `Bearer ${accessToken}`
                } : {},
                credentials: 'include'
            });

            return {
                success: true,
                message: "Logged out successfully"
            };

        } catch (e: any) {
            // Still clear storage even if network fails
            await AsyncStorage.multiRemove(['user', 'userId']);
            await SecureStore.deleteItemAsync('userAccessToken');
            await SecureStore.deleteItemAsync('userRefreshToken');
            return {
                success: false,
                message: "Cannot connect to the server"
            };
        }
    }

    // ✅ Get access token
    static async getAccessToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync('userAccessToken');
        } catch (error) {
            console.error('Error getting access token:', error);
            return null;
        }
    }

    // ✅ Get refresh token
    static async getRefreshToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync('userRefreshToken');
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return null;
        }
    }

    // ✅ Refresh access token
    static async refreshAccessToken(): Promise<string | null> {
        try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) {
                console.log('No refresh token available');
                return null;
            }

            console.log('🔄 Refreshing access token...');
            
            const response = await fetch(`${API_URL}/refresh-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${refreshToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success && result.accessToken) {
                // Store new access token
                await SecureStore.setItemAsync('userAccessToken', result.accessToken);
                console.log('✅ Access token refreshed');
                return result.accessToken;
            } else {
                // Refresh failed - clear tokens
                await this.logout();
                return null;
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            return null;
        }
    }

    // ✅ Get current user (with auto-refresh)
    static async getCurrentUser() {
        try {
            // Try to get from storage first
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                return JSON.parse(userData);
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    static async getUserId() {
        try {
            const userId = await AsyncStorage.getItem('userId');
            return userId || null;
        } catch (error) {
            return null;
        }
    }

    // Check if user is authenticated (has tokens)
    static async isAuthenticated(): Promise<boolean> {
        const accessToken = await this.getAccessToken();
        const refreshToken = await this.getRefreshToken();
        return !!(accessToken && refreshToken);
    }

    // Fetch fresh user data from server
    static async fetchFreshUserData(): Promise<any> {
      try {
        console.log('🔄 Fetching fresh user data from server...');
        
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
          console.log('❌ No access token found');
          return null;
        }

        const response = await fetch(`${API_URL}/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        // Handle 401 - token might be expired
        if (response.status === 401) {
            console.log('🔑 Access token expired, attempting refresh...');
            const newToken = await this.refreshAccessToken();
            if (newToken) {
                // Retry with new token
                return this.fetchFreshUserData();
            }
            return null;
        }

        const result = await response.json();
        console.log('📥 Fresh user data response:', result);
        
        if (result.success && result.user) {
          // Update AsyncStorage with fresh data
          await AsyncStorage.setItem('user', JSON.stringify(result.user));
          console.log('✅ Updated user data in AsyncStorage');
          return result.user;
        }
        
        console.log('❌ Failed to fetch fresh user data:', result.message);
        return null;
      } catch (error) {
        console.error('Error fetching fresh user data:', error);
        return null;
      }
    }

   static async updateProfile(data: { fullName: string }): Promise<any> {
    try {
        console.log('🔍 Attempting to update profile...');
        
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            return {
                success: false,
                message: "Not authenticated"
            };
        }

        const response = await fetch(`${API_URL}/profile`, {
            method: "PUT",
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('📥 Update profile response:', result);
        
        if (result.success && result.user) {
            // ✅ FIX: Handle null refreshToken
            const refreshToken = await this.getRefreshToken();
            await storeUserData(
                result.user, 
                accessToken, 
                refreshToken || undefined // ← Convert null to undefined
            );
            console.log('✅ User data updated successfully');
        }

        return result;

    } catch (error: any) {
        console.error('Error updating profile:', error);
        return {
            success: false,
            message: error.message || 'Failed to update profile'
        };
    }
}

    // ===== CHANGE PASSWORD =====
    static async changePassword(data: { currentPassword: string; newPassword: string }): Promise<any> {
        try {
            console.log('🔍 Attempting to change password...');
            
            const accessToken = await this.getAccessToken();
            if (!accessToken) {
                return {
                    success: false,
                    message: "Not authenticated"
                };
            }

            const response = await fetch(`${API_URL}/change-password`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('📥 Change password response:', result);
            
            return result;

        } catch (error: any) {
            console.error('Error changing password:', error);
            return {
                success: false,
                message: error.message || 'Failed to change password'
            };
        }
    }

    // ===== DELETE ACCOUNT =====
    static async deleteAccount(password: string): Promise<any> {
        try {
            console.log('🔍 Attempting to delete account...');
            
            const accessToken = await this.getAccessToken();
            if (!accessToken) {
                return {
                    success: false,
                    message: "Not authenticated"
                };
            }

            const response = await fetch(`${API_URL}/delete`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const result = await response.json();
            console.log('📥 Delete account response:', result);
            
            if (result.success) {
                // Clear all stored data
                await AsyncStorage.multiRemove(['user', 'userId']);
                await SecureStore.deleteItemAsync('userAccessToken');
                await SecureStore.deleteItemAsync('userRefreshToken');
            }

            return result;

        } catch (error: any) {
            console.error('Error deleting account:', error);
            return {
                success: false,
                message: error.message || 'Failed to delete account'
            };
        }
    }
}