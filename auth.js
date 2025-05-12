import { auth, db } from "./firebase-config.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ 회원가입
window.handleSignup = async function () {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  const name = document.getElementById("authName").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), { email, name });

    // ✅ 이메일 인증 메일 전송
    await sendEmailVerification(cred.user);

    alert("회원가입 성공! 이메일을 확인해주세요.");
    
    // ✅ 인증 전이므로 로그아웃 처리
    await signOut(auth);
    window.location.reload();

  } catch (error) {
    console.error("회원가입 실패:", error.message);
    alert("회원가입 실패: " + error.message);
  }
};

// ✅ 로그인
window.handleLogin = async function () {
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // ✅ 이메일 인증 확인
    if (!cred.user.emailVerified) {
      alert("이메일 인증이 필요합니다. 메일함을 확인해주세요.");
      await signOut(auth);
      return;
    }

    alert("로그인 성공!");
    window.location.reload(); // 또는 checkLoginStatus()
  } catch (error) {
    console.error("로그인 실패:", error.message);
    alert("로그인 실패: " + error.message);
  }
};

// ✅ 로그아웃
window.handleLogout = async function () {
  try {
    await signOut(auth);
    alert("로그아웃 완료");
    window.location.reload();
  } catch (error) {
    console.error("로그아웃 오류:", error.message);
    alert("로그아웃 실패: " + error.message);
  }
};




  
