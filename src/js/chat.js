import { auth, db } from "./firebase-config.js";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDoc,
  onSnapshot,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const inboxList = document.getElementById("inboxList");
const chatPeerEl = document.getElementById("chatPeer");
const chatAvatar = document.getElementById("chatAvatar");
const messagesEl = document.getElementById("messages");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const emptyHint = document.getElementById("emptyHint");

let currentChatId = null;
let currentPeer = null;
let unsubscribeMessages = null;

// Load all chats that include the current user
onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  const chatsRef = collection(db, "chats");
  const q = query(chatsRef, where("users", "array-contains", user.uid));

  onSnapshot(q, async (snapshot) => {
    inboxList.innerHTML = "";

    if (snapshot.empty) {
      inboxList.innerHTML = `
        <div style="padding:16px; color:#777;">
          No matches yet. Go like someone's profile!
        </div>`;
      return;
    }

    snapshot.forEach(async (chatDoc) => {
      const chatData = chatDoc.data();

      // Get the other user in the chat
      const peerUid = chatData.users.find((u) => u !== user.uid);
      const peerSnap = await getDoc(doc(db, "users", peerUid));
      const peer = peerSnap.data();

      const item = document.createElement("div");
      item.className = "inbox-item";
      item.dataset.chatId = chatDoc.id;

      item.innerHTML = `
        <img class="avatar" src="${
          peer.profilePic || ""
        }" style="background:#ddd">
        <div>
          <div class="name">${peer.username || "Unknown"}</div>
          <div class="snippet">Tap to chat</div>
        </div>
      `;

      item.onclick = () => selectChat(chatDoc.id, peer);
      inboxList.appendChild(item);
    });
  });
});

function selectChat(chatId, peer) {
  currentChatId = chatId;
  currentPeer = peer;

  chatPeerEl.textContent = peer.username;
  chatAvatar.src = peer.profilePic || "";
  chatAvatar.style.background = peer.profilePic ? "" : "#ccc";

  input.disabled = false;
  sendBtn.disabled = false;
  messagesEl.innerHTML = "";
  emptyHint.style.display = "none";

  // Stop the previous listener if switching chats
  if (unsubscribeMessages) unsubscribeMessages();

  const msgsRef = collection(db, "chats", chatId, "messages");
  const q = query(msgsRef, orderBy("ts"));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesEl.innerHTML = "";
    snapshot.forEach((msgDoc) => {
      const msg = msgDoc.data();
      const b = document.createElement("div");
      b.className =
        "bubble " + (msg.sender === auth.currentUser.uid ? "me" : "them");
      b.textContent = msg.text;
      messagesEl.appendChild(b);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

sendBtn.onclick = sendMessage;
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  if (!currentChatId) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  await addDoc(collection(db, "chats", currentChatId, "messages"), {
    text,
    sender: auth.currentUser.uid,
    ts: Date.now(),
  });
}
