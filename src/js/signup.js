import { auth, db } from "./firebase-config.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

document.getElementById("signup").onclick = async function () {
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!username || !email || !password) {
        alert("Please fill out all fields.");
        return;
    }

    try {
        // 1. Create the user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update Firebase Auth profile
        await updateProfile(user, {
            displayName: username
        });

        // 3. Save username to Firestore
        await setDoc(doc(db, "users", user.uid), {
            username: username,
            email: email,
            batch: "",
            faculty: "",
            phone: "",
            program: "",
            description: "",
            profileImage: "",
            createdAt: new Date()
        });

        alert("Account created!");
        window.location.href = "login.html";

    } catch (err) {
        alert(err.message);
    }
};

