class Shape {
    constructor(forceType = null, zone = null) {
        const canvas = document.getElementById('gameCanvas');
        this.size = Math.random() * 30 + 40; 
        
        this.zone = zone || { minX: 0, maxX: canvas.width, pIndex: 0 };
        const margin = this.size / 2 + 5;
        const safeMinX = this.zone.minX + margin;
        const safeMaxX = this.zone.maxX - margin;
        
        this.x = Math.random() * (safeMaxX - safeMinX) + safeMinX;
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
        if (typeof this.config.color === 'function') {
            this.color = this.config.color(this);
        } else {
            this.color = this.config.color;
        }
    }

    setupBoss() {
        this.size = 90; 
        this.color = '#FFD700'; 
        this.vy = -18; 
        this.vx = (Math.random() - 0.5) * 2;
        this.gravity = 0.1; 
        this.rotSpeed = 0.05;
    }

    // Menerima speedModifier khusus untuk objek ini
    update(dtSeconds, speedModifier = 1.0) {
        const canvas = document.getElementById('gameCanvas');
        
        this.x += this.vx * speedModifier;
        this.y += this.vy * speedModifier;
        this.vy += this.gravity * speedModifier;
        this.rotation += this.rotSpeed * speedModifier;

        // PANTULAN DINDING ZONA
        const radius = this.size / 2;
        if (this.x - radius < this.zone.minX) {
            this.x = this.zone.minX + radius;
            this.vx *= -1; 
        } else if (this.x + radius > this.zone.maxX) {
            this.x = this.zone.maxX - radius;
            this.vx *= -1; 
        }

        if (this.y > canvas.height + this.size + 50) this.active = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        let useImage = (this.config.imgObj && this.config.imgObj.complete && this.config.imgObj.naturalWidth > 0);
        if (useImage) {
            try { ctx.drawImage(this.config.imgObj, -this.size/2, -this.size/2, this.size, this.size); } 
            catch(e) { this.drawFallback(ctx); }
        } else { this.drawFallback(ctx); }
        ctx.restore();
    }

    drawFallback(ctx) {
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff';
        ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
        if (this.config && this.config.draw) { ctx.beginPath(); this.config.draw(ctx, this); }
    }

    checkHit(x, y) {
        const dx = this.x - x; const dy = this.y - y;
        const radius = this.size/2 + 15;
        return (dx*dx + dy*dy) < (radius * radius);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; 
        this.vx = (Math.random()-0.5)*10; 
        this.vy = (Math.random()-0.5)*10;
        this.life = 1.0; 
        this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.05; }
    draw(ctx) { ctx.globalAlpha = this.life; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; }
}