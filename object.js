class Shape {
    constructor(forceType = null) {
        const canvas = document.getElementById('gameCanvas');
        
        this.size = Math.random() * 30 + 40; // Sedikit lebih besar agar icon terlihat
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
            // Setup khusus Boss
            if(this.type === 'boss') this.setupBoss();
        } else {
            // Gunakan helper dari items.js
            this.type = getRandomItemType(gameMode);
        }

        // Ambil config dari items.js
        this.config = ItemConfig[this.type];
        
        // Resolve warna (bisa string atau function)
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
        // Mengakses globalSpeed (akan diupdate di script.js utk handle Fast Mode)
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
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        // Custom Draw dari ItemConfig
        if (this.type === 'boss') {
            // Gambar manual boss (Prism)
             const spikes = 5;
             const outerRadius = this.size / 2;
             const innerRadius = this.size / 4;
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
             ctx.fillStyle = ctx.createRadialGradient(0,0,5, 0,0,this.size);
             ctx.fillStyle.addColorStop(0, "white");
             ctx.fillStyle.addColorStop(1, "gold");
             ctx.fill(); ctx.stroke();
        } else if (this.config && this.config.draw) {
            ctx.beginPath(); // Penting untuk isolasi path
            this.config.draw(ctx, this);
            // ctx.fill/stroke dipanggil di dalam config.draw jika perlu spesifik,
            // tapi kita sediakan default fill/stroke jika config.draw hanya bikin path
            // (namun di items.js kita sudah melakukan fill/stroke sendiri)
        }

        ctx.restore();
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