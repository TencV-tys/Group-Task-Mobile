
import { useState } from "react";
import { AuthService } from "../authServices/AuthService";

interface SignupData{
    fullName:string;
    email:string;
    gender:string;
    password:string;
    confirmPassword:string;
}

export function useSignupForm(){
      const [formData , setFormData] = useState<SignupData>({
        fullName:"",
        email:'',
        gender:'',
        password:"",
        confirmPassword:""
      });

    const [ loading , setLoading ] = useState<boolean>(false);
    const [ message, setMessage ] = useState<string>('');

   const handleChange = (fields:keyof SignupData , value:string)=>{
    setFormData(prev=>({
      ...prev,
      [fields]:value
    }));

   }
      
    const handleSubmit = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Simple validation
      if (formData.password !== formData.confirmPassword) {
        setMessage('❌ Passwords do not match');
        setLoading(false);
        return;
      }

   
      const result = await AuthService.signup(formData);
      
      if (!result.success) {
        setMessage(`❌ ${result.message}`);
      } else {
        setMessage(`✅ ${result.message}`);
        console.log('Signup successful:', result.user);
        
        // Could auto-login or navigate to login
        // navigation.navigate('Login');
      }
      
    } catch (e: any) {
      setMessage(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      fullName: '', 
      email: '', 
      password: '',
      gender:'', 
      confirmPassword: '' 
    });
    setMessage('');
  };

  return {
    formData,
    loading,
    message,
    handleChange,
    handleSubmit,
    resetForm
  };
  

}