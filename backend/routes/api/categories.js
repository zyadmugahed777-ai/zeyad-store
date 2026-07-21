const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM categories c 
      WHERE c.is_active = 1 
      ORDER BY c.sort_order ASC
    `).all();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', (req, res, next) => {
  try {
    const db = getDb();
    const category = db.prepare('SELECT * FROM categories WHERE slug = ? AND is_active = 1').get(req.params.slug);
    if (!category) {
      return res.status(404).json({ success: false, error: 'التصنيف غير موجود' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

module.exports = router;