const STORAGE_KEY = "FD_LEVELS";
const levelList = document.getElementById("levelList");

function loadLevels() {
    const levels = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const names = Object.keys(levels);
    const allBoards = JSON.parse(localStorage.getItem("FD_LEADERBOARDS")) || {};
    const currentUser = localStorage.getItem("loggedInUser");

    if (names.length === 0) {
        levelList.innerHTML = "<p>No levels saved yet.</p>";
        return;
    }

    levelList.innerHTML = "";

    names.forEach(levelName => {
        const container = document.createElement("div");
        container.style.margin = "10px";

        const btn = document.createElement("button");
        btn.textContent = "Play: " + levelName;
        btn.style.padding = "15px";

        // Find Personal Best for this level
        let pbText = "";
        if (currentUser && allBoards[levelName]) {
            const userScores = allBoards[levelName]
                .filter(s => s.username === currentUser)
                .sort((a, b) => a.time - b.time);
            
            if (userScores.length > 0) {
                pbText = ` <span style="color:gold;">(PB: ${userScores[0].time}s)</span>`;
            }
        }

        const info = document.createElement("span");
        info.innerHTML = pbText;

        btn.onclick = () => {
            localStorage.setItem("playLevel", JSON.stringify(levels[levelName].blocks));
            localStorage.setItem("currentLevelName", levelName); // Track level name
            window.location.href = "game.html";
        };

        container.appendChild(btn);
        container.appendChild(info);
        levelList.appendChild(container);
    });
}

loadLevels();