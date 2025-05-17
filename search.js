import { db } from "./firebase-config.js";
import { getSession } from "./auth-utils.js";
import {
  collection, getDocs, query, where, addDoc, deleteDoc,
  doc, getDoc,updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const input = document.getElementById("searchInput");
const resultsBox = document.getElementById("searchResults");

input.focus();

input.addEventListener("input", async () => {
  const keyword = input.value.trim().toLowerCase();
  resultsBox.innerHTML = "";
  if (keyword.length < 1) return;

  const session = await getSession();
  const currentUid = session?.user?.uid;
  if (!currentUid) return;

  // 친구 목록 가져오기
  const q1 = query(collection(db, "friends"), where("uid1", "==", currentUid));
  const q2 = query(collection(db, "friends"), where("uid2", "==", currentUid));
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const friendSet = new Set();
  snap1.forEach(friendDoc => friendSet.add(friendDoc.data().uid2));
  snap2.forEach(friendDoc => friendSet.add(friendDoc.data().uid1));


  // 내가 보낸 친구 요청 가져오기
  const reqQ = query(collection(db, "friend_requests"), where("from", "==", currentUid));
  const requestSnap = await getDocs(reqQ);
  const requestedSet = new Set();
  const requestMap = new Map(); // 요청 ID 저장
  requestSnap.forEach(reqDoc => {
    requestedSet.add(reqDoc.data().to);
    requestMap.set(reqDoc.data().to, reqDoc.id);
  });
  
  
  const userSnap = await getDocs(collection(db, "users"));
  const shownUids = new Set();

  userSnap.forEach(userDoc => {
    const data = userDoc.data();
    const uid = userDoc.id;

    if (uid === currentUid) return;
    if (!data.name?.toLowerCase().includes(keyword)) return;
    if (shownUids.has(uid)) return;
    shownUids.add(uid);

    const isFriend = friendSet.has(uid);
    const isRequested = requestedSet.has(uid);
    const emailText = isFriend ? data.email : "(비공개)";

    const wrapper = document.createElement("div");
    wrapper.className = "bg-gray-800 p-4 rounded-xl shadow flex justify-between items-center mb-2";

    const info = document.createElement("div");
    info.innerHTML = `<div class="font-medium">${data.name}</div>
                      <div class="text-sm text-gray-400">📧 Email: ${emailText}</div>`;

    const btn = document.createElement("button");
    btn.className = "text-sm px-3 py-1 rounded text-white";

    if (isFriend) {
      btn.textContent = "✔ 친구";
      btn.classList.add("bg-green-600");
      btn.disabled = true;
    } else if (isRequested) {
      btn.textContent = "❌ 요청 취소";
      btn.classList.add("bg-yellow-600", "hover:bg-yellow-700");

      btn.onclick = async () => {
        try {
          const reqId = requestMap.get(uid);
          if (reqId) {
            await deleteDoc(doc(db, "friend_requests", reqId));
            requestMap.delete(uid);

            btn.textContent = "➕ 친구 요청";
            btn.classList.remove("bg-yellow-600");
            btn.classList.add("bg-blue-600", "hover:bg-blue-700");

            btn.onclick = sendRequestHandler;
          }
        } catch (e) {
            console.error("❌ 친구 요청 오류:", e);  // ✅ 오류 원인을 콘솔에 정확히 출력
            alert("요청 중 오류가 발생했습니다.");
          }
      };
    } else {
      btn.textContent = "➕ 친구 요청";
      btn.classList.add("bg-blue-600", "hover:bg-blue-700");

      const sendRequestHandler = async () => {
        try {
          console.log("📌 Firestore doc 함수 테스트:", doc);
          const userRef = doc(db, "users", uid);
          const userSnap = await getDoc(userRef);
          const targetName = userSnap.exists() ? userSnap.data().name : "익명";

          const dupCheck = query(
            collection(db, "friend_requests"),
            where("from", "==", currentUid),
            where("to", "==", uid)
          );
          const dupSnap = await getDocs(dupCheck);
          if (!dupSnap.empty) {
            alert("이미 요청한 사용자입니다.");
            return;
          }

          const docRef = await addDoc(collection(db, "friend_requests"), {
            from: currentUid,
            to: uid,
            name: session?.user?.user_metadata?.name || "익명",
            content: `${targetName}님과 친구가 되고 싶어요!`,
            created_at: new Date().toISOString()
          });
          

          requestMap.set(uid, docRef.id);

          btn.textContent = "❌ 요청 취소";
          btn.classList.remove("bg-blue-600");
          btn.classList.add("bg-yellow-600", "hover:bg-yellow-700");

          btn.onclick = async () => {
            try {
              const reqId = requestMap.get(uid);
              if (reqId) {
                await deleteDoc(doc(db, "friend_requests", reqId));
                requestMap.delete(uid);

                btn.textContent = "➕ 친구 요청";
                btn.classList.remove("bg-yellow-600");
                btn.classList.add("bg-blue-600", "hover:bg-blue-700");

                btn.onclick = sendRequestHandler;
              }
            } catch (e) {
                console.error("❌ 친구 요청 오류:", e?.message ?? e, e?.stack);
                alert("요청 중 오류가 발생했습니다.");
              }
          };
        } catch (e) {
            console.error("❌ 친구 요청 오류:", e?.message ?? e, e?.stack);
            alert("요청 중 오류가 발생했습니다.");
          }
      };

      btn.onclick = sendRequestHandler;
    }

    wrapper.appendChild(info);
    wrapper.appendChild(btn);
    resultsBox.appendChild(wrapper);
  });
});
// ✅ 알림 열기 & 읽음처리
window.toggleNotifications = async function () {
    const box = document.getElementById("notificationBox");
    if (!box) return;
  
    box.classList.toggle("hidden");
  
    if (!box.classList.contains("hidden")) {
      await loadNotifications();         // 알림 불러오기
      await markNotificationsAsRead();   // 읽음 처리
    }
  };
  
  // ✅ 알림 불러오기
  async function loadNotifications() {
    const session = await getSession();
    const currentUid = session?.user?.uid;
    if (!currentUid) return;
  
    const q = query(
      collection(db, "notifications"),
      where("to", "==", currentUid)
    );
    const snap = await getDocs(q);
  
    const notiList = document.getElementById("notificationList");
    const notiCount = document.getElementById("notiCount");
  
    if (!notiList || !notiCount) return;
  
    notiList.innerHTML = "";
    let unreadCount = 0;
  
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.className = "text-sm bg-gray-100 text-black p-2 rounded flex justify-between items-center";
  
      div.innerHTML = `
        <span>${data.message}</span>
        <button onclick="deleteNotification('${docSnap.id}')" class="text-xs text-red-500 ml-2 hover:underline">삭제</button>
      `;
      notiList.appendChild(div);
  
      if (!data.isRead) unreadCount++;
    });
  
    // 🔔 뱃지
    if (unreadCount > 0) {
      notiCount.textContent = unreadCount;
      notiCount.classList.remove("hidden");
    } else {
      notiCount.classList.add("hidden");
    }
  }
  
  // ✅ 알림 읽음 처리
  async function markNotificationsAsRead() {
    const session = await getSession();
    const currentUid = session?.user?.uid;
    if (!currentUid) return;
  
    const q = query(
      collection(db, "notifications"),
      where("to", "==", currentUid),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
  
    snap.forEach(async (docSnap) => {
      const ref = doc(db, "notifications", docSnap.id);
      await updateDoc(ref, { isRead: true });
    });
  
    document.getElementById("notiCount")?.classList.add("hidden");
  }
  
  // ✅ 알림 삭제
  window.deleteNotification = async function (id) {
    try {
      await deleteDoc(doc(db, "notifications", id));
      await loadNotifications();
    } catch (e) {
      console.error("❌ 알림 삭제 실패:", e);
      alert("알림 삭제 중 오류가 발생했습니다.");
    }
  };
  
  // ✅ 처음 로드 시 알림 확인
  document.addEventListener("DOMContentLoaded", () => {
    loadNotifications();
  });
  
  // ✅ 알림 UI 토글
  window.toggleNotifications = function () {
    const box = document.getElementById("notificationBox");
    if (!box) return;
  
    box.classList.toggle("hidden");
    if (!box.classList.contains("hidden")) {
      loadNotifications(); // ✅ 창을 열 때마다 새로고침
    }
  };
  
  
  // ✅ 알림 로딩 + 개수 표시
  window.loadNotifications = async function () {
    const session = await getSession();
    const currentUid = session?.user?.uid;
    if (!currentUid) return;
  
    const q = query(
      collection(db, "notifications"),
      where("to", "==", currentUid)
    );
    const snap = await getDocs(q);
  
    const notiList = document.getElementById("notificationList");
    const notiCount = document.getElementById("notiCount");
  
    if (!notiList || !notiCount) return;
  
    notiList.innerHTML = "";
    let unreadCount = 0;
  
    snap.forEach(doc => {
      const data = doc.data();
      const item = document.createElement("div");
      item.className = "text-sm bg-gray-100 text-black p-2 rounded";
  
      item.textContent = data.message;
      notiList.appendChild(item);
  
      if (!data.isRead) unreadCount++;
    });
  
    // 뱃지 표시
    if (unreadCount > 0) {
      notiCount.textContent = unreadCount;
      notiCount.classList.remove("hidden");
    } else {
      notiCount.classList.add("hidden");
    }
  };
  
  
  document.addEventListener("DOMContentLoaded", () => {
    loadNotifications();
  });
    