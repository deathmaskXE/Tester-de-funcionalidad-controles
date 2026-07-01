/**
 * ==========================================================================
 * XE TESTER PRO - CORE APPLICATION LOGIC
 * Architecture: Vanilla JS ES6+ (No Frameworks)
 * Modules Integrated: 1 to 6
 * Fix: Continuous Polling Engine para bypass de seguridad Anti-Fingerprinting
 * ==========================================================================
 */

import { JoystickAnalyzer } from './diagnostics.js';
import { ButtonAnalyzer } from './buttons.js';
import { TriggerAnalyzer, XEScoreCalculator } from './gamepad.js';
import { OscilloscopeAnalyzer } from './charts.js';
import { ReportGenerator } from './report.js';

class XETesterPro {
    constructor() {
        this.activeGamepad = null;
        this.activeGamepadIndex = null;
        this.animationFrameId = null;
        this.lastTimestamp = 0;
        this.pollingRates = [];
        
        // Instancia de Módulos
        this.joystickAnalyzer = new JoystickAnalyzer();
        this.buttonAnalyzer = new ButtonAnalyzer();
        this.triggerAnalyzer = new TriggerAnalyzer();
        this.oscopeAnalyzer = new OscilloscopeAnalyzer();
        
        this.xeScore = new XEScoreCalculator(this); 
        this.reportGenerator = new ReportGenerator(this);
        
        this.initUI();
        this.initGamepadSystem();
    }

    initUI() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const viewSections = document.querySelectorAll('.view-section');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                viewSections.forEach(v => v.classList.remove('active'));

                const targetId = e.target.getAttribute('data-target');
                e.target.classList.add('active');
                document.getElementById(`view-${targetId}`).classList.add('active');
                
                // Redimensionar canvas de Osciloscopio si se entra a esa pestaña
                if (targetId === 'osciloscopio') {
                    this.oscopeAnalyzer.lsChart.resize();
                    this.oscopeAnalyzer.rsChart.resize();
                }
            });
        });

        console.log("[XE Tester Pro] Sistema UI Inicializado.");
    }

    /**
     * Inicializa el sistema de detección robusto (Eventos + Polling)
     */
    initGamepadSystem() {
        // 1. Escuchar eventos nativos (pueden fallar si ya estaba conectado antes de cargar)
        window.addEventListener("gamepadconnected", (e) => {
            console.log(`[XE Tester Pro] Evento de conexión detectado: ${e.gamepad.id}`);
            if (this.activeGamepadIndex === null) {
                this.handleGamepadConnect(e.gamepad);
            }
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log(`[XE Tester Pro] Evento de desconexión detectado: ${e.gamepad.id}`);
            if (this.activeGamepadIndex === e.gamepad.index) {
                this.handleGamepadDisconnect();
            }
        });

        // 2. Iniciar el Engine de sondeo continuo (60FPS) INMEDIATAMENTE
        // Esto soluciona el bloqueo de Chrome/Edge al devolver arrays nulos.
        const engineLoop = (time) => {
            this.pollGamepads(time);
            this.animationFrameId = requestAnimationFrame(engineLoop);
        };
        this.animationFrameId = requestAnimationFrame(engineLoop);
        
        console.log("[XE Tester Pro] Motor de detección continuo iniciado. Presiona cualquier botón para enlazar.");
    }

    /**
     * Bucle de sondeo constante para detectar controles "fantasma" bloqueados por el navegador
     */
    pollGamepads(currentTime) {
        // Obtener el estado actual del hardware
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
        
        // ESTADO A: No tenemos control asignado, buscar uno válido
        if (this.activeGamepadIndex === null) {
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i] && gamepads[i].connected) {
                    this.handleGamepadConnect(gamepads[i]);
                    break; // Enlazar al primer control que reporte actividad
                }
            }
        } 
        // ESTADO B: Tenemos un control asignado, procesar sus datos
        else {
            const gamepad = gamepads[this.activeGamepadIndex];
            
            // Si el control se desconectó físicamente o el índice se vuelve null
            if (!gamepad || !gamepad.connected) {
                this.handleGamepadDisconnect();
            } else {
                // El control está activo, actualizar módulos
                this.updateGamepadData(currentTime, gamepad);
            }
        }
    }

    handleGamepadConnect(gamepad) {
        this.activeGamepadIndex = gamepad.index;
        this.activeGamepad = gamepad;
        
        const statusIndicator = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        
        statusIndicator.classList.remove('disconnected');
        statusIndicator.classList.add('connected');
        statusText.textContent = "Control Conectado";

        document.getElementById('info-name').textContent = this.parseGamepadName(gamepad.id);
        document.getElementById('info-id').textContent = gamepad.id;
        document.getElementById('info-index').textContent = gamepad.index;
        document.getElementById('info-mapping').textContent = gamepad.mapping || "Estándar";

        this.xeScore.enable();
    }

    handleGamepadDisconnect() {
        this.activeGamepadIndex = null;
        this.activeGamepad = null;
        this.lastTimestamp = 0;
        this.pollingRates = [];
        
        const statusIndicator = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        
        statusIndicator.classList.remove('connected');
        statusIndicator.classList.add('disconnected');
        
        // Aviso importante al usuario respecto a la seguridad de los navegadores
        statusText.textContent = "Presiona cualquier botón...";

        document.getElementById('info-name').textContent = "N/A";
        document.getElementById('info-id').textContent = "N/A";
        document.getElementById('info-index').textContent = "N/A";
        document.getElementById('info-mapping').textContent = "N/A";
        document.getElementById('info-polling').textContent = "0 Hz";
        document.getElementById('info-timestamp').textContent = "0 ms";

        // Reiniciar todos los módulos visuales
        this.joystickAnalyzer.resetPaths();
        this.joystickAnalyzer.resetStatsUI();
        this.joystickAnalyzer.drawJoystick(this.joystickAnalyzer.lsCtx, {x:0, y:0}, []);
        this.joystickAnalyzer.drawJoystick(this.joystickAnalyzer.rsCtx, {x:0, y:0}, []);
        
        this.buttonAnalyzer.resetCounters();
        this.triggerAnalyzer.resetAnalysis();
        this.oscopeAnalyzer.reset();
        this.xeScore.disable();
    }

    parseGamepadName(idString) {
        const idLower = idString.toLowerCase();
        if (idLower.includes('xbox')) return 'Control Xbox';
        if (idLower.includes('playstation') || idLower.includes('dualshock') || idLower.includes('dualsense')) return 'Control PlayStation';
        if (idLower.includes('nintendo') || idLower.includes('pro controller')) return 'Control Nintendo';
        return 'Control Genérico';
    }

    /**
     * Actualiza la data de todos los submódulos usando el control activo
     */
    updateGamepadData(currentTime, gamepad) {
        // Cálculo de Polling Rate 
        const dt = currentTime - this.lastTimestamp;
        if (dt > 0 && this.lastTimestamp !== 0) {
            const currentHz = 1000 / dt;
            this.pollingRates.push(currentHz);
            if (this.pollingRates.length > 60) this.pollingRates.shift(); 
            
            const avgHz = this.pollingRates.reduce((a, b) => a + b) / this.pollingRates.length;
            
            // Actualizar DOM a baja frecuencia para no afectar rendimiento
            if (Math.floor(currentTime) % 10 < 2) {
                document.getElementById('info-polling').textContent = `${Math.round(avgHz)} Hz`;
                document.getElementById('info-timestamp').textContent = `${Math.round(gamepad.timestamp)} ms`;
            }
        }
        this.lastTimestamp = currentTime;

        // Inyectar datos en vivo a los módulos analíticos
        this.joystickAnalyzer.update(gamepad.axes);
        this.buttonAnalyzer.update(gamepad.buttons, currentTime);
        this.triggerAnalyzer.update(gamepad.buttons);
        this.oscopeAnalyzer.update(gamepad.axes);
    }
}

// Inicializar Aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.xeApp = new XETesterPro();
});
