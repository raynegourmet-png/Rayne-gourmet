import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Current AI Studio Project Credentials
// Note: The previous "Production" project (rayne-gourmet-7801e) has been suspended.
// We are now using the active "rayne-gourmet" project for all environments.
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

// Official config from firebase-applet-config.json
const rawDbUrl = getEnv('VITE_FIREBASE_DATABASE_URL', 'https://rayne-gourmet-default-rtdb.firebaseio.com');
// Force the correct URL and ignore the old "7801e" project if it appears in env
const sanitizedDbUrl = (rawDbUrl && rawDbUrl.startsWith('http') && !rawDbUrl.includes('7801e')) 
  ? rawDbUrl 
  : 'https://rayne-gourmet-default-rtdb.firebaseio.com';

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', 'AIzaSyCFKe12MyDKM2PQ5IXZIXORfM67JIA9eKI'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'rayne-gourmet.firebaseapp.com'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'rayne-gourmet'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'rayne-gourmet.firebasestorage.app'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '1074178859385'),
  appId: getEnv('VITE_FIREBASE_APP_ID', '1:1074178859385:web:1257012b9632d834ca4fa8'),
  databaseURL: sanitizedDbUrl
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Initialize RTDB safely
let database;
try {
  const dbUrl = firebaseConfig.databaseURL;
  if (dbUrl && typeof dbUrl === 'string' && dbUrl.startsWith('http')) {
    database = getDatabase(app, dbUrl);
  } else {
    database = getDatabase(app);
  }
} catch (err) {
  console.warn("RTDB initialization with URL failed, falling back to default:", err);
  database = getDatabase(app);
}

export const db = database;
