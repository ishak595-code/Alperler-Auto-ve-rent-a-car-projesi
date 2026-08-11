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
const generatePDF = async (data: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers: Buffer[] = [];
            
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
            if (data.recordId) doc.text(`Referans No: ${data.recordId}`);
            if (data.customerName) doc.text(`Müşteri Adı: ${data.customerName}`);
            if (data.customerPhone) doc.text(`Telefon: ${data.customerPhone}`);
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
        } catch (e) {
            reject(e);
        }
    });
};

function getBeautifulHtml(subject: string, message: string, isHtml: boolean = false) {
    const content = isHtml ? message : message.replace(/\n/g, '<br/>');
    return `
    <div style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 35px 20px; text-align: center; border-bottom: 4px solid #3b82f6;">
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td align="center">
                        <div style="display: inline-block; background: #ffffff; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                            <img src="https://alperrentacar.online/assets/logo.png" alt="Alperler Auto Logo" width="120" style="display: block; max-height: 50px; object-fit: contain; font-size: 24px; font-weight: bold; color: #0284c7; text-align: center;" onerror="this.outerHTML='<span style=\\'color:#0284c7;font-weight:bold;font-size:24px;\\'>ALPERLER</span>'"/>
                        </div>
                    </td>
                </tr>
            </table>
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px;">ALPERLER AUTO</h1>
            <p style="color: #93c5fd; margin: 8px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2.5px;">Premium Araç Kiralama & Satış</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 35px; background-color: #ffffff;">
            <h2 style="color: #1e293b; font-size: 22px; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; font-weight: 600;">${subject}</h2>
            
            <div style="color: #334155; font-size: 16px; line-height: 1.7; margin-top: 25px;">
                ${content}
            </div>
            
            <!-- Default Contact Block -->
            <div style="margin-top: 40px; padding: 25px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px;">
                <p style="margin: 0; color: #0f172a; font-size: 15px; line-height: 1.6;">
                    <strong style="color: #0284c7; display: block; margin-bottom: 8px; font-size: 16px;">💬 Yardıma mı ihtiyacınız var?</strong>
                    Müşteri hizmetlerimiz size destek olmak için 7/24 hizmetinizdedir.<br/>
                    <strong>Telefon / WhatsApp:</strong> +90 532 000 0000<br/>
                    <strong>E-posta:</strong> destek@alperrentacar.online
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 30px 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #475569;">Alperler Otomotiv Turizm ve Tic. Ltd. Şti.</p>
            <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b;">Yüksekova, Hakkari, Türkiye</p>
            
            <div style="margin-bottom: 20px;">
                <a href="https://alperrentacar.online" style="display: inline-block; padding: 8px 20px; background-color: #0284c7; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 600; margin: 0 5px;">Web Sitesini Ziyaret Et</a>
            </div>

            <div style="margin-bottom: 20px;">
                <a href="https://instagram.com/alperlerauto" style="color: #0ea5e9; text-decoration: none; margin: 0 12px; font-weight: 600; font-size: 13px;">Instagram</a>
                <a href="https://facebook.com/alperlerauto" style="color: #0ea5e9; text-decoration: none; margin: 0 12px; font-weight: 600; font-size: 13px;">Facebook</a>
                <a href="https://twitter.com/alperlerauto" style="color: #0ea5e9; text-decoration: none; margin: 0 12px; font-weight: 600; font-size: 13px;">X (Twitter)</a>
            </div>

            <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Bu e-posta sistem tarafından otomatik olarak gönderilmiştir.<br/>
                Lütfen bu adrese doğrudan yanıt vermeyiniz.
            </p>
            <p style="margin: 10px 0 0 0; font-size: 10px; color: #cbd5e1;">
                &copy; ${new Date().getFullYear()} Alperler Auto. Tüm hakları saklıdır.
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

        const mailOptions: any = {
            from: `"Alperler Auto" <${process.env.SMTP_USER}>`,
            to,
            subject: subject || 'Alperler Auto',
            text: text || 'Sistem Bildirimi',
            html: html ? getBeautifulHtml(subject || 'Alperler Auto Bildirim', html, true) : getBeautifulHtml(subject || 'Alperler Auto Bildirim', text, false)
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
            } catch (err) {
                console.error('[MAILER] Failed to generate PDF, sending without attachment', err);
            }
        }

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true });
    } catch (error) {
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
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});
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
  } else {
      res.status(404).send('Application not built.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

