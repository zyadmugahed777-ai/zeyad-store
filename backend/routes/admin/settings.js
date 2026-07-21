const router = require('express').Router();
const { getDb } = require('../../config/database');
const upload = require('../../middleware/upload');
const { setFlash, logAction } = require('../../middleware/auth');
const { syncFrontend } = require('../../utils/sync-frontend');

const fieldGroups = {
  general: ['site_name', 'default_currency', 'enabled_languages'],
  branding: ['site_logo', 'site_favicon'],
  contact: ['contact_phone', 'contact_whatsapp', 'contact_email', 'contact_address', 'google_maps_url'],
  social: ['social_facebook', 'social_instagram', 'social_tiktok'],
  payment: ['payment_methods'],
  shipping: ['shipping_methods'],
  seo: ['seo_title', 'seo_description'],
  analytics: ['analytics_head'],
  ai: ['ai_provider', 'ai_api_key']
};

function groupForKey(key) {
  return Object.entries(fieldGroups).find(([, keys]) => keys.includes(key))?.[0] || 'general';
}

function typeForValue(key, value) {
  if (key.includes('api_key')) return 'password';
  if (key.includes('description') || key.includes('methods') || key.includes('analytics')) return 'text';
  if (!Number.isNaN(Number(value)) && value !== '') return 'number';
  return 'string';
}

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const settingsRows = db.prepare('SELECT * FROM settings ORDER BY group_name, key').all();
    const settings = {};
    settingsRows.forEach((setting) => { settings[setting.key] = setting.value || ''; });

    res.render('admin/settings/index', {
      title: 'إعدادات الموقع',
      active: 'settings',
      settings,
      fieldGroups
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', upload.fields([{ name: 'site_logo', maxCount: 1 }, { name: 'site_favicon', maxCount: 1 }]), (req, res, next) => {
  try {
    const db = getDb();
    const oldSettings = db.prepare('SELECT key, value FROM settings').all();
    const payload = { ...req.body };

    if (req.files?.site_logo?.[0]) payload.site_logo = `/uploads/media/${req.files.site_logo[0].filename}`;
    if (req.files?.site_favicon?.[0]) payload.site_favicon = `/uploads/media/${req.files.site_favicon[0].filename}`;

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, type, group_name, updated_at)
      VALUES (@key, @value, @type, @group_name, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        type = excluded.type,
        group_name = excluded.group_name,
        updated_at = datetime('now')
    `);

    db.transaction(() => {
      Object.entries(payload).forEach(([key, value]) => {
        if (key === '_csrf') return;
        upsert.run({
          key,
          value: Array.isArray(value) ? value.join(',') : String(value || ''),
          type: typeForValue(key, value),
          group_name: groupForKey(key)
        });
      });
    })();

    logAction(req.session.admin.id, 'UPDATE', 'settings', 'site', payload, oldSettings, req.ip);
    syncFrontend();
    setFlash(req, 'success', 'تم حفظ الإعدادات بنجاح');
    res.redirect('/admin/settings');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
