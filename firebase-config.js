// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCrI8s4zpZGrLX5XIT7Nl9v8zLDJ1FcozU",
  authDomain: "training-video-b4935.firebaseapp.com",
  projectId: "training-video-b4935",
  storageBucket: "training-video-b4935.appspot.com",
  messagingSenderId: "1099229932660",
  appId: "1:1099229932660:web:0c71995a5bd79b657c3521"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


