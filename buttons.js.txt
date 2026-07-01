/**
 * ==========================================================================
 * XE TESTER PRO - DIAGNOSTICS MODULE
 * Module: 3 (Buttons Analyzer)
 * ==========================================================================
 */

export class ButtonAnalyzer {
    constructor() {
        this.container = document.getElementById('botones-grid-container');
        this.btnReset = document.getElementById('btn-reset-botones');
        
        // Mapeo Estándar de Gamepad HTML5 (17 Botones)
        this.buttonNames = [
            'A / Cruz', 'B / Círculo', 'X / Cuadrado', 'Y / Triángulo',
            'LB / L1', 'RB / R1', 'LT / L2', 'RT / R2',
            'Select / Share', 'Start / Options',
            'LS Click', 'RS Click',
            'D-Pad Arriba', 'D-Pad Abajo', 'D-Pad Izquierda', 'D-Pad Derecha',
            'Home / Guía'
        ];

        // Estructura de Datos
        this.buttonsData = [];
        this.domElements = [];

        this.STUCK_THRESHOLD_MS = 3000; // 3 segundos para considerar un botón pegado

        this.init();
        this.bindEvents();
    }

    /**
     * Inicializa la estructura de datos e inyecta la UI en el DOM
     */
    init() {
        this.container.innerHTML = ''; // Limpiar contenedor
        
        for (let i = 0; i < this.buttonNames.length; i++) {
            // Inicializar Data
            this.buttonsData.push({
                isPressed: false,
                pressCount: 0,
                pressStartTime: 0,
                lastResponseTime: 0,
                isStuck: false
            });

            // Generar HTML de la Tarjeta
            const card = document.createElement('div');
            card.className = 'btn-card';
            card.id = `btn-card-${i}`;
            
            card.innerHTML = `
                <div class="btn-header">
                    <span class="btn-name">${this.buttonNames[i]}</span>
                    <span class="btn-status-indicator"></span>
                </div>
                <div class="btn-stats">
                    <span>Pulsaciones: <span class="btn-stat-val" id="btn-count-${i}">0</span></span>
                    <span>Respuesta: <span class="btn-stat-val" id="btn-time-${i}">0ms</span></span>
                </div>
                <div class="btn-stats" style="margin-top: 5px;">
                    <span>Estado: <span class="btn-stat-val text-cyan" id="btn-status-text-${i}">OK</span></span>
                </div>
            `;
            
            this.container.appendChild(card);

            // Guardar referencias al DOM para evitar QuerySelectors en el Loop de 60FPS
            this.domElements.push({
                card: card,
                count: document.getElementById(`btn-count-${i}`),
                time: document.getElementById(`btn-time-${i}`),
                statusText: document.getElementById(`btn-status-text-${i}`)
            });
        }
    }

    /**
     * Enlaza eventos de UI del módulo
     */
    bindEvents() {
        this.btnReset.addEventListener('click', () => {
            this.resetCounters();
        });
    }

    /**
     * Reinicia las estadísticas
     */
    resetCounters() {
        for (let i = 0; i < this.buttonsData.length; i++) {
            this.buttonsData[i].pressCount = 0;
            this.buttonsData[i].lastResponseTime = 0;
            this.buttonsData[i].isStuck = false;
            
            this.domElements[i].count.textContent = '0';
            this.domElements[i].time.textContent = '0ms';
            this.domElements[i].statusText.textContent = 'OK';
            this.domElements[i].statusText.className = 'btn-stat-val text-cyan';
            this.domElements[i].card.classList.remove('stuck');
        }
    }

    /**
     * Llamado por app.js en cada frame
     * @param {ReadonlyArray<GamepadButton>} buttons Arreglo de botones
     * @param {number} currentTime Tiempo actual de requestAnimationFrame
     */
    update(buttons, currentTime) {
        if (!buttons) return;

        // Iterar solo hasta la cantidad de botones que tenga el control conectado o el mapeo estándar (máx 17)
        const limit = Math.min(buttons.length, this.buttonNames.length);

        for (let i = 0; i < limit; i++) {
            const btnState = buttons[i].pressed;
            const data = this.buttonsData[i];
            const dom = this.domElements[i];

            // Detectar Cambio de Estado (De Suelto a Presionado)
            if (btnState && !data.isPressed) {
                data.isPressed = true;
                data.pressCount++;
                data.pressStartTime = currentTime;
                
                // Actualizar UI
                dom.count.textContent = data.pressCount;
                dom.card.classList.add('pressed');
            } 
            // Detectar Cambio de Estado (De Presionado a Suelto)
            else if (!btnState && data.isPressed) {
                data.isPressed = false;
                
                // Calcular tiempo de respuesta (duración presionado)
                data.lastResponseTime = Math.round(currentTime - data.pressStartTime);
                dom.time.textContent = `${data.lastResponseTime}ms`;
                
                // Resetear estado visual
                dom.card.classList.remove('pressed');
                
                // Si estaba atascado, liberarlo visualmente
                if (data.isStuck) {
                    data.isStuck = false;
                    dom.card.classList.remove('stuck');
                    dom.statusText.textContent = 'OK';
                    dom.statusText.className = 'btn-stat-val text-cyan';
                }
            }

            // Diagnóstico de Botón Pegado (Stuck) si sigue presionado
            if (data.isPressed) {
                const holdDuration = currentTime - data.pressStartTime;
                
                // Actualizar contador en vivo mientras se mantiene presionado
                dom.time.textContent = `${Math.round(holdDuration)}ms`;

                if (holdDuration > this.STUCK_THRESHOLD_MS && !data.isStuck) {
                    data.isStuck = true;
                    dom.card.classList.add('stuck');
                    dom.statusText.textContent = '¡PEGADO!';
                    dom.statusText.className = 'btn-stat-val text-danger';
                    dom.statusText.style.color = "var(--color-danger)";
                }
            }
        }
    }
}
