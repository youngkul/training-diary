// app.js
import { auth, db } from "./firebase-config.js";
import { getSession } from "./auth.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ 영상 업로드
window.uploadVideo = async function () {
  const file = document.getElementById("videoInput").files[0];
  const note = document.getElementById("videoNote").value;
  if (!file) return alert("영상을 선택하세요.");

  const session = await getSession();
  const uid = session?.user?.uid;
  if (!uid) return alert("로그인이 필요합니다.");

  // ✅ 1. Firebase Functions로 Signed URL 요청
  const fileName = `${Date.now()}_${file.name}`;
  const signedUrlResponse = await fetch(`https://us-central1-training-video-b4935.cloudfunctions.net/getSignedUrl?fileName=${encodeURIComponent(fileName)}`);
  const { signedUrl, publicUrl } = await signedUrlResponse.json();

  // ✅ 2. Wasabi에 실제 영상 업로드
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file
  });

  if (!uploadRes.ok) {
    console.error("Wasabi 업로드 실패:", await uploadRes.text());
    return alert("영상 업로드 실패");
  }

  // ✅ 3. Firestore에 메타데이터 저장
  await addDoc(collection(db, "videos"), {
    url: publicUrl,
    note,
    uid,
    created_at: new Date().toISOString()
  });

  alert("업로드 성공!");
  loadAllVideos();
};


// ✅ 영상 삭제
window.deleteVideo = async function (videoId, videoUrl) {
  const confirmDelete = confirm("정말 삭제하시겠습니까?");
  if (!confirmDelete) return;

  const session = await getSession();
  const uid = session?.user?.uid;
  if (!uid) return alert("로그인이 필요합니다.");

  // ✅ 1. 좋아요 삭제
  const likesQuery = query(collection(db, "likes"), where("video_id", "==", videoId));
  const likesSnap = await getDocs(likesQuery);
  likesSnap.forEach(async (likeDoc) => {
    await deleteDoc(doc(db, "likes", likeDoc.id));
  });

  // ✅ 2. 영상 메타데이터 삭제
  await deleteDoc(doc(db, "videos", videoId));

  // ✅ 3. Wasabi에서 삭제 요청 (생략 or Functions 구현 필요)

  alert("삭제 완료");
  loadAllVideos();
};

// ✅ 전체 영상 로딩
async function loadAllVideos() {
  const videoFeed = document.getElementById("videoFeed");
  videoFeed.innerHTML = "";

  const q = query(collection(db, "videos"), orderBy("created_at", "desc"));
  const snapshot = await getDocs(q);

  const session = await getSession();
  const currentUid = session?.user?.uid;

  snapshot.forEach(async (docSnap) => {
    const video = { id: docSnap.id, ...docSnap.data() };
    const videoDiv = document.createElement("div");
    videoDiv.classList.add("space-y-2", "border-b", "pb-4");

    videoDiv.innerHTML = `
      <div class="bg-white rounded-2xl shadow-lg p-5 space-y-4">
        <p class="text-sm text-gray-500">${timeAgo(video.created_at)}에 업로드됨</p>
        <video src="${video.url}" controls class="w-full aspect-video rounded-xl shadow-lg border border-gray-200"></video>
        <p><strong>메모:</strong> <span id="note-${video.id}">${video.note || "없음"}</span></p>
        <input type="text" id="edit-note-${video.id}" placeholder="메모 수정" class="p-2 w-full border rounded" />
        <div class="flex gap-2 mt-2">
          <button onclick="updateNote('${video.id}')" class="bg-yellow-500 text-white px-3 py-1 rounded">메모 저장</button>
          <button onclick="deleteNote('${video.id}')" class="bg-gray-600 text-white px-3 py-1 rounded">메모 삭제</button>
          <button onclick="deleteVideo('${video.id}', '${video.url}')" class="bg-red-500 text-white px-3 py-1 rounded">영상 삭제</button>
        </div>
        <div class="flex items-center mt-2">
          <button onclick="toggleLike('${video.id}')" id="like-btn-${video.id}" class="text-red-500 text-xl">❤️</button>
          <span id="like-count-${video.id}" class="ml-2">0</span>명이 좋아요
        </div>
        <div id="comments-${video.id}" class="mt-4 text-sm text-gray-700"></div>
        <input type="text" placeholder="댓글 작성" id="comment-input-${video.id}" class="p-2 mt-2 w-full border rounded" />
        <button onclick="postComment('${video.id}')" class="mt-2 bg-blue-500 text-white px-3 py-1 rounded">댓글 달기</button>
      </div>
    `;

    videoFeed.appendChild(videoDiv);
    await loadComments(video.id);
    await loadLikes(video.id);
  });
}

// ✅ 메모 수정
window.updateNote = async function (videoId) {
  const input = document.getElementById(`edit-note-${videoId}`);
  const newNote = input.value.trim();
  if (!newNote) return alert("메모를 입력하세요.");

  await updateDoc(doc(db, "videos", videoId), { note: newNote });
  document.getElementById(`note-${videoId}`).textContent = newNote;
  input.value = "";
  alert("메모 저장 완료");
};

// ✅ 메모 삭제
window.deleteNote = async function (videoId) {
  await updateDoc(doc(db, "videos", videoId), { note: "" });
  document.getElementById(`note-${videoId}`).textContent = "없음";
  document.getElementById(`edit-note-${videoId}`).value = "";
  alert("메모 삭제 완료");
};

// ✅ 댓글 작성
window.postComment = async function (videoId) {
  const input = document.getElementById(`comment-input-${videoId}`);
  const content = input.value.trim();
  if (!content) return;

  const session = await getSession();
  const uid = session?.user?.uid;
  const name = session?.user?.name || "익명";

  await addDoc(collection(db, "comments"), {
    video_id: videoId,
    uid,
    name, // 추가
    content,
    created_at: new Date().toISOString()
  });

  input.value = "";
  loadComments(videoId);
};


// ✅ 댓글 불러오기
async function loadComments(videoId) {
  const q = query(collection(db, "comments"), where("video_id", "==", videoId), orderBy("created_at"));
  const snapshot = await getDocs(q);

  const session = await getSession();
  const currentUid = session?.user?.uid;
  const container = document.getElementById(`comments-${videoId}`);
  container.innerHTML = "<p class='font-semibold'>댓글:</p>";

  snapshot.forEach((docSnap) => {
    const comment = { id: docSnap.id, ...docSnap.data() };
    const div = document.createElement("div");
    div.classList.add("flex", "justify-between", "items-center");

    const p = document.createElement("p");
    const displayName = comment.name || "익명";
    p.textContent = `${displayName}: ${comment.content}`;
    div.appendChild(p);

    if (comment.uid === currentUid) {
      const btn = document.createElement("button");
      btn.textContent = "삭제";
      btn.className = "text-sm text-red-500 ml-2";
      btn.onclick = () => deleteComment(videoId, comment.id);
      div.appendChild(btn);
    }

    container.appendChild(div);
  });
}


// ✅ 댓글 삭제
window.deleteComment = async function (videoId, commentId) {
  await deleteDoc(doc(db, "comments", commentId));
  loadComments(videoId);
};

// ✅ 좋아요 불러오기
async function loadLikes(videoId) {
  const q = query(collection(db, "likes"), where("video_id", "==", videoId));
  const snapshot = await getDocs(q);

  const session = await getSession();
  const uid = session?.user?.uid;

  const count = snapshot.size;
  const likeCountEl = document.getElementById(`like-count-${videoId}`);
  const likeBtn = document.getElementById(`like-btn-${videoId}`);
  likeCountEl.textContent = count;

  const liked = snapshot.docs.some(doc => doc.data().uid === uid);
  likeBtn.textContent = liked ? "❤️" : "🤍";
  
}

// ✅ 좋아요 토글
window.toggleLike = async function (videoId) {
  const session = await getSession();
  const uid = session?.user?.uid;

  const q = query(collection(db, "likes"), where("video_id", "==", videoId), where("uid", "==", uid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    await addDoc(collection(db, "likes"), { video_id: videoId, uid });
  } else {
    await deleteDoc(doc(db, "likes", snapshot.docs[0].id));
  }

  loadLikes(videoId);
};

// ✅ 시간 표시
function timeAgo(dateString) {
  const now = new Date();
  const uploaded = new Date(dateString);
  const diff = (now - uploaded) / 1000;

  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ✅ 로그인 여부 확인
async function checkLoginStatus() {
  const session = await getSession();
  const authDiv = document.getElementById("authSection");
  const mainDiv = document.getElementById("mainSection");
  const userInfo = document.getElementById("userInfo");

  if (session) {
    authDiv.classList.add("hidden");
    mainDiv.classList.remove("hidden");
    userInfo.innerText = `로그인됨: ${session.user.email}`;
    loadAllVideos();
  } else {
    authDiv.classList.remove("hidden");
    mainDiv.classList.add("hidden");
  }
}

// ✅ 페이지 로딩 시 실행
document.addEventListener("DOMContentLoaded", checkLoginStatus);

    
  


   