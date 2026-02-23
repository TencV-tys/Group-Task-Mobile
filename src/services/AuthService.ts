// src/authServices/AuthService.ts - UPDATED with consistent storage

import {API_BASE_URL} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = `${API_BASE_URL}/api/auth/users`;

// Helper function to store user data
const storeUserData = async (userData: any) => {
    try {
        // Store in multiple formats for compatibility
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('user', JSON.stringify(userData)); // ADD THIS for compatibility
        
        // Also store individual fields if needed elsewhere
        const userId = userData._id || userData.id;
        if (userId) {
            await AsyncStorage.setItem('userId', userId);
        }
        if (userData.token) {
            await AsyncStorage.setItem('userToken', userData.token);
        }
        
        console.log('✅ User data stored successfully');
    } catch (error) {
        console.error('Error storing user data:', error);
    }
};

export class AuthService {
 static async login(data: {email: string, password: string}) {
    try {
        if (!data.email || !data.password) {
            return {
                success: false,
                message: "Please fill all required fields"
            };
        }

        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {'Content-Type': "application/json"},
            body: JSON.stringify(data),
            credentials: 'include'
        });

        const result = await response.json();
        
        // 🔍 DEBUG: Log the FULL result to see what the backend returns
        console.log("🔍 FULL LOGIN RESPONSE:", JSON.stringify(result, null, 2));
        
        // Store user data if login is successful
        if (result.success && result.user) {
            // Store user data
            await storeUserData(result.user);
            
            // 🔍 Check if token exists in the response
            console.log("🔍 Token in response:", result.token ? "YES" : "NO");
            
            // STORE THE TOKEN - but where is it?
            if (result.token) {
                await AsyncStorage.setItem('userToken', result.token);
                console.log('🔐 Token stored successfully');
            } else if (result.accessToken) {
                await AsyncStorage.setItem('userToken', result.accessToken);
                console.log('🔐 Access token stored successfully');
            } else if (result.data?.token) {
                await AsyncStorage.setItem('userToken', result.data.token);
                console.log('🔐 Data.token stored successfully');
            } else {
                console.log('⚠️ No token found in response!');
            }
            
            console.log('🔐 Login successful, user stored:', result.user.id || result.user._id);
        }

        return result;

    } catch (e: any) {
        console.error("Error login response: ", e);
        return {
            success: false,
            message: "Cannot connect to the server"
        };
    }
}
    static async signup(data: {fullName: string, email: string, password: string, confirmPassword: string, gender: string, avatarBase64?: string}) {
        try {
            if (!data.email || !data.fullName || !data.password || !data.confirmPassword || !data.gender) {
                return {
                    success: false,
                    message: "All fields are required"
                };
            }

            if (data.password !== data.confirmPassword) {
                return {
                    success: false,
                    message: "Please match your password"
                };
            }

            const response = await fetch(`${API_URL}/signup`, {
                method: "POST",
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
                credentials: 'include'
            });

            const result = await response.json();
            
            // Store user data if signup is successful
            if (result.success && result.user) {
                await storeUserData(result.user);
                console.log('🔐 Signup successful, user stored:', result.user.id || result.user._id);
            }

            return result;

        } catch (e: any) {
            console.error("Error sign up response: ", e);
            return {
                success: false,
                message: "Cannot connect to the server"
            };
        }
    }

    static async logout() {
        try {
            // Clear local storage first
            await AsyncStorage.multiRemove([
                'userData',
                'user', // ADD THIS
                'userId',
                'userToken',
                'userRefreshToken'
            ]);

            // Then call backend logout
            const response = await fetch(`${API_URL}/logout`, {
                method: "POST",
                credentials: 'include'
            });

            if (response.ok) {
                return {
                    success: true,
                    message: "Logged out successfully"
                };
            }

            const result = await response.json();
            return {
                success: false,
                message: result.message || 'Logout Failed'
            };

        } catch (e: any) {
            // Even if network fails, we still cleared local storage
            return {
                success: false,
                message: "Cannot connect to the server"
            };
        }
    }

    // Get current user from either storage location
    static async getCurrentUser() {
        try {
            // Try userData first, then user as fallback
            let userData = await AsyncStorage.getItem('userData');
            if (!userData) {
                userData = await AsyncStorage.getItem('user');
            }
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    // Get user ID specifically
    static async getUserId() {
        try {
            // Try direct userId first
            let userId = await AsyncStorage.getItem('userId');
            if (userId) return userId;
            
            // Then try from userData
            const userData = await this.getCurrentUser();
            return userData?.id || userData?._id || null;
        } catch (error) {
            console.error('Error getting user ID:', error);
            return null;
        }
    }
}