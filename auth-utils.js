// auth-utils.js
import { auth } from "./firebase-config.js";

export async function getSession() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user ? { user } : null);
    });
  });
}
