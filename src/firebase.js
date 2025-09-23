import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// ===== PASSO 1: Adicione esta importação =====
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  // Suas credenciais aqui (mantive as suas)
  apiKey: "AIzaSyBcMMoKNIpijamhbADP3aO0Yx7xF0tJg5U",
  authDomain: "vivenciepei.firebaseapp.com",
  projectId: "vivenciepei",
  storageBucket: "vivenciepei.firebasestorage.app",
  messagingSenderId: "591556223675",
  appId: "1:591556223675:web:804fc4b9b4a56ac4757f9e",
};

// As exportações que você já tinha
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "southamerica-east1");

// ===== PASSO 2: Adicione esta linha para inicializar e exportar o Storage =====
export const storage = getStorage(app);
