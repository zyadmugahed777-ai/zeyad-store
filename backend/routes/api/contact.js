const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, email, subject, message } = req.body;

    if (!fullName || !message) {
      return res.status(400).json({ success: false, error: 'الاسم والرسالة مطلوبان' });
    }

    const result = db.prepare(`
      INSERT INTO contact_messages (full_name, phone, email, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(sanitize(fullName), normalizePhone(phone), sanitize(email), sanitize(subject), sanitize(message));

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'contact', result.lastInsertRowid, 'رسالة تواصل جديدة', `رسالة جديدة من: ${sanitize(fullName)}`
    );

    res.json({ success: true, message: 'تم إرسال الرسالة بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;