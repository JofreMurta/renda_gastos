/* ============================================================
   config.js — Configuração do Firebase
   ------------------------------------------------------------
   SUBSTITUA o objeto abaixo pelas credenciais do SEU projeto.
   Caminho no console: Firebase > Configurações do projeto >
   "Seus apps" > app Web > SDK > Configuração.
   ============================================================ */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHTphHVu40rtRB2pl98_kokeGjJlgDyBs",
  authDomain: "renda-gastos.firebaseapp.com",
  projectId: "renda-gastos",
  storageBucket: "renda-gastos.firebasestorage.app",
  messagingSenderId: "65877849248",
  appId: "1:65877849248:web:799a3a3901aa54fddd45c5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
