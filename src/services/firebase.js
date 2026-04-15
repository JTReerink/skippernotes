import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvV6ZaTIYMNG3EAPk2Msc3qQ4d0k7bmHY",
  authDomain: "skippernotes-b987a.firebaseapp.com",
  projectId: "skippernotes-b987a",
  storageBucket: "skippernotes-b987a.firebasestorage.app",
  messagingSenderId: "895835249178",
  appId: "1:895835249178:web:f91a0cf0656ecca3f00fa3",
  measurementId: "G-0QGHT3988X"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
