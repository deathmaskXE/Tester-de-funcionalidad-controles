class XETesterPro {
    constructor() {
        this.activeGamepadIndex = null;
        this.animationFrameId = null;
        this.lastTimestamp = 0;
        this.pollingRates = [];
        
        // Las clases ahora están disponibles globalmente gracias a la carga secuencial en index.html
        this.joystickAnalyzer = new JoystickAnalyzer();
        this.buttonAnalyzer = new ButtonAnalyzer();
        this.triggerAnalyzer = new TriggerAnalyzer();
        this.oscopeAnalyzer = new OscilloscopeAnalyzer();
        this.xeScore = new XEScoreCalculator(this); 
        this.reportGenerator = new ReportGenerator(this);
        
        this.initUI();
        this.startEngine();
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
                if (targetId === 'osciloscopio') {
                    this.oscopeAnalyzer.lsChart.resize();
                    this.oscopeAnalyzer.rsChart.resize();
                }
            });
        });

        // Informar al usuario que el sistema arrancó con éxito
        document.getElementById('status-text').textContent = "Presiona cualquier botón en el control...";
    }

    /**
     * MOTOR BLINDADO DE SONDEO (Polling Engine)
     * Ignoramos los eventos engañosos del navegador y leemos el hardware 60 veces por segundo.
     */
    startEngine() {
        const loop = (time) => {
            this.pollHardware(time);
            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    pollHardware(currentTime) {
        // Soporte universal para Chrome, Edge, Safari, Firefox
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let activeStillConnected = false;

        // Fase 1: Si ya tenemos un control asignado, verificar que siga vivo
        if (this.activeGamepadIndex !== null) {
            const current = gamepads[this.activeGamepadIndex];
            if (current && current.connected) {
                activeStillConnected = true;
                this.updateGamepadData(currentTime, current);
            } else {
                // Se desconectó físicamente o se perdió la conexión Bluetooth
                this.handleGamepadDisconnect();
            }
        }

        // Fase 2: Si no hay control asignado, buscar desesperadamente uno conectado
        if (!activeStillConnected) {
            for (let i = 0; i < gamepads.length; i++) {
                // Cuando el usuario oprima cualquier botón, la seguridad del navegador liberará este objeto
                if (gamepads[i] && gamepads[i].connected) {
                    this.handleGamepadConnect(gamepads[i]);
                    break; 
                }
            }
        }
    }

    handleGamepadConnect(gamepad) {
        this.activeGamepadIndex = gamepad.index;
        
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
        this.lastTimestamp = 0;
        this.pollingRates = [];
        
        const statusIndicator = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        
        statusIndicator.classList.remove('connected');
        statusIndicator.classList.add('disconnected');
        statusText.textContent = "Esperando... Presiona un botón";

        document.getElementById('info-name').textContent = "N/A";
        document.getElementById('info-id').textContent = "N/A";
        document.getElementById('info-index').textContent = "N/A";
        document.getElementById('info-mapping').textContent = "N/A";
        document.getElementById('info-polling').textContent = "0 Hz";
        document.getElementById('info-timestamp').textContent = "0 ms";

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

    updateGamepadData(currentTime, gamepad) {
        const dt = currentTime - this.lastTimestamp;
        if (dt > 0 && this.lastTimestamp !== 0) {
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

        // Despachar los datos a los módulos (Estricto orden de lectura)
        this.joystickAnalyzer.update(gamepad.axes);
        this.buttonAnalyzer.update(gamepad.buttons, currentTime);
        this.triggerAnalyzer.update(gamepad.buttons);
        this.oscopeAnalyzer.update(gamepad.axes);
    }
}

// Arrancar la aplicación una vez que todo el HTML se ha dibujado
document.addEventListener('DOMContentLoaded', () => {
    window.xeApp = new XETesterPro();
});
