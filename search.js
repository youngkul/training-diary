import { db } from "./firebase-config.js";
import { getSession } from "./auth-utils.js";
import {
  collection, getDocs, query, where, addDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const input = document.getElementById("searchInput");
const resultsBox = document.getElementById("searchResults");

input.focus(); // 🔍 자동 포커스

input.addEventListener("input", async () => {
  const keyword = input.value.trim().toLowerCase();
  resultsBox.innerHTML = "";
  if (keyword.length < 1) return;

  const session = await getSession();
  const currentUid = session?.user?.uid;
  if (!currentUid) return;

  // ✅ 현재 사용자의 친구 목록
  const q1 = query(collection(db, "friends"), where("uid1", "==", currentUid));
  const q2 = query(collection(db, "friends"), where("uid2", "==", currentUid));
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const friendSet = new Set();
  snap1.forEach(doc => friendSet.add(doc.data().uid2));
  snap2.forEach(doc => friendSet.add(doc.data().uid1));

  // ✅ 현재 사용자가 보낸 친구 요청
  const qReq = query(collection(db, "friend_requests"), where("from", "==", currentUid));
  const reqSnap = await getDocs(qReq);
  const requestedSet = new Set();
  reqSnap.forEach(doc => requestedSet.add(doc.data().to));

  // ✅ 사용자 목록 불러오기
  const userSnap = await getDocs(collection(db, "users"));
  const shownUids = new Set(); // 중복 표시 방지
  const shownNames = new Set();

  userSnap.forEach(docSnap => {
    const data = docSnap.data();
    const uid = docSnap.id;

    if (uid === currentUid) return; // 본인은 제외
    if (!data.name?.toLowerCase().includes(keyword)) return;
    if (shownUids.has(uid)) return;
    shownUids.add(uid);
    shownNames.add(data.name);

    const isFriend = friendSet.has(uid);
    const isRequested = requestedSet.has(uid);
    const emailText = isFriend ? data.email : "(비공개)";

    // 🔸 프로필 카드 생성
    const wrapper = document.createElement("div");
    wrapper.className = "bg-gray-800 p-4 rounded-xl shadow flex justify-between items-center mb-3";

    const info = document.createElement("div");
    info.innerHTML = `
      <div class="font-medium text-white">${data.name}</div>
      <div class="text-sm text-gray-400">📧 Email: ${emailText}</div>
    `;

    const btn = document.createElement("button");
    btn.className = "text-sm px-3 py-1 rounded";

    if (isFriend) {
      btn.textContent = "✔ 친구";
      btn.classList.add("bg-green-600", "text-white");
      btn.disabled = true;
    } else if (isRequested) {
      btn.textContent = "⏳ 요청됨";
      btn.classList.add("bg-yellow-500", "text-white");
      btn.disabled = true;
    } else {
      btn.textContent = "➕ 친구 요청";
      btn.classList.add("bg-blue-600", "text-white", "hover:bg-blue-700");
      btn.onclick = async () => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    const targetName = userSnap.exists() ? userSnap.data().name : "익명";

    const senderName = session?.user?.user_metadata?.name || "익명";

    await addDoc(collection(db, "friend_requests"), {
      from: currentUid,
      to: uid,
      name: senderName,
      content: `${targetName}님과 친구가 되고 싶어요!`,
      created_at: new Date().toISOString()
    });

    btn.textContent = "⏳ 요청됨";
    btn.classList.remove("bg-blue-600");
    btn.classList.add("bg-yellow-500");
    btn.disabled = true;
  } catch (e) {
    console.error("❌ 친구 요청 오류:", e);
    alert("요청 중 오류가 발생했습니다.");
  }
};

    }

    wrapper.appendChild(info);
    wrapper.appendChild(btn);
    resultsBox.appendChild(wrapper);
  });
});
