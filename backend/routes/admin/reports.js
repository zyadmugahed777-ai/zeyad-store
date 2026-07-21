const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    
    // Status breakdown
    const statusCounts = db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all();
    
    // Top products
    const topProducts = db.prepare(`
      SELECT product_title, SUM(quantity) as qty, SUM(total) as revenue 
      FROM order_items 
      GROUP BY product_id 
      ORDER BY qty DESC LIMIT 10
    `).all();

    res.render('admin/reports/index', {
      title: 'التقارير',
      active: 'reports',
      statusCounts,
      topProducts
    });
  } catch (error) {
    next(error);
  }
});
module.exports = router;