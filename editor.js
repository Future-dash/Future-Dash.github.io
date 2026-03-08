(function() {
const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const blockSize = 50; 
let cameraX = 0;
let currentTool = "block";
let currentLevelName = null;
const STORAGE_KEY = "FD_LEVELS";

let levelData = { name:"", blocks: [] };

// Tool List
const buttons = ["blockBtn", "spikeBtn", "finishBtn", "jumpPadBtn", "gravityBtn", "deleteBtn", "planeBtn"];

function setActive(id) {
    buttons.forEach(b => {
        const btn = document.getElementById(b);
        if(btn) btn.classList.remove("active");
    });
    const activeBtn = document.getElementById(id);
    if(activeBtn) activeBtn.classList.add("active");
}

// Tool Selection Handlers
document.getElementById("blockBtn").onclick = () => { currentTool = "block"; setActive("blockBtn"); };
document.getElementById("spikeBtn").onclick = () => { currentTool = "spike"; setActive("spikeBtn"); };
document.getElementById("finishBtn").onclick = () => { currentTool = "finish"; setActive("finishBtn"); };
document.getElementById("jumpPadBtn").onclick = () => { currentTool = "jumppad"; setActive("jumpPadBtn"); };
document.getElementById("gravityBtn").onclick = () => { currentTool = "gravity"; setActive("gravityBtn"); };
document.getElementById("planeBtn").onclick = () => { currentTool = "plane"; setActive("planeBtn"); };
document.getElementById("deleteBtn").onclick = () => { currentTool = "delete"; setActive("deleteBtn"); };

// Publish Listener
document.getElementById("publish-btn").onclick = () => {
    const levelTitle = prompt("Enter a name for your level:");
    const creatorName = prompt("Enter your Creator Name:", "GuestDev");
    
    const blocksToPublish = levelData.blocks;

    if (levelTitle && blocksToPublish && blocksToPublish.length > 0) {
        console.log("Publishing " + blocksToPublish.length + " blocks...");
        window.publishLevel(levelTitle, creatorName, blocksToPublish);
    } else {
        alert("Error: No map data found to publish. Place some blocks first!");
    }
};

// File Management
document.getElementById("saveBtn").onclick = saveLevel;
document.getElementById("loadBtn").onclick = loadLevel;
document.getElementById("newBtn").onclick = newLevel;

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Grid
    ctx.strokeStyle="#222";
    for(let x=0; x<canvas.width + cameraX; x+=blockSize){
        ctx.beginPath();
        ctx.moveTo(x - (cameraX % blockSize), 0);
        ctx.lineTo(x - (cameraX % blockSize), canvas.height);
        ctx.stroke();
    }
    for(let y=0; y<canvas.height; y+=blockSize){
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Drawing Elements
    levelData.blocks.forEach(obj => {
        const drawX = obj.x - cameraX;
        if(drawX + blockSize < 0 || drawX > canvas.width) return;

        ctx.save();
        // Move context to the center of the block for rotation
        ctx.translate(drawX + blockSize / 2, obj.y + blockSize / 2);
        if (obj.rotation) {
            ctx.rotate((obj.rotation * Math.PI) / 180);
        }

        if (obj.type === "block") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-blockSize / 2, -blockSize / 2, blockSize, blockSize);
        } else if (obj.type === "spike") {
            ctx.fillStyle = "red";
            ctx.beginPath();
            // Coordinates are relative to the center due to translate()
            ctx.moveTo(-blockSize / 2, blockSize / 2);
            ctx.lineTo(0, -blockSize / 2);
            ctx.lineTo(blockSize / 2, blockSize / 2);
            ctx.closePath();
            ctx.fill();
        } else if (obj.type === "finish") {
            ctx.fillStyle = "gold";
            ctx.fillRect(-blockSize / 2, -blockSize / 2, blockSize, blockSize);
        } else if (obj.type === "jumppad") {
            ctx.fillStyle = "yellow";
            ctx.fillRect(-blockSize / 2, (blockSize * 0.2), blockSize, blockSize * 0.3);
        } else if (obj.type === "gravity") {
            ctx.strokeStyle = "#bf40bf";
            ctx.lineWidth = 3;
            ctx.strokeRect(-blockSize / 2 + 5, -blockSize / 2 + 5, blockSize - 10, blockSize - 10);
            ctx.fillStyle = "rgba(191, 64, 191, 0.3)";
            ctx.fillRect(-blockSize / 2 + 10, -blockSize / 2 + 10, blockSize - 20, blockSize - 20);
        } else if (obj.type === "plane") {
            ctx.strokeStyle = "#44ff44";
            ctx.lineWidth = 3;
            ctx.strokeRect(-blockSize / 2 + 5, -blockSize / 2 + 5, blockSize - 10, blockSize - 10);
            ctx.fillStyle = "rgba(68, 255, 68, 0.3)";
            ctx.fillRect(-blockSize / 2 + 10, -blockSize / 2 + 10, blockSize - 20, blockSize - 20);
        }
        ctx.restore();
    });

    requestAnimationFrame(draw);
}
draw();

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const worldX = Math.floor((e.clientX - rect.left + cameraX) / blockSize) * blockSize;
    const worldY = Math.floor((e.clientY - rect.top) / blockSize) * blockSize;

    // Find if a block already exists at this location
    const existingIndex = levelData.blocks.findIndex(b => b.x === worldX && b.y === worldY);

    if (currentTool === "delete") {
        if (existingIndex !== -1) levelData.blocks.splice(existingIndex, 1);
    } else {
        if (existingIndex !== -1) {
            let block = levelData.blocks[existingIndex];
            // If clicking an existing spike with the spike tool, cycle rotation
            if (currentTool === "spike" && block.type === "spike") {
                block.rotation = (block.rotation || 0) + 90;
                if (block.rotation >= 360) block.rotation = 0;
            } else {
                // Otherwise replace the block
                levelData.blocks.splice(existingIndex, 1);
                if (currentTool === "finish") levelData.blocks = levelData.blocks.filter(b => b.type !== "finish");
                levelData.blocks.push({ x: worldX, y: worldY, type: currentTool, rotation: 0 });
            }
        } else {
            // Place new block
            if (currentTool === "finish") levelData.blocks = levelData.blocks.filter(b => b.type !== "finish");
            levelData.blocks.push({ x: worldX, y: worldY, type: currentTool, rotation: 0 });
        }
    }
});

document.addEventListener("keydown",(e)=>{
    if(e.key === "ArrowRight") cameraX += blockSize;
    if(e.key === "ArrowLeft") { cameraX -= blockSize; if(cameraX < 0) cameraX = 0; }
});

function saveLevel(){
    if(!currentLevelName) currentLevelName = prompt("Enter level name:");
    if(!currentLevelName) return;
    levelData.name = currentLevelName;
    let levels = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    levels[currentLevelName] = levelData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
    alert("Level Saved: " + currentLevelName);
}

function loadLevel(){
    let levels = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    let names = Object.keys(levels);
    if(names.length === 0) { alert("No saved levels."); return; }
    let choice = prompt("Available levels:\n" + names.join("\n"));
    if(!choice || !levels[choice]) return;
    currentLevelName = choice;
    levelData = levels[choice];
}

function newLevel(){
    currentLevelName = null;
    levelData = { name: "", blocks: [] };
    cameraX = 0;
}
})();
