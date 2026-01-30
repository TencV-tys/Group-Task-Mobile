// src/authHook/useSignupForm.ts
import { useState } from "react";
import { AuthService } from "../authServices/AuthService";

// Define valid gender options
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

interface SignupData {
    fullName: string;
    email: string;
    gender: string;
    password: string;
    confirmPassword: string;
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

    const handleChange = (field: keyof SignupData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }

  // In your useSignupForm.ts, update the handleSubmit function:
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
        const result = await AuthService.signup(formData);
        console.log("AuthService result:", result);

        if (result.success) {
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
        setMessage('');
        setSuccess(false);
    };

    return {
        formData,
        loading,
        message,
        success,
        handleChange,
        handleSubmit,
        resetForm,
        genderOptions: VALID_GENDERS
    };
}