import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Current AI Studio Project Credentials
const getEnv = (key: string, fallback: string): string => {
  try {
    const value = import.meta.env[key];
    if (typeof value === 'string' && value.trim() && value !== 'undefined' && value !== 'null') {
      return value.trim();
    }
  } catch (e) {
    // Environment access error
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', 'AIzaSyCFKe12MyDKM2PQ5IXZIXORfM67JIA9eKI'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'rayne-gourmet.firebaseapp.com'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'rayne-gourmet'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'rayne-gourmet.firebasestorage.app'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '1074178859385'),
  appId: getEnv('VITE_FIREBASE_APP_ID', '1:1074178859385:web:1257012b9632d834ca4fa8')
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export const db = getFirestore(app);
