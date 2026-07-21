const router = require('express').Router();
const { requireAuth, loginAdmin, ensureDefaultAdmin, setFlash } = require('../../middleware/auth');
const csrfProtection = require('../../middleware/csrf');
const { formatPrice, formatDate, formatDateTime, parsePagination, paginationInfo, statusLabel, statusColor, paymentLabel } = require('../../utils/helpers');

// Ensure default admin exists
ensureDefaultAdmin();

// Make helpers available to all admin views
router.use((req, res, next) => {
  res.locals.helpers = { formatPrice, formatDate, formatDateTime, parsePagination, paginationInfo, statusLabel, statusColor, paymentLabel };
  res.locals.admin = req.session ? req.session.admin : null;
  res.locals.flash = req.session ? req.session.flash : null;
  if (req.session) delete req.session.flash;
  next();
});

// Auth routes
router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { title: 'تسجيل الدخول', layout: false });
});

// POST /admin/login - Authenticate
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = loginAdmin(username, password, req);
  
  if (admin) {
    req.session.admin = admin;
    const returnTo = req.session.returnTo || '/admin/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } else {
    res.render('admin/login', { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Protect all following routes
router.use(requireAuth);
router.use(csrfProtection);

const { checkPermission } = require('../../middleware/rbac');

// Mount sub-routers with RBAC protection
router.use('/', require('./dashboard'));
router.use('/dashboard', require('./dashboard'));
router.use('/products', checkPermission('products:view'), require('./products'));
router.use('/departments', checkPermission('departments:view'), require('./departments'));
router.use('/categories', checkPermission('categories:view'), require('./categories'));
router.use('/orders', checkPermission('orders:view'), require('./orders'));
router.use('/customers', checkPermission('customers:view'), require('./customers'));
router.use('/branches', checkPermission('branches:view'), require('./branches'));
router.use('/offers', checkPermission('offers:view'), require('./offers'));
router.use('/banners', checkPermission('banners:view'), require('./banners'));
router.use('/editor', checkPermission('pages:view'), require('./editor'));
router.use('/media', checkPermission('media:view'), require('./media'));
router.use('/pages', checkPermission('pages:view'), require('./pages')); 
router.use('/notifications', checkPermission('notifications:view'), require('./notifications'));
router.use('/settings', checkPermission('settings:view'), require('./settings'));
router.use('/theme', checkPermission('settings:view'), require('./theme'));
router.use('/users', checkPermission('users:view'), require('./users'));
router.use('/reports', checkPermission('reports:view'), require('./reports'));

module.exports = router;
