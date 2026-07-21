const express = require('express');
const router = express.Router();
const { getDb } = require('../../config/database');
const { requireAuth, logAction } = require('../../middleware/auth');

router.use(requireAuth);

// GET /admin/editor - Serve the Visual Editor UI
router.get('/', (req, res) => {
  const db = getDb();
  const pageId = req.query.page_id;
  
  if (!pageId) {
    req.session.flash = { type: 'danger', message: 'يجب اختيار صفحة للتحرير' };
    return res.redirect('/admin/pages');
  }

  const cmsPage = db.prepare('SELECT * FROM cms_pages WHERE id = ?').get(pageId);
  if (!cmsPage) {
    req.session.flash = { type: 'danger', message: 'الصفحة غير موجودة' };
    return res.redirect('/admin/pages');
  }

  // We load the actual site route with a visual_editor query flag
  // E.g. if slug is "index" it goes to /, if "about" goes to /about
  let previewUrl = cmsPage.slug === 'index' ? '/' : `/${cmsPage.slug}`;
  previewUrl += `?visual_editor=true`;

  const allPages = db.prepare('SELECT id, title_ar, slug FROM cms_pages ORDER BY page_type ASC, sort_order ASC, id ASC').all();

  res.render('admin/editor', {
    title: 'المحرر المرئي: ' + cmsPage.title_ar,
    layout: false,
    previewUrl,
    cmsPage,
    allPages
  });
});

// POST /admin/editor/save - Save content block with revision
router.post('/save', express.json(), (req, res) => {
  try {
    const { page_id, element_key, content, element_type } = req.body;
    
    if (!page_id || !element_key) {
      return res.status(400).json({ success: false, message: 'بيانات غير مكتملة' });
    }

    const db = getDb();
    const type = element_type || 'text';
    
    const existing = db.prepare('SELECT * FROM cms_elements WHERE page_id = ? AND element_key = ?').get(page_id, element_key);
    
    db.transaction(() => {
      // 1. Save revision
      const snapshot = existing ? existing.content : null;
      db.prepare('INSERT INTO cms_revisions (page_id, user_id, snapshot, description) VALUES (?, ?, ?, ?)').run(
        page_id, req.session.admin.id, JSON.stringify({ element_key, content: snapshot, type: existing ? existing.element_type : null }), `تعديل العنصر: ${element_key}`
      );

      // 2. Save element
      if (existing) {
        db.prepare(`
          UPDATE cms_elements 
          SET content = ?, element_type = ?, updated_at = datetime('now') 
          WHERE id = ?
        `).run(content, type, existing.id);
      } else {
        db.prepare(`
          INSERT INTO cms_elements (page_id, element_key, element_type, content) 
          VALUES (?, ?, ?, ?)
        `).run(page_id, element_key, type, content);
      }
    })();

    res.json({ success: true });
  } catch (err) {
    console.error('Editor save error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /admin/editor/undo
router.post('/undo', express.json(), (req, res) => {
  try {
    const { page_id, element_key } = req.body;
    if (!page_id || !element_key) return res.status(400).json({ success: false, message: 'بيانات غير مكتملة' });
    
    const db = getDb();
    
    // Find the latest revision for this element
    // Since snapshot is JSON containing element_key, we search for it.
    // In a real robust system, cms_revisions should have element_key column, but we'll use LIKE here or exact logic if needed.
    // Let's modify our logic to just query by parsing or we can search snapshot text for the key.
    const searchString = `%"element_key":"${element_key}"%`;
    const lastRev = db.prepare('SELECT * FROM cms_revisions WHERE page_id = ? AND snapshot LIKE ? ORDER BY id DESC LIMIT 1').get(page_id, searchString);
    
    if (!lastRev) {
      return res.status(400).json({ success: false, message: 'لا توجد نسخة سابقة لاستعادتها لهذا العنصر.' });
    }
    
    const snapshotData = JSON.parse(lastRev.snapshot);
    const existing = db.prepare('SELECT * FROM cms_elements WHERE page_id = ? AND element_key = ?').get(page_id, element_key);

    if (snapshotData.content === null) {
      // It was an insert, so delete it
      if (existing) {
        db.prepare('DELETE FROM cms_elements WHERE id = ?').run(existing.id);
      }
    } else {
      // Restore old value
      if (existing) {
        db.prepare("UPDATE cms_elements SET content = ?, element_type = ?, updated_at = datetime('now') WHERE id = ?").run(
          snapshotData.content, snapshotData.type || existing.element_type, existing.id
        );
      } else {
        db.prepare("INSERT INTO cms_elements (page_id, element_key, element_type, content) VALUES (?, ?, ?, ?)").run(
          page_id, element_key, snapshotData.type || 'text', snapshotData.content
        );
      }
    }
    
    // Remove the revision so we can undo multiple times
    db.prepare('DELETE FROM cms_revisions WHERE id = ?').run(lastRev.id);
    
    res.json({ success: true, restoredValue: snapshotData.content });
  } catch (err) {
    console.error('Undo error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
