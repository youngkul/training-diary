import { db } from "./firebase-config.js";
import { getSession } from "./auth-utils.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ URL에서 videoId 파라미터 추출
const urlParams = new URLSearchParams(window.location.search);
const videoId = urlParams.get("id");

// ✅ 로그인 상태 확인 후 영상 불러오기
async function loadVideoDetail() {
  const session = await getSession();
  if (!session) {
    alert("로그인이 필요합니다.");
    window.location.href = "/index.html";
    return;
  }

  if (!videoId) {
    alert("잘못된 링크입니다.");
    return;
  }

  const videoRef = doc(db, "videos", videoId);
  const snap = await getDoc(videoRef);

  if (!snap.exists()) {
    document.getElementById("videoDetail").innerHTML =
      "<p class='text-red-500'>영상을 찾을 수 없습니다.</p>";
    return;
  }

  const data = snap.data();
  const html = `
    <div class="bg-white rounded-xl shadow p-6 space-y-4 max-w-xl mx-auto mt-10">
      <p class="text-gray-700 text-sm">${data.name || "익명"}님이 업로드한 영상</p>
      <video src="${data.url}" controls class="w-full aspect-video rounded"></video>
      <p><strong>메모:</strong> ${data.note || "없음"}</p>
      <div>
        <button id="likeBtn">❤️ 좋아요</button>
        <p id="likedUsers" class="text-sm text-gray-600 mt-1">불러오는 중...</p>
      </div>
    </div>
  `;

  document.getElementById("videoDetail").innerHTML = html;

  // ✅ 좋아요 목록 표시
  loadLikedUsers();
}

// ✅ 좋아요 누른 사용자 목록 불러오기
async function loadLikedUsers() {
  const likedUsersElement = document.getElementById("likedUsers");
  if (!likedUsersElement) return;

  const q = query(collection(db, "likes"), where("video_id", "==", videoId));
  const snapshot = await getDocs(q);

  const names = [];
  for (const docSnap of snapshot.docs) {
    const like = docSnap.data();
    const userSnap = await getDoc(doc(db, "users", like.uid));
    if (userSnap.exists()) {
      names.push(userSnap.data().name || "익명");
    }
  }

  if (names.length === 0) {
    likedUsersElement.textContent = "아직 좋아요가 없습니다.";
  } else {
    likedUsersElement.textContent = `좋아요 누른 사람: ${names.join(", ")}`;
  }
}

// ✅ 좋아요 버튼 클릭 시 처리
document.addEventListener("click", async (e) => {
  if (e.target.id === "likeBtn") {
    const session = await getSession();
    const uid = session?.user?.uid;
    if (!uid) return alert("로그인이 필요합니다.");

    const q = query(
      collection(db, "likes"),
      where("video_id", "==", videoId),
      where("uid", "==", uid)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      await addDoc(collection(db, "likes"), { video_id: videoId, uid });
    } else {
      await deleteDoc(doc(db, "likes", snap.docs[0].id));
    }

    loadLikedUsers(); // 좋아요 목록 다시 불러오기
  }
});

// ✅ 실행
document.addEventListener("DOMContentLoaded", loadVideoDetail);

