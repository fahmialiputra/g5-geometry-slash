/**
 * items.js
 * Konfigurasi item, logika gambar, dan efek.
 */

const ItemConfig = {
    'normal': {
        weight: 80,
        imgSrc: 'assets/item_normal.png',
        color: (s) => `hsl(${Math.random()*360}, 70%, 50%)`,
        draw: (ctx, s) => {
            if (s.subType === undefined) s.subType = Math.floor(Math.random() * 3);
            if (s.subType === 0) ctx.rect(-s.size/2, -s.size/2, s.size, s.size);
            else if (s.subType === 1) { ctx.moveTo(0, -s.size/2); ctx.lineTo(s.size/2, s.size/2); ctx.lineTo(-s.size/2, s.size/2); ctx.closePath(); }
            else ctx.arc(0, 0, s.size/2, 0, Math.PI*2);
            ctx.fill(); 
            ctx.stroke();
        },
        effect: (game) => {
            game.addScore(10);
            game.shapesDestroyed++;
        }
    },
    'bomb': {
        weight: 10,
        imgSrc: 'assets/item_bomb.png',
        color: '#333',
        draw: (ctx, s) => {
            ctx.fillStyle = '#111'; ctx.arc(0,0, s.size/2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'red'; ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("X", 0, 0);
        },
        effect: (game, s) => {
            if (game.immunityTimer <= 0) {
                game.lives--; 
                game.createExplosion(s.x, s.y, 'red');
                game.triggerScreenEffect('red');
            }
        }
    },
    'score_up': {
        weight: 5,
        imgSrc: 'assets/item_score.png',
        color: '#00ff55',
        draw: (ctx, s) => {
            ctx.fillStyle = '#0f5'; 
            ctx.fillRect(-10, -s.size/2, 20, s.size); 
            ctx.fillRect(-s.size/2, -10, s.size, 20); 
            ctx.strokeRect(-10, -s.size/2, 20, s.size);
        },
        effect: (game) => {
            game.addScore(50);
            game.triggerScreenEffect('#00ff55');
        }
    },
    'multiplier': {
        weight: 4,
        imgSrc: 'assets/item_mult.png',
        color: '#ffaa00',
        draw: (ctx, s) => {
            if(!s.multVal) s.multVal = Math.random() > 0.5 ? 3 : 2;
            ctx.fillStyle = '#fa0'; ctx.font = "bold 40px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(`x${s.multVal}`, 0, 0); ctx.lineWidth = 1; ctx.strokeText(`x${s.multVal}`, 0, 0);
        },
        effect: (game, s) => {
            game.scoreMultiplier = s.multVal || 2; 
            game.multiplierTimer = 10;
            game.triggerScreenEffect('#ffaa00');
        }
    },
    'slow_mo': {
        weight: 3,
        imgSrc: 'assets/item_slow.png',
        color: '#00ccff',
        draw: (ctx, s) => {
            ctx.fillStyle = '#0cf'; const sides = 6; ctx.moveTo(s.size/2, 0);
            for (let i = 1; i <= sides; i++) ctx.lineTo(s.size/2 * Math.cos(i * 2 * Math.PI / sides), s.size/2 * Math.sin(i * 2 * Math.PI / sides));
            ctx.fill(); ctx.stroke(); ctx.fillStyle = "white"; ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("SLOW", 0, 0);
        },
        effect: (game) => {
            game.slowMoTimer = 5;
            game.triggerScreenEffect('#00ccff');
        }
    },
    'life': {
        weight: 2,
        imgSrc: 'assets/item_life.png',
        color: '#ff0055',
        draw: (ctx, s) => {
            ctx.fillStyle = '#f05'; 
            ctx.font = "40px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("❤️", 0, 0);
        },
        effect: (game) => {
            if (game.lives < game.maxLives) game.lives++;
            else game.immunityTimer = 10;
            game.triggerScreenEffect('#ff0055');
        }
    },
    'gold_ball': {
        weight: 3,
        imgSrc: 'assets/item_gold.png',
        color: '#FFD700',
        draw: (ctx, s) => {
            ctx.arc(0, 0, s.size/2, 0, Math.PI*2);
            ctx.fillStyle = "gold"; ctx.fill(); ctx.stroke();
        },
        effect: (game) => {
            game.addScore(100);
            game.triggerScreenEffect('rgba(255, 215, 0, 0.5)');
        }
    },
    'black_ball': {
        weight: 3,
        imgSrc: 'assets/item_black.png',
        color: '#000000',
        draw: (ctx, s) => {
            ctx.arc(0, 0, s.size/2, 0, Math.PI*2);
            ctx.fillStyle = "black"; ctx.fill();
            ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.stroke();
        },
        effect: (game) => {
            game.addScore(-100);
            game.triggerScreenEffect('rgba(0, 0, 0, 0.8)');
        }
    },
    'minus_shape': {
        weight: 3,
        imgSrc: 'assets/item_minus.png',
        color: '#ff3333',
        draw: (ctx, s) => {
            ctx.fillStyle = "#ff3333";
            ctx.fillRect(-s.size/2, -s.size/6, s.size, s.size/3);
        },
        effect: (game) => {
            game.addScore(-150);
            game.triggerScreenEffect('rgba(255, 0, 0, 0.5)');
        }
    },
    'combo_lock': {
        weight: 2,
        imgSrc: 'assets/item_combo.png',
        color: '#ff00ff',
        draw: (ctx, s) => {
            ctx.font = "bold 30px Arial"; ctx.fillStyle = "white"; 
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("∞", 0, 0);
            ctx.strokeStyle = "#ff00ff"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0,0, s.size/2, 0, Math.PI*2); ctx.stroke();
        },
        effect: (game) => {
            game.multiplierTimer = 10;
            if(game.scoreMultiplier === 1) game.scoreMultiplier = 2;
            game.triggerScreenEffect('#ff00ff');
        }
    },
    'evil_spike': {
        weight: 3,
        imgSrc: 'assets/item_spike.png',
        color: '#800000',
        draw: (ctx, s) => {
            const spikes = 8;
            ctx.fillStyle = "#800000";
            ctx.beginPath();
            for(let i=0; i<spikes; i++) {
                const angle = (Math.PI*2 * i)/spikes;
                const rOut = s.size/2 + 10;
                const rIn = s.size/3;
                ctx.lineTo(Math.cos(angle)*rOut, Math.sin(angle)*rOut);
                ctx.lineTo(Math.cos(angle+0.4)*rIn, Math.sin(angle+0.4)*rIn);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "yellow"; 
            ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-5, 5); ctx.lineTo(-15, 5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(15, 5); ctx.lineTo(5, 5); ctx.fill();
        },
        effect: (game) => {
            game.fastModeTimer = 10;
            game.triggerScreenEffect('red');
        }
    },
    'splash_blur': {
        weight: 3,
        imgSrc: 'assets/item_splash.png',
        color: '#888888',
        draw: (ctx, s) => {
            ctx.fillStyle = "gray";
            ctx.beginPath();
            ctx.moveTo(0, -s.size/2);
            ctx.bezierCurveTo(s.size, -s.size, s.size, s.size, 0, s.size/2);
            ctx.bezierCurveTo(-s.size, s.size, -s.size, -s.size, 0, -s.size/2);
            ctx.fill(); ctx.stroke();
        },
        effect: (game) => {
            game.blurTimer = 10;
            document.body.classList.add('blur-effect');
        }
    },
    'math_op': {
        weight: 3,
        imgSrc: 'assets/item_math.png',
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
    'cleanse_donut': {
        weight: 2,
        imgSrc: 'assets/item_cleanse.png',
        color: '#00ff00',
        draw: (ctx, s) => {
            ctx.lineWidth = 5; ctx.strokeStyle = "#00ff00";
            ctx.shadowColor = "#00ff00"; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(0,0, s.size/2 - 5, 0, Math.PI*2); ctx.stroke();
            ctx.shadowBlur = 0;
        },
        effect: (game) => {
            game.fastModeTimer = 0;
            game.blurTimer = 0;
            document.body.classList.remove('blur-effect');
            game.triggerScreenEffect('#ffffff');
        }
    },
    'purge_lightning': {
        weight: 2,
        imgSrc: 'assets/item_purge.png',
        color: '#800080',
        draw: (ctx, s) => {
            ctx.shadowColor = "#000"; ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(-10, -s.size/2); ctx.lineTo(10, -10); ctx.lineTo(-10, 10); ctx.lineTo(10, s.size/2);
            ctx.strokeStyle = "#4b0082"; ctx.lineWidth = 4; ctx.stroke();
            ctx.shadowBlur = 0;
        },
        effect: (game) => {
            game.scoreMultiplier = 1;
            game.multiplierTimer = 0;
            game.immunityTimer = 0;
            game.slowMoTimer = 0;
            game.triggerScreenEffect('#4b0082');
        }
    },
    'boss': {
        weight: 0,
        imgSrc: 'assets/item_boss.png',
        color: 'gold',
        draw: (ctx, s) => {
             const spikes = 5;
             const outerRadius = s.size / 2;
             const innerRadius = s.size / 4;
             let rot = Math.PI / 2 * 3;
             let step = Math.PI / spikes;
             ctx.beginPath();
             ctx.moveTo(0, 0 - outerRadius);
             for (let i = 0; i < spikes; i++) {
                 ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
                 rot += step;
                 ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
                 rot += step;
             }
             ctx.lineTo(0, 0 - outerRadius);
             ctx.closePath();
             ctx.fillStyle = ctx.createRadialGradient(0,0,5, 0,0,s.size);
             ctx.fillStyle.addColorStop(0, "white");
             ctx.fillStyle.addColorStop(1, "gold");
             ctx.fill(); ctx.stroke();
        },
        effect: (game) => {
            game.addScore(1000);
            game.endGame(true);
        }
    }
};

(function preloadAssets() {
    for (const key in ItemConfig) {
        const item = ItemConfig[key];
        if (item.imgSrc) {
            item.imgObj = new Image();
            item.imgObj.src = item.imgSrc;
        }
    }
})();

function getRandomItemType(gameMode) {
    let keys = Object.keys(ItemConfig);
    keys = keys.filter(k => k !== 'boss'); 
    let totalWeight = 0;
    keys.forEach(k => totalWeight += ItemConfig[k].weight);
    let random = Math.random() * totalWeight;
    for(let k of keys) {
        if (random < ItemConfig[k].weight) return k;
        random -= ItemConfig[k].weight;
    }
    return 'normal';
}