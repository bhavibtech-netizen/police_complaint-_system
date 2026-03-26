import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB8YlCt8mWhiwFe6Ny3-1YjcQhHeWOTFG4",
  authDomain: "police-complaint-system-bf8e5.firebaseapp.com",
  projectId: "police-complaint-system-bf8e5",
  storageBucket: "police-complaint-system-bf8e5.firebasestorage.app",
  messagingSenderId: "398106016831",
  appId: "1:398106016831:web:a86ea9769c96a14db54c8a"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut
};
