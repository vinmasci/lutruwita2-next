import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material';

export const Auth0Callback = () => {
    const { isAuthenticated, error, user } = useAuth0();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Initializing...');
    const [initializingUser, setInitializingUser] = useState(false);

    useEffect(() => {
        console.log('[AUTH_CALLBACK] State:', {
            isAuthenticated,
            error: error?.message,
            user,
            currentPath: window.location.pathname
        });

        const initializeUser = async () => {
            if (!user || !user.sub) {
                console.log('[AUTH_CALLBACK] No user or user.sub available yet');
                return;
            }

            try {
                setStatus('Checking user data...');
                setInitializingUser(true);
                
                // Dynamically import to avoid circular dependencies
                const { initializeUserData } = await import('../../services/authCallbackService');
                
                console.log('[AUTH_CALLBACK] Initializing user data for:', user.sub);
                await initializeUserData(user.sub, user);
                
                console.log('[AUTH_CALLBACK] User initialization complete');
                setStatus('User data initialized');
                
                // Redirect to editor page
                navigate('/editor', { replace: true });
            } catch (error) {
                console.error('[AUTH_CALLBACK] Error initializing user:', error);
                setStatus(`Error: ${error.message}`);
                // Still redirect to editor after a delay, even if there was an error
                setTimeout(() => {
                    navigate('/editor', { replace: true });
                }, 3000);
            } finally {
                setInitializingUser(false);
            }
        };

        if (isAuthenticated && user && !initializingUser) {
            console.log('[AUTH_CALLBACK] User authenticated, initializing user data');
            initializeUser();
        } else if (isAuthenticated && !user) {
            console.log('[AUTH_CALLBACK] Authenticated but no user data yet');
            setStatus('Waiting for user data...');
        }
    }, [isAuthenticated, navigate, error, user, initializingUser]);
    if (error) {
        console.error('[AUTH_CALLBACK] Error:', error);
        return (_jsxs("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }, children: [
            _jsx("div", { children: "Authentication error" }), 
            _jsx("div", { children: error.message }), 
            _jsx("button", { onClick: () => navigate('/', { replace: true }), children: "Return to Home" })
        ] }));
    }
    
    return (_jsxs("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }, children: [
        _jsx(CircularProgress, { size: 40 }),
        _jsx("div", { children: status })
    ] }));
};
export default Auth0Callback;
