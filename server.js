import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());
// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});
// Helper to generate a PDF in memory
const generatePDF = async (data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', reject);
            const isBooking = data.type === 'BOOKING';
            const title = isBooking ? 'Rezervasyon Konfirmasyon Belgesi' : 'Bilgilendirme Dökümanı';
            // Header
            doc.fontSize(24).fillColor('#0284c7').text('ALPERLER AUTO', { align: 'center' });
            doc.moveDown();
            doc.fontSize(16).fillColor('#334155').text(title, { align: 'center' });
            doc.moveDown(2);
            // Customer Info
            doc.fontSize(12).fillColor('#000000');
            doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`);
            if (data.recordId)
                doc.text(`Referans No: ${data.recordId}`);
            if (data.customerName)
                doc.text(`Müşteri Adı: ${data.customerName}`);
            if (data.customerPhone)
                doc.text(`Telefon: ${data.customerPhone}`);
            doc.moveDown(2);
            // Body
            doc.fontSize(14).fillColor('#0284c7').text('Detaylar', { underline: true });
            doc.moveDown();
            doc.fontSize(12).fillColor('#334155').text(data.text || 'Detay bulunamadı.');
            doc.moveDown(2);
            // Legal & Terms
            doc.fontSize(10).fillColor('#64748b');
            doc.text('Bu belge bilgilendirme amaçlıdır. Araç teslimatında ıslak imzalı sözleşme yapılacaktır. Gösterilen fiyatlar ve şartlar bilgilendirme niteliğinde olup, şirket politikalarına göre değişiklik gösterebilir.');
            doc.moveDown();
            doc.text('Iletişim: alperlerauto@gmail.com | Tel: +90 532 000 0000', { align: 'center' });
            doc.end();
        }
        catch (e) {
            reject(e);
        }
    });
};
function getBeautifulHtml(subject, message) {
    const messageHtml = message.replace(/\n/g, '<br/>');
    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #0f172a; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;">ALPERLER</h1>
            <p style="color: #60a5fa; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Premium Rent A Car</p>
        </div>
        
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="color: #1e293b; font-size: 20px; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">${subject}</h2>
            <div style="color: #475569; font-size: 16px; line-height: 1.6; margin-top: 20px;">
                ${messageHtml}
            </div>
            
            <div style="margin-top: 40px; padding: 20px; background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 4px;">
                <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.5;">
                    📌 Sorularınız mı var? Bize 7/24 whatsapp (veya telefon) üzerinden ulaşabilirsiniz.<br/>
                    <strong style="color: #0284c7;">Müşteri Hizmetleri:</strong> +90 532 000 0000
                </p>
            </div>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 13px; color: #64748b;">
            <p style="margin: 0; margin-bottom: 15px;">Alperler Automotiv Turizm ve Tic. Ltd. Şti. | Yüksekova, Hakkari</p>
            <div>
                <a href="https://alperrentacar.online" style="color: #0284c7; text-decoration: none; margin: 0 10px; font-weight: bold;">Web Sitemiz</a>
                <a href="https://instagram.com/alperler" style="color: #0284c7; text-decoration: none; margin: 0 10px; font-weight: bold;">Instagram</a>
            </div>
            <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
                Bu e-posta sistem tarafından otomatik olarak gönderilmiştir. Lütfen bu adrese doğrudan yanıt vermeyiniz.
            </p>
        </div>
    </div>
    `;
}
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, text, html, pdfData } = req.body;
        if (!to || !to.includes('@')) {
            console.error('[MAILER] Invalid or missing recipient (to):', to);
            return res.status(400).json({ success: false, error: 'Böyle bir e-posta adresi bulunamadı (Invalid recipient)' });
        }
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('[MAILER] SMTP credentials not set. Simulating email send.');
            console.log(`[MAILER] To: ${to} | Subject: ${subject}`);
            return res.status(200).json({ success: true, simulated: true });
        }
        const mailOptions = {
            from: `"Alperler Auto" <${process.env.SMTP_USER}>`,
            to,
            subject: subject || 'Alperler Auto',
            text: text || 'Sistem Bildirimi',
            html: html || getBeautifulHtml(subject, text)
        };
        if (pdfData && pdfData.generate) {
            try {
                const pdfBuffer = await generatePDF(pdfData);
                mailOptions.attachments = [
                    {
                        filename: 'Alperler_Bilgilendirme_Belgesi.pdf',
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ];
            }
            catch (err) {
                console.error('[MAILER] Failed to generate PDF, sending without attachment', err);
            }
        }
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('[MAILER] Error sending email:', error);
        res.status(500).json({ success: false, error: String(error) });
    }
});
// The Angular build output is configured to go directly to 'dist'
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');
console.log(`[DEBUG] Resolved distPath: ${distPath}`);
if (fs.existsSync(distPath)) {
    console.log(`[DEBUG] Contents of distPath:`, fs.readdirSync(distPath));
}
// Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));
// Serve static files
app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));
// SPA routing
app.get(/.*/, (req, res) => {
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        res.status(404).send('Application not built.');
    }
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
