// src/authHook/useLoginForm.ts
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
  field?: 'email' | 'password';  // ← ADD THIS
}

export function useLoginForm() {
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: ''
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [errorField, setErrorField] = useState<'email' | 'password' | null>(null);  // ← ADD THIS

  const handleChange = (name: keyof LoginData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear field-specific error when user types
    if (errorField === name) {
      setErrorField(null);
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
        return {
          success: true,
          message: result.message,
          user: result.user
        };
      } else {
        setSuccess(false);
        setMessage(`❌ ${result.message || 'Login failed'}`);
        
        // ✅ Capture which field caused the error
        if ((result as any).field === 'email') {
          setErrorField('email');
        } else if ((result as any).field === 'password') {
          setErrorField('password');
        }
        
        return {
          success: false,
          message: result.message,
          field: (result as any).field  // ← ADD THIS
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
  };

  return {
    formData,
    loading,
    message,
    success,
    errorField,  // ← ADD THIS
    handleChange,
    handleSubmit,
    resetForm
  };
}