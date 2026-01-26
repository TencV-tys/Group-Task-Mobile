

const API_URL = 'http://10.219.65.2:5000/api/auth/users';

export class AuthService{

      static async login(data:{email:string,password:string}){
             try{
                
                 if(!data.email || !data.password){
                    return {
                        success:false,
                        message:"please fill all required fields"
                    }
                 } 

                 const response = await fetch(`${API_URL}/login`,{
                    method:"POST",
                    headers:{'Content-Type':"application/json"},
                    body:JSON.stringify(data),
                    credentials:'include'
                 });

                 const result = await response.json();

                 return result;

             }catch(e:any){
                   console.error("Error login response: ", e);
                
                   return{
                    success:false,
                    message:"Cannot connect to the server"
                   }
             }
        
      }  
    
      static async signup(data:{fullName:string,email:string,password:string, confirmPassword:string ,gender:string,avatarUrl?:string}){
           try{ 
             if(!data.email || !data.fullName || !data.password || !data.confirmPassword || !data.gender){
                return {
                    success:false,
                    message:"All fields are required"
                }
             }
            
             if(data.password !== data.confirmPassword){
                return{
                    success:false,
                    message:"Please match your password"
                }
             }

             const response = await fetch(`${API_URL}/signup`,{
                method:"POST",
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(data),
                credentials:'include'
             });

             const result = await response.json();

             return result;

           }catch(e:any){
               
            console.error("Error sign up response: ",e);
            return{
                success:false,
                message:"Cannot connect to the server"
            }
                

           }      

      }


        static async logout(){
             try{
                
                const response = await fetch(`${API_URL}/logout`,{
                    method:"POST",
                    credentials:'include'
                });
                
                if(response.ok){
                    return{
                        success:false,
                        message:"Logged out successfully"
                    }
                }
                  
                const result = await response.json();
                   
                return {
                    success:false,
                    message:result.message || 'Logout Failed'
                }

             }catch(e:any){
                 return{
                    success:false,
                    message:"Cannot connect to the server"
                 }

             }

        }


}