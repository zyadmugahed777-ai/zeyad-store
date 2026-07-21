/**
 * Order number generator for Zeyad For Business
 * Format: ZFB-YYYY-XXXXXX
 */

const { getDb } = require('../config/database');

/**
 * Generate a unique order ID
 * @returns {string} Order ID like "ZFB-2026-000001"
 */
function generateOrderId() {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = `ZFB-${year}-`;

  // Get the last order number for this year
  const lastOrder = db.prepare(
    "SELECT order_id FROM orders WHERE order_id LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`${prefix}%`);

  let nextNum = 1;
  if (lastOrder) {
    const lastNum = parseInt(lastOrder.order_id.split('-')[2]);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

module.exports = { generateOrderId };
