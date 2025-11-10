// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Konfigurasi Firebase kamu
const firebaseConfig = {
  apiKey: "AIzaSyDRVbMDhSSZD_9k5jALeTTy2VgGz0lMczU",
  authDomain: "wik-tpm-dashboard.firebaseapp.com",
  databaseURL: "https://wik-tpm-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wik-tpm-dashboard",
  storageBucket: "wik-tpm-dashboard.appspot.com",
  messagingSenderId: "57885421283",
  appId: "1:57885421283:web:fddc02b648fca100081fd6",
  measurementId: "G-8Q9BPZWRWY"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Export agar bisa dipakai di file lain
export { db, ref, set, get, update, remove, onValue };
