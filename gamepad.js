class TriggerAnalyzer {
    constructor() {
        this.ltValues = new Set(); this.rtValues = new Set();
        this.lastLtValue = 0; this.lastRtValue = 0; this.ltJitterCount = 0; this.rtJitterCount = 0;
        this.dom = {
            lt: { bar: document.getElementById('lt-bar-fill'), pct: document.getElementById('lt-percentage'), raw: document.getElementById('lt-raw'), res: document.getElementById('lt-res'), smooth: document.getElementById('lt-smooth'), diag: document.getElementById('lt-diag') },
            rt: { bar: document.getElementById('rt-bar-fill'), pct: document.getElementById('rt-percentage'), raw: document.getElementById('rt-raw'), res: document.getElementById('rt-res'), smooth: document.getElementById('rt-smooth'), diag: document.getElementById('rt-diag') }
        };
        this.btnReset = document.getElementById('btn-reset-triggers');
        this.bindEvents();
    }
    bindEvents() { this.btnReset.addEventListener('click', () => this.resetAnalysis()); }
    resetAnalysis() {
        this.ltValues.clear(); this.rtValues.clear(); this.ltJitterCount = 0; this.rtJitterCount = 0;
        ['lt', 'rt'].forEach(side => {
            this.dom[side].res.textContent = "0 / 255"; this.dom[side].smooth.textContent = "OK"; this.dom[side].smooth.className = "stat-val text-success"; this.dom[side].diag.textContent = "Esperando"; this.dom[side].diag.className = "stat-val text-cyan";
        });
    }
    update(buttons) {
        if (!buttons || buttons.length < 8) return;
        this.processTrigger('lt', buttons[6].value, this.ltValues, this.lastLtValue);
        this.processTrigger('rt', buttons[7].value, this.rtValues, this.lastRtValue);
        this.lastLtValue = buttons[6].value; this.lastRtValue = buttons[7].value;
    }
    processTrigger(side, value, valueSet, lastValue) {
        const dom = this.dom[side]; const pct = (value * 100).toFixed(1);
        dom.bar.style.width = `${pct}%`; dom.pct.textContent = `${pct}%`; dom.raw.textContent = value.toFixed(5);
        if (value > 0.01) {
            valueSet.add(value.toFixed(3));
            dom.res.textContent = `${Math.min(valueSet.size, 255)} / 255`;
            const delta = Math.abs(value - lastValue);
            if (delta > 0.1 && delta < 0.9) { if (side === 'lt') this.ltJitterCount++; else this.rtJitterCount++; }
        }
        const jitter = side === 'lt' ? this.ltJitterCount : this.rtJitterCount;
        if (jitter > 10) { dom.smooth.textContent = "Ruido (Jitter)"; dom.smooth.className = "stat-val text-danger"; }
        if (value > 0.98) { dom.diag.textContent = "Excelente"; dom.diag.className = "stat-val text-success"; } 
        else if (value > 0.85 && pct > 85) { dom.diag.textContent = "Pérdida de Rango"; dom.diag.className = "stat-val text-warning"; }
    }
}

class XEScoreCalculator {
    constructor(appInstance) {
        this.app = appInstance; this.btnCalc = document.getElementById('btn-calculate-score');
        this.dom = { circle: document.querySelector('.score-circle'), value: document.getElementById('xe-score-value'), text: document.getElementById('xe-score-text'), list: document.getElementById('xe-recommendations') };
        this.bindEvents();
    }
    bindEvents() { this.btnCalc.addEventListener('click', () => this.generateScore()); }
    enable() {
        this.btnCalc.disabled = false; this.dom.value.textContent = "--"; this.dom.text.textContent = "Listo para evaluar";
        this.dom.circle.style.borderColor = "var(--glass-border)"; this.dom.circle.style.color = "var(--color-text-muted)"; this.dom.circle.style.boxShadow = "inset 0 0 20px rgba(0,0,0,0.5)";
        this.dom.list.innerHTML = '<li class="placeholder-text">Presiona "Generar Evaluación XE" para analizar los datos recopilados.</li>';
    }
    disable() {
        this.btnCalc.disabled = true; this.dom.value.textContent = "--"; this.dom.text.textContent = "Esperando diagnóstico...";
        this.dom.circle.style.borderColor = "var(--glass-border)"; this.dom.circle.style.color = "var(--color-text-muted)"; this.dom.circle.style.boxShadow = "inset 0 0 20px rgba(0,0,0,0.5)";
        this.dom.list.innerHTML = '<li class="placeholder-text">Conecta un control para iniciar.</li>';
    }
    generateScore() {
        let score = 100; let recommendations = [];
        const lsDrift = parseFloat(document.getElementById('ls-drift').textContent.replace('%', '')) || 0;
        const rsDrift = parseFloat(document.getElementById('rs-drift').textContent.replace('%', '')) || 0;
        if (lsDrift > 5.0) { score -= (lsDrift - 5.0) * 1.5; recommendations.push(`Limpieza o reemplazo del potenciómetro izquierdo (Drift: ${lsDrift.toFixed(1)}%).`); }
        if (rsDrift > 5.0) { score -= (rsDrift - 5.0) * 1.5; recommendations.push(`Limpieza o reemplazo del potenciómetro derecho (Drift: ${rsDrift.toFixed(1)}%).`); }
        if (this.app.buttonAnalyzer && this.app.buttonAnalyzer.buttonsData) {
            this.app.buttonAnalyzer.buttonsData.forEach((btn, index) => {
                if (btn.isStuck) { score -= 15; recommendations.push(`Revisar goma conductora o microswitch del botón [${this.app.buttonAnalyzer.buttonNames[index]}] (Atascado).`); }
            });
        }
        if (this.app.triggerAnalyzer) {
            if (this.app.triggerAnalyzer.ltJitterCount > 10) { score -= 10; recommendations.push("Ruido detectado en Gatillo Izquierdo (LT). Requiere limpieza del sensor."); }
            if (this.app.triggerAnalyzer.rtJitterCount > 10) { score -= 10; recommendations.push("Ruido detectado en Gatillo Derecho (RT). Requiere limpieza del sensor."); }
        }
        score = Math.max(0, Math.min(100, Math.round(score)));
        let classification = "", color = "", glow = "";
        if (score >= 90) { classification = "Excelente"; color = "var(--color-success)"; glow = "rgba(0, 255, 136, 0.4)"; if(recommendations.length === 0) recommendations.push("El control se encuentra en perfectas condiciones."); } 
        else if (score >= 80) { classification = "Muy Bueno"; color = "var(--color-cyan-neon)"; glow = "rgba(0, 243, 255, 0.4)"; } 
        else if (score >= 70) { classification = "Bueno"; color = "var(--color-white)"; glow = "rgba(255, 255, 255, 0.2)"; } 
        else if (score >= 60) { classification = "Regular"; color = "var(--color-warning)"; glow = "rgba(255, 183, 0, 0.4)"; } 
        else if (score >= 40) { classification = "Malo"; color = "var(--color-danger)"; glow = "rgba(255, 42, 42, 0.4)"; } 
        else { classification = "Requiere Reparación"; color = "#ff0000"; glow = "rgba(255, 0, 0, 0.8)"; recommendations.unshift("URGENTE: Múltiples fallos críticos detectados."); }
        this.animateScoreCounter(score, color, glow);
        this.dom.text.textContent = classification; this.dom.text.style.color = color;
        this.dom.list.innerHTML = '';
        recommendations.forEach(rec => { const li = document.createElement('li'); li.innerHTML = `<span style="color:${color}">■</span> ${rec}`; this.dom.list.appendChild(li); });
    }
    animateScoreCounter(targetScore, color, glow) {
        let current = 0; const step = Math.ceil(targetScore / 30) || 1;
        this.dom.circle.style.borderColor = color; this.dom.circle.style.color = color; this.dom.circle.style.boxShadow = `0 0 30px ${glow}, inset 0 0 20px ${glow}`;
        const interval = setInterval(() => {
            current += step; if (current >= targetScore) { current = targetScore; clearInterval(interval); }
            this.dom.value.textContent = current;
        }, 20);
    }
        }
