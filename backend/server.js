require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { initDatabase } = require('./config/database');
const errorHandler = require('./middleware/error');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// MIDDLEWARE
// =============================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
const visualCmsMiddleware = require('./middleware/visual-cms');
app.use(visualCmsMiddleware);
app.use(express.static(path.join(__dirname, '..'), { extensions: ['html'] }));

app.use('/admin-assets', express.static(path.join(__dirname, 'public', 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'zfb-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Make session data available in EJS views
app.use((req, res, next) => {
  res.locals.admin = req.session.admin || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

// =============================================
// INITIALIZE DATABASE
// =============================================
initDatabase();

// =============================================
// API ROUTES (Public - No auth required)
// =============================================
app.use('/api/products', require('./routes/api/products'));
app.use('/api/categories', require('./routes/api/categories'));
app.use('/api/orders', require('./routes/api/orders'));
app.use('/api/appointments', require('./routes/api/appointments'));
app.use('/api/consultations', require('./routes/api/consultations'));
app.use('/api/designs', require('./routes/api/designs'));
app.use('/api/quotes', require('./routes/api/quotes'));
app.use('/api/contact', require('./routes/api/contact'));
app.use('/api/newsletter', require('./routes/api/newsletter'));
app.use('/api/branches', require('./routes/api/branches'));
app.use('/api/offers', require('./routes/api/offers'));
app.use('/api/banners', require('./routes/api/banners'));
app.use('/api/media', require('./routes/api/media'));
app.use('/api/cart', require('./routes/api/cart'));
app.use('/api/wishlist', require('./routes/api/wishlist'));
app.use('/api/settings', require('./routes/api/settings'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/notifications', require('./routes/api/notifications'));
app.use('/api', require('./routes/api/legacy'));

// =============================================
// ADMIN ROUTES (Auth required)
// =============================================
app.use('/admin', require('./routes/admin/index'));

// =============================================
// HEALTH CHECK
// =============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// =============================================
// ERROR HANDLER
// =============================================
app.use(errorHandler);

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Zeyad For Business Backend`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Admin: http://localhost:${PORT}/admin`);
  console.log(`  API:   http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});

module.exports = app;
