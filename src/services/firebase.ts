import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your actual Firebase Project config
const firebaseConfig = {
  apiKey: "AIzaSyBAa7RjWms5dFlF2huzPC2pas3TGKfM1F0",
  authDomain: "loverzz-app.firebaseapp.com",
  projectId: "loverzz-app",
  storageBucket: "loverzz-app.firebasestorage.app",
  messagingSenderId: "213989705979",
  appId: "1:213989705979:web:2743b741421a1a3285485e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
