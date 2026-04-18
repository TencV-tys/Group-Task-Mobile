// src/authServices/AuthService.ts - COMPLETE FIXED VERSION

import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_URL = `${API_BASE_URL}/api/auth/users`;

// ✅ Socket callbacks (set by SocketProvider)
let socketLoginCallback: (() => Promise<void>) | null = null;
let socketLogoutCallback: (() => void) | null = null;

export const setSocketLoginCallback = (callback: () => Promise<void>) => {
  socketLoginCallback = callback;
};

export const setSocketLogoutCallback = (callback: () => void) => {
  socketLogoutCallback = callback;
};

// ✅ Input sanitization helpers
const sanitizeEmail = (email: string): string => {
    return email.trim().toLowerCase().replace(/[<>'"]/g, '');
};

const sanitizeString = (str: string): string => {
    if (!str) return '';
    return str.trim().replace(/[<>'"]/g, '');
};

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
};

// ✅ UPDATED: Match backend password requirements (8 chars, uppercase, lowercase, number, special)
const validatePassword = (password: string): boolean => {
    if (password.length < 8) return false;
    if (password.length > 128) return false;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
};

// Store user data with tokens
const storeUserData = async (userData: any, accessToken?: string, refreshToken?: string) => {
    try {
        const sanitizedUser = {
            ...userData,
            email: userData.email?.toLowerCase().trim(),
            fullName: userData.fullName?.trim().replace(/[<>'"]/g, ''),
        };
        
        await AsyncStorage.setItem('user', JSON.stringify(sanitizedUser));
        if (sanitizedUser.id) {
            await AsyncStorage.setItem('userId', sanitizedUser.id);
        }
        
        if (accessToken) {
            await SecureStore.setItemAsync('userAccessToken', accessToken);
            console.log('🔐 Access token stored securely');
        }
        
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
    static async login(data: { email: string, password: string }) {
        try {
            const sanitizedEmail = sanitizeEmail(data.email);
            const sanitizedPassword = data.password.trim();
            
            if (!validateEmail(sanitizedEmail)) {
                return {
                    success: false,
                    message: "Please enter a valid email address"
                };
            }
            
            if (!sanitizedPassword) {
                return {
                    success: false,
                    message: "Password cannot be empty"
                };
            }
            
            console.log("🔍 Attempting login for:", sanitizedEmail);
            
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { 'Content-Type': "application/json" },
                body: JSON.stringify({
                    email: sanitizedEmail,
                    password: sanitizedPassword
                }),
                credentials: 'include'
            });

            const result = await response.json();
            console.log("🔍 Login response:", result);
            
            if (result.success && result.user) {
                await storeUserData(
                    result.user,
                    result.accessToken,
                    result.refreshToken
                );
                console.log('🔐 Login successful, tokens stored');
                
                if (socketLoginCallback) {
                    await socketLoginCallback();
                }
            }

            // ✅ FIXED: Return error details properly
            if (!result.success) {
                return {
                    success: false,
                    message: result.message,
                    field: result.field,
                    isLocked: result.isLocked,
                    remainingAttempts: result.remainingAttempts,
                    lockoutMinutes: result.lockoutMinutes
                };
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

    // src/services/AuthService.ts - FIXED signup method

static async signup(data: { 
  email: string; 
  password: string; 
  fullName: string;
  gender?: string;
  confirmPassword?: string;  // ✅ ADD THIS
  avatarUrl?: string;         // ✅ ADD THIS
}) {
  try {
    const sanitizedEmail = sanitizeEmail(data.email);
    const sanitizedFullName = sanitizeString(data.fullName);
    const sanitizedPassword = data.password.trim();
    const sanitizedGender = data.gender ? sanitizeString(data.gender) : undefined;
    const sanitizedConfirmPassword = data.confirmPassword?.trim(); // ✅ ADD THIS
    
    if (!validateEmail(sanitizedEmail)) {
      return {
        success: false,
        message: "Please enter a valid email address"
      };
    }
    
    if (!sanitizedFullName || sanitizedFullName.length < 2) {
      return {
        success: false,
        message: "Please enter your full name (at least 2 characters)"
      };
    }
    
    if (sanitizedFullName.length > 100) {
      return {
        success: false,
        message: "Full name cannot exceed 100 characters"
      };
    }
    
    // ✅ UPDATED: Use the new validatePassword with 8 char requirement
    if (!validatePassword(sanitizedPassword)) {
      return {
        success: false,
        message: "Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, one number, and one special character"
      };
    }
    
    // ✅ ADD confirmPassword validation
    if (sanitizedPassword !== sanitizedConfirmPassword) {
      return {
        success: false,
        message: "Passwords do not match"
      };
    }
    
    console.log("🔍 Attempting signup for:", sanitizedEmail);
    
    // ✅ INCLUDE confirmPassword in the request body
    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: sanitizedEmail,
        password: sanitizedPassword,
        fullName: sanitizedFullName,
        gender: sanitizedGender,
        confirmPassword: sanitizedConfirmPassword,  // ✅ ADD THIS
        avatarUrl: data.avatarUrl                    // ✅ ADD THIS
      }),
      credentials: 'include'
    });

    const result = await response.json();
    console.log("🔍 Signup response:", result);
    
    if (result.success && result.user) {
      await storeUserData(
        result.user,
        result.accessToken,
        result.refreshToken
      );
      console.log('🔐 Signup successful, tokens stored');
      
      if (socketLoginCallback) {
        await socketLoginCallback();
      }
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
            const accessToken = await this.getAccessToken();
            
            await AsyncStorage.multiRemove(['user', 'userId']);
            await SecureStore.deleteItemAsync('userAccessToken');
            await SecureStore.deleteItemAsync('userRefreshToken');
            
            if (socketLogoutCallback) {
                socketLogoutCallback();
            }
            
            if (accessToken) {
                fetch(`${API_URL}/logout`, {
                    method: "POST",
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    credentials: 'include'
                }).catch(() => {});
            }

            return {
                success: true,
                message: "Logged out successfully"
            };

        } catch (e: any) {
            await AsyncStorage.multiRemove(['user', 'userId']);
            await SecureStore.deleteItemAsync('userAccessToken');
            await SecureStore.deleteItemAsync('userRefreshToken');
            
            if (socketLogoutCallback) {
                socketLogoutCallback();
            }
            
            return {
                success: false,
                message: "Cannot connect to the server"
            };
        }
    }

    static async getAccessToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync('userAccessToken');
        } catch (error) {
            console.error('Error getting access token:', error);
            return null;
        }
    }

    static async getRefreshToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync('userRefreshToken');
        } catch (error) {
            console.error('Error getting refresh token:', error);
            return null;
        }
    }

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
                await SecureStore.setItemAsync('userAccessToken', result.accessToken);
                console.log('✅ Access token refreshed');
                return result.accessToken;
            } else {
                await this.logout();
                return null;
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            return null;
        }
    }

    static async getCurrentUser() {
        try {
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

    static async isAuthenticated(): Promise<boolean> {
        const accessToken = await this.getAccessToken();
        const refreshToken = await this.getRefreshToken();
        return !!(accessToken && refreshToken);
    }

    static async fetchFreshUserData(): Promise<any> {
        try {
            console.log('🔄 Fetching fresh user data from server...');
            
            let accessToken = await this.getAccessToken();
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

            if (response.status === 401) {
                console.log('🔑 Access token expired, attempting refresh...');
                const newToken = await this.refreshAccessToken();
                if (newToken) {
                    return this.fetchFreshUserData();
                }
                return null;
            }

            const result = await response.json();
            console.log('📥 Fresh user data response:', result);
            
            if (result.success && result.user) {
                const sanitizedUser = {
                    ...result.user,
                    email: result.user.email?.toLowerCase().trim(),
                    fullName: result.user.fullName?.trim().replace(/[<>'"]/g, ''),
                };
                await AsyncStorage.setItem('user', JSON.stringify(sanitizedUser));
                console.log('✅ Updated user data in AsyncStorage');
                return sanitizedUser;
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching fresh user data:', error);
            return null;
        }
    }

    static async updateProfile(data: { fullName: string }): Promise<any> {
        try {
            console.log('🔍 Attempting to update profile...');
            
            const sanitizedFullName = sanitizeString(data.fullName);
            
            if (!sanitizedFullName || sanitizedFullName.length < 2) {
                return {
                    success: false,
                    message: "Please enter a valid full name (at least 2 characters)"
                };
            }
            
            if (sanitizedFullName.length > 100) {
                return {
                    success: false,
                    message: "Full name cannot exceed 100 characters"
                };
            }
            
            let accessToken = await this.getAccessToken();
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
                body: JSON.stringify({ fullName: sanitizedFullName })
            });

            const result = await response.json();
            console.log('📥 Update profile response:', result);
            
            if (result.success && result.user) {
                const newAccessToken = result.accessToken || accessToken;
                const refreshToken = await this.getRefreshToken();
                
                await storeUserData(
                    result.user,
                    newAccessToken,
                    refreshToken || undefined
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

    static async changePassword(data: { currentPassword: string; newPassword: string }): Promise<any> {
        try {
            console.log('🔍 Attempting to change password...');
            
            // ✅ UPDATED: Use new password validation
            if (!validatePassword(data.newPassword)) {
                return {
                    success: false,
                    message: "New password must be at least 8 characters with at least one uppercase letter, one lowercase letter, one number, and one special character"
                };
            }
            
            if (data.currentPassword === data.newPassword) {
                return {
                    success: false,
                    message: "New password must be different from current password"
                };
            }
            
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
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword
                })
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

    static async deleteAccount(password: string): Promise<any> {
        try {
            console.log('🔍 Attempting to delete account...');
            
            if (!password || password.length < 1) {
                return {
                    success: false,
                    message: "Password is required to delete account"
                };
            }
            
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
                await AsyncStorage.multiRemove(['user', 'userId']);
                await SecureStore.deleteItemAsync('userAccessToken');
                await SecureStore.deleteItemAsync('userRefreshToken');
                
                if (socketLogoutCallback) {
                    socketLogoutCallback();
                }
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