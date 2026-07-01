/**
 * ==========================================================================
 * XE TESTER PRO - DIAGNOSTICS MODULE
 * Module: 4 (Triggers & XE Score)
 * ==========================================================================
 */

export class TriggerAnalyzer {
    constructor() {
        // Estructura para registrar valores únicos y calcular resolución
        this.ltValues = new Set();
        this.rtValues = new Set();
        
        // Variables para cálculo de suavidad (Jittering)
        this.lastLtValue = 0;
        this.lastRtValue = 0;
        this.ltJitterCount = 0;
        this.rtJitterCount = 0;

        // Referencias DOM (Cacheadas por rendimiento)
        this.dom = {
            lt: {
                bar: document.getElementById('lt-bar-fill'),
                pct: document.getElementById('lt-percentage'),
                raw: document.getElementById('lt-raw'),
                res: document.getElementById('lt-res'),
                smooth: document.getElementById('lt-smooth'),
                diag: document.getElementById('lt-diag')
            },
            rt: {
                bar: document.getElementById('rt-bar-fill'),
                pct: document.getElementById('rt-percentage'),
                raw: document.getElementById('rt-raw'),
                res: document.getElementById('rt-res'),
                smooth: document.getElementById('rt-smooth'),
                diag: document.getElementById('rt-diag')
            }
        };

        this.btnReset = document.getElementById('btn-reset-triggers');
        this.bindEvents();
    }

    bindEvents() {
        this.btnReset.addEventListener('click', () => {
            this.resetAnalysis();
        });
    }

    resetAnalysis() {
        this.ltValues.clear();
        this.rtValues.clear();
        this.ltJitterCount = 0;
        this.rtJitterCount = 0;
        
        ['lt', 'rt'].forEach(side => {
            this.dom[side].res.textContent = "0 / 255";
            this.dom[side].smooth.textContent = "OK";
            this.dom[side].smooth.className = "stat-val text-success";
            this.dom[side].diag.textContent = "Esperando";
            this.dom[side].diag.className = "stat-val text-cyan";
        });
    }

    /**
     * Llamado por app.js a 60FPS
     * En el estándar HTML5: buttons[6] es LT/L2, buttons[7] es RT/R2
     */
    update(buttons) {
        if (!buttons || buttons.length < 8) return;

        const ltVal = buttons[6].value;
        const rtVal = buttons[7].value;

        this.processTrigger('lt', ltVal, this.ltValues, this.lastLtValue);
        this.processTrigger('rt', rtVal, this.rtValues, this.lastRtValue);

        this.lastLtValue = ltVal;
        this.lastRtValue = rtVal;
    }

    processTrigger(side, value, valueSet, lastValue) {
        const dom = this.dom[side];
        const pct = (value * 100).toFixed(1);
        
        // Actualizar UI en vivo
        dom.bar.style.width = `${pct}%`;
        dom.pct.textContent = `${pct}%`;
        dom.raw.textContent = value.toFixed(5);

        // Registro de Resolución (ignorando valores muertos absolutos de reposo constante)
        if (value > 0.01) {
            // Guardamos a 3 decimales para emular la resolución estándar de potenciómetros (aprox 255-1024 pasos)
            valueSet.add(value.toFixed(3));
            
            // Limitamos visualmente el conteo a 255 (estándar de 8-bit) para la UI
            const resCount = Math.min(valueSet.size, 255);
            dom.res.textContent = `${resCount} / 255`;
            
            // Jitter / Suavidad: Si el valor salta de forma anómala (ruido eléctrico)
            const delta = Math.abs(value - lastValue);
            if (delta > 0.1 && delta < 0.9) { // Ignorar soltadas bruscas intencionales (>0.9)
                if (side === 'lt') this.ltJitterCount++;
                else this.rtJitterCount++;
            }
        }

        // Diagnóstico en tiempo real
        const jitter = side === 'lt' ? this.ltJitterCount : this.rtJitterCount;
        
        if (jitter > 10) {
            dom.smooth.textContent = "Ruido (Jitter)";
            dom.smooth.className = "stat-val text-danger";
        }

        // Diagnóstico general de vida útil del potenciómetro
        if (value > 0.98) {
            dom.diag.textContent = "Excelente";
            dom.diag.className = "stat-val text-success";
        } else if (value > 0.85 && pct > 85) {
             // Si el usuario lo presiona y no llega al 100, pero se queda estancado
            dom.diag.textContent = "Pérdida de Rango";
            dom.diag.className = "stat-val text-warning";
        }
    }
}

/**
 * Motor del Algoritmo XE Score
 */
export class XEScoreCalculator {
    constructor(appInstance) {
        this.app = appInstance; // Referencia para leer estados de los módulos
        this.btnCalc = document.getElementById('btn-calculate-score');
        
        this.dom = {
            circle: document.querySelector('.score-circle'),
            value: document.getElementById('xe-score-value'),
            text: document.getElementById('xe-score-text'),
            list: document.getElementById('xe-recommendations')
        };

        this.bindEvents();
    }

    bindEvents() {
        this.btnCalc.addEventListener('click', () => {
            this.generateScore();
        });
    }

    /**
     * Habilita el botón cuando se conecta un control
     */
    enable() {
        this.btnCalc.disabled = false;
        this.dom.value.textContent = "--";
        this.dom.text.textContent = "Listo para evaluar";
        this.dom.circle.style.borderColor = "var(--glass-border)";
        this.dom.circle.style.color = "var(--color-text-muted)";
        this.dom.circle.style.boxShadow = "inset 0 0 20px rgba(0,0,0,0.5)";
        this.dom.list.innerHTML = '<li class="placeholder-text">Presiona "Generar Evaluación XE" para analizar los datos recopilados.</li>';
    }

    disable() {
        this.btnCalc.disabled = true;
        this.dom.value.textContent = "--";
        this.dom.text.textContent = "Esperando diagnóstico...";
        this.dom.circle.style.borderColor = "var(--glass-border)";
        this.dom.circle.style.color = "var(--color-text-muted)";
        this.dom.circle.style.boxShadow = "inset 0 0 20px rgba(0,0,0,0.5)";
        this.dom.list.innerHTML = '<li class="placeholder-text">Conecta un control para iniciar.</li>';
    }

    /**
     * Algoritmo Propietario de Calificación XE (0 a 100)
     */
    generateScore() {
        let score = 100;
        let recommendations = [];

        // 1. Evaluar Joysticks (Lectura indirecta desde el DOM para mantener el encapsulamiento de módulos)
        const lsDriftText = document.getElementById('ls-drift').textContent.replace('%', '');
        const rsDriftText = document.getElementById('rs-drift').textContent.replace('%', '');
        const lsDrift = parseFloat(lsDriftText) || 0;
        const rsDrift = parseFloat(rsDriftText) || 0;

        // Penalización por Drift (Tolerancia aceptable < 5%)
        if (lsDrift > 5.0) {
            score -= (lsDrift - 5.0) * 1.5; 
            recommendations.push(`Limpieza o reemplazo del potenciómetro izquierdo (Drift: ${lsDrift.toFixed(1)}%).`);
        }
        if (rsDrift > 5.0) {
            score -= (rsDrift - 5.0) * 1.5;
            recommendations.push(`Limpieza o reemplazo del potenciómetro derecho (Drift: ${rsDrift.toFixed(1)}%).`);
        }

        // 2. Evaluar Botones Pegados (Lectura de la instancia de ButtonAnalyzer)
        let stuckCount = 0;
        if (this.app.buttonAnalyzer && this.app.buttonAnalyzer.buttonsData) {
            this.app.buttonAnalyzer.buttonsData.forEach((btn, index) => {
                if (btn.isStuck) {
                    stuckCount++;
                    score -= 15; // Gran penalización por botón pegado
                    recommendations.push(`Revisar goma conductora o microswitch del botón [${this.app.buttonAnalyzer.buttonNames[index]}] (Atascado).`);
                }
            });
        }

        // 3. Evaluar Gatillos
        if (this.app.triggerAnalyzer) {
            const tr = this.app.triggerAnalyzer;
            if (tr.ltJitterCount > 10) {
                score -= 10;
                recommendations.push("Ruido detectado en Gatillo Izquierdo (LT). Requiere limpieza del sensor.");
            }
            if (tr.rtJitterCount > 10) {
                score -= 10;
                recommendations.push("Ruido detectado en Gatillo Derecho (RT). Requiere limpieza del sensor.");
            }
        }

        // Asegurar límites matemáticos
        score = Math.max(0, Math.min(100, Math.round(score)));

        // Determinar Clasificación y Estilos Visuales
        let classification = "";
        let color = "";
        let glow = "";

        if (score >= 90) {
            classification = "Excelente";
            color = "var(--color-success)";
            glow = "rgba(0, 255, 136, 0.4)";
            if(recommendations.length === 0) recommendations.push("El control se encuentra en perfectas condiciones.");
        } else if (score >= 80) {
            classification = "Muy Bueno";
            color = "var(--color-cyan-neon)";
            glow = "rgba(0, 243, 255, 0.4)";
        } else if (score >= 70) {
            classification = "Bueno";
            color = "var(--color-white)";
            glow = "rgba(255, 255, 255, 0.2)";
        } else if (score >= 60) {
            classification = "Regular";
            color = "var(--color-warning)";
            glow = "rgba(255, 183, 0, 0.4)";
        } else if (score >= 40) {
            classification = "Malo";
            color = "var(--color-danger)";
            glow = "rgba(255, 42, 42, 0.4)";
        } else {
            classification = "Requiere Reparación";
            color = "#ff0000";
            glow = "rgba(255, 0, 0, 0.8)";
            recommendations.unshift("URGENTE: Múltiples fallos críticos detectados.");
        }

        // Actualizar UI
        this.animateScoreCounter(score, color, glow);
        this.dom.text.textContent = classification;
        this.dom.text.style.color = color;

        // Renderizar Recomendaciones
        this.dom.list.innerHTML = '';
        recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="color:${color}">■</span> ${rec}`;
            this.dom.list.appendChild(li);
        });
    }

    /**
     * Animación visual del círculo de puntuación
     */
    animateScoreCounter(targetScore, color, glow) {
        let current = 0;
        const speed = 20; // ms por frame
        const step = Math.ceil(targetScore / 30) || 1; // Ajuste de velocidad dinámica

        this.dom.circle.style.borderColor = color;
        this.dom.circle.style.color = color;
        this.dom.circle.style.boxShadow = `0 0 30px ${glow}, inset 0 0 20px ${glow}`;

        const interval = setInterval(() => {
            current += step;
            if (current >= targetScore) {
                current = targetScore;
                clearInterval(interval);
            }
            this.dom.value.textContent = current;
        }, speed);
    }
}
