// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBcMMoKNIpijamhbADP3aO0Yx7xF0tJg5U",
  authDomain: "vivenciepei.firebaseapp.com",
  projectId: "vivenciepei",
  storageBucket: "vivenciepei.appspot.com",
  messagingSenderId: "591556223675",
  appId:"1:591556223675:web:804fc4b9b4a56ac4757f9e"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta Auth e Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);