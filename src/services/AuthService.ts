// src/authServices/AuthService.ts - UPDATED with SecureStore
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
}