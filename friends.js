// friends.js
import { db } from "./firebase-config.js";
import { getSession } from "./auth-utils.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 친구 요청 전송
window.sendFriendRequest = async function () {
  const input = document.getElementById("friendUidInput");
  const toUid = input.value.trim();
  if (!toUid) return alert("UID를 입력하세요.");

  const session = await getSession();
  const fromUid = session?.user?.uid;
  if (!fromUid) return alert("로그인이 필요합니다.");
  if (fromUid === toUid) return alert("자기 자신에게는 요청할 수 없습니다.");

  await addDoc(collection(db, "friend_requests"), {
    from: fromUid,
    to: toUid,
    created_at: new Date().toISOString()
  });

  alert("친구 요청을 보냈습니다!");
  input.value = "";
};

// ✅ 요청 수락
window.acceptFriendRequest = async function (requestId, fromUid, toUid) {
  await addDoc(collection(db, "friends"), {
    uid1: fromUid,
    uid2: toUid,
    created_at: serverTimestamp()
  });
  await deleteDoc(doc(db, "friend_requests", requestId));
  alert("친구 요청을 수락했습니다.");
  loadFriendRequests();
};

// ✅ 요청 거절
window.rejectFriendRequest = async function (requestId) {
  await deleteDoc(doc(db, "friend_requests", requestId));
  alert("친구 요청을 거절했습니다.");
  loadFriendRequests();
};

// ✅ 받은 요청 불러오기
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

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "flex justify-between items-center border p-3 rounded";

    div.innerHTML = `
      <p class="text-gray-800">${data.from} 님이 친구 요청</p>
      <div class="flex gap-2">
        <button onclick="acceptFriendRequest('${docSnap.id}', '${data.from}', '${data.to}')" class="text-green-600">수락</button>
        <button onclick="rejectFriendRequest('${docSnap.id}')" class="text-red-600">거절</button>
      </div>
    `;

    listBox.appendChild(div);
  });
};

// ✅ 친구 목록 불러오기
window.loadFriendList = async function () {
  const session = await getSession();
  const currentUid = session?.user?.uid;
  const listBox = document.getElementById("friendList");

  if (!currentUid || !listBox) return;

  const q1 = query(collection(db, "friends"), where("uid1", "==", currentUid));
  const q2 = query(collection(db, "friends"), where("uid2", "==", currentUid));

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const friends = new Set();

  snap1.forEach(doc => friends.add(doc.data().uid2));
  snap2.forEach(doc => friends.add(doc.data().uid1));

  if (friends.size === 0) {
    listBox.innerHTML = "<p class='text-gray-500'>친구가 없습니다.</p>";
    return;
  }

  listBox.innerHTML = "";
  friends.forEach(uid => {
    const li = document.createElement("li");
    li.textContent = uid;
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
