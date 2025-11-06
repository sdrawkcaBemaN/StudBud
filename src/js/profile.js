import { auth, db, storage} from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged  } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const usernameInput = document.getElementById("username");
const batchInput = document.getElementById("batch");
const emailInput = document.getElementById("email");
const facultyInput = document.getElementById("faculty");
const phoneInput = document.getElementById("phone");
const programInput = document.getElementById("program");
const descriptionInput = document.getElementById("description");
const form = document.getElementById("profileForm");

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "login.html");
  console.log(user);

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    usernameInput.value = data.username || "";
    batchInput.value = data.batch || "";
    facultyInput.value = data.faculty || "";
    phoneInput.value = data.phone || "";
    programInput.value = data.program || "";
    descriptionInput.value = data.description || "";
    profileImage.src = data.profilePic || "https://placehold.co/142x142";
  }
});

profilePicInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const user = auth.currentUser;
  const storageRef = ref(storage, `profilePictures/${user.uid}`);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", user.uid), { profilePic: url });

  profileImage.src = url; // Update instantly
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  await updateDoc(doc(db, "users", user.uid), {
    username: usernameInput.value,
    batch: batchInput.value,
    faculty: facultyInput.value,
    phone: phoneInput.value,
    program: programInput.value,
    description: descriptionInput.value,
  });

  alert("Profile updated!");
  window.location.href = "match.html"
});
