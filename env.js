// env.js
export const firebaseConfig = {
    apiKey: "당신의 apiKey",
    authDomain: "당신의 authDomain",
    projectId: "당신의 projectId",
    storageBucket: "당신의 storageBucket",
    messagingSenderId: "당신의 messagingSenderId",
    appId: "당신의 appId"
  };
  import { firebaseConfig } from "./env.js";
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
  
  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const db = getFirestore(app);
    