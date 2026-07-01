/**
 * ==========================================================================
 * XE TESTER PRO - DIAGNOSTICS MODULE
 * Module: 6 (Reports Generator)
 * Sin frameworks externos.
 * ==========================================================================
 */

export class ReportGenerator {
    constructor(appInstance) {
        this.app = appInstance;
        
        // Referencias Inputs UI
        this.inputs = {
            clientName: document.getElementById('client-name'),
            serialNumber: document.getElementById('device-serial'),
            comments: document.getElementById('tech-comments')
        };

        // Referencias Documento Reporte
        this.doc = {
            date: document.getElementById('doc-date'),
            id: document.getElementById('doc-id'),
            client: document.getElementById('doc-client'),
            serial: document.getElementById('doc-serial'),
            deviceName: document.getElementById('doc-device-name'),
            deviceId: document.getElementById('doc-device-id'),
            scoreVal: document.getElementById('doc-score-val'),
            scoreClass: document.getElementById('doc-score-class'),
            scoreCircle: document.querySelector('.doc-score-circle'),
            recs: document.getElementById('doc-recommendations'),
            comments: document.getElementById('doc-comments'),
            qrImg: document.getElementById('doc-qr-img')
        };

        // Botones de Acción
        this.btnUpdate = document.getElementById('btn-generate-report');
        this.btnPrint = document.getElementById('btn-print-pdf');
        this.btnWhatsApp = document.getElementById('btn-send-wa');

        this.bindEvents();
    }

    bindEvents() {
        this.btnUpdate.addEventListener('click', () => this.generateReport());
        this.btnPrint.addEventListener('click', () => {
            this.generateReport();
            // window.print() abre el diálogo nativo del SO para imprimir o Guardar como PDF
            window.print();
        });
        this.btnWhatsApp.addEventListener('click', () => this.sendWhatsApp());
    }

    /**
     * Extrae información de la UI y los Módulos para llenar la plantilla
     */
    generateReport() {
        // 1. Metadatos del Documento
        const now = new Date();
        this.doc.date.textContent = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        this.doc.id.textContent = `XETP-${Math.floor(Math.random() * 90000) + 10000}`;

        // 2. Datos del Formulario Cliente
        this.doc.client.textContent = this.inputs.clientName.value || 'No especificado';
        this.doc.serial.textContent = this.inputs.serialNumber.value || 'No especificado';
        
        const comm = this.inputs.comments.value;
        this.doc.comments.textContent = comm ? comm : 'El control ha sido analizado mediante la suite de diagnóstico XE Tester Pro.';

        // 3. Datos del Dispositivo (Leyendo del módulo Core App)
        this.doc.deviceName.textContent = document.getElementById('info-name').textContent;
        this.doc.deviceId.textContent = document.getElementById('info-id').textContent;

        // 4. Datos del XE Score
        const scoreValStr = document.getElementById('xe-score-value').textContent;
        const scoreClassStr = document.getElementById('xe-score-text').textContent;
        
        this.doc.scoreVal.textContent = scoreValStr;
        this.doc.scoreClass.textContent = scoreClassStr;

        // Coloreo para impresión según la clasificación
        if (scoreValStr !== '--') {
            const score = parseInt(scoreValStr);
            if (score >= 90) { this.doc.scoreCircle.style.borderColor = '#00ff88'; this.doc.scoreClass.style.color = '#00aa55'; }
            else if (score >= 80) { this.doc.scoreCircle.style.borderColor = '#00f3ff'; this.doc.scoreClass.style.color = '#0088aa'; }
            else if (score >= 60) { this.doc.scoreCircle.style.borderColor = '#ffb700'; this.doc.scoreClass.style.color = '#cc9900'; }
            else { this.doc.scoreCircle.style.borderColor = '#ff2a2a'; this.doc.scoreClass.style.color = '#cc0000'; }
        }

        // 5. Recomendaciones (Copiar de la UI del Score)
        const recListUI = document.getElementById('xe-recommendations');
        this.doc.recs.innerHTML = '';
        if (recListUI.children.length > 0) {
            Array.from(recListUI.children).forEach(li => {
                const newLi = document.createElement('li');
                // Limpiar el cuadradito de color que usamos en el dashboard oscuro
                newLi.textContent = li.textContent.replace('■', '').trim();
                this.doc.recs.appendChild(newLi);
            });
        }

        // 6. Generar Código QR
        this.generateQRCode();
    }

    /**
     * Utiliza la API pública de QR Server (Sin librerías externas)
     */
    generateQRCode() {
        const score = this.doc.scoreVal.textContent;
        const device = this.doc.deviceName.textContent;
        const serial = this.doc.serial.textContent;
        
        // El texto que contendrá el QR al escanearse
        const qrText = `XE Tester Pro | Diagnóstico\nDispositivo: ${device}\nSerie: ${serial}\nCalificación Global: ${score}/100`;
        const encodedText = encodeURIComponent(qrText);
        
        // URL de la API pública
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedText}`;
        
        this.doc.qrImg.src = qrUrl;
        this.doc.qrImg.style.display = 'block';
    }

    /**
     * Formatea un mensaje para la API de WhatsApp Web/App
     */
    sendWhatsApp() {
        // Asegurarse de que el reporte está actualizado
        this.generateReport(); 

        const client = this.inputs.clientName.value || 'Cliente';
        const device = this.doc.deviceName.textContent;
        const score = this.doc.scoreVal.textContent;
        const clasif = this.doc.scoreClass.textContent;
        
        // Extraer recomendaciones en texto
        let recsText = "";
        Array.from(this.doc.recs.children).forEach((li, idx) => {
            recsText += `${idx + 1}. ${li.textContent}\n`;
        });

        // Crear plantilla del mensaje
        const message = `*DIAGNÓSTICO XE TESTER PRO*\n\nHola ${client},\nTe compartimos el resumen técnico de tu dispositivo:\n\n🎮 *Control:* ${device}\n📊 *Calificación:* ${score}/100 (${clasif})\n\n*🛠️ Observaciones/Recomendaciones:*\n${recsText}\nGracias por tu confianza.`;

        // Abrir WhatsApp con el texto pre-cargado
        const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    }
}
