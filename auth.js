import { auth, db } from "./firebase-config.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ 회원가입
window.handleSignup = async function () {
  const emailInput = document.getElementById("authEmail");
  const passwordInput = document.getElementById("authPassword");
  const nameInput = document.getElementById("authName");
  const teamInput = document.getElementById("authTeam"); // 있을 수도 있고 없을 수도 있음

  if (!emailInput || !passwordInput || !nameInput) {
    alert("필수 입력값이 누락되었습니다.");
    return;
  }

  const email = emailInput.value;
  const password = passwordInput.value;
  const name = nameInput.value;
  const team = teamInput ? teamInput.value : ""; // 입력창 없으면 빈 값

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      name,
      team
    });

    await sendEmailVerification(cred.user);
    alert("회원가입 성공! 이메일을 확인해주세요.");

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

    // 🔄 인증 상태 강제 갱신
    await cred.user.reload();

    if (!cred.user.emailVerified) {
      await sendEmailVerification(cred.user);
      alert("이메일 인증이 필요합니다. 메일을 다시 보냈습니다.");
      await signOut(auth);
      return;
    }

    // ✅ 사용자 추방 여부 확인
    const userRef = doc(db, "users", cred.user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().banned) {
      alert("🚫 이용이 정지된 계정입니다.");
      await signOut(auth);
      return;
    }

    alert("로그인 성공!");
    window.location.reload();

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





  
