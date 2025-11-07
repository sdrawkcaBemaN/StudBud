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
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        
        await updateProfile(user, {
            displayName: username
        });

        
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

