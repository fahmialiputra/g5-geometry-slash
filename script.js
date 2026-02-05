// --- KONFIGURASI GLOBAL ---
const config = {
    difficulty: 2,
    timerDuration: 5,
    targetShapes: 50,
    playerName: "Player",
    bgMenu: "bg-default", // Default Baru
    bgGame: "bg-grid"     // Default Baru
};

// New Logic Variables
let fastModeTimer = 0; // Untuk Evil Spike
let blurTimer = 0;     // Untuk Splash

// --- STATE VARIABLES ---
let gameState = 'title';
let gameMode = '';

let score = 0;
let lives = 3;
const maxLives = 5;

let timeRemaining = 0;
let timeElapsed = 0;
let shapesDestroyed = 0;

// Logic Variables
let shapes = [];
let particles = [];
let mousePath = [];
let lastTime = 0;
let spawnTimer = 0;
let isMouseDown = false;
let globalSpeed = 1.0; 

// Effects & Boss
let scoreMultiplier = 1;
let multiplierTimer = 0;
let slowMoTimer = 0;
let immunityTimer = 0;
let fxTimer = 0; 

// Boss Logic
let bossSpawned = false;
let bossActive = false;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- MANAJEMEN DATA ---
const DB_KEY = 'geo_slash_db_v3';
let leaderboardData = { time_trial: [], geometry_run: [] };

function loadData() {
    const saved = localStorage.getItem(DB_KEY);
    if(saved) leaderboardData = JSON.parse(saved);
}
function saveData() { localStorage.setItem(DB_KEY, JSON.stringify(leaderboardData)); }
function resetData() {
    showCustomConfirm(
        "Reset Data",
        "Apakah Anda yakin ingin menghapus semua data leaderboard?",
        () => {
            leaderboardData = { time_trial: [], geometry_run: [] };
            saveData();
            showMainMenu();
            showCustomAlert("Sukses", "Data leaderboard berhasil dihapus.");
        }
    );
}
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leaderboardData));
    const node = document.createElement('a');
    node.setAttribute("href", dataStr);
    node.setAttribute("download", "geoslash_save.json");
    document.body.appendChild(node);
    node.click();
    node.remove();
}
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = re => {
            try {
                leaderboardData = JSON.parse(re.target.result);
                saveData();
                showCustomAlert("Berhasil", "Data berhasil di-import!");
                updateSettingsUI();
            } catch (err) { 
                showCustomAlert("Error", "Format file tidak valid."); 
            }
        }
        reader.readAsText(file);
    }
    input.click();
}

// --- UI NAVIGATION ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('modal-name').classList.add('hidden');
    document.getElementById('game-layer').classList.add('hidden');
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
}

function showMainMenu() {
    gameState = 'menu';
    showScreen('screen-menu');
    showLeaderboard('time_trial');
    clearScreenEffect();
    applyBackground();
}

function toggleSettings() {
    document.getElementById('modal-settings').classList.toggle('hidden');
    updateSettingsUI();
}

function updateSettingsUI() {
    document.getElementById('val-diff').innerText = document.getElementById('cfg-difficulty').value;
    document.getElementById('val-time').innerText = document.getElementById('cfg-timer').value;
    document.getElementById('val-shape').innerText = document.getElementById('cfg-shape').value;
    config.difficulty = parseInt(document.getElementById('cfg-difficulty').value);
    config.timerDuration = parseInt(document.getElementById('cfg-timer').value);
    config.targetShapes = parseInt(document.getElementById('cfg-shape').value);
    config.bgMenu = document.getElementById('cfg-bg-menu').value;
    config.bgGame = document.getElementById('cfg-bg-game').value;
    applyBackground();
}

function applyBackground() {
    const body = document.body;
    body.classList.remove('bg-default', 'bg-grid', 'bg-space', 'bg-retro');
    if (gameState === 'playing' || gameState === 'gameover') {
        body.classList.add(config.bgGame);
    } else {
        body.classList.add(config.bgMenu);
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
}

function prepareGame(mode) {
    gameMode = mode;
    document.getElementById('player-name').value = config.playerName;
    document.getElementById('modal-name').classList.remove('hidden');
}

function closeNameModal() { document.getElementById('modal-name').classList.add('hidden'); }

function showLeaderboard(mode) {
    const table = document.getElementById('mini-leaderboard');
    const data = leaderboardData[mode] || [];
    if(mode === 'time_trial') data.sort((a,b) => b.score - a.score);
    else data.sort((a,b) => a.timeElapsed - b.timeElapsed || b.score - a.score);

    let html = `<tr><th>Rank</th><th>Nama</th><th>${mode === 'time_trial' ? 'Skor' : 'Waktu'}</th></tr>`;
    data.slice(0, 3).forEach((d, i) => {
        let val = mode === 'time_trial' ? d.score : formatTime(d.timeElapsed);
        html += `<tr><td>#${i+1}</td><td>${d.name}</td><td>${val}</td></tr>`;
    });
    if(data.length === 0) html += `<tr><td colspan="3" style="text-align:center">Kosong</td></tr>`;
    table.innerHTML = html;
}

// --- VISUAL EFFECTS ---
function triggerScreenEffect(color) {
    const fx = document.getElementById('screen-fx');
    fx.style.setProperty('--fx-color', color);
    fx.classList.add('fx-buff');
    fxTimer = 2.0; 
}

function clearScreenEffect() {
    const fx = document.getElementById('screen-fx');
    fx.classList.remove('fx-buff');
}

// --- GAME LOOP & LOGIC ---

function startGame() {
    const nameInput = document.getElementById('player-name').value.trim();
    if(!nameInput) { showCustomAlert("Peringatan", "Mohon masukkan nama pemain!"); return; }
    config.playerName = nameInput;

    closeNameModal();
    showScreen('game-layer');
    document.getElementById('game-layer').classList.remove('hidden');

    // Reset Vars
    score = 0; lives = 3; shapes = []; particles = []; mousePath = [];
    shapesDestroyed = 0; timeElapsed = 0; gameState = 'playing';
    scoreMultiplier = 1; multiplierTimer = 0; globalSpeed = 1.0;
    slowMoTimer = 0; immunityTimer = 0; fxTimer = 0;
    fastModeTimer = 0; blurTimer = 0;
    document.body.classList.remove('blur-effect');
    bossSpawned = false; bossActive = false;
    document.getElementById('boss-warning').style.display = 'none';
    
    if(gameMode === 'time_trial') {
        timeRemaining = config.timerDuration * 60;
        document.getElementById('hud-target').style.display = 'none';
    } else {
        timeRemaining = 0;
        document.getElementById('hud-target').style.display = 'block';
    }

    clearScreenEffect();
    updateHUD();
    
    applyBackground(); // <-- Tambahan: Ganti BG ke mode Game
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}
// FEATURE 1: ABORT GAME
function abortGame() {
    const prevSpeed = globalSpeed;
    globalSpeed = 0; 
    showCustomConfirm(
        "Keluar Permainan?", 
        "Yakin ingin keluar?", 
        () => {
            gameState = 'menu';
            clearScreenEffect();
            showMainMenu();
            globalSpeed = 1.0; 
            applyBackground(); // <-- Balik ke BG Menu
        },
        () => { globalSpeed = prevSpeed; }
    );
}

function gameLoop(timestamp) {
    if(gameState !== 'playing') return;

    const rawDt = timestamp - lastTime;
    lastTime = timestamp;
    const dt = rawDt; 
    const dtSeconds = dt / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. UPDATE TIMERS & EFFECTS
    if(gameMode === 'time_trial') {
        timeRemaining -= dtSeconds;
        if(timeRemaining <= 0) endGame();
    } else {
        timeElapsed += dtSeconds;
    }

    if (multiplierTimer > 0) { multiplierTimer -= dtSeconds; if(multiplierTimer <= 0) scoreMultiplier = 1; }
    
    // LOGIKA SPEED (Slow Mo vs Evil Spike)
    if (slowMoTimer > 0) { 
        slowMoTimer -= dtSeconds; 
        globalSpeed = 0.3; 
    } else if (fastModeTimer > 0) {
        fastModeTimer -= dtSeconds;
        globalSpeed = 2.5; // SANGAT CEPAT
    } else { 
        globalSpeed = 1.0; 
    }

    if (immunityTimer > 0) immunityTimer -= dtSeconds;
    
    // LOGIKA BLUR
    if (blurTimer > 0) {
        blurTimer -= dtSeconds;
        if (blurTimer <= 0) document.body.classList.remove('blur-effect');
    }

    if (fxTimer > 0) {
        fxTimer -= dtSeconds;
        if(fxTimer <= 0) clearScreenEffect();
    }

    // 2. SPAWN LOGIC
    let currentSpawnRate = (2000 - (config.difficulty * 300));
    // Jika Fast Mode, spawn juga makin cepat
    if (globalSpeed > 1.5) currentSpawnRate = 200; 
    else if (globalSpeed < 1.0) currentSpawnRate = 300; 

    // LOGIKA BOSS & SPAWN (Sama seperti sebelumnya)
    if (gameMode === 'geometry_run' && shapesDestroyed >= config.targetShapes) {
        if (!bossSpawned) {
            document.getElementById('boss-warning').style.display = 'block';
            setTimeout(() => {
                shapes.push(new Shape('boss'));
                bossActive = true;
            }, 2000);
            bossSpawned = true;
        }
    } else {
        spawnTimer -= rawDt;
        if(spawnTimer <= 0) {
            shapes.push(new Shape()); // Type otomatis random dari constructor
            spawnTimer = currentSpawnRate;
        }
    }

    // 3. UPDATE OBJECTS
    for (let i = shapes.length - 1; i >= 0; i--) {
        shapes[i].update(dt);
        shapes[i].draw(ctx);
        
        if (shapes[i].type === 'boss' && !shapes[i].active) {
             shapes[i].active = true;
             shapes[i].y = canvas.height;
             shapes[i].vy = -18; 
        }
        
        if (!shapes[i].active) shapes.splice(i, 1);
    }

    // Trail
    if (mousePath.length > 1) {
        ctx.beginPath();
        // Warna trail berubah jika ada efek khusus
        if (fastModeTimer > 0) ctx.strokeStyle = 'red';
        else if (immunityTimer > 0) ctx.strokeStyle = 'yellow';
        else ctx.strokeStyle = 'white';
        
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.shadowBlur = 20; ctx.shadowColor = '#00ffcc';
        ctx.moveTo(mousePath[0].x, mousePath[0].y);
        for (let i = 1; i < mousePath.length; i++) ctx.lineTo(mousePath[i].x, mousePath[i].y);
        ctx.stroke();
        if(mousePath.length > 10) mousePath.shift();
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(); particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    updateHUD();
    requestAnimationFrame(gameLoop);
}

const gameContext = {
    get score() { return score; },
    set score(val) { score = val; },
    get lives() { return lives; },
    set lives(val) { lives = val; },
    get scoreMultiplier() { return scoreMultiplier; },
    set scoreMultiplier(val) { scoreMultiplier = val; },
    get maxLives() { return maxLives; },
    get immunityTimer() { return immunityTimer; },
    set immunityTimer(val) { immunityTimer = val; },
    get multiplierTimer() { return multiplierTimer; },
    set multiplierTimer(val) { multiplierTimer = val; },
    get slowMoTimer() { return slowMoTimer; },
    set slowMoTimer(val) { slowMoTimer = val; },
    get fastModeTimer() { return fastModeTimer; },
    set fastModeTimer(val) { fastModeTimer = val; },
    get blurTimer() { return blurTimer; },
    set blurTimer(val) { blurTimer = val; },
    
    // Vars temp
    shapesDestroyed: 0,
    lastSlashX: 0,
    lastSlashY: 0,

    addScore: addScore,
    triggerScreenEffect: triggerScreenEffect,
    createExplosion: createExplosion,
    endGame: (win) => { 
        // Logic win custom jika perlu
        endGame(); 
    }
};

function handleSlash(x, y) {
    for (let i = shapes.length - 1; i >= 0; i--) {
        if(shapes[i].checkHit(x, y)) {
            const s = shapes[i];
            
            // Update context coords untuk explosion
            gameContext.lastSlashX = s.x;
            gameContext.lastSlashY = s.y;
            gameContext.shapesDestroyed = shapesDestroyed; // Sync

            createExplosion(s.x, s.y, s.color);
            
            // EXECUTE EFFECT FROM CONFIG
            if (s.config && s.config.effect) {
                s.config.effect(gameContext, s);
            }

            // Sync balik shapesDestroyed (karena primitif)
            shapesDestroyed = gameContext.shapesDestroyed;

            if(s.type !== 'boss') shapes.splice(i, 1);
            if (lives <= 0) endGame();
        }
    }
}

function createExplosion(x, y, color) {
    for(let i=0; i<10; i++) particles.push(new Particle(x, y, color));
}

function addScore(base) { score += Math.floor(base * scoreMultiplier * config.difficulty); }

function updateHUD() {
    document.getElementById('hud-score').innerText = `Skor: ${score}`;
    if(gameMode === 'time_trial') document.getElementById('hud-timer').innerText = formatTime(timeRemaining);
    else {
        document.getElementById('hud-timer').innerText = formatTime(timeElapsed);
        const remaining = Math.max(0, config.targetShapes - shapesDestroyed);
        document.getElementById('hud-target').innerText = remaining === 0 ? "TARGET: BOSS!" : `Target: ${remaining}`;
    }

    let hearts = ""; for(let i=0; i<lives; i++) hearts += "❤️";
    document.getElementById('hud-lives').innerHTML = hearts;

    let buffsHtml = "";
    if (immunityTimer > 0) buffsHtml += `<div class="buff-badge" style="color:yellow; border-color:yellow;">🛡️ Kebal (${Math.ceil(immunityTimer)}s)</div>`;
    if (multiplierTimer > 0) buffsHtml += `<div class="buff-badge" style="color:orange; border-color:orange;">⚡ x${scoreMultiplier} (${Math.ceil(multiplierTimer)}s)</div>`;
    if (slowMoTimer > 0) buffsHtml += `<div class="buff-badge" style="color:#0cf; border-color:#0cf;">❄️ Slow (${Math.ceil(slowMoTimer)}s)</div>`;
    
    // NEW BUFFS HUD
    if (fastModeTimer > 0) buffsHtml += `<div class="buff-badge" style="color:red; border-color:red;">😈 SPEED (${Math.ceil(fastModeTimer)}s)</div>`;
    if (blurTimer > 0) buffsHtml += `<div class="buff-badge" style="color:gray; border-color:white;">🌫️ BLUR (${Math.ceil(blurTimer)}s)</div>`;
    
    document.getElementById('hud-active-buffs').innerHTML = buffsHtml;
}

function formatTime(seconds) {
    if(seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function endGame() {
    gameState = 'gameover';
    clearScreenEffect();
    document.getElementById('boss-warning').style.display = 'none';
    showScreen('screen-gameover');
    
    document.getElementById('final-score').innerText = `Skor Akhir: ${score}`;
    let detail = gameMode === 'geometry_run' ? `Waktu: ${formatTime(timeElapsed)}` : `Mode Time Trial Selesai`;
    if (lives <= 0) detail += " (Mati)";
    else if (gameMode === 'geometry_run' && bossSpawned) detail += " (Boss Terkalahkan!)";
    
    document.getElementById('final-detail').innerText = detail;

    const newEntry = { name: config.playerName, score: score, timeElapsed: timeElapsed, date: new Date().toISOString() };
    leaderboardData[gameMode].push(newEntry);
    saveData();
}

// --- SISTEM MODAL CUSTOM ---

function showCustomAlert(title, message, callback = null) {
    const modal = document.getElementById('modal-dialog');
    const titleEl = document.getElementById('dialog-title');
    const msgEl = document.getElementById('dialog-msg');
    const actionsEl = document.getElementById('dialog-actions');

    titleEl.innerText = title;
    msgEl.innerText = message;
    
    // Setup Tombol OK
    actionsEl.innerHTML = '';
    const btnOk = document.createElement('button');
    btnOk.className = 'btn btn-small';
    btnOk.innerText = 'OK';
    btnOk.onclick = () => {
        modal.classList.add('hidden');
        if(callback) callback();
    };
    actionsEl.appendChild(btnOk);

    modal.classList.remove('hidden');
}

function showCustomConfirm(title, message, onYes, onNo = null) {
    const modal = document.getElementById('modal-dialog');
    const titleEl = document.getElementById('dialog-title');
    const msgEl = document.getElementById('dialog-msg');
    const actionsEl = document.getElementById('dialog-actions');

    titleEl.innerText = title;
    msgEl.innerText = message;

    // Bersihkan tombol lama
    actionsEl.innerHTML = '';

    // Tombol YA
    const btnYes = document.createElement('button');
    btnYes.className = 'btn btn-small btn-danger'; // Merah karena biasanya confirm untuk aksi destruktif/keluar
    btnYes.innerText = 'YA';
    btnYes.onclick = () => {
        modal.classList.add('hidden');
        if(onYes) onYes();
    };

    // Tombol TIDAK
    const btnNo = document.createElement('button');
    btnNo.className = 'btn btn-small btn-cancel';
    btnNo.innerText = 'BATAL';
    btnNo.onclick = () => {
        modal.classList.add('hidden');
        if(onNo) onNo();
    };

    actionsEl.appendChild(btnYes);
    actionsEl.appendChild(btnNo);

    modal.classList.remove('hidden');
}

function goToMenu() { showMainMenu(); }

// --- INPUT HANDLING ---
function addInputPoint(x, y) { mousePath.push({x, y}); handleSlash(x, y); }
window.addEventListener('mousedown', () => { isMouseDown = true; mousePath = []; });
window.addEventListener('mouseup', () => { isMouseDown = false; mousePath = []; });
window.addEventListener('mousemove', (e) => { if(isMouseDown && gameState === 'playing') addInputPoint(e.clientX, e.clientY); });

window.addEventListener('touchstart', (e) => { isMouseDown = true; mousePath = []; }, {passive: false});
window.addEventListener('touchend', () => { isMouseDown = false; mousePath = []; });
window.addEventListener('touchmove', (e) => {
    if(isMouseDown && gameState === 'playing') { e.preventDefault(); const touch = e.touches[0]; addInputPoint(touch.clientX, touch.clientY); }
}, {passive: false});

window.onload = () => {
    document.getElementById('cfg-bg-menu').value = config.bgMenu;
    document.getElementById('cfg-bg-game').value = config.bgGame;
    applyBackground();
    loadData();
    resizeCanvas();
};