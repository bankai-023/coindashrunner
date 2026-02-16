const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-display');
const livesEl = document.getElementById('lives-display');
const pointsEl = document.getElementById('points-display');
const finalScoreEl = document.getElementById('final-score-val');
const pwrIndicators = document.getElementById('powerup-indicators');

// Game State
let state = {
    score: 0,
    lives: 3,
    points: 0,
    isPaused: false,
    isActive: false,
    player: { x: 0, y: 0, w: 40, h: 40, speed: 5, tilt: 0 },
    coins: [],
    keys: { left: false, right: false },
    lastCoinSpawn: 0,
    coinSpawnRate: 1000,
    powerups: { magnet: false, speed: false },
    canvasW: 800,
    canvasH: 600
};

// Resize
function resize() {
    state.canvasW = window.innerWidth > 800 ? 800 : window.innerWidth;
    state.canvasH = window.innerHeight;
    canvas.width = state.canvasW;
    canvas.height = state.canvasH;
    state.player.y = state.canvasH - 100;
    if (state.player.x > state.canvasW - state.player.w) {
        state.player.x = state.canvasW - state.player.w;
    }
}
window.addEventListener('resize', resize);
resize();

// Input
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = true;
    if (e.key === ' ') togglePause();
});
window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a') state.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') state.keys.right = false;
});

// Mobile Controls
document.getElementById('left-btn').addEventListener('touchstart', e => { e.preventDefault(); state.keys.left = true; });
document.getElementById('left-btn').addEventListener('touchend', e => { e.preventDefault(); state.keys.left = false; });
document.getElementById('right-btn').addEventListener('touchstart', e => { e.preventDefault(); state.keys.right = true; });
document.getElementById('right-btn').addEventListener('touchend', e => { e.preventDefault(); state.keys.right = false; });
document.getElementById('pause-btn').addEventListener('click', togglePause);

function togglePause() {
    if (!state.isActive) return;
    state.isPaused = !state.isPaused;
    const icon = document.getElementById('pause-icon');
    icon.innerHTML = state.isPaused ? 
        '<path d="M8 5v14l11-7z"/>' : 
        '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if (viewId === 'menu-view') {
        state.isActive = false;
    }
}

function startGame() {
    state.score = 0;
    state.lives = state.inventoryExtraLife ? 4 : 3;
    state.inventoryExtraLife = false;
    state.coins = [];
    state.isActive = true;
    state.isPaused = false;
    state.player.x = state.canvasW / 2 - 20;
    state.lastCoinSpawn = 0;
    state.coinSpawnRate = 1000;
    
    // Apply pre-purchased items
    if (state.inventoryMagnet) { activateMagnet(); state.inventoryMagnet = false; }
    if (state.inventorySpeed) { activateSpeed(); state.inventorySpeed = false; }
    
    updateHUD();
    showView('game-view');
    requestAnimationFrame(loop);
}

function buyItem(id, cost) {
    if (state.points >= cost) {
        state.points -= cost;
        if (id === 'extraLife') state.inventoryExtraLife = true;
        if (id === 'magnet') state.inventoryMagnet = true;
        if (id === 'speed') state.inventorySpeed = true;
        
        pointsEl.innerText = state.points;
        const btn = document.getElementById(`buy-${id}`);
        btn.innerText = 'OWNED';
        btn.disabled = true;
    }
}

function activateMagnet() {
    state.powerups.magnet = true;
    updatePowerupUI();
    setTimeout(() => { state.powerups.magnet = false; updatePowerupUI(); }, 10000);
}

function activateSpeed() {
    state.powerups.speed = true;
    state.player.speed = 10;
    updatePowerupUI();
    setTimeout(() => { state.powerups.speed = false; state.player.speed = 5; updatePowerupUI(); }, 10000);
}

function updatePowerupUI() {
    pwrIndicators.innerHTML = '';
    if (state.powerups.magnet) pwrIndicators.innerHTML += '<div class="pwr-badge" style="background:var(--secondary);color:black">MAGNET</div>';
    if (state.powerups.speed) pwrIndicators.innerHTML += '<div class="pwr-badge" style="background:var(--primary);color:white">SPEED</div>';
}

function updateHUD() {
    scoreEl.innerText = `SCORE: ${state.score}`;
    livesEl.innerText = `LIVES: ${'❤️'.repeat(state.lives)}`;
    pointsEl.innerText = state.points;
}

function drawJet(x, y, w, h, tilt) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(tilt * 0.15);

    // Exhaust
    const flicker = Math.random() * 5 + 5;
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(-5, h/2); ctx.lineTo(5, h/2); ctx.lineTo(0, h/2 + flicker);
    ctx.fill();

    // Wings
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.moveTo(-w/2, h/4); ctx.lineTo(w/2, h/4); ctx.lineTo(0, -h/4);
    ctx.fill();

    // Body
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(0, -h/2); ctx.lineTo(w/4, h/2); ctx.lineTo(-w/4, h/2);
    ctx.fill();

    // Cockpit
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(0, -h/6, w/8, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

function loop(time) {
    if (!state.isActive) return;
    if (!state.isPaused) {
        ctx.clearRect(0, 0, state.canvasW, state.canvasH);

        // Movement
        let targetTilt = 0;
        if (state.keys.left && state.player.x > 0) { state.player.x -= state.player.speed; targetTilt = -1; }
        if (state.keys.right && state.player.x < state.canvasW - state.player.w) { state.player.x += state.player.speed; targetTilt = 1; }
        state.player.tilt += (targetTilt - state.player.tilt) * 0.1;

        // Spawning
        if (time - state.lastCoinSpawn > state.coinSpawnRate) {
            state.coins.push({
                x: Math.random() * (state.canvasW - 30),
                y: -30,
                vy: 3 + (state.score / 100)
            });
            state.lastCoinSpawn = time;
            state.coinSpawnRate = Math.max(250, 1000 - state.score * 2);
        }

        // Update Coins
        for (let i = state.coins.length - 1; i >= 0; i--) {
            const coin = state.coins[i];
            
            if (state.powerups.magnet) {
                const dx = state.player.x + 20 - (coin.x + 15);
                const dy = state.player.y + 20 - (coin.y + 15);
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 250) {
                    coin.x += (dx / dist) * 4;
                    coin.y += (dy / dist) * 4;
                }
            }
            coin.y += coin.vy;

            // Collision
            if (coin.x < state.player.x + 40 && coin.x + 30 > state.player.x &&
                coin.y < state.player.y + 40 && coin.y + 30 > state.player.y) {
                state.score += 10;
                updateHUD();
                state.coins.splice(i, 1);
                continue;
            }

            if (coin.y > state.canvasH) {
                state.lives--;
                updateHUD();
                state.coins.splice(i, 1);
                if (state.lives <= 0) {
                    state.isActive = false;
                    state.points += state.score;
                    finalScoreEl.innerText = state.score;
                    showView('gameover-view');
                }
                continue;
            }

            // Draw Coin
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(coin.x + 15, coin.y + 15, 15, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(coin.x + 10, coin.y + 10, 5, 0, Math.PI*2);
            ctx.fill();
        }

        drawJet(state.player.x, state.player.y, state.player.w, state.player.h, state.player.tilt);
    }
    requestAnimationFrame(loop);
}