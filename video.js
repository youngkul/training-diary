// video.js
import { db } from "./firebase-config.js";
import { getSession } from "./auth-utils.js";
import {
  doc,
  getDoc,
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
    document.getElementById("videoDetail").innerHTML = "<p class='text-red-500'>영상을 찾을 수 없습니다.</p>";
    return;
  }

  const data = snap.data();
  const html = `
    <div class="bg-white rounded-xl shadow p-6 space-y-4 max-w-xl mx-auto mt-10">
      <p class="text-gray-700 text-sm">${data.name || "익명"}님이 업로드한 영상</p>
      <video src="${data.url}" controls class="w-full aspect-video rounded"></video>
      <p><strong>메모:</strong> ${data.note || "없음"}</p>
    </div>
  `;

  document.getElementById("videoDetail").innerHTML = html;
}

document.addEventListener("DOMContentLoaded", loadVideoDetail);
