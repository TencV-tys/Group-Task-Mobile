// src/authServices/AuthService.ts - UPDATED with updateProfile
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_URL = `${API_BASE_URL}/api/auth/users`;

const storeUserData = async (userData: any, token?: string) => {
    try {
        // Store user data in AsyncStorage (non-sensitive)
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        if (userData.id) {
            await AsyncStorage.setItem('userId', userData.id);
        }
        
        // ✅ Store token in SecureStore (encrypted)
        if (token) {
            await SecureStore.setItemAsync('userToken', token);
            console.log('🔐 Token stored securely in SecureStore');
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
            
            if (result.success && result.user) {
                // ✅ Store user data in AsyncStorage, token in SecureStore
                await storeUserData(result.user, result.token);
                console.log('🔐 Login successful, user stored:', result.user.id);
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
            
            if (result.success && result.user) {
                // ✅ Store user data in AsyncStorage, token in SecureStore
                await storeUserData(result.user, result.token);
                console.log('🔐 Signup successful, user stored:', result.user.id);
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
            // Clear AsyncStorage data
            await AsyncStorage.multiRemove([
                'user', 
                'userId'
            ]);
            
            // ✅ Clear SecureStore token
            await SecureStore.deleteItemAsync('userToken');
            
            const response = await fetch(`${API_URL}/logout`, {
                method: "POST",
                credentials: 'include'
            });

            return {
                success: true,
                message: "Logged out successfully"
            };

        } catch (e: any) {
            // Still clear storage even if network fails
            await AsyncStorage.multiRemove(['user', 'userId']);
            await SecureStore.deleteItemAsync('userToken');
            return {
                success: false,
                message: "Cannot connect to the server"
            };
        }
    }

    // ✅ Get token from SecureStore
    static async getToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync('userToken');
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    static async getCurrentUser() {
        try {
            const userData = await AsyncStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
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

    // Check if user is authenticated (has token)
    static async isAuthenticated(): Promise<boolean> {
        const token = await this.getToken();
        return !!token;
    }

    // Fetch fresh user data from server
    static async fetchFreshUserData(): Promise<any> {
      try {
        console.log('🔄 Fetching fresh user data from server...');
        
        const token = await this.getToken();
        if (!token) {
          console.log('❌ No token found');
          return null;
        }

        const response = await fetch(`${API_URL}/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

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

    // ===== NEW: Update user profile =====
    static async updateProfile(data: { fullName: string }): Promise<any> {
        try {
            console.log('🔍 Attempting to update profile...');
            
            const token = await this.getToken();
            if (!token) {
                return {
                    success: false,
                    message: "Not authenticated"
                };
            }

            const response = await fetch(`${API_URL}/profile`, {
                method: "PUT",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('📥 Update profile response:', result);
            
            if (result.success && result.user) {
                // Update stored user data
                await storeUserData(result.user, token);
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

    // ===== NEW: Change password =====
    static async changePassword(data: { currentPassword: string; newPassword: string }): Promise<any> {
        try {
            console.log('🔍 Attempting to change password...');
            
            const token = await this.getToken();
            if (!token) {
                return {
                    success: false,
                    message: "Not authenticated"
                };
            }

            const response = await fetch(`${API_URL}/change-password`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
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

    // ===== NEW: Delete account =====
    static async deleteAccount(password: string): Promise<any> {
        try {
            console.log('🔍 Attempting to delete account...');
            
            const token = await this.getToken();
            if (!token) {
                return {
                    success: false,
                    message: "Not authenticated"
                };
            }

            const response = await fetch(`${API_URL}/delete`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const result = await response.json();
            console.log('📥 Delete account response:', result);
            
            if (result.success) {
                // Clear all stored data
                await AsyncStorage.multiRemove(['user', 'userId']);
                await SecureStore.deleteItemAsync('userToken');
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