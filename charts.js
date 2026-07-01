class OscilloscopeChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId); this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.maxFrames = 300; this.bufferX = new Array(this.maxFrames).fill(0); this.bufferY = new Array(this.maxFrames).fill(0);
        this.colorX = '#00f3ff'; this.colorY = '#ffb700'; this.zoom = 1.0;
        this.resize(); window.addEventListener('resize', () => this.resize());
    }
    resize() { this.canvas.width = this.canvas.parentElement.getBoundingClientRect().width; this.canvas.height = 200; this.draw(); }
    updateData(valX, valY) { this.bufferX.push(valX); this.bufferY.push(valY); if (this.bufferX.length > this.maxFrames) { this.bufferX.shift(); this.bufferY.shift(); } }
    setZoom(multiplier) { this.zoom = multiplier; }
    draw() {
        const width = this.canvas.width, height = this.canvas.height, centerY = height / 2;
        this.ctx.fillStyle = '#0a0a0c'; this.ctx.fillRect(0, 0, width, height);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; this.ctx.lineWidth = 1; this.ctx.beginPath();
        for (let i = 0; i <= 4; i++) { const y = (height / 4) * i; this.ctx.moveTo(0, y); this.ctx.lineTo(width, y); }
        for (let i = 0; i <= 10; i++) { const x = (width / 10) * i; this.ctx.moveTo(x, 0); this.ctx.lineTo(x, height); }
        this.ctx.stroke();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; this.ctx.setLineDash([5, 5]); this.ctx.beginPath(); this.ctx.moveTo(0, centerY); this.ctx.lineTo(width, centerY); this.ctx.stroke(); this.ctx.setLineDash([]);
        const stepX = width / (this.maxFrames - 1), amplitude = (height / 2) * 0.9 * this.zoom;
        this.ctx.strokeStyle = this.colorY; this.ctx.lineWidth = 2; this.ctx.lineJoin = 'round'; this.ctx.beginPath();
        for (let i = 0; i < this.bufferY.length; i++) { const x = i * stepX, y = centerY + (this.bufferY[i] * amplitude); if (i === 0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y); }
        this.ctx.stroke();
        this.ctx.strokeStyle = this.colorX; this.ctx.shadowBlur = 5; this.ctx.shadowColor = this.colorX; this.ctx.beginPath();
        for (let i = 0; i < this.bufferX.length; i++) { const x = i * stepX, y = centerY + (this.bufferX[i] * amplitude); if (i === 0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y); }
        this.ctx.stroke(); this.ctx.shadowBlur = 0; 
    }
    exportImage(fileName) { const link = document.createElement('a'); link.download = fileName; link.href = this.canvas.toDataURL('image/png'); link.click(); }
}

class OscilloscopeAnalyzer {
    constructor() {
        this.lsChart = new OscilloscopeChart('ls-oscope-canvas'); this.rsChart = new OscilloscopeChart('rs-oscope-canvas');
        this.isFrozen = false; this.zoomLevel = 1.0;
        this.btnFreeze = document.getElementById('btn-oscope-freeze'); this.btnZoomIn = document.getElementById('btn-oscope-zoom-in'); this.btnZoomOut = document.getElementById('btn-oscope-zoom-out'); this.lblZoom = document.getElementById('oscope-zoom-val');
        this.btnExpLS = document.getElementById('btn-export-ls'); this.btnExpRS = document.getElementById('btn-export-rs');
        this.bindEvents();
    }
    bindEvents() {
        this.btnFreeze.addEventListener('click', () => {
            this.isFrozen = !this.isFrozen;
            if (this.isFrozen) { this.btnFreeze.textContent = "Reanudar"; this.btnFreeze.classList.add('active-test'); } 
            else { this.btnFreeze.textContent = "Congelar"; this.btnFreeze.classList.remove('active-test'); }
        });
        this.btnZoomIn.addEventListener('click', () => { if (this.zoomLevel < 5.0) { this.zoomLevel += 0.5; this.updateZoom(); } });
        this.btnZoomOut.addEventListener('click', () => { if (this.zoomLevel > 1.0) { this.zoomLevel -= 0.5; this.updateZoom(); } });
        this.btnExpLS.addEventListener('click', () => this.lsChart.exportImage('XE_Osciloscopio_LS.png'));
        this.btnExpRS.addEventListener('click', () => this.rsChart.exportImage('XE_Osciloscopio_RS.png'));
    }
    updateZoom() {
        this.lblZoom.textContent = `${this.zoomLevel.toFixed(1)}x`; this.lsChart.setZoom(this.zoomLevel); this.rsChart.setZoom(this.zoomLevel);
        if (this.isFrozen) { this.lsChart.draw(); this.rsChart.draw(); }
    }
    reset() {
        this.isFrozen = false; this.zoomLevel = 1.0; this.updateZoom(); this.btnFreeze.textContent = "Congelar"; this.btnFreeze.classList.remove('active-test');
        this.lsChart.bufferX.fill(0); this.lsChart.bufferY.fill(0); this.rsChart.bufferX.fill(0); this.rsChart.bufferY.fill(0);
        this.lsChart.draw(); this.rsChart.draw();
    }
    update(axes) {
        if (!axes || axes.length < 4) return;
        if (!this.isFrozen) { this.lsChart.updateData(axes[0], axes[1]); this.rsChart.updateData(axes[2], axes[3]); }
        this.lsChart.draw(); this.rsChart.draw();
    }
}
