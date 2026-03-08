// MENU BUTTONS
document.getElementById("playBtn").onclick = () => {
    window.location.href = "levelselect.html";
};

document.getElementById("editorBtn").onclick = () => {
    window.location.href = "editor.html";
};

document.getElementById("creditsBtn").onclick = () => {
    window.location.href = "credits.html";
};

document.getElementById("githubBtn").onclick = () => {
    window.open("https://github.com/Future-dash/Future-dash.github.io/issues", "_blank");
};

// Login now goes to login.html instead of alert
document.getElementById("loginBtn").onclick = () => {
    window.location.href = "login.html";
};

document.getElementById("leaderboardBtn").onclick = () => {
    window.location.href = "leaderboard.html";
};

document.getElementById("settingsBtn").onclick = () => {
    window.location.href = "settings.html";
};
// Check login status when the menu loads
window.onload = function() {
    const loggedInUser = localStorage.getItem("loggedInUser");
    const loginBtn = document.getElementById("loginBtn");

    if (loggedInUser) {
        // Change button appearance and text
        loginBtn.innerText = "Logout (" + loggedInUser + ")";
        loginBtn.classList.remove("blue");
        loginBtn.classList.add("green"); // Or a logout color

        // Change the button's click behavior to logout
        loginBtn.onclick = function() {
            localStorage.removeItem("loggedInUser");
            location.reload(); // Refresh to show "Login" again
        };
    } else {
        // Standard behavior
        loginBtn.onclick = function() {
            window.location.href = "login.html";
        };
    }
};