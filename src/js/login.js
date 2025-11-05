import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

document.getElementById("login").onclick = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Logged in!");

        
      // Optional redirect:
      // window.location.href = "home.html";

        window.location.href = "profile.html";

    })
    .catch(err => {
      alert(err.message);
    });
};
