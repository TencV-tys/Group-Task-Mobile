// src/authHook/useLoginForm.ts
import {useState} from 'react';
import { AuthService } from '../services/AuthService';

interface LoginData{
  email:string;
  password:string;
}

// Define return type for handleSubmit
interface LoginResult {
  success: boolean;
  message?: string;
  user?: any;
}

export function useLoginForm(){
    const [formData , setFormData] = useState<LoginData>({
        email:'',
        password:''
    });
    
    const [loading , setLoading] = useState<boolean>(false);
    const [message , setMessage] = useState<string>('');
    const [success, setSuccess] = useState<boolean>(false);

    const handleChange = (name: keyof LoginData , value:string)=>{
          setFormData(prev=>({
            ...prev,
            [name]:value
          }));
    }

    const handleSubmit = async (): Promise<LoginResult> => { // Add return type
            setLoading(true);
            setMessage('');

            try{
                const result = await AuthService.login(formData);
                
                if(result.success){
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
                    return {
                        success: false,
                        message: result.message
                    };
                }

            }catch(e:any){
                setSuccess(false);
                setMessage(`❌ ${e.message || 'Network error'}`);
                return {
                    success: false,
                    message: e.message
                };
            }finally{
                setLoading(false);
            }
    }
        
    const resetForm = () => {
        setFormData({ email: '', password: '' });
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
        resetForm
    };
}