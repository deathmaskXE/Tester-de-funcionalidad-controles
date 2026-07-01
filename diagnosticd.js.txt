class JoystickAnalyzer {
    constructor() {
        this.lsCanvas = document.getElementById('ls-canvas');
        this.rsCanvas = document.getElementById('rs-canvas');
        this.lsCtx = this.lsCanvas.getContext('2d');
        this.rsCtx = this.rsCanvas.getContext('2d');
        this.isTestingCircularity = false;
        this.lsPath = [];
        this.rsPath = [];
        this.btnTestCirc = document.getElementById('btn-test-circ');
        this.btnReset = document.getElementById('btn-reset-joy');
        this.bindEvents();
    }
    bindEvents() {
        this.btnTestCirc.addEventListener('click', () => {
            this.isTestingCircularity = !this.isTestingCircularity;
            if (this.isTestingCircularity) {
                this.btnTestCirc.textContent = "Detener Test";
                this.btnTestCirc.classList.add('active-test');
                this.resetPaths();
            } else {
                this.btnTestCirc.textContent = "Iniciar Test Circularidad";
                this.btnTestCirc.classList.remove('active-test');
            }
        });
        this.btnReset.addEventListener('click', () => {
            this.resetPaths();
            this.resetStatsUI();
        });
    }
    resetPaths() { this.lsPath = []; this.rsPath = []; }
    resetStatsUI() {
        ['ls', 'rs'].forEach(prefix => {
            document.getElementById(`${prefix}-drift`).textContent = '0.00%';
            document.getElementById(`${prefix}-circ`).textContent = '0.00%';
            document.getElementById(`${prefix}-drift`).style.color = "var(--color-white)";
            document.getElementById(`${prefix}-circ`).style.color = "var(--color-white)";
        });
    }
    update(axes) {
        if (!axes || axes.length < 4) return;
        const lsData = { x: axes[0], y: axes[1] };
        const rsData = { x: axes[2], y: axes[3] };
        this.updateStats('ls', lsData);
        this.updateStats('rs', rsData);
        this.drawJoystick(this.lsCtx, lsData, this.lsPath);
        this.drawJoystick(this.rsCtx, rsData, this.rsPath);
    }
    updateStats(prefix, data) {
        document.getElementById(`${prefix}-x`).textContent = data.x.toFixed(5);
        document.getElementById(`${prefix}-y`).textContent = data.y.toFixed(5);
        const distance = Math.sqrt((data.x * data.x) + (data.y * data.y));
        if (!this.isTestingCircularity) {
            const driftValue = (distance * 100).toFixed(2);
            const driftEl = document.getElementById(`${prefix}-drift`);
            driftEl.textContent = `${driftValue}%`;
            if (distance > 0.05) driftEl.style.color = "var(--color-danger)";
            else driftEl.style.color = "var(--color-success)";
        }
        if (this.isTestingCircularity && distance > 0.8) {
            this[`${prefix}Path`].push({ x: data.x, y: data.y, dist: distance });
            let totalError = 0;
            this[`${prefix}Path`].forEach(p => totalError += Math.abs(1.0 - p.dist));
            const avgError = (totalError / this[`${prefix}Path`].length) * 100;
            const circEl = document.getElementById(`${prefix}-circ`);
            circEl.textContent = `${avgError.toFixed(2)}%`;
            if (avgError > 10.0) circEl.style.color = "var(--color-danger)";
            else if (avgError > 5.0) circEl.style.color = "yellow";
            else circEl.style.color = "var(--color-success)";
        }
    }
    drawJoystick(ctx, data, path) {
        const width = ctx.canvas.width, height = ctx.canvas.height;
        const centerX = width / 2, centerY = height / 2, radius = (width / 2) - 15; 
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
        ctx.moveTo(0, centerY); ctx.lineTo(width, centerY); ctx.stroke();
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        if (path.length > 0) {
            ctx.fillStyle = 'rgba(0, 243, 255, 0.1)';
            path.forEach(p => {
                ctx.beginPath(); ctx.arc(centerX + (p.x * radius), centerY + (p.y * radius), 3, 0, Math.PI * 2); ctx.fill();
            });
        }
        const posX = centerX + (data.x * radius), posY = centerY + (data.y * radius);
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(posX, posY); ctx.stroke();
        ctx.fillStyle = '#00f3ff'; ctx.shadowBlur = 15; ctx.shadowColor = '#00f3ff';
        ctx.beginPath(); ctx.arc(posX, posY, 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; 
    }
}
