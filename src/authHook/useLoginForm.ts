import {useState} from 'react';
import { AuthService } from '../authServices/AuthService';

interface LoginData{
  email:string;
  password:string;
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

    const handleSubmit = async()=>{
        // Validate form
        if(!formData.email.trim() || !formData.password.trim()){
            setMessage('Please fill in all fields');
            return;
        }
        
        setLoading(true);
        setMessage('');

        try{
            const result = await AuthService.login(formData);
            
            // CORRECTED: Check for success properly
            if(result.success){
                setSuccess(true);
                setMessage(`✅ ${result.message || 'Login successful!'}`);
                
                // You might want to store the token/user data here
                if(result.user){
                    // Store user data in context/async storage
                    console.log('Logged in user:', result.user);
                }
                
                // Reset form on success
                setTimeout(() => {
                    resetForm();
                }, 2000);
                
            } else {
                setSuccess(false);
                setMessage(`❌ ${result.message || 'Login failed'}`);
            }

        }catch(e:any){
            setSuccess(false);
            setMessage(`❌ ${e.message || 'Network error'}`);
            console.error('Login error:', e);
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