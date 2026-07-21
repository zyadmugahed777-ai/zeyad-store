const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const position = req.query.position || 'home';
    const now = new Date().toISOString();
    const banners = db.prepare(`
      SELECT * FROM banners 
      WHERE is_active = 1 
      AND position = ?
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
      ORDER BY sort_order ASC
    `).all(position, now, now);
    res.json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
});

module.exports = router;