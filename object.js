class Shape {
    constructor(forceType = null) {
        // Akses canvas global untuk posisi
        const canvas = document.getElementById('gameCanvas');
        
        this.size = Math.random() * 30 + 30; 
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = canvas.height + this.size;
        
        // Mengakses config global (pastikan config sudah didefinisikan di script.js atau window)
        // Kita menggunakan fallback nilai jika config belum siap saat inisialisasi awal
        const diff = (typeof config !== 'undefined') ? config.difficulty : 2;
        const diffMult = 1 + (diff * 0.2);
        
        this.vx = (Math.random() - 0.5) * 4 * diffMult;
        this.vy = -(Math.random() * 5 + 10 + diff); 
        this.gravity = 0.2;
        this.rotation = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
        
        this.active = true;
        
        // Placeholder Assets Structure
        // Ini disiapkan agar nanti tinggal mengganti logika draw() untuk menggunakan gambar
        this.assetData = {
            spriteSrc: null, 
            soundSrc: null
        };

        if (forceType) {
            this.type = forceType;
            this.setupBoss();
        } else {
            this.determineType();
        }

        // Set path asset berdasarkan tipe (Placeholder logic)
        this.setAssetPaths();
    }

    setAssetPaths() {
        // Placeholder: Ini mengasumsikan nama file aset sesuai tipe shape
        // Contoh: assets/shape_bomb.png, assets/shape_normal.png
        this.assetData.spriteSrc = `assets/shape_${this.type}.png`;
        this.assetData.soundSrc = `assets/sfx_${this.type}.mp3`;
    }

    setupBoss() {
        // SPECIAL BOSS GEOMETRY: THE GOLDEN PRISM
        this.size = 100; 
        this.color = '#FFD700'; 
        this.vy = -18; 
        this.vx = 0;
        this.gravity = 0.1; 
        this.rotSpeed = 0.05;
    }

    determineType() {
        const rand = Math.random();
        // Mengakses gameMode global
        const currentMode = (typeof gameMode !== 'undefined') ? gameMode : 'time_trial';

        if (rand < 0.70) {
            this.type = 'normal';
            this.subType = Math.floor(Math.random() * 4); 
            this.color = `hsl(${Math.random()*360}, 70%, 50%)`;
            if(this.subType === 3) this.createIrregularVertices();
        } else if (rand < 0.85) {
            this.type = 'bomb'; this.color = '#333';
        } else if (rand < 0.90) {
            this.type = 'score_up'; this.color = '#00ff55';
        } else if (rand < 0.94) {
            this.type = 'multiplier'; this.multVal = Math.random() > 0.5 ? 3 : 2; this.color = '#ffaa00';
        } else if (rand < 0.98) {
            this.type = 'slow_mo'; this.color = '#00ccff';
        } else {
            if (currentMode === 'geometry_run') { this.type = 'life'; this.color = '#ff0055'; }
            else { this.type = 'normal'; this.subType = 2; this.color = 'white'; }
        }
    }

    createIrregularVertices() {
        this.vertices = [];
        const sides = Math.floor(Math.random() * 3) + 5;
        for(let i=0; i<sides; i++) {
            const angle = (Math.PI * 2 * i) / sides;
            const r = this.size * (0.5 + Math.random()*0.5);
            this.vertices.push({x: Math.cos(angle)*r, y: Math.sin(angle)*r});
        }
    }

    update(dt) {
        // Mengakses globalSpeed
        const speed = (typeof globalSpeed !== 'undefined') ? globalSpeed : 1.0;
        const canvas = document.getElementById('gameCanvas');

        this.x += this.vx * speed;
        this.y += this.vy * speed;
        this.vy += this.gravity * speed;
        this.rotation += this.rotSpeed * speed;

        if (this.y > canvas.height + this.size + 50) this.active = false;
    }

    draw(ctx) {
        // TODO: Di masa depan, cek if (this.imageLoaded) ctx.drawImage(...)
        // Untuk sekarang tetap render geometri primitif
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        ctx.beginPath();

        if (this.type === 'boss') {
            const spikes = 5;
            const outerRadius = this.size / 2;
            const innerRadius = this.size / 4;
            
            let rot = Math.PI / 2 * 3;
            let step = Math.PI / spikes;

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
            ctx.fill();
            ctx.stroke();
            
        } else if (this.type === 'normal') {
            if (this.subType === 0) ctx.rect(-this.size/2, -this.size/2, this.size, this.size);
            else if (this.subType === 1) { ctx.moveTo(0, -this.size/2); ctx.lineTo(this.size/2, this.size/2); ctx.lineTo(-this.size/2, this.size/2); }
            else if (this.subType === 2) ctx.arc(0, 0, this.size/2, 0, Math.PI*2);
            else if (this.subType === 3) { ctx.moveTo(this.vertices[0].x, this.vertices[0].y); this.vertices.forEach(v => ctx.lineTo(v.x, v.y)); }
            ctx.fill(); ctx.stroke();
        } else if (this.type === 'bomb') {
            ctx.fillStyle = '#111'; ctx.arc(0,0, this.size/2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(-10, -5, 5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10, -5, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'red'; ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.fillText("X", 0, 15);
        } else if (this.type === 'score_up') {
            ctx.fillStyle = '#0f5'; ctx.fillRect(-10, -this.size/2, 20, this.size); ctx.fillRect(-this.size/2, -10, this.size, 20); ctx.strokeRect(-10, -this.size/2, 20, this.size);
        } else if (this.type === 'multiplier') {
            ctx.fillStyle = '#fa0'; ctx.font = "bold 40px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(`x${this.multVal}`, 0, 0); ctx.lineWidth = 1; ctx.strokeText(`x${this.multVal}`, 0, 0);
        } else if (this.type === 'slow_mo') {
            ctx.fillStyle = '#0cf'; const sides = 6; ctx.moveTo(this.size/2, 0);
            for (let i = 1; i <= sides; i++) ctx.lineTo(this.size/2 * Math.cos(i * 2 * Math.PI / sides), this.size/2 * Math.sin(i * 2 * Math.PI / sides));
            ctx.fill(); ctx.stroke(); ctx.fillStyle = "white"; ctx.font = "bold 20px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("SLOW", 0, 0);
        } else if (this.type === 'life') {
            ctx.fillStyle = '#f05'; const top = this.size * 0.3; ctx.moveTo(0, top);
            ctx.bezierCurveTo(0, 0, -this.size/2, 0, -this.size/2, top); ctx.bezierCurveTo(-this.size/2, (this.size + top)/2, 0, (this.size + top)/2, 0, this.size);
            ctx.bezierCurveTo(0, (this.size + top)/2, this.size/2, (this.size + top)/2, this.size/2, top); ctx.bezierCurveTo(this.size/2, 0, 0, 0, 0, top);
            ctx.fill(); ctx.stroke();
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
    draw(ctx) { ctx.globalAlpha = this.life; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x,this.y,3,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; }
}