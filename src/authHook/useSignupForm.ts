// src/authHook/useSignupForm.ts - FULLY UPDATED

import { useState } from "react";
import { Alert } from "react-native";
import { AuthService } from "../services/AuthService";
import { UploadResponse, UploadService } from "../uploadService/UploadService";

const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

interface SignupData {
    fullName: string;
    email: string;
    gender: string;
    password: string;
    confirmPassword: string;
    avatarUrl?: string;
}

interface SignupResult {
  success: boolean;
  message?: string;
  user?: any;
}

// ✅ Password strength validation (matching backend requirements)
const validatePasswordStrength = (password: string): { isValid: boolean; message?: string } => {
  if (!password) {
    return { isValid: false, message: "Password is required" };
  }
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters" };
  }
  if (password.length > 128) {
    return { isValid: false, message: "Password is too long (max 128 characters)" };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter (A-Z)" };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter (a-z)" };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number (0-9)" };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one special character (!@#$%^&* etc.)" };
  }
  return { isValid: true };
};

export function useSignupForm() {
    const [formData, setFormData] = useState<SignupData>({
        fullName: "",
        email: '',
        gender: '',
        password: "",
        confirmPassword: ""
    });

    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [success, setSuccess] = useState<boolean>(false);
    const [avatarImage, setAvatarImage] = useState<string | null>(null);
    const [avatarCloudinaryUrl, setAvatarCloudinaryUrl] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

    const handleChange = (field: keyof SignupData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }

    // ✅ Upload to Cloudinary immediately when user selects image
    const handleAvatarSelect = async (imageUri: string) => {
        setAvatarImage(imageUri);
        setUploadingAvatar(true);
        
        try { 
            console.log('📤 Uploading avatar to Cloudinary...');
            const result = await UploadService.uploadAvatarCloudinary(imageUri);
            const upload = result as UploadResponse;
            if (upload.success && upload.data?.avatarUrl) {
                console.log('✅ Avatar uploaded to Cloudinary:', upload.data.avatarUrl);
                setAvatarCloudinaryUrl(upload.data.avatarUrl);
                setFormData(prev => ({
                    ...prev,
                    avatarUrl: upload.data?.avatarUrl
                }));
            } else {
                console.error('❌ Cloudinary upload failed:', result.message);
                Alert.alert('Warning', 'Could not upload profile picture. You can add it later.');
            }
        } catch (error: any) {
            console.error('❌ Avatar upload error:', error);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleAvatarRemove = () => {
        setAvatarImage(null);
        setAvatarCloudinaryUrl(null);
        setFormData(prev => ({
            ...prev,
            avatarUrl: undefined
        }));
    };

    const handleSubmit = async (): Promise<SignupResult> => {
        console.log("Signup attempt with data:", { ...formData, password: '***', confirmPassword: '***' });
        
        // ===== VALIDATION =====
        
        // Check required fields
        if (!formData.fullName.trim() || !formData.email.trim() || 
            !formData.gender.trim() || !formData.password || !formData.confirmPassword) {
            const msg = 'All fields are required';
            setMessage(`❌ ${msg}`);
            return { success: false, message: msg };
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            const msg = 'Please enter a valid email address';
            setMessage(`❌ ${msg}`);
            return { success: false, message: msg };
        }

        // Password match validation
        if (formData.password !== formData.confirmPassword) {
            const msg = 'Passwords do not match';
            setMessage(`❌ ${msg}`);
            return { success: false, message: msg };
        }

        // ✅ Password strength validation (8 chars, uppercase, lowercase, number, special)
        const passwordValidation = validatePasswordStrength(formData.password);
        if (!passwordValidation.isValid) {
            setMessage(`❌ ${passwordValidation.message}`);
            return { success: false, message: passwordValidation.message };
        }

        // Gender validation
        if (!VALID_GENDERS.includes(formData.gender.toUpperCase())) {
            const msg = `Gender must be one of: ${VALID_GENDERS.join(', ')}`;
            setMessage(`❌ ${msg}`);
            return { success: false, message: msg };
        }

        setLoading(true);
        setMessage('');

        try {
            console.log("Calling AuthService.signup...");
            
            // ✅ Prepare data with Cloudinary URL if available
            const signupData = {
                fullName: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                gender: formData.gender.toUpperCase(),
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                avatarUrl: avatarCloudinaryUrl || undefined,
            };

            console.log("📤 Sending signup data:", { 
                ...signupData, 
                password: '***', 
                confirmPassword: '***' 
            });

            const result = await AuthService.signup(signupData);
            console.log("AuthService result:", result);

            if (result.success && result.user) {
                setSuccess(true);
                setMessage(`✅ ${result.message || 'Signup successful!'}`);
                return {
                    success: true,
                    message: result.message,
                    user: result.user
                };
            } else {
                setSuccess(false);
                const errorMsg = result.message || 'Signup failed';
                setMessage(`❌ ${errorMsg}`);
                return {
                    success: false,
                    message: errorMsg
                };
            }

        } catch (e: any) {
            console.error("Signup error:", e);
            const errorMsg = e.message || 'Network error';
            setSuccess(false);
            setMessage(`❌ ${errorMsg}`);
            return {
                success: false,
                message: errorMsg
            };
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            fullName: '',
            email: '',
            gender: '',
            password: '',
            confirmPassword: ''
        });
        setAvatarImage(null);
        setAvatarCloudinaryUrl(null);
        setMessage('');
        setSuccess(false);
    };

    return {
        formData,
        loading,
        message,
        success,
        avatarImage,
        avatarCloudinaryUrl,
        uploadingAvatar,
        handleChange,
        handleAvatarSelect,
        handleAvatarRemove,
        handleSubmit,
        resetForm,
        genderOptions: VALID_GENDERS
    };
}