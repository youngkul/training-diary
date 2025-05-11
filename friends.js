// friends.js
import { db } from "./firebase-config.js";
import { getSession } from "./auth.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.sendFriendRequest = async function () {
  // ...코드 그대로
};

window.acceptFriendRequest = async function (requestId, fromUid, toUid) {
  // ...코드 그대로
};

window.rejectFriendRequest = async function (requestId) {
  // ...코드 그대로
};

window.loadFriendRequests = async function () {
  // ...코드 그대로
};

document.addEventListener("DOMContentLoaded", async () => {
  const session = await getSession();
  if (session) loadFriendRequests();
});
