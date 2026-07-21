const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination, paginationInfo } = require('../../utils/helpers');

// Note: In a real app this might be protected, but keeping open for simplicity as per requirements
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    
    const totalItems = db.prepare('SELECT COUNT(*) as total FROM notifications').get().total;
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get().count;

    res.json({ 
      success: true, 
      data: notifications,
      unreadCount,
      pagination: paginationInfo(page, limit, totalItems)
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/read', (req, res, next) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;