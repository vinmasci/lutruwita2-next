import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
export const Auth0Callback = () => {
    const { isAuthenticated, error, user } = useAuth0();
    const navigate = useNavigate();
    useEffect(() => {
        console.log('Auth0Callback State:', {
            isAuthenticated,
            error: error?.message,
            user,
            currentPath: window.location.pathname
        });
        if (isAuthenticated) {
            navigate('/editor', { replace: true }); // Redirect to editor page
        }
    }, [isAuthenticated, navigate, error, user]);
    if (error) {
        console.error('Auth0Callback Error:', error);
        return (_jsxs("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }, children: [_jsx("div", { children: "Authentication error" }), _jsx("div", { children: error.message }), _jsx("button", { onClick: () => navigate('/', { replace: true }), children: "Return to Home" })] }));
    }
    return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }, children: _jsx("div", { children: "Processing authentication..." }) }));
};
export default Auth0Callback;
