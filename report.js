class ReportGenerator {
    constructor(appInstance) {
        this.app = appInstance;
        this.inputs = { clientName: document.getElementById('client-name'), serialNumber: document.getElementById('device-serial'), comments: document.getElementById('tech-comments') };
        this.doc = {
            date: document.getElementById('doc-date'), id: document.getElementById('doc-id'), client: document.getElementById('doc-client'), serial: document.getElementById('doc-serial'), deviceName: document.getElementById('doc-device-name'), deviceId: document.getElementById('doc-device-id'),
            scoreVal: document.getElementById('doc-score-val'), scoreClass: document.getElementById('doc-score-class'), scoreCircle: document.querySelector('.doc-score-circle'), recs: document.getElementById('doc-recommendations'), comments: document.getElementById('doc-comments'), qrImg: document.getElementById('doc-qr-img')
        };
        this.btnUpdate = document.getElementById('btn-generate-report'); this.btnPrint = document.getElementById('btn-print-pdf'); this.btnWhatsApp = document.getElementById('btn-send-wa');
        this.bindEvents();
    }
    bindEvents() {
        this.btnUpdate.addEventListener('click', () => this.generateReport());
        this.btnPrint.addEventListener('click', () => { this.generateReport(); window.print(); });
        this.btnWhatsApp.addEventListener('click', () => this.sendWhatsApp());
    }
    generateReport() {
        const now = new Date(); this.doc.date.textContent = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        this.doc.id.textContent = `XETP-${Math.floor(Math.random() * 90000) + 10000}`;
        this.doc.client.textContent = this.inputs.clientName.value || 'No especificado';
        this.doc.serial.textContent = this.inputs.serialNumber.value || 'No especificado';
        this.doc.comments.textContent = this.inputs.comments.value || 'El control ha sido analizado mediante la suite de diagnóstico XE Tester Pro.';
        this.doc.deviceName.textContent = document.getElementById('info-name').textContent;
        this.doc.deviceId.textContent = document.getElementById('info-id').textContent;
        
        const scoreValStr = document.getElementById('xe-score-value').textContent; const scoreClassStr = document.getElementById('xe-score-text').textContent;
        this.doc.scoreVal.textContent = scoreValStr; this.doc.scoreClass.textContent = scoreClassStr;
        if (scoreValStr !== '--') {
            const score = parseInt(scoreValStr);
            if (score >= 90) { this.doc.scoreCircle.style.borderColor = '#00ff88'; this.doc.scoreClass.style.color = '#00aa55'; }
            else if (score >= 80) { this.doc.scoreCircle.style.borderColor = '#00f3ff'; this.doc.scoreClass.style.color = '#0088aa'; }
            else if (score >= 60) { this.doc.scoreCircle.style.borderColor = '#ffb700'; this.doc.scoreClass.style.color = '#cc9900'; }
            else { this.doc.scoreCircle.style.borderColor = '#ff2a2a'; this.doc.scoreClass.style.color = '#cc0000'; }
        }
        const recListUI = document.getElementById('xe-recommendations'); this.doc.recs.innerHTML = '';
        if (recListUI.children.length > 0) { Array.from(recListUI.children).forEach(li => { const newLi = document.createElement('li'); newLi.textContent = li.textContent.replace('■', '').trim(); this.doc.recs.appendChild(newLi); }); }
        this.generateQRCode();
    }
    generateQRCode() {
        const qrText = `XE Tester Pro | Diagnóstico\nDispositivo: ${this.doc.deviceName.textContent}\nSerie: ${this.doc.serial.textContent}\nCalificación Global: ${this.doc.scoreVal.textContent}/100`;
        this.doc.qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;
        this.doc.qrImg.style.display = 'block';
    }
    sendWhatsApp() {
        this.generateReport();
        let recsText = ""; Array.from(this.doc.recs.children).forEach((li, idx) => recsText += `${idx + 1}. ${li.textContent}\n`);
        const message = `*DIAGNÓSTICO XE TESTER PRO*\n\nHola ${this.inputs.clientName.value || 'Cliente'},\nTe compartimos el resumen técnico de tu dispositivo:\n\n🎮 *Control:* ${this.doc.deviceName.textContent}\n📊 *Calificación:* ${this.doc.scoreVal.textContent}/100 (${this.doc.scoreClass.textContent})\n\n*🛠️ Observaciones/Recomendaciones:*\n${recsText}\nGracias por tu confianza.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
                                      }
