const router = require('express').Router();
const { getDb } = require('../../config/database');

/**
 * Helper to get the cart ID based on user_id or guest_id
 */
function getActiveCart(db, userId, guestId) {
  if (userId) {
    let cart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId);
    if (!cart) {
      const res = db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
      return res.lastInsertRowid;
    }
    return cart.id;
  } else if (guestId) {
    // Upsert guest session
    db.prepare('INSERT OR IGNORE INTO guest_sessions (guest_id) VALUES (?)').run(guestId);
    db.prepare("UPDATE guest_sessions SET last_active_at = datetime('now') WHERE guest_id = ?").run(guestId);

    let cart = db.prepare('SELECT id FROM carts WHERE guest_id = ?').get(guestId);
    if (!cart) {
      const res = db.prepare('INSERT INTO carts (guest_id) VALUES (?)').run(guestId);
      return res.lastInsertRowid;
    }
    return cart.id;
  }
  return null;
}

/**
 * Get current cart
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session?.customer?.id;
    const guestId = req.headers['x-guest-id'];

    if (!userId && !guestId) {
      return res.json({ success: true, items: [], total: 0, count: 0 });
    }

    const cartId = getActiveCart(db, userId, guestId);
    if (!cartId) {
      return res.json({ success: true, items: [], total: 0, count: 0 });
    }

    const items = db.prepare(`
      SELECT 
        product_id as id,
        quantity
      FROM cart_items
      WHERE cart_id = ?
    `).all(cartId);

    // Totals will be computed on the frontend using PRODUCTS_DB
    res.json({ success: true, items });
  } catch (error) {
    console.error('Get Cart Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Add or Update product in cart
 */
router.post('/add', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session?.customer?.id;
    const guestId = req.headers['x-guest-id'];
    const { productId, quantity = 1 } = req.body;

    if (!userId && !guestId) {
      return res.status(400).json({ success: false, error: 'Session required' });
    }
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID required' });
    }

    const cartId = getActiveCart(db, userId, guestId);

    const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?').get(cartId, String(productId));

    if (existing) {
      db.prepare("UPDATE cart_items SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?").run(quantity, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)').run(cartId, String(productId), quantity);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Add to Cart Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Update quantity exactly
 */
router.put('/update', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session?.customer?.id;
    const guestId = req.headers['x-guest-id'];
    const { productId, quantity } = req.body;

    const cartId = getActiveCart(db, userId, guestId);
    if (!cartId) return res.status(400).json({ success: false });

    if (quantity <= 0) {
      db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cartId, String(productId));
    } else {
      db.prepare("UPDATE cart_items SET quantity = ?, updated_at = datetime('now') WHERE cart_id = ? AND product_id = ?").run(quantity, cartId, String(productId));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update Cart Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Remove product from cart
 */
router.delete('/remove', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session?.customer?.id;
    const guestId = req.headers['x-guest-id'];
    const { productId } = req.body;

    const cartId = getActiveCart(db, userId, guestId);
    if (!cartId) return res.status(400).json({ success: false });

    db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cartId, String(productId));

    res.json({ success: true });
  } catch (error) {
    console.error('Remove Cart Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Merge guest cart into user cart
 */
router.post('/merge', (req, res) => {
  try {
    const db = getDb();
    const userId = req.session?.customer?.id;
    const { guestId } = req.body;

    if (!userId || !guestId) {
      return res.json({ success: true, ignored: true });
    }

    const guestCart = db.prepare('SELECT id FROM carts WHERE guest_id = ?').get(guestId);
    if (!guestCart) {
      return res.json({ success: true, empty: true });
    }

    const userCartId = getActiveCart(db, userId, null);
    const guestItems = db.prepare('SELECT product_id, quantity FROM cart_items WHERE cart_id = ?').all(guestCart.id);

    const updateStmt = db.prepare("UPDATE cart_items SET quantity = quantity + ?, updated_at = datetime('now') WHERE cart_id = ? AND product_id = ?");
    const insertStmt = db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)');

    db.transaction(() => {
      for (const item of guestItems) {
        const existing = db.prepare('SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?').get(userCartId, item.product_id);
        if (existing) {
          updateStmt.run(item.quantity, userCartId, item.product_id);
        } else {
          insertStmt.run(userCartId, item.product_id, item.quantity);
        }
      }
      db.prepare('DELETE FROM carts WHERE id = ?').run(guestCart.id);
    })();

    res.json({ success: true, merged: guestItems.length });
  } catch (error) {
    console.error('Merge Cart Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
