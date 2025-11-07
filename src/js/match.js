import { auth, db } from "./firebase-config.js";
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { supabase } from './supabase-config.js'

/* ===== Data (swap these image paths to your files) ===== */
let PROFILES_MASTER = [];

onAuthStateChanged(auth, async (user) => {
    if (!user) return (window.location.href = "login.html");

    // load all users except yourself
    const snap = await getDocs(collection(db, "users"));
    PROFILES_MASTER = [];

    snap.forEach(docSnap => {
        const data = docSnap.data();
        if (docSnap.id !== user.uid && data.username && data.profilePic) {
            PROFILES_MASTER.push({
                uid: docSnap.id,
                name: data.username,
                img: data.profilePic,
                desc: data.description,
                info: `${data.faculty || ''} ${data.batch || ''}`.trim()
            });
        }
    });

    // now rebuild UI with real profiles
    rebuildQueue();
    renderStack();
});

/* ===== Storage ===== */
const MATCHES_KEY = 'thinker_matches';      // [{name,img,desc}]
const DECLINED_KEY = 'thinker_declined';    // [name]
const loadJSON = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f } catch { return f } };
const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const loadMatches = () => loadJSON(MATCHES_KEY, []);
const saveMatches = (arr) => saveJSON(MATCHES_KEY, arr);
const loadDeclined = () => loadJSON(DECLINED_KEY, []);
const saveDeclined = (arr) => saveJSON(DECLINED_KEY, arr);

function upsertMatch(obj) {
    const list = loadMatches();
    const i = list.findIndex(m => (typeof m === 'string' ? m : m.name) === obj.name);
    if (i >= 0) list[i] = obj; else list.push(obj);
    saveMatches(list);
    const key = 'chat_history_' + obj.name;
    if (!localStorage.getItem(key)) localStorage.setItem(key, '[]');
}
function addDeclined(name) {
    const d = loadDeclined();
    if (!d.includes(name)) { d.push(name); saveDeclined(d); }
}

/* ===== DOM ===== */
const stackEl = document.getElementById('stack');
const btnDecline = document.getElementById('btnDecline');
const btnTick = document.getElementById('btnTick');
const btnAirplane = document.getElementById('btnAirplane');
const btnProfile = document.getElementById('btnProfile');
const toastsEl = document.getElementById('toasts');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
document.getElementById('year').textContent = new Date().getFullYear();

/* ===== Toasts ===== */
function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="dot"></span> ${msg}`;
    toastsEl.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

/* ===== Queue ===== */
let queue = [];
function rebuildQueue() {
    const liked = new Set(loadMatches().map(m => (typeof m === 'string' ? m : m.name)));
    const declined = new Set(loadDeclined());
    queue = PROFILES_MASTER.filter(p => !liked.has(p.name) && !declined.has(p.name));
}

function renderStack() {
    stackEl.innerHTML = '';
    if (queue.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = "color:#333;font-size:20px;padding:12px 16px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)";
        empty.textContent = "No more profiles — check your Messages ✈️";
        stackEl.appendChild(empty);
        updateProgress();
        return;
    }
    queue.forEach((p, i) => {
        const card = document.createElement('div'); card.className = 'card'; card.dataset.index = i;
        const img = document.createElement('img'); img.src = p.img; img.alt = p.name;
        const info = document.createElement('div'); info.className = 'info';
        info.innerHTML = `<div class="left"><div class="name">${p.name}</div><div class="desc">${p.desc}</div></div>`;
        const likeB = document.createElement('div'); likeB.className = 'badge like'; likeB.textContent = 'Like';
        const disB = document.createElement('div'); disB.className = 'badge decline'; disB.textContent = 'Nope';
        card.appendChild(img); card.appendChild(info); card.appendChild(likeB); card.appendChild(disB);
        stackEl.appendChild(card);
    });
    attachDrag();
    updateProgress();
}

function currentProfile() { return queue.length ? queue[queue.length - 1] : null; }
function topCardElement() { const last = stackEl.lastElementChild; return last && last.classList.contains('card') ? last : null; }
function animateAndAdvance(anim, showToast) {
    const el = topCardElement(); if (!el) return;
    el.classList.add(anim);
    setTimeout(() => { queue.pop(); renderStack(); if (showToast) toast(showToast.text, showToast.type); }, 360);
}

/* ===== Buttons ===== */
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

    chatSnap.forEach(doc => {
      if (doc.data().users.includes(p.uid)) {
        existingChat = doc.id;
      }
    });

    if (!existingChat) {
      // Create chat with correct field name
      await addDoc(chatsRef, {
        users: [user.uid, p.uid],
        createdAt: Date.now()
      });
    }

    toast(`You and ${p.name} matched! 💫`, "like");
  } else {
    // ❗ They have not liked you — just save your like
    await addDoc(likesRef, {
      from: user.uid,
      to: p.uid,
      createdAt: Date.now()
    });
    toast(`Liked ${p.name} ✓`, "like");
  }

  // local app UI update
  upsertMatch({ name: p.name, img: p.img, desc: p.desc });
  animateAndAdvance("like");
});



btnDecline.addEventListener('click', () => {
    const p = currentProfile(); if (!p) return;
    addDeclined(p.name);
    animateAndAdvance('decline', { text: `Declined ${p.name} ✖`, type: 'decline' });
});
btnAirplane.addEventListener('click', () => { window.location.href = 'chat.html'; });
btnProfile.addEventListener('click', () => {
    const p = currentProfile(); if (!p) return;
});
btnProfile.addEventListener('click', () => { window.location.href = 'profile.html'; });
btnProfile.addEventListener('click', () => {
    const p = currentProfile(); if (!p) return;
});

document.getElementById('btnReset').addEventListener('click', () => {
    if (!confirm("Reset likes/declines? (Chat histories will stay)")) return;
    localStorage.removeItem(MATCHES_KEY);
    localStorage.removeItem(DECLINED_KEY);
    rebuildQueue(); renderStack();
    toast('Decisions reset ✓', 'info');
});

/* ===== Progress ===== */
function updateProgress() {
    const total = PROFILES_MASTER.length, remaining = queue.length, done = total - remaining;
    const pct = total ? Math.round((done / total) * 100) : 100;
    progressText.textContent = `${remaining} of ${total} profiles left`;
    progressFill.style.width = `${pct}%`;
}

/* ===== Ambient canvas ===== */
const c = document.getElementById('ambient'); const ctx = c.getContext('2d');
function resizeAmbient() { c.width = document.querySelector('.center-wrap').clientWidth; c.height = 180; }
function animDots() {
    const dots = Array.from({ length: 20 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 3 + 1, dx: Math.random() * .5 - .25, dy: Math.random() * .5 - .25 }));
    function tick() {
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#FF8D76";
        dots.forEach(d => {
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 2 * Math.PI); ctx.fill();
            d.x += d.dx; d.y += d.dy; if (d.x < 0 || d.x > c.width) d.dx *= -1; if (d.y < 0 || d.y > c.height) d.dy *= -1;
        });
        requestAnimationFrame(tick);
    }
    tick();
}
window.addEventListener('resize', resizeAmbient);

/* ===== Drag-to-like/decline ===== */
function attachDrag() {
    const card = topCardElement(); if (!card) return;
    const likeB = card.querySelector('.badge.like'); const disB = card.querySelector('.badge.decline');
    let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false;
    const start = (x, y) => { dragging = true; sx = x; sy = y; dx = 0; dy = 0; card.style.transition = 'none' };
    const move = (x, y) => {
        if (!dragging) return; dx = x - sx; dy = y - sy;
        const rot = dx * 0.05, blur = Math.min(Math.abs(dx) / 50, 3);
        card.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg)`; card.style.filter = `blur(${blur}px)`;
        const la = Math.min(Math.max(dx / 120, 0), 1), da = Math.min(Math.max(-dx / 120, 0), 1);
        likeB.style.opacity = la; likeB.style.transform = `scale(${0.9 + la * 0.1})`;
        disB.style.opacity = da; disB.style.transform = `scale(${0.9 + da * 0.1})`;
    };
    const end = () => {
        if (!dragging) return; dragging = false; likeB.style.opacity = 0; disB.style.opacity = 0;
        const threshold = 140; card.style.transition = 'transform .28s ease, filter .28s ease';
        if (dx > threshold) {
            const p = currentProfile(); if (!p) return;
            upsertMatch({ name: p.name, img: p.img, desc: p.desc });
            card.style.transform = `translate(120%,0) rotate(10deg)`; card.style.filter = 'blur(2px)';
            setTimeout(() => { queue.pop(); renderStack(); toast(`Liked ${p.name} ✓`, 'like') }, 280);
        } else if (dx < -threshold) {
            const p = currentProfile(); if (!p) return;
            addDeclined(p.name);
            card.style.transform = `translate(-120%,0) rotate(-10deg)`; card.style.filter = 'blur(2px)';
            setTimeout(() => { queue.pop(); renderStack(); toast(`Declined ${p.name} ✖`, 'decline') }, 280);
        } else {
            card.style.transform = 'translate(0,0) rotate(0)'; card.style.filter = 'blur(0)';
        }
    };
    card.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', end);
    card.addEventListener('touchstart', e => { const t = e.touches[0]; start(t.clientX, t.clientY) }, { passive: true });
    card.addEventListener('touchmove', e => { const t = e.touches[0]; move(t.clientX, t.clientY) }, { passive: true });
    card.addEventListener('touchend', end); card.addEventListener('touchcancel', end);
}

/* ===== Init ===== */
resizeAmbient(); animDots();
rebuildQueue(); renderStack();