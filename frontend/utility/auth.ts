import { signinUserType, signupUserType } from "@/interfaces/auth";
import axios from "axios";

 const httpUrl = process.env.NEXT_PUBLIC_HTTP_URL;

export const signinUser = async ({ email, password }: signinUserType): Promise<number> => {
    try {
      const response = await axios.post(`${httpUrl}/signin`, { email, password });
  
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        console.log("Token saved:", response.data.token);
      }
      const status:number = response.status;
      return status;
    } catch (error:any) {
      console.error("Signin error:", error);
      const errorStatus:number=error.response.status;
      return errorStatus;
    }
  };
  export const signupUser = async ({ username, email, password }: signupUserType): Promise<number> => {
    try {
      const response = await axios.post(`${httpUrl}/signup`, { username, email, password });
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        console.log("Token saved:", response.data.token);
      }
  
      return response.status;
    } catch (error:any) {
      console.error(error);
      return error.response.status;
    }
  };