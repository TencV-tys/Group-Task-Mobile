
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

    const handleChange = (name: keyof LoginData , value:string)=>{
          setFormData(prev=>({
            ...prev,
            [name]:value
          }));
    }

    const handleSubmit = async()=>{
            setLoading(true);
            setMessage('');

            try{
                const result = await AuthService.login(formData);
                
                if(!result.message){
                    setMessage(result.message);
                }else{
                    setMessage(result.message)
                }

            }catch(e:any){
           setMessage(`❌ ${e.message}`);
            }finally{
                setLoading(false);
            }

    }
        
      const resetForm = () => {
    setFormData({ email: '', password: '' });
    setMessage('');
  };

  return{
    formData,
    loading,
    message,
    handleChange,
    handleSubmit,
    resetForm
  }

}