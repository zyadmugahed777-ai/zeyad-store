const router = require('express').Router();
const { getDb } = require('../../config/database');
const { setFlash } = require('../../middleware/auth');

router.get('/', (req, res) => {
  const db = getDb();
  let themeConfig = db.prepare('SELECT value FROM settings WHERE key = ?').get('theme_config');
  let themeData = {};
  if (themeConfig && themeConfig.value) {
    try {
      themeData = JSON.parse(themeConfig.value);
    } catch (e) {
      themeData = {};
    }
  }

  res.render('admin/theme-builder', {
    title: 'محرر المظهر المرئي (Theme Builder)',
    active: 'theme', // Highlight theme builder in sidebar
    themeData: JSON.stringify(themeData)
  });
});

router.post('/save', (req, res) => {
  try {
    const db = getDb();
    const { themeData } = req.body;
    
    if (!themeData) {
      return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
    }

    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(JSON.stringify(themeData), 'theme_config');
    
    res.json({ success: true, message: 'تم حفظ المظهر بنجاح' });
  } catch (err) {
    console.error('Theme Save Error:', err);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
