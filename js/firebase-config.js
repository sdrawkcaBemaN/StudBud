// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALFwqwSHIeBXd2O5vFIQCE_UESe2mgZYQ",
  authDomain: "studybudy-c382d.firebaseapp.com",
  projectId: "studybudy-c382d",
  storageBucket: "studybudy-c382d.firebasestorage.app",
  messagingSenderId: "1085418542703",
  appId: "1:1085418542703:web:2bafcba35d2a74b0cd9f9a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
