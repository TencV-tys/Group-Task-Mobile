

import { useState } from "react";
import { GroupService } from "../services/GroupService";

export function useCreateGroup(){
    const [loading, setLoading]  = useState<boolean>(false);
    const [message, setMessage ] = useState<string>('');
    const [success, setSuccess ] = useState<boolean>(false);
    
    const createGroup = async(name:string, description?:string)=>{
           setLoading(true);
           setMessage('');
           setSuccess(false);

           try{
            const result = await GroupService.createGroup(name,description);

            if(result.success){
                setSuccess(true);
                setMessage(result.message || "Group created successfully" );
                return{
                    success:true,
                    message:result.message,
                    group:result.group,
                    inviteCode:result.inviteCode
                }

            }else{
                   setSuccess(false);
        setMessage(`❌ ${result.message || 'Failed to create group'}`);
        return {
          success: false,
          message: result.message
        };
            }

           }catch(error:any){
 console.error("useCreateGroup: Error:", error);
      setSuccess(false);
      setMessage(`❌ ${error.message || 'Network error'}`);
      return {
        success: false,
        message: error.message || 'Network error'
      };

           }finally{
            setLoading(false);
           }
 

    };

    const reset = () =>{
        setLoading(false);
        setMessage('');
        setSuccess(false);
    }

    return{
        loading,
        message,
        success,
        createGroup,
        reset
    }

}