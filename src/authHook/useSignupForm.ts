import { useState } from "react";
import { AuthService } from "../authServices/AuthService";

// Define valid gender options to match your backend Gender enum
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

interface SignupData {
    fullName: string;
    email: string;
    gender: string;  // This will be string from the form
    password: string;
    confirmPassword: string;
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

    const handleSubmit = async () => {
        // Validation before API call
        if (!formData.fullName.trim() || !formData.email.trim() || 
            !formData.gender.trim() || !formData.password || !formData.confirmPassword) {
            setMessage('❌ All fields are required');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setMessage('❌ Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setMessage('❌ Password must be at least 6 characters');
            return;
        }

        // Validate gender is one of the allowed values
        if (!VALID_GENDERS.includes(formData.gender.toUpperCase())) {
            setMessage(`❌ Gender must be one of: ${VALID_GENDERS.join(', ')}`);
            return;
        }

        setLoading(true);
        setMessage('');

        try {
          
            const result = await AuthService.signup(formData);

            if (result.success) {
                setSuccess(true);
                setMessage(`✅ ${result.message || 'Signup successful!'}`);
                console.log('Signup successful:', result.user);
                
                // Auto-reset form after successful signup
                setTimeout(() => {
                    resetForm();
                }, 3000);
            } else {
                setSuccess(false);
                setMessage(`❌ ${result.message || 'Signup failed'}`);
            }

        } catch (e: any) {
            setSuccess(false);
            setMessage(`❌ ${e.message || 'Network error'}`);
            console.error('Signup error:', e);
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
        // Optional: Helper for gender options
        genderOptions: VALID_GENDERS
    };
}