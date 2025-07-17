import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User as AppUser } from '@/types';

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<AppUser | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Create or update user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    const userData: AppUser = {
      uid: user.uid,
      name: user.displayName || '',
      email: user.email || '',
      createdAt: userDoc.exists() ? userDoc.data().createdAt : new Date().toISOString(),
    };
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
      });
    }
    
    return userData;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return null;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};