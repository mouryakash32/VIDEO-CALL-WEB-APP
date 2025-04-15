import axios from "axios";
import { createContext, useContext, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import httpStatus from "http-status"
import server from "../enviroment.js";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
})

export const AuthProvider = ({ children }) => {
    const authContext = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    const [userData, setUserData] = useState(authContext);

    const handleRegister = async (name, username, password) => {
        try {
            let request = await client.post("/register", {
                name: name,
                username: username,
                password: password
            })

            if (request.status === httpStatus.CREATED) {
                console.log(request.data.message);
                return request.data.message;
            }
        }
        catch (error) {
            console.error("Registration error:", error);
            throw error;
        }
    }

    const handleLogin = async (username, password) => {
        try {
            
            const from = location.state?.from?.pathname || '/home';
            let request = await client.post("/login", {
                username: username,
                password: password
            });
            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);//"token" it is key and request.data.token is body, request.data.token has the access of the data sent from the response;
                navigate(from, {replace: true})
            }
        }
        catch (err) {
            throw err;
        }
    }

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                params: {
                    token: localStorage.getItem("token")
                }
            });
            return request.data
        }
        catch (err) {
            throw err;
        }
    }

    const addToUserHistory = async (meetingCode) => {
        try {
            let request = await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request
        } catch (e) {
            throw e;
        }
    }


    const data = {
        userData, setUserData, addToUserHistory, getHistoryOfUser, handleRegister, handleLogin
    }
    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )
}