const router = require('express').Router();
const { getDb } = require('../../config/database');

router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'بريد إلكتروني غير صالح' });
    }

    try {
      db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(email);
    } catch (e) {
      // Ignore unique constraint error
      if (!e.message.includes('UNIQUE constraint failed')) throw e;
    }

    res.json({ success: true, message: 'تم الاشتراك في النشرة البريدية بنجاح' });
  } catch (error) {
    next(error);
  }
});

router.delete('/', (req, res, next) => {
  try {
    const db = getDb();
    const { email } = req.body;
    if (email) {
      db.prepare('DELETE FROM newsletter WHERE email = ?').run(email);
    }
    res.json({ success: true, message: 'تم إلغاء الاشتراك' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;