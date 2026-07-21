const express = require('express');
const router = express.Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res) => {
  const db = getDb();
  
  // 1. Top Stats
  const stats = {
    productsCount: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
    customersCount: db.prepare('SELECT COUNT(*) as count FROM customers').get().count,
    totalSales: db.prepare("SELECT SUM(total) as sum FROM orders WHERE status != 'cancelled'").get().sum || 0,
    ordersCount: db.prepare('SELECT COUNT(*) as count FROM orders').get().count
  };

  // 2. Order Status Distribution (For Doughnut Chart)
  const statusDist = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM orders 
    GROUP BY status
  `).all();
  
  // Format for Chart.js
  const chartStatusData = {
    labels: statusDist.map(s => s.status), // We will translate this in EJS using helpers
    data: statusDist.map(s => s.count),
    colors: statusDist.map(s => {
      switch(s.status) {
        case 'pending': return '#f59e0b';
        case 'processing': return '#3b82f6';
        case 'shipped': return '#8b5cf6';
        case 'delivered': return '#10b981';
        case 'cancelled': return '#ef4444';
        default: return '#9ca3af';
      }
    })
  };

  // 3. Sales last 30 days (For Line Chart)
  // SQLite date logic
  const salesDataRaw = db.prepare(`
    SELECT date(created_at) as sale_date, SUM(total) as daily_total 
    FROM orders 
    WHERE created_at >= date('now', '-30 days') AND status != 'cancelled'
    GROUP BY sale_date
    ORDER BY sale_date ASC
  `).all();
  
  const chartSalesData = {
    labels: salesDataRaw.map(s => s.sale_date),
    data: salesDataRaw.map(s => s.daily_total)
  };

  // 4. Top Selling Products
  const topProducts = db.prepare(`
    SELECT product_title, SUM(quantity) as qty, SUM(order_items.total) as revenue
    FROM order_items
    JOIN orders ON order_items.order_id = orders.id
    WHERE orders.status != 'cancelled'
    GROUP BY product_id
    ORDER BY qty DESC
    LIMIT 5
  `).all();

  // 5. Recent Orders
  const recentOrders = db.prepare(`
    SELECT o.*, c.first_name, c.last_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
    LIMIT 6
  `).all();

  res.render('admin/dashboard', { 
    title: 'لوحة التحكم', 
    active: 'dashboard',
    stats,
    chartStatusData: JSON.stringify(chartStatusData),
    chartSalesData: JSON.stringify(chartSalesData),
    topProducts,
    recentOrders
  });
});

module.exports = router;