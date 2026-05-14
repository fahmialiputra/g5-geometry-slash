// --- KONFIGURASI GLOBAL ---
const config = { difficulty: 2, timerDuration: 5, targetShapes: 50, bgMenu: "bg-default", bgGame: "bg-grid" };
const activeToasts = {};

// --- MULTIPLAYER & GAME STATE ---
let players = []; 
let activePointers = {}; 

let gameState = 'title';
let gameMode = '';
let currentLbMode = 'time_trial'; // Status menu aktif
let lives = 3; 
const maxLives = 5;

let timeRemaining = 0;
let timeElapsed = 0;
let shapesDestroyed = 0;

let shapes = [];
let particles = [];
let lastTime = 0;
let spawnTimer = 0;

let gameLoopId = null; 
let bossSpawned = false;

// DOM Caching Efisien
const hudCache = { score: "", timer: "", target: "", lives: "", combo: "" };
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- MANAJEMEN DATA ---
const DB_KEY = 'geo_slash_db_v3';
let leaderboardData = { time_trial: [], geometry_run: [] };

function loadData() { const saved = localStorage.getItem(DB_KEY); if(saved) leaderboardData = JSON.parse(saved); }
function saveData() { localStorage.setItem(DB_KEY, JSON.stringify(leaderboardData)); }
function resetData() { showCustomConfirm("Reset Data", "Yakin ingin menghapus semua data?", () => { leaderboardData = { time_trial: [], geometry_run: [] }; saveData(); showMainMenu(); showCustomAlert("Sukses", "Data dihapus."); }); }
function exportData() { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leaderboardData)); const node = document.createElement('a'); node.setAttribute("href", dataStr); node.setAttribute("download", "geoslash.json"); document.body.appendChild(node); node.click(); node.remove(); }
function importData() { const input = document.createElement('input'); input.type = 'file'; input.onchange = e => { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = re => { try { const parsed = JSON.parse(re.target.result); if(parsed.time_trial) { leaderboardData = parsed; saveData(); updateSettingsUI(); showCustomAlert("Berhasil", "Data di-import!"); } else throw new Error(); } catch (err) { showCustomAlert("Error", "Format file tidak valid."); } }; reader.readAsText(file); }; input.click(); }

// --- UI NAVIGATION & STEPPER CONTROL ---
function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById('modal-setup').classList.add('hidden'); document.getElementById('game-layer').classList.add('hidden'); const target = document.getElementById(id); if(target) target.classList.remove('hidden'); }
function showMainMenu() { gameState = 'menu'; showScreen('screen-menu'); showLeaderboard('time_trial'); applyBackground(); }

function showGameToast(id, label, type, durationSeconds = 0) {
    const container = document.getElementById('toast-container');
    if (activeToasts[id]) { const existing = document.getElementById(activeToasts[id]); if (existing) existing.remove(); clearTimeout(activeToasts[id + '_timeout']); }
    const toast = document.createElement('div'); toast.className = `toast-item toast-${type}`; toast.id = `toast-${id}-${Date.now()}`; activeToasts[id] = toast.id;
    let html = `<span class="toast-label">${label}</span>`;
    if (durationSeconds > 0) html += `<div class="toast-progress" style="transition: width ${durationSeconds}s linear; width: 100%;"></div>`;
    toast.innerHTML = html; container.appendChild(toast);
    if (durationSeconds > 0) { toast.offsetHeight; const bar = toast.querySelector('.toast-progress'); if(bar) bar.style.width = '0%'; activeToasts[id + '_timeout'] = setTimeout(() => { if(toast.parentNode) toast.remove(); delete activeToasts[id]; }, durationSeconds * 1000); } 
    else { activeToasts[id + '_timeout'] = setTimeout(() => { if(toast.parentNode) toast.remove(); delete activeToasts[id]; }, 2000); }
}

function toggleSettings() { document.getElementById('modal-settings').classList.toggle('hidden'); updateSettingsUI(); }
function setDifficulty(level) { config.difficulty = level; document.getElementById('cfg-difficulty').value = level; updateSettingsUI(); }

// Fungsi Stepper Numerik
function adjTimer(val) { let cur = parseInt(document.getElementById('cfg-timer').value) + val; if (cur < 1) cur = 1; if (cur > 15) cur = 15; document.getElementById('cfg-timer').value = cur; updateSettingsUI(); }
function adjTarget(val) { let cur = parseInt(document.getElementById('cfg-shape').value) + val; if (cur < 50) cur = 50; if (cur > 500) cur = 500; document.getElementById('cfg-shape').value = cur; updateSettingsUI(); }

function updateSettingsUI() {
    const diffMap = ["Mudah", "Normal", "Keras", "Ekstrem", "Gila"];
    document.getElementById('val-diff-label').innerText = diffMap[config.difficulty - 1];
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach((star, index) => { if (index < config.difficulty) star.classList.add('active'); else star.classList.remove('active'); });
    
    document.getElementById('val-time').innerText = document.getElementById('cfg-timer').value;
    document.getElementById('val-shape').innerText = document.getElementById('cfg-shape').value;
    config.timerDuration = parseInt(document.getElementById('cfg-timer').value);
    config.targetShapes = parseInt(document.getElementById('cfg-shape').value);
    config.bgMenu = document.getElementById('cfg-bg-menu').value;
    config.bgGame = document.getElementById('cfg-bg-game').value;
    applyBackground();
}

function applyBackground() { const body = document.body; body.classList.remove('bg-default', 'bg-grid', 'bg-space', 'bg-retro'); if (gameState === 'playing' || gameState === 'gameover') body.classList.add(config.bgGame); else body.classList.add(config.bgMenu); }
function toggleFullScreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{}); else if (document.exitFullscreen) document.exitFullscreen(); }

// --- MULTIPLAYER SETUP ---
function openMultiplayerSetup(mode) { gameMode = mode; document.getElementById('modal-setup').classList.remove('hidden'); renderPlayerInputs(); }
function closeSetupModal() { document.getElementById('modal-setup').classList.add('hidden'); }
function setPlayerCount(n) { document.getElementById('num-players').value = n; const btns = document.querySelectorAll('.btn-count'); btns.forEach((btn, index) => { if (index + 1 === n) btn.classList.add('active'); else btn.classList.remove('active'); }); renderPlayerInputs(); }

function updateRowColor(index, color) { document.getElementById(`pRow-${index}`).style.borderColor = color; }

function renderPlayerInputs() {
    let count = parseInt(document.getElementById('num-players').value) || 1;
    const container = document.getElementById('player-inputs-container'); container.innerHTML = '';
    const defaultColors = ['#00ffcc', '#ff0055', '#00ccff', '#ffaa00'];
    for(let i=0; i<count; i++) {
        container.innerHTML += `
            <div class="player-row" id="pRow-${i}" style="border-color: ${defaultColors[i]}">
                <span style="font-weight:bold; color:white; min-width:25px;">P${i+1}</span>
                <input type="text" id="p${i}-name" value="Player ${i+1}" placeholder="Nama P${i+1}" maxlength="10">
                <div class="color-wheel">
                    <input type="color" id="p${i}-color" value="${defaultColors[i]}" oninput="updateRowColor(${i}, this.value)">
                </div>
            </div>`;
    }
}

// Implementasi Rentang Kuota (Min 20 - Max 100)
function showLeaderboard(mode) {
    currentLbMode = mode;
    
    // Warnai tab aktif
    document.getElementById('tab-tt').classList.remove('active-tab');
    document.getElementById('tab-gr').classList.remove('active-tab');
    if(mode === 'time_trial') document.getElementById('tab-tt').classList.add('active-tab');
    else document.getElementById('tab-gr').classList.add('active-tab');

    const limit = parseInt(document.getElementById('lb-limit').value) || 20;
    const table = document.getElementById('mini-leaderboard');
    let data = leaderboardData[mode] ? [...leaderboardData[mode]] : [];
    
    if(mode === 'time_trial') data.sort((a,b) => b.score - a.score); 
    else data.sort((a,b) => a.timeElapsed - b.timeElapsed || b.score - a.score);
    
    let html = `<tr><th>Rank</th><th>Nama</th><th>${mode === 'time_trial' ? 'Skor' : 'Waktu'}</th></tr>`;
    data.slice(0, limit).forEach((d, i) => { 
        let val = mode === 'time_trial' ? d.score : formatTime(d.timeElapsed); 
        html += `<tr><td>#${i+1}</td><td>${d.name}</td><td>${val}</td></tr>`; 
    });
    
    if(data.length === 0) html += `<tr><td colspan="3">Belum Ada Data Tersimpan</td></tr>`;
    table.innerHTML = html;
}

// --- GAME LOGIC ---
function startGame() {
    const numPlayers = parseInt(document.getElementById('num-players').value) || 1;
    players = [];
    
    for(let i=0; i<numPlayers; i++) {
        players.push({
            id: i, name: document.getElementById(`p${i}-name`).value || `P${i+1}`,
            color: document.getElementById(`p${i}-color`).value || '#ffffff',
            score: 0, combo: 0, comboTimer: 0, comboLockTimer: 0,
            
            scoreMultiplier: 1, multiplierTimer: 0,
            immunityTimer: 0, blurTimer: 0,
            slowTimer: 0, fastTimer: 0, speedModifier: 1.0,
            fxTimer: 0, fxColor: null
        });
    }

    closeSetupModal(); showScreen('game-layer'); document.getElementById('game-layer').classList.remove('hidden');
    lives = 3; shapes = []; particles = []; activePointers = {};
    shapesDestroyed = 0; timeElapsed = 0; gameState = 'playing';
    bossSpawned = false; document.getElementById('boss-warning').style.display = 'none';
    document.getElementById('toast-container').innerHTML = '';
    
    Object.keys(hudCache).forEach(k => hudCache[k] = "");

    if(gameMode === 'time_trial') { timeRemaining = config.timerDuration * 60; document.getElementById('hud-target').style.display = 'none'; }
    else { timeRemaining = 0; document.getElementById('hud-target').style.display = 'block'; }

    updateHUD(); applyBackground();
    if(gameLoopId) cancelAnimationFrame(gameLoopId);
    lastTime = performance.now(); gameLoopId = requestAnimationFrame(gameLoop);
}

function abortGame() { showCustomConfirm("Keluar Permainan?", "Yakin ingin kembali ke menu?", () => { gameState = 'menu'; showMainMenu(); applyBackground(); }); }

function gameLoop(timestamp) {
    if(gameState !== 'playing') return;
    const rawDt = timestamp - lastTime; lastTime = timestamp; const dtSeconds = rawDt / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(gameMode === 'time_trial') { timeRemaining -= dtSeconds; if(timeRemaining <= 0) { endGame(); return; } }
    else timeElapsed += dtSeconds;

    players.forEach(p => {
        if (p.multiplierTimer > 0) { p.multiplierTimer -= dtSeconds; if(p.multiplierTimer <= 0) p.scoreMultiplier = 1; }
        if (p.immunityTimer > 0) p.immunityTimer -= dtSeconds;
        if (p.blurTimer > 0) p.blurTimer -= dtSeconds;
        if (p.comboLockTimer > 0) p.comboLockTimer -= dtSeconds;
        else if (p.comboTimer > 0) { p.comboTimer -= dtSeconds; if(p.comboTimer <= 0) p.combo = 0; }
        
        if (p.slowTimer > 0) { p.slowTimer -= dtSeconds; p.speedModifier = 0.3; }
        else if (p.fastTimer > 0) { p.fastTimer -= dtSeconds; p.speedModifier = 2.5; }
        else p.speedModifier = 1.0;
    });

    const baseSpawnRate = Math.max(300, 2000 - (config.difficulty * 300));
    const zoneWidth = canvas.width / players.length;

    if (gameMode === 'geometry_run' && shapesDestroyed >= config.targetShapes) {
        if (!bossSpawned) { 
            document.getElementById('boss-warning').style.display = 'block'; 
            setTimeout(() => { 
                players.forEach((p, idx) => {
                    let zone = { minX: idx * zoneWidth, maxX: (idx + 1) * zoneWidth, pIndex: idx };
                    shapes.push(new Shape('boss', zone)); 
                });
            }, 2000); bossSpawned = true; 
        }
    } else {
        spawnTimer -= rawDt; 
        if(spawnTimer <= 0) { 
            let pIndex = Math.floor(Math.random() * players.length);
            let zone = { minX: pIndex * zoneWidth, maxX: (pIndex + 1) * zoneWidth, pIndex: pIndex };
            shapes.push(new Shape(null, zone)); 
            
            let effectiveSpawnRate = baseSpawnRate;
            if (players[pIndex].speedModifier > 1) effectiveSpawnRate = 200;
            spawnTimer = effectiveSpawnRate; 
        }
    }

    for (let i = shapes.length - 1; i >= 0; i--) {
        let pSpeed = shapes[i].zone ? players[shapes[i].zone.pIndex].speedModifier : 1.0;
        shapes[i].update(dtSeconds, pSpeed); 
        shapes[i].draw(ctx);
        if (shapes[i].type === 'boss' && !shapes[i].active) { shapes[i].active = true; shapes[i].y = canvas.height; shapes[i].vy = -18; }
        if (!shapes[i].active) shapes.splice(i, 1);
    }

    players.forEach((p, i) => {
        const startX = i * zoneWidth;
        if (i > 0) {
            ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
            ctx.setLineDash([15, 10]); ctx.moveTo(startX, 0); ctx.lineTo(startX, canvas.height);
            ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.fillStyle = p.color; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
        ctx.globalAlpha = 0.5; ctx.fillText(p.name, startX + zoneWidth / 2, canvas.height - 20); ctx.globalAlpha = 1.0;
        
        if (p.blurTimer > 0) {
            ctx.fillStyle = 'rgba(15, 15, 15, 0.95)'; ctx.fillRect(startX, 0, zoneWidth, canvas.height);
            ctx.fillStyle = 'red'; ctx.font = 'bold 25px Arial'; ctx.textAlign = 'center'; ctx.fillText('BLIND', startX + zoneWidth / 2, canvas.height / 2);
        }
        if (p.fxTimer > 0) {
            p.fxTimer -= dtSeconds; ctx.save();
            ctx.globalAlpha = Math.abs(Math.sin(p.fxTimer * Math.PI)) * 0.4; ctx.fillStyle = p.fxColor || 'white';
            ctx.fillRect(startX, 0, zoneWidth, canvas.height); ctx.restore();
        }
    });

    for(let pid in activePointers) {
        const ptr = activePointers[pid]; const player = players[ptr.playerIndex];
        if (ptr.path.length > 1) {
            ctx.beginPath(); ctx.strokeStyle = (player.fastTimer > 0) ? 'red' : ((player.immunityTimer > 0) ? 'yellow' : player.color);
            ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowBlur = 15; ctx.shadowColor = player.color;
            ctx.moveTo(ptr.path[0].x, ptr.path[0].y); for (let i = 1; i < ptr.path.length; i++) ctx.lineTo(ptr.path[i].x, ptr.path[i].y);
            ctx.stroke(); if(ptr.path.length > 10) ptr.path.shift();
        }
    }
    
    for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(); particles[i].draw(ctx); if (particles[i].life <= 0) particles.splice(i, 1); }

    updateHUD(); gameLoopId = requestAnimationFrame(gameLoop);
}

const gameContext = {
    get lives() { return lives; }, set lives(val) { lives = val; },
    get maxLives() { return maxLives; },
    triggeringPlayer: null,
    addScore: (base) => { 
        let p = gameContext.triggeringPlayer || players[0];
        let comboMultiplier = p.combo >= 5 ? 1 + (p.combo * 0.1) : 1; 
        p.score += Math.floor(base * p.scoreMultiplier * config.difficulty * comboMultiplier);
    },
    createExplosion: (x,y,c) => { for(let i=0; i<10; i++) particles.push(new Particle(x, y, c)); },
    endGame: () => { endGame(); }, showToast: showGameToast,
    triggerScreenEffect: (color) => {
        if (gameContext.triggeringPlayer) { gameContext.triggeringPlayer.fxColor = color; gameContext.triggeringPlayer.fxTimer = 2.0; }
    }
};

function handleSlash(x, y, playerIndex) {
    let player = players[playerIndex];
    for (let i = shapes.length - 1; i >= 0; i--) {
        if(shapes[i].checkHit(x, y)) {
            const s = shapes[i];
            player.combo++; player.comboTimer = 2.0; 
            gameContext.triggeringPlayer = player; 
            gameContext.createExplosion(s.x, s.y, s.color);
            if (s.config && s.config.effect) s.config.effect(gameContext, s);
            if(s.type !== 'boss') shapes.splice(i, 1); else shapesDestroyed++;
            if (lives <= 0) endGame();
        }
    }
}

function updateHUD() {
    let scoreHtml = ""; players.forEach(p => { scoreHtml += `<span style="color:${p.color}; text-shadow:1px 1px 2px #000;">${p.name}: ${p.score}</span><br>`; });
    if(hudCache.score !== scoreHtml) { document.getElementById('hud-score').innerHTML = scoreHtml; hudCache.score = scoreHtml; }

    let timerHtml = gameMode === 'time_trial' ? formatTime(timeRemaining) : formatTime(timeElapsed);
    if(hudCache.timer !== timerHtml) { document.getElementById('hud-timer').innerText = timerHtml; hudCache.timer = timerHtml; }

    if(gameMode !== 'time_trial') {
        const remaining = Math.max(0, config.targetShapes - shapesDestroyed);
        let targetHtml = remaining === 0 ? "TARGET: BOSS!" : `Target: ${remaining}`;
        if(hudCache.target !== targetHtml) { document.getElementById('hud-target').innerText = targetHtml; hudCache.target = targetHtml; }
    }

    let hearts = ""; for(let i=0; i<lives; i++) hearts += "❤️";
    if(hudCache.lives !== hearts) { document.getElementById('hud-lives').innerHTML = hearts; hudCache.lives = hearts; }
    
    let comboHtml = "";
    players.forEach(p => {
        let pBuffs = "";
        if (p.immunityTimer > 0) pBuffs += "🛡️ ";
        if (p.multiplierTimer > 0) pBuffs += `⚡x${p.scoreMultiplier} `;
        if (p.blurTimer > 0) pBuffs += "🌫️ ";
        if (p.comboLockTimer > 0) pBuffs += "🔒 ";
        if (p.slowTimer > 0) pBuffs += "❄️ ";
        if (p.fastTimer > 0) pBuffs += "😈 ";
        
        if (p.combo >= 5 || pBuffs !== "") {
            let label = p.combo >= 5 ? `🔥 ${p.name} COMBO x${p.combo}` : p.name;
            comboHtml += `<div class="combo-indicator" style="color:${p.color}; border-color:${p.color}">${pBuffs} ${label}</div>`;
        }
    });
    if(hudCache.combo !== comboHtml) { document.getElementById('hud-combo').innerHTML = comboHtml; hudCache.combo = comboHtml; }
}

function formatTime(seconds) { if(seconds < 0) seconds = 0; const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; }

function endGame() {
    gameState = 'gameover'; document.getElementById('boss-warning').style.display = 'none'; showScreen('screen-gameover');
    let topPlayer = [...players].sort((a, b) => b.score - a.score)[0];
    document.getElementById('final-score').innerText = `Skor Terbanyak: ${topPlayer.name} (${topPlayer.score})`;
    let detail = gameMode === 'geometry_run' ? `Waktu: ${formatTime(timeElapsed)}` : `Selesai`;
    if (lives <= 0) detail += " (Tim Kehabisan Nyawa)"; else if (gameMode === 'geometry_run') detail += " (Boss Terkalahkan!)";
    document.getElementById('final-detail').innerText = detail;
    leaderboardData[gameMode].push({ name: topPlayer.name, score: topPlayer.score, timeElapsed: timeElapsed, date: new Date().toISOString() }); saveData();
}

function showCustomAlert(title, message, callback = null) { const m = document.getElementById('modal-dialog'); document.getElementById('dialog-title').innerText = title; document.getElementById('dialog-msg').innerText = message; const a = document.getElementById('dialog-actions'); a.innerHTML = ''; const btn = document.createElement('button'); btn.className = 'btn btn-small btn-confirm'; btn.innerText = 'OK'; btn.onclick = () => { m.classList.add('hidden'); if(callback) callback(); }; a.appendChild(btn); m.classList.remove('hidden'); }
function showCustomConfirm(title, message, onYes, onNo = null) { const m = document.getElementById('modal-dialog'); document.getElementById('dialog-title').innerText = title; document.getElementById('dialog-msg').innerText = message; const a = document.getElementById('dialog-actions'); a.innerHTML = ''; const y = document.createElement('button'); y.className = 'btn btn-small btn-danger'; y.innerText = 'YA'; y.onclick = () => { m.classList.add('hidden'); if(onYes) onYes(); }; const n = document.createElement('button'); n.className = 'btn btn-small btn-cancel'; n.innerText = 'BATAL'; n.onclick = () => { m.classList.add('hidden'); if(onNo) onNo(); }; a.appendChild(y); a.appendChild(n); m.classList.remove('hidden'); }
function goToMenu() { showMainMenu(); }

// --- PEMBAGIAN ZONA INPUT CLAMPED ---
function assignPlayerZone(x, y) {
    if (players.length <= 1) return 0;
    const colWidth = window.innerWidth / players.length;
    let pIndex = Math.floor(x / colWidth);
    return pIndex >= players.length ? players.length - 1 : pIndex;
}

function pointerDown(e) { 
    if(gameState !== 'playing') return; e.preventDefault(); 
    let pIndex = assignPlayerZone(e.clientX, e.clientY); 
    const zoneWidth = canvas.width / players.length;
    let clampedX = Math.max(pIndex * zoneWidth + 2, Math.min((pIndex + 1) * zoneWidth - 2, e.clientX));
    activePointers[e.pointerId] = { path: [{x: clampedX, y: e.clientY}], playerIndex: pIndex }; 
    handleSlash(clampedX, e.clientY, pIndex); 
}
function pointerMove(e) { 
    if(gameState !== 'playing' || !activePointers[e.pointerId]) return; e.preventDefault(); 
    const ptr = activePointers[e.pointerId]; const zoneWidth = canvas.width / players.length;
    let clampedX = Math.max(ptr.playerIndex * zoneWidth + 2, Math.min((ptr.playerIndex + 1) * zoneWidth - 2, e.clientX));
    ptr.path.push({x: clampedX, y: e.clientY}); handleSlash(clampedX, e.clientY, ptr.playerIndex); 
}
function pointerUp(e) { if(gameState !== 'playing') return; e.preventDefault(); delete activePointers[e.pointerId]; }

canvas.addEventListener('pointerdown', pointerDown, {passive: false}); canvas.addEventListener('pointermove', pointerMove, {passive: false}); canvas.addEventListener('pointerup', pointerUp, {passive: false}); canvas.addEventListener('pointercancel', pointerUp, {passive: false}); canvas.addEventListener('contextmenu', e => e.preventDefault());

window.onload = () => { document.getElementById('cfg-bg-menu').value = config.bgMenu; document.getElementById('cfg-bg-game').value = config.bgGame; applyBackground(); loadData(); resizeCanvas(); setDifficulty(config.difficulty); };