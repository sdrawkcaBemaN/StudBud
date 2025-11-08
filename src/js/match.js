import { auth, db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { supabase } from "./supabase-config.js";

/* ===== Data (swap these image paths to your files) ===== */
let PROFILES_MASTER = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");

  const snap = await getDocs(collection(db, "users"));
  PROFILES_MASTER = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (docSnap.id !== user.uid && data.username && data.profilePic) {
      PROFILES_MASTER.push({
        uid: docSnap.id,
        name: data.username,
        img: data.profilePic,
        desc: data.description,
        info: `${data.faculty || ""} ${data.batch || ""}`.trim(),
      });
    }
  });

  // Load likes from Firebase once and compute sets
  const likesSnap = await getDocs(collection(db, "likes"));
  const alreadyLiked = new Set(); // users this client already liked (backend)
  const likedYou = new Set(); // users who liked this client
  likesSnap.forEach((d) => {
    const like = d.data();
    if (like.from === user.uid) alreadyLiked.add(like.to);
    if (like.to === user.uid) likedYou.add(like.from);
  });

  // now rebuild UI with real profiles excluding already liked / who liked you
  rebuildQueue(alreadyLiked, likedYou);
  renderStack();
});

/* ===== Storage ===== */
const MATCHES_KEY = "thinker_matches"; // [{uid,name,img,desc}]
const DECLINED_KEY = "thinker_declined"; // [uid]
const loadJSON = (k, f) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? f;
  } catch {
    return f;
  }
};
const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const loadMatches = () => loadJSON(MATCHES_KEY, []);
const saveMatches = (arr) => saveJSON(MATCHES_KEY, arr);
const loadDeclined = () => loadJSON(DECLINED_KEY, []);
const saveDeclined = (arr) => saveJSON(DECLINED_KEY, arr);

function upsertMatch(obj) {
  // obj must contain { uid, name, img, desc }
  const list = loadMatches();
  const i = list.findIndex((m) => m.uid === obj.uid);
  if (i >= 0) list[i] = obj;
  else list.push(obj);
  saveMatches(list);
  const key = "chat_history_" + obj.uid; // use uid for chat history local key
  if (!localStorage.getItem(key)) localStorage.setItem(key, "[]");
}
function addDeclined(uid) {
  const d = loadDeclined();
  if (!d.includes(uid)) {
    d.push(uid);
    saveDeclined(d);
  }
}

/* ===== DOM ===== */
const stackEl = document.getElementById("stack");
const btnDecline = document.getElementById("btnDecline");
const btnTick = document.getElementById("btnTick");
const btnAirplane = document.getElementById("btnAirplane");
const btnProfile = document.getElementById("btnProfile");
const toastsEl = document.getElementById("toasts");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
if (document.getElementById("year"))
  document.getElementById("year").textContent = new Date().getFullYear();

/* ===== Toasts ===== */
function toast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="dot"></span> ${msg}`;
  toastsEl.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

/* ===== Queue ===== */
let queue = [];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function rebuildQueue(alreadyLiked = new Set(), likedYou = new Set()) {
  // local liked UIDs (from localStorage)
  const likedLocal = new Set(loadMatches().map((m) => m.uid));
  const declined = new Set(loadDeclined());

  queue = PROFILES_MASTER.filter(
    (p) =>
      !likedLocal.has(p.uid) &&
      !declined.has(p.uid) &&
      !alreadyLiked.has(p.uid) &&
      !likedYou.has(p.uid)
  );

  // randomize order so refresh/top-right doesn't always show same ordering
  shuffle(queue);
}

function renderStack() {
  stackEl.innerHTML = "";
  if (queue.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText =
      "color:#333;font-size:20px;padding:12px 16px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)";
    empty.textContent =
      "No more profiles — check your Messages Or wait to be accepted!✈️";
    stackEl.appendChild(empty);
    updateProgress();
    return;
  }
  queue.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.index = i;
    const img = document.createElement("img");
    img.src = p.img;
    img.alt = p.name;
    const info = document.createElement("div");
    info.className = "info";
    info.innerHTML = `<div class="left"><div class="name">${p.name}</div><div class="desc">${p.desc}</div></div>`;
    const likeB = document.createElement("div");
    likeB.className = "badge like";
    likeB.textContent = "Like";
    const disB = document.createElement("div");
    disB.className = "badge decline";
    disB.textContent = "Nope";
    card.appendChild(img);
    card.appendChild(info);
    card.appendChild(likeB);
    card.appendChild(disB);
    stackEl.appendChild(card);
  });

  updateProgress();
}

function currentProfile() {
  return queue.length ? queue[queue.length - 1] : null;
}
function topCardElement() {
  const last = stackEl.lastElementChild;
  return last && last.classList.contains("card") ? last : null;
}
function animateAndAdvance(anim, showToast) {
  const el = topCardElement();
  if (!el) return;
  el.classList.add(anim);
  setTimeout(() => {
    queue.pop();
    renderStack();
    if (showToast) toast(showToast.text, showToast.type);
  }, 360);
}

/* ===== Buttons (clean + single handlers) ===== */
btnTick.addEventListener("click", async () => {
  const p = currentProfile();
  if (!p) return;

  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  const likesRef = collection(db, "likes");

  // 1. Check if they liked you first
  const q = query(
    likesRef,
    where("from", "==", p.uid),
    where("to", "==", user.uid)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    // ✅ MATCH
    // First: Check if chat already exists
    const chatsRef = collection(db, "chats");
    const q2 = query(chatsRef, where("users", "array-contains", user.uid));
    const chatSnap = await getDocs(q2);
    let existingChat = null;

    chatSnap.forEach((doc) => {
      if (doc.data().users.includes(p.uid)) {
        existingChat = doc.id;
      }
    });

    if (!existingChat) {
      // Create chat with correct field name
      await addDoc(chatsRef, {
        users: [user.uid, p.uid],
        createdAt: Date.now(),
      });
    }

    toast(`You and ${p.name} matched! 💫`, "like");
  } else {
    // ❗ They have not liked you — just save your like (backend)
    await addDoc(likesRef, {
      from: user.uid,
      to: p.uid,
      createdAt: Date.now(),
    });
    toast(`Liked ${p.name} ✓`, "like");
  }

  // local app UI update (store by uid)
  upsertMatch({ uid: p.uid, name: p.name, img: p.img, desc: p.desc });
  animateAndAdvance("like");
});

btnDecline.addEventListener("click", () => {
  const p = currentProfile();
  if (!p) return;
  addDeclined(p.uid); // store uid
  animateAndAdvance("decline", {
    text: `You skipped ${p.name}`,
    type: "decline",
  });
});
btnAirplane.addEventListener("click", () => {
  window.location.href = "chat.html";
});
btnProfile.addEventListener("click", () => {
  window.location.href = "profile.html";
});

// Refresh (reset local decisions + re-run queue with backend exclusion + randomize)
document.getElementById("refreshTop").addEventListener("click", async () => {
  if (!confirm("Reset likes/declines? (Chat histories will stay)")) return;

  // Clear local decisions
  localStorage.removeItem(MATCHES_KEY);
  localStorage.removeItem(DECLINED_KEY);

  // Rebuild queue excluding backend likes
  const user = auth.currentUser;
  if (!user) return;

  const likesSnap = await getDocs(collection(db, "likes"));
  const alreadyLiked = new Set();
  const likedYou = new Set();
  likesSnap.forEach((doc) => {
    const like = doc.data();
    if (like.from === user.uid) alreadyLiked.add(like.to);
    if (like.to === user.uid) likedYou.add(like.from);
  });

  rebuildQueue(alreadyLiked, likedYou);
  renderStack();
  toast("Decisions reset ✓", "info");
});

/* ===== Progress ===== */
function updateProgress() {
  const total = PROFILES_MASTER.length,
    remaining = queue.length,
    done = total - remaining;
  const pct = total ? Math.round((done / total) * 100) : 100;
  progressText.textContent = `${remaining} of ${total} profiles left`;
  if (progressFill) progressFill.style.width = `${pct}%`;
}

/* ===== Ambient canvas ===== */
const c = document.getElementById("ambient");
let ctx = null;
if (c) ctx = c.getContext("2d");
function resizeAmbient() {
  if (!c) return;
  c.width = document.querySelector(".center-wrap").clientWidth;
  c.height = 180;
}
function animDots() {
  if (!c || !ctx) return;
  const dots = Array.from({ length: 20 }, () => ({
    x: Math.random() * c.width,
    y: Math.random() * c.height,
    r: Math.random() * 3 + 1,
    dx: Math.random() * 0.5 - 0.25,
    dy: Math.random() * 0.5 - 0.25,
  }));
  function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#FF8D76";
    dots.forEach((d) => {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, 2 * Math.PI);
      ctx.fill();
      d.x += d.dx;
      d.y += d.dy;
      if (d.x < 0 || d.x > c.width) d.dx *= -1;
      if (d.y < 0 || d.y > c.height) d.dy *= -1;
    });
    requestAnimationFrame(tick);
  }
  tick();
}
window.addEventListener("resize", resizeAmbient);

/* ===== Init ===== */
resizeAmbient();
animDots();
rebuildQueue();
renderStack();

document.getElementById("btnHome").onclick = () => {
  window.location.href = "home.html";
};

document.getElementById("btnLogout").onclick = () => {
  import("./firebase-config.js").then(({ auth }) => {
    import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js")
      .then(({ signOut }) => signOut(auth))
      .then(() => (window.location.href = "index.html"));
  });
};
