const router = require('express').Router();
const { getDb } = require('../../config/database');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    // Return only safe public settings
    const settings = db.prepare(`
      SELECT key, value, type FROM settings 
      WHERE group_name IN ('general', 'delivery', 'payment', 'contact', 'social', 'branding', 'commerce', 'theme')
    `).all();
    
    const formatted = {};
    settings.forEach(s => {
      let val = s.value;
      if (s.type === 'json' && val) {
        try { val = JSON.parse(val); } catch (e) {}
      } else if (s.type === 'number' && val) {
        val = parseFloat(val);
      }
      formatted[s.key] = val;
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/:key', (req, res, next) => {
  try {
    const db = getDb();
    const setting = db.prepare('SELECT value, type FROM settings WHERE key = ?').get(req.params.key);
    if (!setting) {
      return res.status(404).json({ success: false, error: 'غير موجود' });
    }
    
    let val = setting.value;
    if (setting.type === 'json' && val) {
      try { val = JSON.parse(val); } catch (e) {}
    } else if (setting.type === 'number' && val) {
      val = parseFloat(val);
    }
    
    res.json({ success: true, data: { key: req.params.key, value: val } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;