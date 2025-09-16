const path = require('path');

// Serve React static files
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Multer for file uploads (optional)
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
app.post('/send', upload.single('file'), async (req, res) => {
  try {
    const {
      fromName,
      fromEmail,
      subject,
      recipients,
      concurrency,
      imageType,
      imagePath: imageURL,
      body
    } = req.body;

    const file = req.file; // Optional uploaded file

    if (!fromEmail || !subject || !recipients || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const recipientList = JSON.parse(recipients);

    // Prepare image source
    let imageSrc = '';
    if (imageType === 'local') {
      if (file) imageSrc = 'cid:headerImage';
      else imageSrc = '';
    } else if (imageType === 'url') {
      imageSrc = imageURL || '';
    } else {
      return res.status(400).json({ error: 'Invalid imageType' });
    }

    const worker = async (recipient) => {
      const replacedSubject = subject.replace(/\{\{name\}\}/g, recipient.name || '');
      const replacedBody = body.replace(/\{\{name\}\}/g, recipient.name || '');

      const attachments = [];

      // Attach header image if local
      if (file && imageType === 'local') {
        attachments.push({
          filename: file.originalname,
          path: file.path,
          cid: 'headerImage'
        });
      }

      // Optional: Attach any additional file if provided (user can send any file)
      // You can allow users to send multiple files if needed by using upload.array('files') in multer
      if (file && imageType !== 'local') {
        attachments.push({
          filename: file.originalname,
          path: file.path
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

    // Delete uploaded file after sending
    if (file) fs.unlinkSync(file.path);

    res.json({ ok: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Mail server running on port ${PORT}`));
