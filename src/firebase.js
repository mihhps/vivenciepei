import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// Sua configuração da web (CORRETA!)
const firebaseConfig = {
  apiKey: "AIzaSyBcMMoKNIpijamhbADP3aO0Yx7xF0tJg5U",
  authDomain: "vivenciepei.firebaseapp.com",
  projectId: "vivenciepei",
  storageBucket: "vivenciepei.firebasestorage.app",
  messagingSenderId: "591556223675",
  appId: "1:591556223675:web:804fc4b9b4a56ac4757f9e",
};

// Inicializa o Firebase
// ✅ CORREÇÃO 1: Adicionamos "export" aqui para corrigir o SyntaxError
export const app = initializeApp(firebaseConfig);

// ✅ CORREÇÃO 2: Garantimos que todos os serviços são inicializados
// com a configuração correta da web, vinda do objeto acima.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "southamerica-east1");
export const storage = getStorage(app);
