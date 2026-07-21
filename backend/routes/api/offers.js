const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const offers = db.prepare(`
      SELECT * FROM offers 
      WHERE is_active = 1 
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
    `).all(now, now);
    res.json({ success: true, data: offers });
  } catch (error) {
    next(error);
  }
});

module.exports = router;