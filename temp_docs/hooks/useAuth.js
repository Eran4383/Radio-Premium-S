import { useState, useEffect } from 'react';
import { onAuthStateChangedListener, signInWithGoogle as signIn, signOutUser as signOut } from '../services/authService';
import { checkAdminRole } from '../services/settingsService';
export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    useEffect(() => {
        const unsubscribe = onAuthStateChangedListener(async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                if (firebaseUser.email) {
                    try {
                        const adminStatus = await checkAdminRole(firebaseUser.email);
                        setIsAdmin(adminStatus);
                    }
                    catch (error) {
                        console.error('Error checking admin role:', error);
                        setIsAdmin(false);
                    }
                }
            }
            else {
                setUser(null);
                setIsAdmin(false);
            }
            setIsAuthReady(true);
        });
        return unsubscribe;
    }, []);
    const signInWithGoogle = async () => {
        try {
            await signIn();
        }
        catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    };
    const signOutUser = async () => {
        try {
            await signOut();
        }
        catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };
    return {
        user,
        isAdmin,
        isAuthReady,
        handleLogin: signInWithGoogle,
        handleLogout: signOutUser,
        setIsAdmin
    };
};
