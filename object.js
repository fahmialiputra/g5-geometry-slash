class Shape {
    constructor(forceType = null) {
        const canvas = document.getElementById('gameCanvas');
        
        this.size = Math.random() * 30 + 40; 
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = canvas.height + this.size;
        
        const diff = (typeof config !== 'undefined') ? config.difficulty : 2;
        const diffMult = 1 + (diff * 0.2);
        
        this.vx = (Math.random() - 0.5) * 4 * diffMult;
        this.vy = -(Math.random() * 5 + 10 + diff); 
        this.gravity = 0.2;
        this.rotation = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
        
        this.active = true;

        if (forceType) {
            this.type = forceType;
            if(this.type === 'boss') this.setupBoss();
        } else {
            this.type = getRandomItemType();
        }

        this.config = ItemConfig[this.type];
        
        // Resolve warna
        if (typeof this.config.color === 'function') {
            this.color = this.config.color(this);
        } else {
            this.color = this.config.color;
        }
    }

    setupBoss() {
        this.size = 120; 
        this.color = '#FFD700'; 
        this.vy = -18; 
        this.vx = 0;
        this.gravity = 0.1; 
        this.rotSpeed = 0.05;
    }

    update(dt) {
        const speed = (typeof globalSpeed !== 'undefined') ? globalSpeed : 1.0;
        const canvas = document.getElementById('gameCanvas');

        this.x += this.vx * speed;
        this.y += this.vy * speed;
        this.vy += this.gravity * speed;
        this.rotation += this.rotSpeed * speed;

        if (this.y > canvas.height + this.size + 50) this.active = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // --- LOGIKA ASSET IMAGE ---
        // Cek apakah item ini punya gambar, gambarnya selesai dimuat, dan bukan broken link
        let useImage = false;
        if (this.config.imgObj && this.config.imgObj.complete && this.config.imgObj.naturalWidth > 0) {
            useImage = true;
        }

        if (useImage) {
            // Render Image
            // Kita gambar centered di 0,0
            try {
                ctx.drawImage(this.config.imgObj, -this.size/2, -this.size/2, this.size, this.size);
            } catch(e) {
                // Fallback jika error render
                this.drawFallback(ctx);
            }
        } else {
            // Render Geometri (Fallback / Placeholder)
            this.drawFallback(ctx);
        }

        ctx.restore();
    }

    drawFallback(ctx) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        if (this.config && this.config.draw) {
            ctx.beginPath();
            this.config.draw(ctx, this);
            // Config draw bertanggung jawab untuk fill/stroke jika bentuknya kompleks
            // Tapi untuk amannya kita bisa panggil stroke jika path tertutup
            // (Sebagian besar config.draw di items.js sudah melakukan fill/stroke sendiri)
        }
    }

    checkHit(x, y) {
        const dx = this.x - x; const dy = this.y - y;
        return Math.sqrt(dx*dx + dy*dy) < this.size/2 + 15;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.vx = (Math.random()-0.5)*10; this.vy = (Math.random()-0.5)*10;
        this.life = 1.0; this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.05; }
    draw(ctx) { ctx.globalAlpha = this.life; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x,this.y,4,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; }
}