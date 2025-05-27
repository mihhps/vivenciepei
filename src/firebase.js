// src/firebase.js

// Importações do Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase do projeto Vivencie PEI
const firebaseConfig = {
  apiKey: "AIzaSyBcMMoKNIpijamhbADP3aO0Yx7xF0tJg5U",
  authDomain: "vivenciepei.firebaseapp.com",
  projectId: "vivenciepei",
  storageBucket: "vivenciepei.appspot.com",
  messagingSenderId: "591556223675",
  appId: "1:591556223675:web:804fc4b9b4a56ac4757f9e"
};

// Inicialização do Firebase App
const app = initializeApp(firebaseConfig);

// Exportação dos serviços utilizados (Auth e Firestore)
export const auth = getAuth(app);
export const db = getFirestore(app);