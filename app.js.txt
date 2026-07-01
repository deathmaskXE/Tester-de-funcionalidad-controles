/**
 * ==========================================================================
 * XE TESTER PRO - CORE APPLICATION LOGIC
 * Architecture: Vanilla JS ES6+ (No Frameworks)
 * Modules Integrated: 1 to 6 (Reports)
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
        this.reportGenerator = new ReportGenerator(this); // Módulo 6
        
        this.initUI();
        this.initGamepadListeners();
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

        console.log("[XE Tester Pro] Sistema Completo Inicializado (Módulos 1-6).");
    }

    initGamepadListeners() {
        window.addEventListener("gamepadconnected", (e) => {
            this.handleGamepadConnect(e.gamepad);
        });
        window.addEventListener("gamepaddisconnected", (e) => {
            this.handleGamepadDisconnect(e.gamepad);
        });
        this.scanGamepads();
    }

    scanGamepads() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                this.handleGamepadConnect(gamepads[i]);
                break; 
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
        this.startDiagnosticLoop();
    }

    handleGamepadDisconnect(gamepad) {
        if (this.activeGamepadIndex === gamepad.index) {
            this.activeGamepadIndex = null;
            this.activeGamepad = null;
            
            const statusIndicator = document.getElementById('connection-status');
            const statusText = document.getElementById('status-text');
            
            statusIndicator.classList.remove('connected');
            statusIndicator.classList.add('disconnected');
            statusText.textContent = "Esperando control...";

            document.getElementById('info-name').textContent = "N/A";
            document.getElementById('info-id').textContent = "N/A";
            document.getElementById('info-index').textContent = "N/A";
            document.getElementById('info-mapping').textContent = "N/A";
            document.getElementById('info-polling').textContent = "0 Hz";
            document.getElementById('info-timestamp').textContent = "0 ms";

            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            
            this.joystickAnalyzer.resetPaths();
            this.joystickAnalyzer.resetStatsUI();
            this.joystickAnalyzer.drawJoystick(this.joystickAnalyzer.lsCtx, {x:0, y:0}, []);
            this.joystickAnalyzer.drawJoystick(this.joystickAnalyzer.rsCtx, {x:0, y:0}, []);
            
            this.buttonAnalyzer.resetCounters();
            this.triggerAnalyzer.resetAnalysis();
            this.oscopeAnalyzer.reset();
            this.xeScore.disable();
        }
    }

    parseGamepadName(idString) {
        if (idString.toLowerCase().includes('xbox')) return 'Control Xbox';
        if (idString.toLowerCase().includes('playstation') || idString.toLowerCase().includes('dualshock') || idString.toLowerCase().includes('dualsense')) return 'Control PlayStation';
        if (idString.toLowerCase().includes('nintendo') || idString.toLowerCase().includes('pro controller')) return 'Control Nintendo';
        return 'Control Genérico';
    }

    startDiagnosticLoop() {
        const loop = (time) => {
            this.updateGamepadData(time);
            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    updateGamepadData(currentTime) {
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.activeGamepadIndex];

        if (!gamepad) return;

        // Polling Rate 
        const dt = currentTime - this.lastTimestamp;
        if (dt > 0) {
            const currentHz = 1000 / dt;
            this.pollingRates.push(currentHz);
            if (this.pollingRates.length > 60) this.pollingRates.shift(); 
            
            const avgHz = this.pollingRates.reduce((a, b) => a + b) / this.pollingRates.length;
            
            if (Math.floor(currentTime) % 10 < 2) {
                document.getElementById('info-polling').textContent = `${Math.round(avgHz)} Hz`;
                document.getElementById('info-timestamp').textContent = `${Math.round(gamepad.timestamp)} ms`;
            }
        }
        this.lastTimestamp = currentTime;

        // Dispatch Data to Modules
        this.joystickAnalyzer.update(gamepad.axes);
        this.buttonAnalyzer.update(gamepad.buttons, currentTime);
        this.triggerAnalyzer.update(gamepad.buttons);
        this.oscopeAnalyzer.update(gamepad.axes);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.xeApp = new XETesterPro();
});
