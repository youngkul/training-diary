// auth.js
import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ 회원가입
export async function signup(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error("회원가입 오류:", error.message);
    alert("회원가입 실패: " + error.message);
    return null;
  }
}

// ✅ 로그인
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error("로그인 오류:", error.message);
    alert("로그인 실패: " + error.message);
    return null;
  }
}

// ✅ 로그아웃
export async function logout() {
  try {
    await signOut(auth);
    alert("로그아웃 되었습니다.");
    location.reload();
  } catch (error) {
    console.error("로그아웃 오류:", error.message);
    alert("로그아웃 실패: " + error.message);
  }
}

// ✅ 세션 가져오기
export async function getSession() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve({ user });
      } else {
        resolve(null);
      }
    });
  });
}

// ✅ 전역 연결
window.handleSignup = async function () {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;

  const result = await signup(email, password);
  if (result) {
    document.getElementById("signupMessage").classList.remove("hidden");
  }
};

window.handleLogin = async function () {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;

  const result = await login(email, password);
  if (result) location.reload();
};

window.handleLogout = async function () {
  await logout();
};

console.log("✅ auth.js loaded"); // 배포 확인용

  
// force deploy
// trigger deploy
// 🔁 캐시 무력화 테스트
