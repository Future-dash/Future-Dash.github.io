function register() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();
    if (!u || !p) return alert("Fill all fields!");

    let users = JSON.parse(localStorage.getItem("users")) || [];
    if (users.find(user => user.username.toLowerCase() === u.toLowerCase())) {
        return alert("Username already exists!");
    }

    users.push({ username: u, password: p });
    localStorage.setItem("users", JSON.stringify(users));
    alert("Account created! You can now login.");
}

function login() {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();
    let users = JSON.parse(localStorage.getItem("users")) || [];
    
    const user = users.find(user => user.username === u && user.password === p);

    if (user) {
        localStorage.setItem("loggedInUser", u);
        window.location.href = "index.html";
    } else {
        alert("Invalid username or password!");
    }
}

// Ensure this function ONLY removes the session name
function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
}