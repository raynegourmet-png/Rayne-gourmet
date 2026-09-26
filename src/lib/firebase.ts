import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Credentials from the user's initial request (Production fallback)
const PROD_CONFIG = {
  apiKey: "AIzaSyAyDFe8jriSqx8IjWCYLKLpQwjwvZYLeYA",
  authDomain: "rayne-gourmet-7801e.firebaseapp.com",
  projectId: "rayne-gourmet-7801e",
  storageBucket: "rayne-gourmet-7801e.appspot.com",
  messagingSenderId: "1056346765278",
  appId: "1:1056346765278:web:8a50f146c1f01dfa4674eb",
  databaseURL: "https://rayne-gourmet-7801e-default-rtdb.firebaseio.com"
};

// Credentials from AI Studio (Development default)
const DEV_CONFIG = {
  apiKey: "AIzaSyCFKe12MyDKM2PQ5IXZIXORfM67JIA9eKI",
  authDomain: "rayne-gourmet.firebaseapp.com",
  projectId: "rayne-gourmet",
  storageBucket: "rayne-gourmet.firebasestorage.app",
  messagingSenderId: "1074178859385",
  appId: "1:1074178859385:web:1257012b9632d834ca4fa8",
  databaseURL: "https://rayne-gourmet-default-rtdb.firebaseio.com"
};

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

// Build config for initialization
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', DEV_CONFIG.apiKey),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', DEV_CONFIG.authDomain),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', DEV_CONFIG.projectId),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', DEV_CONFIG.storageBucket),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', DEV_CONFIG.messagingSenderId),
  appId: getEnv('VITE_FIREBASE_APP_ID', DEV_CONFIG.appId),
  // We explicitly omit databaseURL here and pass it to getDatabase later
  // to avoid fatal errors during initializeApp if the URL is somehow mangled.
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Extremely robust RTDB initialization
let database;

// Collect all candidate URLs to try
const candidateUrls = [
  getEnv('VITE_FIREBASE_DATABASE_URL', ''),
  DEV_CONFIG.databaseURL,
  PROD_CONFIG.databaseURL,
  `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`,
  `https://${firebaseConfig.projectId}.firebaseio.com`,
  `https://rayne-gourmet-default-rtdb.firebaseio.com`,
  `https://rayne-gourmet-7801e-default-rtdb.firebaseio.com`
];

for (const rawUrl of candidateUrls) {
  if (database) break;
  
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!url || !url.startsWith('http') || url === 'undefined' || url === 'null') continue;
  
  try {
    // Attempt initialization with this specific URL
    database = getDatabase(app, url);
    console.log(`Firebase RTDB successfully initialized with: ${url}`);
  } catch (err) {
    // This is expected if the URL is invalid or malformed
    console.warn(`Failed to initialize RTDB with URL [${url}]:`, err);
  }
}

// Final fallback: try standard initialization without explicit URL
if (!database) {
  try {
    database = getDatabase(app);
  } catch (err) {
    console.error("FATAL: All Firebase RTDB initialization attempts failed.", err);
    // As a last resort, to avoid crashing the whole import, return a dummy or re-throw
    throw err;
  }
}

export const db = database!;
