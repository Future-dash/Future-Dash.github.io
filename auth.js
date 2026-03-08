// auth.js - Pure Username/Password Authentication

/**
 * Helper to ensure Firebase bridge functions are ready before execution.
 */
async function ensureFirebase() {
    return new Promise((resolve) => {
        const check = () => {
            if (window.userLogin && window.userSignUp) resolve();
            else setTimeout(check, 100);
        };
        check();
    });
}

/**
 * Handles the Login logic using a Username.
 */
async function handleLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    
    if (!username || !password) return alert("Please enter both username and password.");

    // Background transformation to satisfy Firebase Auth requirements
    const identityEmail = `${username.toLowerCase()}@future-dash.io`;

    await ensureFirebase();

    try {
        await window.userLogin(identityEmail, password);
        // Persistence and redirection is handled by onAuthStateChanged in firebase-init.js
        window.location.href = "index.html";
    } catch (e) {
        alert("Login Failed: Invalid credentials.");
        console.error("Auth Error:", e.code);
    }
}

/**
 * Handles the Registration logic and ensures username uniqueness.
 */
async function handleRegister() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Validation
    if (username.length < 3) return alert("Username must be at least 3 characters.");
    if (password.length < 6) return alert("Password must be at least 6 characters.");

    const identityEmail = `${username.toLowerCase()}@future-dash.io`;

    await ensureFirebase();

    try {
        const userCredential = await window.userSignUp(identityEmail, password);
        const user = userCredential.user;

        // Save the display username to the Firestore profile immediately
        // This ensures leaderboards show the clean name, not an email.
        if (window.updateUserProfile) {
            await window.updateUserProfile(user.uid, {
                username: username,
                records: {},
                ghosts: {}
            });
        }
        
        localStorage.setItem("loggedInUser", username);
        window.location.href = "index.html";
    } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
            alert("This username is already taken. Please try another one!");
        } else {
            alert("Registration Error: " + e.message);
        }
    }
}

// Global scope attachment for the buttons in login.html
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;