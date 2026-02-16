// src/authServices/AuthService.ts
import {API_BASE_URL} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = `${API_BASE_URL}/api/auth/users`;

// Helper function to store user data
const storeUserData = async (userData: any) => {
    try {
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        // Also store individual fields if needed elsewhere
        if (userData._id || userData.id) {
            await AsyncStorage.setItem('userId', userData._id || userData.id);
        }
        if (userData.token) {
            await AsyncStorage.setItem('userToken', userData.token);
        }
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
            
            // Store user data if login is successful
            if (result.success && result.user) {
                await storeUserData(result.user);
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
                    success: true,  // Changed from false to true
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

    // Add this helper method to get current user
    static async getCurrentUser() {
        try {
            const userData = await AsyncStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }
}