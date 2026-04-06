import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { auth } from './firebaseConfig';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, provider);

export const signOutUser = () => signOut(auth);

export const onAuthStateChangedListener = (callback: (user: User | null) => void) => 
  onAuthStateChanged(auth, callback);
