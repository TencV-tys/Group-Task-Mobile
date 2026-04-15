// src/authHook/useLoginForm.ts - UPDATED with remainingAttempts

import { useState } from 'react';
import { AuthService } from '../services/AuthService';

interface LoginData {
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  message?: string;
  user?: any;
  field?: 'email' | 'password';
  isLocked?: boolean;
  remainingAttempts?: number;
  lockoutMinutes?: number;
}

export function useLoginForm() {
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: ''
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [errorField, setErrorField] = useState<'email' | 'password' | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);  // ✅ ADD THIS
  const [isLocked, setIsLocked] = useState<boolean>(false);  // ✅ ADD THIS

  const handleChange = (name: keyof LoginData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errorField === name) {
      setErrorField(null);
    }
    // ✅ Clear remaining attempts when user starts typing
    if (remainingAttempts !== null) {
      setRemainingAttempts(null);
      setIsLocked(false);
    }
  }

  const handleSubmit = async (): Promise<LoginResult> => {
    setLoading(true);
    setMessage('');
    setErrorField(null);

    try {
      const result = await AuthService.login(formData);
      
      if (result.success) {
        setSuccess(true);
        setMessage(`✅ ${result.message || 'Login successful!'}`);
        setRemainingAttempts(null);
        setIsLocked(false);
        return {
          success: true,
          message: result.message,
          user: result.user
        };
      } else {
        setSuccess(false);
        setMessage(`❌ ${result.message || 'Login failed'}`);
        
        // ✅ Capture field-specific error
        if ((result as any).field === 'email') {
          setErrorField('email');
        } else if ((result as any).field === 'password') {
          setErrorField('password');
        }
        
        // ✅ Capture remaining attempts
        if ((result as any).remainingAttempts !== undefined) {
          setRemainingAttempts((result as any).remainingAttempts);
        }
        
        // ✅ Capture lockout
        if ((result as any).isLocked) {
          setIsLocked(true);
          setRemainingAttempts(0);
        }
        
        return {
          success: false,
          message: result.message,
          field: (result as any).field,
          remainingAttempts: (result as any).remainingAttempts,
          isLocked: (result as any).isLocked,
          lockoutMinutes: (result as any).lockoutMinutes
        };
      }

    } catch (e: any) {
      setSuccess(false);
      setMessage(`❌ ${e.message || 'Network error'}`);
      return {
        success: false,
        message: e.message
      };
    } finally {
      setLoading(false);
    }
  }
    
  const resetForm = () => {
    setFormData({ email: '', password: '' });
    setMessage('');
    setSuccess(false);
    setErrorField(null);
    setRemainingAttempts(null);
    setIsLocked(false);
  };

  return {
    formData,
    loading,
    message,
    success,
    errorField,
    remainingAttempts,  // ✅ ADD THIS
    isLocked,           // ✅ ADD THIS
    handleChange,
    handleSubmit,
    resetForm
  };
}