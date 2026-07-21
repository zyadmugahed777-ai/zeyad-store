const router = require('express').Router();
const { getDb } = require('../../config/database');
const upload = require('../../middleware/upload');
const { sanitize, normalizePhone } = require('../../utils/helpers');

router.use('/book-appointment', require('./appointments'));
router.use('/request-consultation', require('./consultations'));
router.use('/request-design', require('./designs'));
router.use('/request-quote', require('./quotes'));

function pick(body, keys) {
  for (const key of keys) {
    if (body[key]) return body[key];
  }
  return '';
}

function createContactLikeRequest(type, title, req, res, next) {
  try {
    const db = getDb();
    const fullName = pick(req.body, ['fullName', 'contactName', 'name']) || 'عميل الموقع';
    const phone = normalizePhone(pick(req.body, ['phone', 'contactPhone']));
    const email = sanitize(pick(req.body, ['email', 'contactEmail']));
    const subject = sanitize(pick(req.body, ['subject', 'contactSubject']) || title);
    const details = Object.entries(req.body)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    const files = (req.files || []).map((file) => `/uploads/media/${file.filename}`);
    const message = sanitize([details, files.length ? `files: ${files.join(', ')}` : ''].filter(Boolean).join('\n'));

    if (!fullName || !message) {
      return res.status(400).json({ success: false, error: 'الاسم والتفاصيل مطلوبة' });
    }

    const result = db.prepare(`
      INSERT INTO contact_messages (full_name, phone, email, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(sanitize(fullName), phone, email, subject, message);

    if (req.files && req.files.length) {
      const insertMedia = db.prepare('INSERT INTO media (filename, original_name, mime_type, size, path) VALUES (?, ?, ?, ?, ?)');
      for (const file of req.files) {
        insertMedia.run(file.filename, file.originalname, file.mimetype, file.size, `/uploads/media/${file.filename}`);
      }
    }

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      type,
      result.lastInsertRowid,
      title,
      `${title}: ${sanitize(fullName)}`
    );

    res.json({ success: true, message: 'تم إرسال الطلب بنجاح' });
  } catch (error) {
    next(error);
  }
}

router.post('/request-installation', upload.any(), (req, res, next) => {
  createContactLikeRequest('installation', 'طلب تركيب جديد', req, res, next);
});

router.post('/request-maintenance', upload.any(), (req, res, next) => {
  createContactLikeRequest('maintenance', 'طلب صيانة جديد', req, res, next);
});

router.post('/submit-form', upload.any(), (req, res, next) => {
  if (req.body.contactName && !req.body.fullName) req.body.fullName = req.body.contactName;
  if (req.body.contactPhone && !req.body.phone) req.body.phone = req.body.contactPhone;
  if (req.body.contactSubject && !req.body.subject) req.body.subject = req.body.contactSubject;
  if ((req.body.firstName || req.body.lastName) && !req.body.fullName) {
    req.body.fullName = `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim();
  }
  createContactLikeRequest('contact', 'رسالة من نموذج الموقع', req, res, next);
});

router.post('/track-order', (req, res) => {
  res.status(308).json({
    success: false,
    error: 'استخدم رقم الهاتف عبر /api/orders/track/:phone لتتبع الطلب',
  });
});

module.exports = router;
