// src/authHook/useSignupForm.ts
import { useState } from "react";
import { AuthService } from "../authServices/AuthService";
import { UploadService } from "../uploadService/UploadService"; // Add this import

// Define valid gender options
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

interface SignupData {
    fullName: string;
    email: string;
    gender: string;
    password: string;
    confirmPassword: string;
    avatarBase64?: string; // Add this for optional avatar
}

// Define return type
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
    const [avatarImage, setAvatarImage] = useState<string | null>(null); // For storing selected image
    const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);

    const handleChange = (field: keyof SignupData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }

    // Function to handle avatar selection
    const handleAvatarSelect = (base64Image: string) => {
        setAvatarImage(base64Image);
        // Store in form data as base64
        setFormData(prev => ({
            ...prev,
            avatarBase64: base64Image
        }));
    };

    // Function to remove avatar
    const handleAvatarRemove = () => {
        setAvatarImage(null);
        setFormData(prev => ({
            ...prev,
            avatarBase64: undefined
        }));
    };

    const handleSubmit = async (): Promise<SignupResult> => {
        console.log("Signup attempt with data:", formData);
        
        // Validation before API call
        if (!formData.fullName.trim() || !formData.email.trim() || 
            !formData.gender.trim() || !formData.password || !formData.confirmPassword) {
            console.log("Validation failed: Missing fields");
            setMessage('❌ All fields are required');
            return { success: false, message: 'All fields are required' };
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            console.log("Validation failed: Invalid email");
            setMessage('❌ Please enter a valid email address');
            return { success: false, message: 'Please enter a valid email address' };
        }

        if (formData.password !== formData.confirmPassword) {
            console.log("Validation failed: Passwords don't match");
            setMessage('❌ Passwords do not match');
            return { success: false, message: 'Passwords do not match' };
        }

        if (formData.password.length < 6) {
            console.log("Validation failed: Password too short");
            setMessage('❌ Password must be at least 6 characters');
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        // Validate gender is one of the allowed values
        if (!VALID_GENDERS.includes(formData.gender.toUpperCase())) {
            console.log("Validation failed: Invalid gender", formData.gender);
            setMessage(`❌ Gender must be one of: ${VALID_GENDERS.join(', ')}`);
            return { 
                success: false, 
                message: `Gender must be one of: ${VALID_GENDERS.join(', ')}` 
            };
        }

        setLoading(true);
        setMessage('');

        try {
            console.log("Calling AuthService.signup...");
            
            // Prepare data for signup (without avatarBase64)
            const signupData = {
                fullName: formData.fullName,
                email: formData.email,
                gender: formData.gender,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                // Don't send avatarBase64 here - we'll upload it after signup
            };

            // First, create the user account
            const result = await AuthService.signup(signupData);
            console.log("AuthService result:", result);

            if (result.success && result.user) {
                // If user uploaded an avatar, upload it now
                if (avatarImage && formData.avatarBase64) {
                    try {
                        setUploadingAvatar(true);
                        setMessage('📤 Uploading your profile picture...');
                        
                        const uploadResult = await UploadService.uploadAvatarBase64(formData.avatarBase64);
                        
                        if (uploadResult.success) {
                            console.log('✅ Avatar uploaded during signup');
                            // Update the user data with new avatar URL
                            result.user.avatarUrl = uploadResult.data?.avatarUrl;
                        } else {
                            console.log('⚠️ Avatar upload failed, but signup succeeded');
                        }
                    } catch (uploadError) {
                        console.log('⚠️ Avatar upload error, but signup succeeded:', uploadError);
                    } finally {
                        setUploadingAvatar(false);
                    }
                }

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
        setMessage('');
        setSuccess(false);
    };

    return {
        formData,
        loading,
        message,
        success,
        avatarImage,
        uploadingAvatar,
        handleChange,
        handleAvatarSelect,
        handleAvatarRemove,
        handleSubmit,
        resetForm,
        genderOptions: VALID_GENDERS
    };
}