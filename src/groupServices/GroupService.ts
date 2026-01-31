
const API_URL = "http://10.219.65.2:5000/api/group";



export class GroupService{
         
    static async createGroup(name:string, description?:string){
            try{
                
                if(!name.trim() || !name ){
                    return{
                        success:false,
                        message:"Group name is required"
                    }
                }

                const response = await fetch(`${API_URL}/create`,{
                    method:"POST",
                    headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({name:name.trim(), description:description?.trim() || null}),
                    credentials:'include'
                });


                const result = await response.json();
            console.log(result);
                return result;


            }catch(e:any){
                 return{
                    success:false,
                    message:"Failed to create group"
                 }
            }

    }



}