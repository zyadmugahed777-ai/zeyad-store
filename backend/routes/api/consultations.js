const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');
const upload = require('../../middleware/upload');

router.post('/', upload.array('attachments', 5), (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, consultationType, details, city, contactMethod } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    let attachmentsStr = '';
    if (req.files && req.files.length > 0) {
      const paths = req.files.map(f => '/uploads/consultations/' + f.filename);
      attachmentsStr = JSON.stringify(paths);
      
      const insertMedia = db.prepare('INSERT INTO media (filename, original_name, mime_type, size, path) VALUES (?, ?, ?, ?, ?)');
      for (const f of req.files) {
        insertMedia.run(f.filename, f.originalname, f.mimetype, f.size, '/uploads/consultations/' + f.filename);
      }
    }

    const result = db.prepare(`
      INSERT INTO consultations (full_name, phone, consultation_type, details, city, contact_method, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sanitize(fullName), normalizePhone(phone), sanitize(consultationType), sanitize(details), sanitize(city), sanitize(contactMethod), attachmentsStr);

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'consultation', result.lastInsertRowid, 'طلب استشارة جديد', `طلب استشارة من: ${sanitize(fullName)}`
    );

    res.json({ success: true, message: 'تم إرسال طلب الاستشارة بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;