import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAzoGt_pqG64dUDDXu9cGmbK1ziS9CIzlE",
  authDomain: "my-website-bd04c.firebaseapp.com",
  projectId: "my-website-bd04c",
  storageBucket: "my-website-bd04c.firebasestorage.app",
  messagingSenderId: "425480229249",
  appId: "1:425480229249:web:edba05f596a94fff0f5880",
  measurementId: "G-9GWT3PJSDQ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
