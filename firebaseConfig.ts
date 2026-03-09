import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  initializeAuth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 1. Explicitly define the auth variable with the 'Auth' type
let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // 2. We use a dynamic require here to hide the 'getReactNativePersistence' 
  // from the TS compiler so it doesn't complain it's missing.
  const { getReactNativePersistence } = require("firebase/auth");
  
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

const db = getFirestore(app);

export { auth, db };
