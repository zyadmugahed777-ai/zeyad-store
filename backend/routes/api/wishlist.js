const router = require('express').Router();
const { getDb } = require('../../config/database');

/**
 * Helper to get the wishlist ID based on user_id or guest_id
 */
function getActiveWishlist(db, userId, guestId) {
  if (userId) {
    let wl = db.prepare('SELECT id FROM wishlists WHERE user_id = ?').get(userId);
    if (!wl) {
      const res = db.prepare('INSERT INTO wishlists (user_id) VALUES (?)').run(userId);
      return res.lastInsertRowid;
    }
    return wl.id;
  } else if (guestId) {
    db.prepare('INSERT OR IGNORE INTO guest_sessions (guest_id) VALUES (?)').run(guestId);
    db.prepare("UPDATE guest_sessions SET last_active_at = datetime('now') WHERE guest_id = ?").run(guestId);

    let wl = db.prepare('SELECT id FROM wishlists WHERE guest_id = ?').get(guestId);
    if (!wl) {
      const res = db.prepare('INSERT INTO wishlists (guest_id) VALUES (?)').run(guestId);
      return res.lastInsertRowid;
    }
    return wl.id;
  }
  return null;
}

/**
 * Get current wishlist
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session?.customer?.id;
    const guestId = req.headers['x-guest-id'];

    if (!userId && !guestId) {
      return res.json({ success: true, items: [], count: 0 });
    }

    const wlId = getActiveWishlist(db, userId, guestId);
    if (!wlId) {
      return res.json({ success: true, items: [], count: 0 });
    }

    const items = db.prepare(`
      SELECT 
        product_id as id
      FROM wishlist_items
      WHERE wishlist_id = ?
    `).all(wlId);

    res.json({ success: true, items });
  } catch (error) {
    console.error('Get Wishlist Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Toggle product in wishlist
 */
router.post('/toggle', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session?.customer?.id;
    const guestId = req.headers['x-guest-id'];
    const { productId } = req.body;

    if (!userId && !guestId) {
      return res.status(400).json({ success: false, error: 'Session required' });
    }
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID required' });
    }

    const wlId = getActiveWishlist(db, userId, guestId);

    const existing = db.prepare('SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?').get(wlId, String(productId));

    let isAdded = false;
    if (existing) {
      db.prepare('DELETE FROM wishlist_items WHERE id = ?').run(existing.id);
      isAdded = false;
    } else {
      db.prepare('INSERT INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)').run(wlId, String(productId));
      isAdded = true;
    }

    res.json({ success: true, isAdded });
  } catch (error) {
    console.error('Toggle Wishlist Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Merge guest wishlist into user wishlist
 */
router.post('/merge', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session?.customer?.id;
    const { guestId } = req.body;

    if (!userId || !guestId) {
      return res.json({ success: true, ignored: true });
    }

    const guestWl = db.prepare('SELECT id FROM wishlists WHERE guest_id = ?').get(guestId);
    if (!guestWl) {
      return res.json({ success: true, empty: true });
    }

    const userWlId = getActiveWishlist(db, userId, null);
    const guestItems = db.prepare('SELECT product_id FROM wishlist_items WHERE wishlist_id = ?').all(guestWl.id);

    const insertStmt = db.prepare('INSERT OR IGNORE INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)');

    db.transaction(() => {
      for (const item of guestItems) {
        insertStmt.run(userWlId, item.product_id);
      }
      db.prepare('DELETE FROM wishlists WHERE id = ?').run(guestWl.id);
    })();

    res.json({ success: true, merged: guestItems.length });
  } catch (error) {
    console.error('Merge Wishlist Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
