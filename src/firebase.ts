// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// Replace with your actual config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCb_JWhmzG83Te1zSJEjumb_uw947gRSSs",
  authDomain: "ristorante-monopoli-c82e1.firebaseapp.com",
  projectId: "ristorante-monopoli-c82e1",
  storageBucket: "ristorante-monopoli-c82e1.firebasestorage.app",
  messagingSenderId: "552382663447",
  appId: "1:552382663447:web:4ab7f94d1da45415980552",
  measurementId: "G-VRBN10RK8F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firebase Analytics and get a reference to the service
export const analytics = getAnalytics(app);

// Initialize Cloud Functions
export const functions = getFunctions(app, 'us-central1');