// src/authHook/useSignupForm.ts - UPDATED for Cloudinary

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
    avatarUrl?: string; // ✅ Change to avatarUrl
}

interface SignupResult {
  success: boolean;
  message?: string;
  user?: any;
}

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
    const [avatarCloudinaryUrl, setAvatarCloudinaryUrl] = useState<string | null>(null); // ✅ Store Cloudinary URL
    const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

    const handleChange = (field: keyof SignupData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }

    // ✅ UPDATED: Upload to Cloudinary immediately when user selects image
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
        console.log("Signup attempt with data:", formData);
        
        // Validation
        if (!formData.fullName.trim() || !formData.email.trim() || 
            !formData.gender.trim() || !formData.password || !formData.confirmPassword) {
            setMessage('❌ All fields are required');
            return { success: false, message: 'All fields are required' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setMessage('❌ Please enter a valid email address');
            return { success: false, message: 'Please enter a valid email address' };
        }

        if (formData.password !== formData.confirmPassword) {
            setMessage('❌ Passwords do not match');
            return { success: false, message: 'Passwords do not match' };
        }

        if (formData.password.length < 6) {
            setMessage('❌ Password must be at least 6 characters');
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        if (!VALID_GENDERS.includes(formData.gender.toUpperCase())) {
            setMessage(`❌ Gender must be one of: ${VALID_GENDERS.join(', ')}`);
            return { success: false, message: `Gender must be one of: ${VALID_GENDERS.join(', ')}` };
        }

        setLoading(true);
        setMessage('');

        try {
            console.log("Calling AuthService.signup...");
            
            // ✅ Prepare data with Cloudinary URL if available
            const signupData = {
                fullName: formData.fullName,
                email: formData.email,
                gender: formData.gender,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                avatarUrl: avatarCloudinaryUrl || undefined, // ✅ Send Cloudinary URL
            };

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
                setMessage(`❌ ${result.message || 'Signup failed'}`);
                return {
                    success: false,
                    message: result.message
                };
            }

        } catch (e: any) {
            console.error("Signup error:", e);
            setSuccess(false);
            setMessage(`❌ ${e.message || 'Network error'}`);
            return {
                success: false,
                message: e.message
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
        avatarCloudinaryUrl, // ✅ Add this
        uploadingAvatar,
        handleChange,
        handleAvatarSelect,
        handleAvatarRemove,
        handleSubmit,
        resetForm,
        genderOptions: VALID_GENDERS
    };
}