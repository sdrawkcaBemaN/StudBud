import { auth, db } from "./firebase-config.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { supabase } from './supabase-config.js'

const usernameInput = document.getElementById("username");
const batchInput = document.getElementById("batch");
const emailInput = document.getElementById("email");
const facultyInput = document.getElementById("faculty");
const phoneInput = document.getElementById("phone");
const programInput = document.getElementById("program");
const descriptionInput = document.getElementById("description");
const form = document.getElementById("profileForm");

const uploadBtn = document.getElementById('uploadBtn');
const profileImage = document.getElementById('profileImage');
const profilePicInput = document.getElementById('profilePicInput');

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
    if (!user) return;

    try {
        // Create unique filename
        const fileName = `${user.uid}_${Date.now()}_${file.name}`;

        // Upload to Supabase storage bucket 'profile-pics'
        const { data, error } = await supabase
            .storage
            .from('profile-pics')
            .upload(fileName, file);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase
            .storage
            .from('profile-pics')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        if (!publicUrl) throw new Error("Could not get public URL");

        // Save URL to Firebase Firestore
        await updateDoc(doc(db, "users", user.uid), { profilePic: publicUrl });

        // Update image instantly
        profileImage.src = publicUrl;

        alert("Profile picture updated!");
    } catch (err) {
        console.error("Error uploading profile picture:", err.message);
        alert("Failed to upload picture. Check console for details.");
    }
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
