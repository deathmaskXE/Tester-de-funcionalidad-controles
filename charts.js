/**
 * ==========================================================================
 * XE TESTER PRO - DIAGNOSTICS MODULE
 * Module: 5 (Custom Vanilla JS Oscilloscope)
 * Sin frameworks externos.
 * ==========================================================================
 */

class OscilloscopeChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimización de renderizado
        
        // Configuración de Buffer e Historial
        this.maxFrames = 300; // Representa 5 segundos a 60FPS
        this.bufferX = new Array(this.maxFrames).fill(0);
        this.bufferY = new Array(this.maxFrames).fill(0);
        this.currentIndex = 0;

        // Configuración visual
        this.colorX = '#00f3ff'; // Cyan Neon
        this.colorY = '#ffb700'; // Warning Yellow
        this.zoom = 1.0;

        // Resolver resolución interna para evitar gráficos borrosos
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        // Altura fija desde CSS (200px)
        this.canvas.height = 200;
        this.draw(); // Redibujar con la nueva escala
    }

    updateData(valX, valY) {
        // En lugar de hacer shift() que es costoso en arreglos grandes,
        // usamos un array circular o sobreescribimos y desplazamos matemáticamente
        this.bufferX.push(valX);
        this.bufferY.push(valY);
        
        if (this.bufferX.length > this.maxFrames) {
            this.bufferX.shift();
            this.bufferY.shift();
        }
    }

    setZoom(multiplier) {
        this.zoom = multiplier;
    }

    draw() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerY = height / 2;

        // Limpiar fondo (Negro mate)
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, width, height);

        // Dibujar Retícula (Grid)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        // Grid Horizontal
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
        }
        
        // Grid Vertical (Líneas de tiempo)
        const timeCols = 10;
        for (let i = 0; i <= timeCols; i++) {
            const x = (width / timeCols) * i;
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
        }
        this.ctx.stroke();

        // Línea Central Cero
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(width, centerY);
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset

        // Dibujar Trazos
        const stepX = width / (this.maxFrames - 1);
        const amplitude = (height / 2) * 0.9 * this.zoom; // 90% del alto con zoom

        // Trazado de Canal Y (Atrás)
        this.ctx.strokeStyle = this.colorY;
        this.ctx.lineWidth = 2;
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        for (let i = 0; i < this.bufferY.length; i++) {
            const x = i * stepX;
            // Invertimos el valor de Y para que coincida visualmente (arriba negativo en canvas)
            const y = centerY + (this.bufferY[i] * amplitude);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();

        // Trazado de Canal X (Al frente, con glow)
        this.ctx.strokeStyle = this.colorX;
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = this.colorX;
        this.ctx.beginPath();
        for (let i = 0; i < this.bufferX.length; i++) {
            const x = i * stepX;
            const y = centerY + (this.bufferX[i] * amplitude);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
        
        // Reset Shadow para el próximo frame
        this.ctx.shadowBlur = 0; 
    }

    exportImage(fileName) {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}

export class OscilloscopeAnalyzer {
    constructor() {
        this.lsChart = new OscilloscopeChart('ls-oscope-canvas');
        this.rsChart = new OscilloscopeChart('rs-oscope-canvas');
        
        this.isFrozen = false;
        this.zoomLevel = 1.0;
        
        // UI Controls
        this.btnFreeze = document.getElementById('btn-oscope-freeze');
        this.btnZoomIn = document.getElementById('btn-oscope-zoom-in');
        this.btnZoomOut = document.getElementById('btn-oscope-zoom-out');
        this.lblZoom = document.getElementById('oscope-zoom-val');
        this.btnExpLS = document.getElementById('btn-export-ls');
        this.btnExpRS = document.getElementById('btn-export-rs');

        this.bindEvents();
    }

    bindEvents() {
        this.btnFreeze.addEventListener('click', () => {
            this.isFrozen = !this.isFrozen;
            if (this.isFrozen) {
                this.btnFreeze.textContent = "Reanudar";
                this.btnFreeze.classList.add('active-test');
            } else {
                this.btnFreeze.textContent = "Congelar";
                this.btnFreeze.classList.remove('active-test');
            }
        });

        this.btnZoomIn.addEventListener('click', () => {
            if (this.zoomLevel < 5.0) {
                this.zoomLevel += 0.5;
                this.updateZoom();
            }
        });

        this.btnZoomOut.addEventListener('click', () => {
            if (this.zoomLevel > 1.0) {
                this.zoomLevel -= 0.5;
                this.updateZoom();
            }
        });

        this.btnExpLS.addEventListener('click', () => {
            this.lsChart.exportImage('XE_Osciloscopio_LS.png');
        });

        this.btnExpRS.addEventListener('click', () => {
            this.rsChart.exportImage('XE_Osciloscopio_RS.png');
        });
    }

    updateZoom() {
        this.lblZoom.textContent = `${this.zoomLevel.toFixed(1)}x`;
        this.lsChart.setZoom(this.zoomLevel);
        this.rsChart.setZoom(this.zoomLevel);
        
        // Si está congelado, forzar render para que el zoom aplique
        if (this.isFrozen) {
            this.lsChart.draw();
            this.rsChart.draw();
        }
    }

    reset() {
        this.isFrozen = false;
        this.zoomLevel = 1.0;
        this.updateZoom();
        this.btnFreeze.textContent = "Congelar";
        this.btnFreeze.classList.remove('active-test');
        
        this.lsChart.bufferX.fill(0);
        this.lsChart.bufferY.fill(0);
        this.rsChart.bufferX.fill(0);
        this.rsChart.bufferY.fill(0);
        this.lsChart.draw();
        this.rsChart.draw();
    }

    /**
     * Llamado por app.js a 60FPS
     * @param {ReadonlyArray<number>} axes 
     */
    update(axes) {
        if (!axes || axes.length < 4) return;

        if (!this.isFrozen) {
            // Ejes: 0=LX, 1=LY, 2=RX, 3=RY
            this.lsChart.updateData(axes[0], axes[1]);
            this.rsChart.updateData(axes[2], axes[3]);
        }

        // Renderizado
        this.lsChart.draw();
        this.rsChart.draw();
    }
}
