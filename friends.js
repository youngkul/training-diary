// friends.js
import { db } from "./firebase-config.js";
import { getSession } from "./auth-utils.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 친구 요청 전송
window.sendFriendRequest = async function () {
  const input = document.getElementById("friendUidInput");
  const nameInput = input.value.trim();
  if (!nameInput) return alert("친구 이름을 입력하세요.");

  const session = await getSession();
  const fromUid = session?.user?.uid;
  if (!fromUid) return alert("로그인이 필요합니다.");

  console.log("👉 입력된 이름:", nameInput);
  console.log("👉 현재 로그인 UID:", fromUid);

  try {
    // 1. 이름으로 유저 검색
    const userQuery = query(collection(db, "users"), where("name", "==", nameInput));
    const snap = await getDocs(userQuery);
    console.log("🔍 이름 검색 결과 수:", snap.size);

    if (snap.empty) {
      return alert("해당 이름의 사용자를 찾을 수 없습니다.");
    }

    const toDoc = snap.docs[0];
    const toUid = toDoc.id;
    const toName = toDoc.data().name;

    console.log("✅ 수신자 UID:", toUid);
    console.log("✅ 수신자 이름:", toName);

    if (fromUid === toUid) {
      return alert("자기 자신에게는 요청할 수 없습니다.");
    }

    // 2. 중복 요청 방지
    const existingQuery = query(
      collection(db, "friend_requests"),
      where("from", "==", fromUid),
      where("to", "==", toUid)
    );
    const existingSnap = await getDocs(existingQuery);
    console.log("🔁 중복 요청 여부:", !existingSnap.empty);

    if (!existingSnap.empty) {
      return alert("이미 친구 요청을 보냈습니다.");
    }

    // 3. 요청 저장
    await addDoc(collection(db, "friend_requests"), {
      from: fromUid,
      to: toUid,
      created_at: new Date().toISOString()
    });

    alert(`${toName}님에게 친구 요청을 보냈습니다.`);
    input.value = "";

  } catch (error) {
    console.error("❌ 친구 요청 중 오류 발생:", error);
    alert("친구 요청에 실패했습니다. 콘솔을 확인해주세요.");
  }
};




// ✅ 요청 수락 (이름 포함)
window.acceptFriendRequest = async function (requestId, fromUid, toUid) {
  const fromSnap = await getDoc(doc(db, "users", fromUid));
  const toSnap = await getDoc(doc(db, "users", toUid));
  const fromName = fromSnap.exists() ? fromSnap.data().name : "익명";
  const toName = toSnap.exists() ? toSnap.data().name : "익명";

  await addDoc(collection(db, "friends"), {
    uid1: fromUid,
    name1: fromName,
    uid2: toUid,
    name2: toName,
    created_at: serverTimestamp()
  });

  await deleteDoc(doc(db, "friend_requests", requestId));
  alert("친구 요청을 수락했습니다.");
  loadFriendRequests();
  loadFriendList();
};

// ✅ 요청 거절
window.rejectFriendRequest = async function (requestId) {
  await deleteDoc(doc(db, "friend_requests", requestId));
  alert("친구 요청을 거절했습니다.");
  loadFriendRequests();
};

// ✅ 받은 요청 목록
window.loadFriendRequests = async function () {
  const session = await getSession();
  const currentUid = session?.user?.uid;
  const listBox = document.getElementById("friendRequestList");
  if (!currentUid || !listBox) return;

  const q = query(collection(db, "friend_requests"), where("to", "==", currentUid));
  const snap = await getDocs(q);

  if (snap.empty) {
    listBox.innerHTML = "<p class='text-gray-500'>받은 요청이 없습니다.</p>";
    return;
  }

  listBox.innerHTML = "";

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const fromUserSnap = await getDoc(doc(db, "users", data.from));
    const fromName = fromUserSnap.exists() ? fromUserSnap.data().name : data.from;

    const div = document.createElement("div");
    div.className = "flex justify-between items-center border p-3 rounded";

    div.innerHTML = `
      <p class="text-gray-800">${fromName} 님이 친구 요청</p>
      <div class="flex gap-2">
        <button onclick="acceptFriendRequest('${docSnap.id}', '${data.from}', '${data.to}')" class="text-green-600">수락</button>
        <button onclick="rejectFriendRequest('${docSnap.id}')" class="text-red-600">거절</button>
      </div>
    `;
    listBox.appendChild(div);
  }
};

// ✅ 친구 목록 표시 (이름으로)
window.loadFriendList = async function () {
  const session = await getSession();
  const currentUid = session?.user?.uid;
  const listBox = document.getElementById("friendList");
  if (!currentUid || !listBox) return;

  const q1 = query(collection(db, "friends"), where("uid1", "==", currentUid));
  const q2 = query(collection(db, "friends"), where("uid2", "==", currentUid));
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const allFriends = [...snap1.docs, ...snap2.docs];
  if (allFriends.length === 0) {
    listBox.innerHTML = "<p class='text-gray-500'>친구가 없습니다.</p>";
    return;
  }

  listBox.innerHTML = "";
  allFriends.forEach(docSnap => {
    const data = docSnap.data();
    const friendName =
      data.uid1 === currentUid ? data.name2 || data.uid2 : data.name1 || data.uid1;

    const li = document.createElement("li");
    li.textContent = friendName + " 님";
    li.className = "p-2 border-b";
    listBox.appendChild(li);
  });
};

// ✅ 초기 실행
document.addEventListener("DOMContentLoaded", async () => {
  const session = await getSession();
  if (session) {
    loadFriendRequests();
    loadFriendList();
  }
});

