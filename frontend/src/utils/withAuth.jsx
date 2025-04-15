import { useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom"

const withAuth = (WrappedComponent ) => {
    const AuthComponent = (props) => {
        
        const location = useLocation();

        let token = localStorage.getItem("token")

        if(!token){
            return  <Navigate to="/auth" state={{ from: location }} replace />;
        }

        

        return <WrappedComponent {...props} />
    }

    return AuthComponent;
}

export default withAuth;