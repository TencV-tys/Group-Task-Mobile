// src/hooks/useCreateGroup.ts - UPDATED with TokenUtils
import { useState, useCallback } from "react";
import { GroupService } from "../services/GroupService";
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

export function useCreateGroup() {
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>(''); 
    const [success, setSuccess] = useState<boolean>(false);
    const [authError, setAuthError] = useState<boolean>(false);

    // ✅ UPDATED: Use TokenUtils.checkToken()
    const checkToken = useCallback(async (): Promise<boolean> => {
        const hasToken = await TokenUtils.checkToken({
            showAlert: false,
            onAuthError: () => {
                setAuthError(true);
                setMessage('❌ Please log in again');
            }
        });
        
        setAuthError(!hasToken);
        return hasToken;
    }, []);

    const createGroup = async (name: string, description?: string) => {
        setLoading(true);
        setMessage('');
        setSuccess(false);
        setAuthError(false);

        try {
            // Check token first
            const hasToken = await checkToken();
            if (!hasToken) {
                setLoading(false);
                return {
                    success: false,
                    message: 'Authentication required',
                    authError: true
                };
            }

            // Validate input
            if (!name || !name.trim()) {
                throw new Error('Group name is required');
            }

            console.log(`📥 useCreateGroup: Creating group "${name}"`);
            const result = await GroupService.createGroup(name, description);

            if (result.success) {
                setSuccess(true);
                setMessage(result.message || "✅ Group created successfully");
                console.log('✅ useCreateGroup: Group created successfully');
                return {
                    success: true,
                    message: result.message,
                    group: result.group,
                    inviteCode: result.inviteCode
                };
            } else {
                setSuccess(false);
                setMessage(`❌ ${result.message || 'Failed to create group'}`);
                
                // Check if error is auth-related
                if (result.message?.toLowerCase().includes('token') || 
                    result.message?.toLowerCase().includes('auth') ||
                    result.message?.toLowerCase().includes('unauthorized')) {
                    setAuthError(true);
                }
                
                return {
                    success: false,
                    message: result.message,
                    authError: result.message?.toLowerCase().includes('token') || 
                              result.message?.toLowerCase().includes('auth')
                };
            }

        } catch (error: any) {
            console.error("❌ useCreateGroup: Error:", error);
            
            let errorMessage = error.message || 'Network error';
            
            // User-friendly error messages
            if (errorMessage.includes('Network')) {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            setSuccess(false);
            setMessage(`❌ ${errorMessage}`);
            
            return {
                success: false,
                message: errorMessage,
                authError: false
            };

        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setLoading(false);
        setMessage('');
        setSuccess(false);
        setAuthError(false);
    };

    return {
        loading,
        message,
        success,
        authError,
        createGroup,
        reset
    };
}