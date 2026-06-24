/* config.js — Configuração do Firebase (projeto renda-gastos) */

const firebaseConfig = {
  apiKey:            "AIzaSyBHTphHVu40rtRB2pl98_kokeGjJlgDyBs",
  authDomain:        "renda-gastos.firebaseapp.com",
  projectId:         "renda-gastos",
  storageBucket:     "renda-gastos.firebasestorage.app",
  messagingSenderId: "65877849248",
  appId:             "1:65877849248:web:799a3a3901aa54fddd45c5"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();
