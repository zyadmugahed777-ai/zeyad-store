const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const branches = db.prepare('SELECT * FROM branches WHERE is_active = 1 ORDER BY sort_order ASC').all();
    res.json({ success: true, data: branches });
  } catch (error) {
    next(error);
  }
});

module.exports = router;