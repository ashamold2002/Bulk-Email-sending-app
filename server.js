require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Multer: separate header + attachments
const upload = multer({ dest: 'uploads/' });

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Concurrency limiter
async function sendAllWithLimit(items, workerFn, limit = 5) {
  const results = [];
  let idx = 0;
  const runners = new Array(limit).fill(null).map(async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      try {
        results[i] = await workerFn(items[i], i);
      } catch (err) {
        results[i] = { ok: false, error: err.message || String(err) };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

// POST /send
app.post(
  '/send',
  upload.fields([{ name: 'header', maxCount: 1 }, { name: 'files', maxCount: 5 }]),
  async (req, res) => {
    try {
      const {
        fromName,
        fromEmail,
        subject,
        recipients,
        concurrency,
        imageType,   // "url" if you want an external image
        imagePath,   // URL of external image
        body
      } = req.body;

      const headerFile = req.files['header'] ? req.files['header'][0] : null;
      const attachmentFiles = req.files['files'] || [];

      if (!fromEmail || !subject || !recipients || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const recipientList = JSON.parse(recipients);

      // Image source
      let imageSrc = '';
      if (headerFile) {
        // Uploaded header image
        imageSrc = 'cid:headerImage';
      } else if (imageType === 'url' && imagePath) {
        // External image
        imageSrc = imagePath;
      }

      const worker = async (recipient) => {
        const replacedSubject = subject.replace(/\{\{name\}\}/g, recipient.name || '');
        const replacedBody = body.replace(/\{\{name\}\}/g, recipient.name || '');

        const attachments = [];

        // Header image from upload
        if (headerFile) {
          attachments.push({
            filename: headerFile.originalname,
            path: headerFile.path,
            cid: 'headerImage'
          });
        }

        // Additional files
        for (const f of attachmentFiles) {
          attachments.push({
            filename: f.originalname,
            path: f.path
          });
        }

        const mailOptions = {
          from: `${fromName || ''} <${fromEmail}>`,
          to: recipient.email,
          subject: replacedSubject,
          html: `
            <div style="text-align:center;">
              ${imageSrc ? `<img src="${imageSrc}" style="max-width:1500px;width:100%;height:auto;"/>` : ''}
              <div style="margin-top:20px; text-align:left; font-family: Arial, sans-serif; font-size:14px;">
                ${replacedBody.replace(/\n/g, '<br/>')}
              </div>
            </div>
          `,
          attachments
        };

        const info = await transporter.sendMail(mailOptions);
        return { ok: true, info };
      };

      const results = await sendAllWithLimit(recipientList, worker, Math.max(1, Number(concurrency)));

      // Cleanup
      if (headerFile) fs.unlinkSync(headerFile.path);
      for (const f of attachmentFiles) fs.unlinkSync(f.path);

      res.json({ ok: true, results });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mail server running on port ${PORT}`));
