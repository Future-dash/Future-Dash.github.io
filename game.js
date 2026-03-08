/**
 * FUTURE DASH - CORE ENGINE v2.4.0
 * Includes: Cloud Sync, Ghost System, Audio Synth, and Object Rotation
 */

(function() {
    // ===============================
    // 1. ENGINE CONSTANTS & STATE
    // ===============================
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    
    // Set canvas to full screen
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const TILE = 50; 
    const GRAVITY_CONST = 1.2; 
    const MOVE_SPEED = 9;
    const JUMP_POWER = 16; 
    const PAD_POWER = 26;
    const COYOTE_TIME_MAX = 100; 
    const JUMP_BUFFER_MAX = 100;
    const CAMERA_SMOOTHING = 0.08;
    const fpsInterval = 1000 / 60;

    let lastTime = Date.now();
    let isCommunityLevel = false;
    let gameOver = false, gameWin = false, startTime = Date.now(), finalTime = 0;
    let cameraX = 0, lastOnGroundTime = 0, lastJumpPressTime = 0, screenShake = 0, beatTimer = 0;
    let particles = [], deathShards = [], ghostPath = [], ghostFrame = 0, currentRunPath = [];

    // Load Level Data
    let rawLevelData = localStorage.getItem("playLevel");
    let parsedData = rawLevelData ? JSON.parse(rawLevelData) : { blocks: [] };
    let obstacles = parsedData.blocks || (Array.isArray(parsedData) ? parsedData : []);
    let currentLevelName = parsedData.name || "Unnamed Level";

    const player = { 
        x: 100, y: 100, width: 40, height: 40, 
        velX: 0, velY: 0, onGround: false, gravityDir: 1, inPortal: false, isPlane: false, visible: true,
        rotation: 0
    };

    const keys = {};
    const stars = Array.from({ length: 150 }, () => ({
        x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.5, depth: Math.random() * 0.3 + 0.05, twinkle: Math.random() * Math.PI
    }));

    // ===============================
    // 2. AUDIO SYNTH ENGINE
    // ===============================
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playKick(time) {
        const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
        g.gain.setValueAtTime(0.2, time);
        g.gain.linearRampToValueAtTime(0, time + 0.1);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + 0.1);
    }

    function playHat(time) {
        const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(8000, time);
        g.gain.setValueAtTime(0.015, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + 0.05);
    }

    function playSound(type) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        if (type === 'jump') {
            const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
            g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.connect(g); g.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.12);
        } else if (type === 'death') {
            const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(30, now + 0.4);
            g.gain.setValueAtTime(0.15, now); osc.connect(g); g.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.4);
        } else if (type === 'pad' || type === 'gravity') {
            const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
            g.gain.setValueAtTime(0.1, now); osc.connect(g); g.connect(audioCtx.destination);
            osc.start(); osc.stop(now + 0.2);
        } else if (type === 'win') {
            [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
                const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
                o.type = 'triangle'; o.frequency.setValueAtTime(f, now + (i * 0.1));
                g.gain.setValueAtTime(0.05, now + (i * 0.1));
                o.connect(g); g.connect(audioCtx.destination);
                o.start(now + (i * 0.1)); o.stop(now + (i * 0.1) + 0.2);
            });
        }
    }

    // ===============================
    // 3. CLOUD & PERSISTENCE
    // ===============================
    async function loadCloudLevel() {
        const levelId = localStorage.getItem("NEXT_LEVEL_ID");
        if (levelId) {
            if (typeof window.getLevelByID !== 'function') {
                setTimeout(loadCloudLevel, 100);
                return;
            }
            const levelData = await window.getLevelByID(levelId);
            if (levelData) {
                currentLevelName = levelData.name;
                obstacles = (typeof levelData.data === 'string') ? JSON.parse(levelData.data) : levelData.blocks; 
                isCommunityLevel = true;
                loadGhost();
                restart(); 
            }
            localStorage.removeItem("NEXT_LEVEL_ID");
        }
    }

    function getPlayerColor() {
        const user = localStorage.getItem("loggedInUser");
        const userSettings = JSON.parse(localStorage.getItem("FD_USER_SETTINGS")) || {};
        let baseColor = (user && userSettings[user]?.color) || "#67ffff";
        return player.gravityDir === 1 ? baseColor : "#bf40bf"; 
    }

    function loadGhost() {
        const user = localStorage.getItem("loggedInUser");
        const allGhosts = JSON.parse(localStorage.getItem("FD_GHOSTS")) || {};
        ghostPath = (user && allGhosts[currentLevelName] && allGhosts[currentLevelName][user]) ? allGhosts[currentLevelName][user] : [];
    }

    async function saveStats(score) {
        const username = localStorage.getItem("loggedInUser") || "Guest";
        const secretKey = "FutureDash_99_Security"; 
        const validationToken = score + "-" + secretKey;
        const runData = {
            levelName: currentLevelName,
            time: parseFloat(score),
            username: username,
            token: btoa(validationToken)
        };
        if (isCommunityLevel && window.saveToLeaderboardFree) {
            await window.saveToLeaderboardFree(runData);
        }
    }

    function saveLocalScore(levelName, time) {
        const SCORE_KEY = "FD_SCORES";
        let scores = JSON.parse(localStorage.getItem(SCORE_KEY)) || {};
        if (!scores[levelName] || parseFloat(time) < parseFloat(scores[levelName])) {
            scores[levelName] = parseFloat(time);
            localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
        }
    }

    // ===============================
    // 4. CORE ENGINE LOGIC
    // ===============================
    function rectCollision(a, b) {
        return (a.x < b.x + TILE && a.x + a.width > b.x && a.y < b.y + TILE && a.y + a.height > b.y);
    }

    function triggerDeath() {
        if (gameOver) return;
        gameOver = true; player.visible = false; screenShake = 25; playSound('death');
        const pColor = getPlayerColor();
        for (let i = 0; i < 25; i++) {
            deathShards.push({
                x: player.x + 20, y: player.y + 20,
                vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.8) * 16,
                size: Math.random() * 8 + 4, life: 1.0, color: pColor
            });
        }
    }

    function restart() {
        player.x = 100; player.y = 100; player.velX = 0; player.velY = 0; player.gravityDir = 1;
        player.isPlane = false; player.visible = true; player.onGround = false; player.rotation = 0;
        gameOver = false; gameWin = false; startTime = Date.now(); finalTime = 0;
        currentRunPath = []; ghostFrame = 0; particles = []; deathShards = [];
        cameraX = player.x - canvas.width / 2; screenShake = 0;
    }

    function update() {
        const now = Date.now();
        const elapsed = now - lastTime;

        if (elapsed > fpsInterval) {
            lastTime = now - (elapsed % fpsInterval);

            // Particle Physics
            deathShards.forEach(s => { 
                s.x += s.vx; s.y += s.vy; 
                s.vy += GRAVITY_CONST * 0.5; s.life -= 0.02; 
            });

            if (gameOver || gameWin) return;

            // Music Engine
            beatTimer += 0.05;
            if (Math.floor(beatTimer * 4) !== Math.floor((beatTimer - 0.05) * 4)) {
                let step = Math.floor(beatTimer * 4);
                if (step % 4 === 0) playKick(audioCtx.currentTime);
                if (step % 2 === 0) playHat(audioCtx.currentTime);
            }

            // Path Recording
            currentRunPath.push({ x: Math.round(player.x), y: Math.round(player.y) });

            // Horizontal Movement
            if (keys["a"] || keys["arrowleft"]) player.velX = -MOVE_SPEED;
            else if (keys["d"] || keys["arrowright"]) player.velX = MOVE_SPEED;
            else player.velX = 0;

            // Vertical Movement
            if (player.isPlane) {
                let flyForce = 0.6;
                if (keys["w"] || keys["arrowup"] || keys[" "]) player.velY -= flyForce * player.gravityDir;
                else player.velY += flyForce * player.gravityDir;
                player.velY = Math.max(-9, Math.min(9, player.velY));
            } else {
                player.velY += (GRAVITY_CONST * player.gravityDir);
                if (player.onGround) lastOnGroundTime = now;
                if (keys["w"] || keys["arrowup"] || keys[" "]) lastJumpPressTime = now;
                
                if ((now - lastOnGroundTime < COYOTE_TIME_MAX) && (now - lastJumpPressTime < JUMP_BUFFER_MAX)) {
                    player.velY = -JUMP_POWER * player.gravityDir;
                    player.onGround = false; lastJumpPressTime = 0; 
                    playSound('jump');
                }
                if (!player.onGround) player.rotation += 0.15;
            }

            // X Collisions
            player.x += player.velX;
            for (let t of obstacles) {
                if (t.type === "block" && rectCollision(player, t)) {
                    if (player.velX > 0) player.x = t.x - player.width;
                    if (player.velX < 0) player.x = t.x + TILE;
                }
            }

            // Y Collisions & Triggers
            player.y += player.velY;
            player.onGround = false;
            let touchingPortal = false;

            for (let t of obstacles) {
                if (rectCollision(player, t)) {
                    if (t.type === "block") {
                        if (player.gravityDir === 1) {
                            if (player.velY > 0) { player.y = t.y - player.height; player.onGround = true; player.velY = 0; player.rotation = 0; }
                            else if (player.velY < 0) { player.y = t.y + TILE; player.velY = 0; }
                        } else {
                            if (player.velY < 0) { player.y = t.y + TILE; player.onGround = true; player.velY = 0; player.rotation = 0; }
                            else if (player.velY > 0) { player.y = t.y - player.height; player.velY = 0; }
                        }
                    } 
                    else if (t.type === "spike") triggerDeath();
                    else if (t.type === "finish") { 
                        gameWin = true; finalTime = ((Date.now() - startTime)/1000).toFixed(2);
                        playSound('win'); saveStats(finalTime); saveLocalScore(currentLevelName, finalTime);
                    }
                    else if (t.type === "jumppad") { player.velY = -PAD_POWER * player.gravityDir; playSound('pad'); screenShake = 12; }
                    else if (t.type === "gravity") {
                        touchingPortal = true;
                        if (!player.inPortal) { player.gravityDir *= -1; player.velY = 0; player.inPortal = true; playSound('gravity'); }
                    }
                    else if (t.type === "plane") {
                        touchingPortal = true;
                        if (!player.inPortal) { player.isPlane = !player.isPlane; player.inPortal = true; playSound('gravity'); }
                    }
                }
            }
            if (!touchingPortal) player.inPortal = false;
            if (player.y > canvas.height + 150 || player.y < -150) triggerDeath();

            // Camera & Particles
            let targetCamX = player.x - canvas.width / 2 + (player.velX * 18);
            cameraX += (targetCamX - cameraX) * CAMERA_SMOOTHING;
            if (screenShake > 0) screenShake *= 0.9;

            if (Math.abs(player.velX) > 0 || !player.onGround) {
                particles.push({ x: player.x + 15, y: player.y + 15, size: Math.random() * 8 + 2, life: 1.0, decay: 0.04 });
            }
            particles = particles.filter(p => (p.life -= p.decay) > 0);
        }
    }

    // ===============================
    // 5. GRAPHICS ENGINE
    // ===============================
    function draw() {
        ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Parallax Stars
        stars.forEach(s => {
            let starX = (s.x - cameraX * s.depth) % canvas.width; if (starX < 0) starX += canvas.width;
            ctx.globalAlpha = 0.3 + Math.abs(Math.sin(Date.now() * 0.001 + s.twinkle)) * 0.7;
            ctx.fillStyle = "white"; ctx.fillRect(starX, s.y, s.size, s.size);
        });
        ctx.globalAlpha = 1.0;

        ctx.save();
        if (screenShake > 0.5) ctx.translate(Math.random()*screenShake - screenShake/2, Math.random()*screenShake - screenShake/2);
        
        // Dynamic Grid
        let gSize = 100 + (Math.sin(beatTimer) * 5);
        let pGX = (cameraX * 0.2) % gSize;
        ctx.strokeStyle = "#112222"; ctx.beginPath();
        for (let x = -pGX; x < canvas.width; x += gSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y < canvas.height; y += gSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        ctx.save(); ctx.translate(-cameraX, 0);

        // Ghost Rendering
        if (ghostPath[ghostFrame]) {
            ctx.globalAlpha = 0.15; ctx.fillStyle = "cyan"; 
            ctx.fillRect(ghostPath[ghostFrame].x, ghostPath[ghostFrame].y, 40, 40);
            ctx.globalAlpha = 1.0; if (!gameOver && !gameWin) ghostFrame++;
        }

        // Particles & Shards
        particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = getPlayerColor(); ctx.fillRect(p.x, p.y, p.size, p.size); });
        deathShards.forEach(s => { ctx.globalAlpha = Math.max(0, s.life); ctx.fillStyle = s.color; ctx.fillRect(s.x, s.y, s.size, s.size); });
        ctx.globalAlpha = 1.0;

        // Obstacle Rendering
        for (let t of obstacles) {
            ctx.save();
            if (t.type === "block") ctx.fillStyle = "white";
            else if (t.type === "spike") ctx.fillStyle = "red";
            else if (t.type === "finish") ctx.fillStyle = "gold";
            else if (t.type === "jumppad") ctx.fillStyle = "yellow";
            else if (t.type === "gravity") ctx.fillStyle = "#bf40bf";
            else if (t.type === "plane") ctx.fillStyle = "#44ff44";

            if (t.type === "spike") {
                ctx.translate(t.x + 25, t.y + 25);
                if (t.rotation) ctx.rotate((t.rotation * Math.PI) / 180);
                ctx.beginPath(); ctx.moveTo(-25, 25); ctx.lineTo(0, -25); ctx.lineTo(25, 25); ctx.fill();
            } else if (t.type === "gravity" || t.type === "plane") {
                ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2;
                ctx.strokeRect(t.x+5, t.y+5, TILE-10, TILE-10);
                ctx.globalAlpha = 0.2; ctx.fillRect(t.x+10, t.y+10, TILE-20, TILE-20); ctx.globalAlpha = 1.0;
            } else {
                ctx.fillRect(t.x, t.y, TILE, TILE);
            }
            ctx.restore();
        }

        // Player Rendering
        if (player.visible) {
            ctx.save(); ctx.translate(player.x + 20, player.y + 20);
            if (player.isPlane) ctx.rotate(player.velY * 0.05);
            else ctx.rotate(player.rotation);
            const col = getPlayerColor();
            ctx.fillStyle = col; ctx.shadowBlur = 15; ctx.shadowColor = col;
            ctx.fillRect(-20, -20, 40, 40); ctx.restore();
        }
        ctx.restore(); ctx.restore();

        // Scanline overlay
        ctx.fillStyle = "rgba(18, 16, 16, 0.1)"; for (let i = 0; i < canvas.height; i += 4) ctx.fillRect(0, i, canvas.width, 1);

        // UI
        if (gameOver || gameWin) {
            ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0,0,canvas.width, canvas.height);
            ctx.textAlign = "center"; ctx.fillStyle = gameWin ? "#00ffcc" : "#ff0044";
            ctx.font = "bold 60px Courier New";
            ctx.fillText(gameWin ? "RECORD: " + finalTime + "s" : "SYSTEM CRITICAL", canvas.width/2, canvas.height/2 - 40);
            ctx.font = "20px Courier New"; ctx.fillStyle = "white";
            ctx.fillText("PRESS [ENTER] TO REBOOT", canvas.width/2, canvas.height/2 + 60);
            ctx.fillText("PRESS [SPACE] FOR MENU", canvas.width/2, canvas.height/2 + 100);
        } else {
            ctx.fillStyle = "white"; ctx.font = "18px Courier New"; ctx.textAlign = "left";
            ctx.fillText(`DATA: ${currentLevelName.toUpperCase()} | TIME: ${((Date.now() - startTime)/1000).toFixed(2)}s`, 20, 40);
        }
    }

    // ===============================
    // 6. MAIN LOOP & STARTUP
    // ===============================
    function mainLoop() {
        update();
        draw();
        requestAnimationFrame(mainLoop);
    }

    document.addEventListener("keydown", e => {
        const k = e.key.toLowerCase(); keys[k] = true;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if ((gameOver || gameWin) && (k === "enter")) restart();
        if (k === "r") restart();
        if ((gameOver || gameWin) && k === " ") window.location.href = "index.html";
    });
    document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

    window.onload = async () => {
        loadGhost();
        await loadCloudLevel();
        mainLoop(); 
    };
})();