import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const startBtn = document.getElementById("startBtn");
const navAnon = document.getElementById("navAnon");
const navAuthed = document.getElementById("navAuthed");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    navAnon.style.display = "none";
    navAuthed.style.display = "flex";
  } else {
    navAnon.style.display = "flex";
    navAuthed.style.display = "none";
  }
});

startBtn.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    localStorage.setItem("returnTo", "match.html");
    window.location.href = "login.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    window.location.href = "profile.html";
    return;
  }

  const userData = userSnap.data();
  if (userData.profilePic) {
    window.location.href = "match.html";
  } else {
    window.location.href = "profile.html";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);

    window.location.href = "home.html";
  } catch (err) {
    console.error("Logout failed:", err);
    alert("Failed to logout. Try again.");
  }
});

document.getElementById("year").textContent = new Date().getFullYear();
