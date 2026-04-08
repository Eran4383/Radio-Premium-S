import { useState, useEffect } from 'react';
import { User } from '../types/user';
import { 
  onAuthStateChangedListener, 
  signInWithGoogle as signIn, 
  signOutUser as signOut 
} from '../services/authService';
import { checkAdminRole } from '../services/settingsService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        if (firebaseUser.email) {
          try {
            const adminStatus = await checkAdminRole(firebaseUser.email);
            const isDev = import.meta.env.MODE === 'development';
            console.log('DEBUG: adminStatus:', adminStatus, 'MODE:', import.meta.env.MODE, 'isDev:', isDev);
            setIsAdmin(adminStatus || isDev);
          } catch (error) {
            console.error('Error checking admin role:', error);
            setIsAdmin(import.meta.env.MODE === 'development');
          }
        } else {
          setIsAdmin(import.meta.env.MODE === 'development');
        }
      } else {
        setUser(null);
        setIsAdmin(import.meta.env.MODE === 'development');
      }
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut();
    } catch (error) {
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
