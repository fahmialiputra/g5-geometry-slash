/**
 * items.js
 * Berisi definisi tipe item, visualisasi (draw), dan logika efeknya (effect).
 */

const ItemConfig = {
    // --- BASIC SHAPES ---
    'normal': {
        weight: 100, // Kemungkinan muncul (relatif)
        color: (s) => `hsl(${Math.random()*360}, 70%, 50%)`,
        draw: (ctx, s) => {
            // Random sub-shape logic dipindah ke sini atau disederhanakan
            if (!s.subType) s.subType = Math.floor(Math.random() * 3);
            if (s.subType === 0) ctx.rect(-s.size/2, -s.size/2, s.size, s.size);
            else if (s.subType === 1) { ctx.moveTo(0, -s.size/2); ctx.lineTo(s.size/2, s.size/2); ctx.lineTo(-s.size/2, s.size/2); }
            else ctx.arc(0, 0, s.size/2, 0, Math.PI*2);
        },
        effect: (game) => {
            game.addScore(10);
            game.shapesDestroyed++;
        }
    },
    
    // --- NEW ITEMS ---
    
    // a. Bola Emas (+100 Skor)
    'gold_ball': {
        weight: 5,
        color: '#FFD700',
        draw: (ctx, s) => {
            ctx.arc(0, 0, s.size/2, 0, Math.PI*2);
        },
        effect: (game) => {
            game.addScore(100);
            game.triggerScreenEffect('rgba(255, 215, 0, 0.5)'); // Kilau emas
        }
    },

    // b. Bola Hitam (-100 Skor)
    'black_ball': {
        weight: 5,
        color: '#000000',
        draw: (ctx, s) => {
            ctx.arc(0, 0, s.size/2, 0, Math.PI*2);
            ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.stroke();
        },
        effect: (game) => {
            game.addScore(-100);
            game.triggerScreenEffect('rgba(0, 0, 0, 0.8)'); // Gelap
        }
    },

    // c. Bentuk "-" (-150 Skor)
    'minus_shape': {
        weight: 4,
        color: '#ff3333',
        draw: (ctx, s) => {
            ctx.fillRect(-s.size/2, -s.size/6, s.size, s.size/3);
        },
        effect: (game) => {
            game.addScore(-150);
            game.triggerScreenEffect('rgba(255, 0, 0, 0.5)');
        }
    },

    // d. Combo (Pertahankan Combo 10s)
    'combo_lock': {
        weight: 3,
        color: '#ff00ff',
        draw: (ctx, s) => {
            ctx.font = "bold 30px Arial"; ctx.fillStyle = "white"; 
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("∞", 0, 0);
            ctx.strokeStyle = "#ff00ff"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0,0, s.size/2, 0, Math.PI*2); ctx.stroke();
        },
        effect: (game) => {
            game.multiplierTimer = 10; // Reset timer multiplier
            // Jika belum ada multiplier, kasih x2 default
            if(game.scoreMultiplier === 1) game.scoreMultiplier = 2;
            game.triggerScreenEffect('#ff00ff');
        }
    },

    // e. Bola Duri Jahat (Speed Up 10s) - DEBUFF
    'evil_spike': {
        weight: 4,
        color: '#800000',
        draw: (ctx, s) => {
            const spikes = 8;
            ctx.beginPath();
            for(let i=0; i<spikes; i++) {
                const angle = (Math.PI*2 * i)/spikes;
                const rOut = s.size/2 + 10;
                const rIn = s.size/3;
                ctx.lineTo(Math.cos(angle)*rOut, Math.sin(angle)*rOut);
                ctx.lineTo(Math.cos(angle+0.4)*rIn, Math.sin(angle+0.4)*rIn);
            }
            ctx.closePath(); ctx.fill();
            // Mata jahat
            ctx.fillStyle = "yellow"; 
            ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-5, 5); ctx.lineTo(-15, 5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(15, 5); ctx.lineTo(5, 5); ctx.fill();
        },
        effect: (game) => {
            game.fastModeTimer = 10; // State baru di game
            game.triggerScreenEffect('red');
        }
    },

    // f. Cipratan (Blur Layar 10s) - DEBUFF
    'splash_blur': {
        weight: 4,
        color: '#888888',
        draw: (ctx, s) => {
            ctx.beginPath();
            ctx.moveTo(0, -s.size/2);
            ctx.bezierCurveTo(s.size, -s.size, s.size, s.size, 0, s.size/2);
            ctx.bezierCurveTo(-s.size, s.size, -s.size, -s.size, 0, -s.size/2);
            ctx.fill();
        },
        effect: (game) => {
            game.blurTimer = 10; // State baru
            document.body.classList.add('blur-effect'); // CSS class baru
        }
    },

    // g. Perkalian/Pembagian (x2 atau /2 Total Skor)
    'math_op': {
        weight: 3,
        color: '#3366ff',
        draw: (ctx, s) => {
            if(!s.op) s.op = Math.random() > 0.5 ? 'mul' : 'div';
            ctx.fillStyle = "white"; ctx.font = "bold 40px monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(s.op === 'mul' ? "×2" : "÷2", 0, 0);
            ctx.lineWidth = 2; ctx.strokeRect(-s.size/2, -s.size/2, s.size, s.size);
        },
        effect: (game, s) => {
            if (s.op === 'mul') {
                game.score *= 2;
                game.triggerScreenEffect('#00ff00');
            } else {
                game.score = Math.floor(game.score / 2);
                game.triggerScreenEffect('#ff0000');
            }
        }
    },

    // h. Donut Hijau (Hapus Debuff)
    'cleanse_donut': {
        weight: 3,
        color: '#00ff00',
        draw: (ctx, s) => {
            ctx.lineWidth = 5; ctx.strokeStyle = "#00ff00";
            ctx.shadowColor = "#00ff00"; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(0,0, s.size/2 - 5, 0, Math.PI*2); ctx.stroke();
            ctx.shadowBlur = 0; // Reset
        },
        effect: (game) => {
            // Hapus efek negatif
            game.fastModeTimer = 0;
            game.blurTimer = 0;
            document.body.classList.remove('blur-effect');
            game.triggerScreenEffect('#ffffff');
        }
    },

    // i. Petir Ungu (Hapus Buff) - DEBUFF
    'purge_lightning': {
        weight: 3,
        color: '#800080', // Ungu
        draw: (ctx, s) => {
            ctx.shadowColor = "#000"; ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(-10, -s.size/2); ctx.lineTo(10, -10); ctx.lineTo(-10, 10); ctx.lineTo(10, s.size/2);
            ctx.strokeStyle = "#4b0082"; ctx.lineWidth = 4; ctx.stroke();
            ctx.shadowBlur = 0;
        },
        effect: (game) => {
            // Hapus efek positif
            game.scoreMultiplier = 1;
            game.multiplierTimer = 0;
            game.immunityTimer = 0;
            game.slowMoTimer = 0;
            game.triggerScreenEffect('#4b0082');
        }
    },
    
    // --- EXISTING ITEMS (Re-implemented) ---
    'bomb': {
        weight: 10,
        color: '#333',
        draw: (ctx, s) => {
            ctx.fillStyle = '#111'; ctx.arc(0,0, s.size/2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'red'; ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("X", 0, 0);
        },
        effect: (game) => {
            if (game.immunityTimer <= 0) {
                game.lives--; 
                game.createExplosion(game.lastSlashX, game.lastSlashY, 'red');
                game.triggerScreenEffect('red');
            }
        }
    },
    'life': {
        weight: 2,
        color: '#ff0055',
        draw: (ctx, s) => {
            ctx.fillStyle = '#f05'; 
            // Simple heart
            ctx.font = "40px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("❤️", 0, 0);
        },
        effect: (game) => {
            if (game.lives < game.maxLives) game.lives++;
            else game.immunityTimer = 10;
            game.triggerScreenEffect('#ff0055');
        }
    },
    'boss': {
        weight: 0, // Tidak spawn random
        color: 'gold',
        draw: (ctx, s) => {
           // Boss Logic Draw (sama seperti sebelumnya tapi disederhanakan di sini jika mau)
           // Untuk sekarang kita biarkan logic boss khusus di script utama atau di object.js karena kompleks
        },
        effect: (game) => {
            game.addScore(1000);
            game.endGame(true); // Win
        }
    }
};

// Helper untuk memilih item berdasarkan weight
function getRandomItemType(gameMode) {
    // Filter item yang tidak relevan (misal 'life' hanya di geo run biasanya, tapi kita buat umum aja seru)
    let keys = Object.keys(ItemConfig);
    
    // Hapus boss dari random pick
    keys = keys.filter(k => k !== 'boss');

    // Hitung total weight
    let totalWeight = 0;
    keys.forEach(k => totalWeight += ItemConfig[k].weight);

    let random = Math.random() * totalWeight;
    for(let k of keys) {
        if (random < ItemConfig[k].weight) return k;
        random -= ItemConfig[k].weight;
    }
    return 'normal';
}
