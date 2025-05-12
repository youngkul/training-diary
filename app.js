// ✅ Firebase 및 인증 모듈 가져오기
import { auth, db } from "./firebase-config.js";
import { getSession } from "./auth-utils.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, getDoc,
  query, where, orderBy, updateDoc,serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// ✅ 요청 수락
window.acceptFriendRequest = async function (requestId, fromUid, toUid) {
  // 사용자 이름 불러오기
  const fromRef = doc(db, "users", fromUid);
  const toRef = doc(db, "users", toUid);
  const fromSnap = await getDoc(fromRef);
  const toSnap = await getDoc(toRef);

  const fromName = fromSnap.exists() ? fromSnap.data().name : "익명";
  const toName = toSnap.exists() ? toSnap.data().name : "익명";

  // friends 컬렉션에 이름 포함 저장
  await addDoc(collection(db, "friends"), {
    uid1: fromUid,
    name1: fromName,
    uid2: toUid,
    name2: toName,
    created_at: serverTimestamp()
  });

  await deleteDoc(doc(db, "friend_requests", requestId));
  alert("친구 요청을 수락했습니다.");
  loadFriendRequests(); // 목록 다시 불러오기
};
  window.toggleNotifications = function () {
    const box = document.getElementById("notificationBox");
    box.classList.toggle("hidden");
    loadNotifications(); // 알림 목록 불러오기
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

// ✅ 로그인 상태 확인 후 친구 요청도 함께 로딩
document.addEventListener("DOMContentLoaded", async () => {
  const session = await getSession();
  if (session) {
    // loadAllVideos?.(); // 영상 불러오기 함수가 있다면 실행
    loadFriendRequests(); // 친구 요청도 함께 불러오기
  }
});
// ✅ 영상 업로드
window.uploadVideo = async function () {
  const uploadBtn = document.querySelector("button[onclick='uploadVideo()']");
  uploadBtn.disabled = true;
  uploadBtn.textContent = "업로드 중...";

  const file = document.getElementById("videoInput").files[0];
  const note = document.getElementById("videoNote").value;
  if (!file) {
    alert("영상을 선택하세요.");
    uploadBtn.disabled = false;
    uploadBtn.textContent = "업로드";
    return;
  }

  const session = await getSession();
  const uid = session?.user?.uid;
  if (!uid) return alert("로그인이 필요합니다.");

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const name = userSnap.exists() ? userSnap.data().name : "익명";

  const fileName = `${Date.now()}_${file.name}`;
  const signedUrlResponse = await fetch(
    `https://us-central1-training-video-b4935.cloudfunctions.net/getSignedUrl?fileName=${encodeURIComponent(fileName)}`
  );
  const { signedUrl, publicUrl } = await signedUrlResponse.json();

  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file
  });

  if (!uploadRes.ok) {
    console.error("Wasabi 업로드 실패:", await uploadRes.text());
    alert("영상 업로드 실패");
    uploadBtn.disabled = false;
    uploadBtn.textContent = "업로드";
    return;
  }

  await addDoc(collection(db, "videos"), {
    url: publicUrl,
    note,
    uid,
    name,
    created_at: new Date().toISOString()
  });

  alert("업로드 성공!");

  // 업로드 폼 초기화
  document.getElementById("videoInput").value = "";
  document.getElementById("videoNote").value = "";
  uploadBtn.disabled = false;
  uploadBtn.textContent = "업로드";

  // 새로고침 대신 영상만 다시 로드
  loadAllVideos();
};
window.loadNotifications = async function () {
  const session = await getSession();
  const uid = session?.user?.uid;
  if (!uid) return;

  const q = query(
    collection(db, "notifications"),
    where("to", "==", uid),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  const list = document.getElementById("notificationList");
  list.innerHTML = "";

  if (snap.empty) {
    list.innerHTML = "<p class='text-gray-500'>알림이 없습니다.</p>";
    return;
  }

  snap.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "text-sm text-gray-800 border-b pb-1";
    div.textContent = data.message;
    list.appendChild(div);
  });
};


// ✅ 영상 삭제
window.deleteVideo = async function (videoId) {
  const confirmDelete = confirm("정말 삭제하시겠습니까?");
  if (!confirmDelete) return;

  const session = await getSession();
  const uid = session?.user?.uid;
  if (!uid) return alert("로그인이 필요합니다.");

  const videoRef = doc(db, "videos", videoId);
  const videoSnap = await getDoc(videoRef);
  if (!videoSnap.exists()) return alert("영상이 존재하지 않습니다.");

  if (videoSnap.data().uid !== uid) {
    return alert("본인의 영상만 삭제할 수 있습니다.");
  }

  // 좋아요도 함께 삭제
  const likesQuery = query(collection(db, "likes"), where("video_id", "==", videoId));
  const likesSnap = await getDocs(likesQuery);
  likesSnap.forEach(async (likeDoc) => {
    await deleteDoc(doc(db, "likes", likeDoc.id));
  });

  await deleteDoc(videoRef);
  alert("삭제 완료");
  loadAllVideos();
};


// ✅ 영상 목록 로딩
async function loadAllVideos() {
  const videoFeed = document.getElementById("videoFeed");
  videoFeed.innerHTML = "";

  const q = query(collection(db, "videos"), orderBy("created_at", "desc"));
  const snapshot = await getDocs(q);

  const session = await getSession();
  const currentUid = session?.user?.uid;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.5 });

  snapshot.forEach(async (docSnap) => {
    const video = { id: docSnap.id, ...docSnap.data() };
    const isOwner = video.uid === currentUid; // ✅ 이 줄은 반드시 위에 있어야 함
  
    const videoDiv = document.createElement("div");
    videoDiv.classList.add("space-y-2", "border-b", "pb-4");

videoDiv.innerHTML = `
  <div class="bg-white rounded-2xl shadow-lg p-5 space-y-4">
    <p class="text-sm text-gray-500">${video.name || "익명"}님이 ${timeAgo(video.created_at)}에 업로드했습니다</p>
    <video
      src="${video.url}"
      poster="${video.poster || 'https://placehold.co/640x360?text=썸네일'}"
      controls
      muted
      playsinline
      preload="metadata"
      loading="lazy"
      class="w-full aspect-video rounded-xl shadow-lg border border-gray-200"
    ></video>
    <p><strong>메모:</strong> <span id="note-${video.id}">${video.note || "없음"}</span></p>
    <div class="flex items-center gap-2 mt-2">
      <button onclick="copyVideoLink('${video.id}')" class="text-blue-600 text-sm underline">🔗 공유하기</button>
      <span id="copied-${video.id}" class="text-green-600 text-sm hidden">링크 복사됨!</span>
    </div>

    ${isOwner ? `
      <input type="text" id="edit-note-${video.id}" placeholder="메모 수정" class="p-2 w-full border rounded" />
      <div class="flex gap-2 mt-2">
        <button onclick="updateNote('${video.id}')" class="bg-yellow-500 text-white px-3 py-1 rounded">메모 저장</button>
        <button onclick="deleteNote('${video.id}')" class="bg-gray-600 text-white px-3 py-1 rounded">메모 삭제</button>
        <button onclick="deleteVideo('${video.id}')" class="bg-red-500 text-white px-3 py-1 rounded">영상 삭제</button>
      </div>
    ` : ``}

    <div class="flex items-center mt-2">
      <button onclick="toggleLike('${video.id}')" id="like-btn-${video.id}" class="text-red-500 text-xl">❤️</button>
      <span id="like-count-${video.id}" class="ml-2">0</span>명이 좋아요
    </div>

    <div data-video-id="${video.id}" class="comment-box mt-4 text-sm text-gray-700"></div>
    <div id="comments-${video.id}" class="mt-4 text-sm text-gray-700"></div>

    <input type="text" placeholder="댓글 작성" id="comment-input-${video.id}" class="p-2 mt-2 w-full border rounded" />
    <button onclick="postComment('${video.id}')" class="mt-2 bg-blue-500 text-white px-3 py-1 rounded">댓글 달기</button>
  </div>
`;


    videoFeed.appendChild(videoDiv);
    const videoTag = videoDiv.querySelector("video");
    if (videoTag) observer.observe(videoTag);
    await loadComments(video.id);
    await loadLikes(video.id);
  });
}
window.copyVideoLink = async function(videoId) {
  console.log("🔥 공유 시도한 videoId:", videoId);

  const session = await getSession();
  const uid = session?.user?.uid;
  if (!uid) {
    alert("로그인이 필요합니다.");
    return;
  }

  const videoRef = doc(db, "videos", videoId);
  const videoSnap = await getDoc(videoRef);

  if (!videoSnap.exists()) {
    alert("영상이 존재하지 않습니다.");
    return;
  }

  const url = `${window.location.origin}/video.html?id=${videoId}`;
  await navigator.clipboard.writeText(url);

  const msg = document.getElementById(`copied-${videoId}`);
  msg.classList.remove("hidden");
  setTimeout(() => {
    msg.classList.add("hidden");
  }, 2000);
  alert("링크가 복사되었습니다. 친구에게 붙여넣어 보내보세요!");
};


// ✅ 메모
window.updateNote = async function (videoId) {
  const input = document.getElementById(`edit-note-${videoId}`);
  const newNote = input.value.trim();
  if (!newNote) return alert("메모를 입력하세요.");

  await updateDoc(doc(db, "videos", videoId), { note: newNote });
  document.getElementById(`note-${videoId}`).textContent = newNote;
  input.value = "";
  alert("메모 저장 완료");
};

window.deleteNote = async function (videoId) {
  await updateDoc(doc(db, "videos", videoId), { note: "" });
  document.getElementById(`note-${videoId}`).textContent = "없음";
  document.getElementById(`edit-note-${videoId}`).value = "";
  alert("메모 삭제 완료");
};

// ✅ 댓글
window.postComment = async function (videoId) {
  console.log("🔥 공유 시도한 videoId:", videoId);

  const input = document.getElementById(`comment-input-${videoId}`);
  const content = input.value.trim();
  if (!content) return;

  const session = await getSession();
  const uid = session?.user?.uid;
  if (!uid) return alert("로그인이 필요합니다.");

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const name = userSnap.exists() ? userSnap.data().name : "익명";

  await addDoc(collection(db, "comments"), {
    video_id: videoId,
    uid,
    name,
    content,
    created_at: new Date().toISOString()
  });

  // ✅ 댓글 알림용 영상 주인 찾기
  const videoRef = doc(db, "videos", videoId);
  const videoSnap = await getDoc(videoRef);
  if (!videoSnap.exists()) {
    alert("영상이 존재하지 않거나 삭제되었습니다.");
    return;
  }
  const videoOwnerUid = videoSnap.exists() ? videoSnap.data().uid : null;

  // ✅ 자기 자신에게는 알림 안 보내기
  if (videoOwnerUid && videoOwnerUid !== uid) {
    await addDoc(collection(db, "notifications"), {
      type: "comment",
      from: uid,
      to: videoOwnerUid,
      videoId,
      message: `${name}님이 내 영상에 댓글을 달았습니다.`,
      isRead: false,
      created_at: new Date().toISOString()
    });
  }

  input.value = "";
  loadComments(videoId);
};


window.deleteComment = async function (videoId, commentId) {
  await deleteDoc(doc(db, "comments", commentId));
  loadComments(videoId);
};

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
    p.textContent = `${comment.name || "익명"}: ${comment.content}`;
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

// ✅ 좋아요
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

window.toggleLike = async function (videoId) {
  console.log("🔥 공유 시도한 videoId:", videoId);

  const session = await getSession();
  const uid = session?.user?.uid;
  if (!uid) return;

  const q = query(collection(db, "likes"), where("video_id", "==", videoId), where("uid", "==", uid));
  const snapshot = await getDocs(q);

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const name = userSnap.exists() ? userSnap.data().name : "익명";

  const videoRef = doc(db, "videos", videoId);
  const videoSnap = await getDoc(videoRef);
  const videoOwnerUid = videoSnap.exists() ? videoSnap.data().uid : null;

  if (snapshot.empty) {
    // 좋아요 저장
    await addDoc(collection(db, "likes"), { video_id: videoId, uid });

    // ✅ 알림 저장 (본인 영상이 아닐 때만)
    if (videoOwnerUid && videoOwnerUid !== uid) {
      await addDoc(collection(db, "notifications"), {
        type: "like",
        from: uid,
        to: videoOwnerUid,
        videoId,
        message: `${name}님이 내 영상에 좋아요를 눌렀습니다.`,
        isRead: false,
        created_at: new Date().toISOString()
      });
    }

  } else {
    // 좋아요 취소
    await deleteDoc(doc(db, "likes", snapshot.docs[0].id));
  }

  loadLikes(videoId);
};


// ✅ 시간 경과 표시
function timeAgo(dateString) {
  const now = new Date();
  const uploaded = new Date(dateString);
  const diff = (now - uploaded) / 1000;

  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ✅ 로그인 상태 확인 → 초기 진입 처리
async function checkLoginStatus() {
  const session = await getSession();
  const authDiv = document.getElementById("authSection");
  const mainDiv = document.getElementById("mainSection");
  const userInfo = document.getElementById("userInfo");

  if (session) {
    localStorage.setItem("uid", session.user.uid);
    authDiv.classList.add("hidden");
    mainDiv.classList.remove("hidden");
    userInfo.innerText = `로그인됨: ${session.user.email}`;
    loadAllVideos();
  } else {
    localStorage.removeItem("uid");
    authDiv.classList.remove("hidden");
    mainDiv.classList.add("hidden");
  }
}

// ✅ 시작 시 실행
document.addEventListener("DOMContentLoaded", checkLoginStatus);
    
  


   