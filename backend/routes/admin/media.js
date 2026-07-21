const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getDb } = require('../../config/database');
const upload = require('../../middleware/upload');
const { requireAuth, setFlash, logAction } = require('../../middleware/auth');
const { parsePagination } = require('../../utils/helpers');

router.use(requireAuth);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

function safeUnlink(mediaPath) {
  if (!mediaPath) return;
  const filePath = path.join(__dirname, '..', '..', mediaPath.replace(/^\//, ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query, 24);
    const folder = req.query.folder || 'all';
    const search = req.query.q || '';
    const type = req.query.type || '';
    const params = [];
    const where = [];

    if (folder !== 'all') {
      where.push('folder = ?');
      params.push(folder);
    }
    if (search) {
      where.push('(original_name LIKE ? OR filename LIKE ? OR title LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (type) {
      where.push('mime_type LIKE ?');
      params.push(`${type}/%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const totalItems = db.prepare(`SELECT COUNT(*) as count FROM media ${whereSql}`).get(...params).count;
    const media = db.prepare(`
      SELECT * FROM media
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    const folders = db.prepare("SELECT folder, COUNT(*) as count FROM media GROUP BY folder ORDER BY folder").all();

    res.render('admin/media/list', {
      title: 'إدارة الوسائط',
      active: 'media',
      media,
      folders,
      currentFolder: folder,
      search,
      type,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upload-ajax', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'لم يتم رفع ملفات' });
    }

    const db = getDb();
    const folder = (req.body.folder || 'general').trim();
    const destFolder = path.join(UPLOAD_DIR, folder);
    if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });

    const uploadedMedia = [];
    for (const file of req.files) {
      let finalPath = file.path;
      let finalFilename = file.filename;
      let finalMime = file.mimetype;
      let finalSize = file.size;

      if (file.mimetype.startsWith('image/') && !file.mimetype.includes('svg')) {
        const webpFilename = file.filename.replace(path.extname(file.filename), '.webp');
        const webpPath = path.join(destFolder, webpFilename);
        await sharp(file.path).webp({ quality: 82 }).toFile(webpPath);
        fs.unlinkSync(file.path);
        finalPath = webpPath;
        finalFilename = webpFilename;
        finalMime = 'image/webp';
        finalSize = fs.statSync(webpPath).size;
      } else {
        const newPath = path.join(destFolder, file.filename);
        if (file.path !== newPath) {
          fs.renameSync(file.path, newPath);
          finalPath = newPath;
        }
      }

      const relativePath = `/uploads/${folder}/${finalFilename}`;
      const result = db.prepare(`
        INSERT INTO media (filename, original_name, mime_type, size, path, folder, title)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(finalFilename, file.originalname, finalMime, finalSize, relativePath, folder, file.originalname);

      const item = {
        id: result.lastInsertRowid,
        filename: finalFilename,
        original_name: file.originalname,
        path: relativePath,
        size: finalSize,
        mime_type: finalMime,
        folder
      };
      uploadedMedia.push(item);
      logAction(req.session.admin.id, 'UPLOAD', 'media', result.lastInsertRowid, item, null, req.ip);
    }

    res.json({ success: true, files: uploadedMedia });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/upload', upload.array('files', 20), async (req, res) => {
  req.url = '/upload-ajax';
  res.redirect('/admin/media');
});

router.post('/:id/edit', (req, res) => {
  try {
    const db = getDb();
    const oldMedia = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    if (!oldMedia) throw new Error('الملف غير موجود');

    const payload = {
      title: (req.body.title || '').trim(),
      alt_text: (req.body.alt_text || '').trim(),
      description: (req.body.description || '').trim(),
      folder: (req.body.folder || 'general').trim()
    };

    db.prepare(`
      UPDATE media SET title = @title, alt_text = @alt_text, description = @description,
      folder = @folder, updated_at = datetime('now') WHERE id = @id
    `).run({ ...payload, id: req.params.id });

    logAction(req.session.admin.id, 'UPDATE', 'media', req.params.id, payload, oldMedia, req.ip);
    setFlash(req, 'success', 'تم تحديث بيانات الملف');
    res.redirect('/admin/media');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('/admin/media');
  }
});

router.post('/:id/replace', upload.single('file'), (req, res) => {
  try {
    if (!req.file) throw new Error('اختر ملفاً للاستبدال');
    const db = getDb();
    const oldMedia = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    if (!oldMedia) throw new Error('الملف غير موجود');

    safeUnlink(oldMedia.path);
    const relativePath = `/uploads/media/${req.file.filename}`;
    db.prepare(`
      UPDATE media SET filename = ?, original_name = ?, mime_type = ?, size = ?, path = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, relativePath, req.params.id);

    logAction(req.session.admin.id, 'REPLACE', 'media', req.params.id, { path: relativePath }, oldMedia, req.ip);
    setFlash(req, 'success', 'تم استبدال الملف');
    res.redirect('/admin/media');
  } catch (error) {
    setFlash(req, 'danger', error.message);
    res.redirect('/admin/media');
  }
});

router.post('/bulk', (req, res) => {
  const db = getDb();
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [req.body.ids].filter(Boolean);
  if (!ids.length || req.body.action !== 'delete') {
    setFlash(req, 'danger', 'حدد ملفات واختر عملية صحيحة');
    return res.redirect('/admin/media');
  }

  const select = db.prepare('SELECT * FROM media WHERE id = ?');
  const del = db.prepare('DELETE FROM media WHERE id = ?');
  ids.forEach((id) => {
    const media = select.get(id);
    if (media) {
      safeUnlink(media.path);
      del.run(id);
    }
  });

  logAction(req.session.admin.id, 'BULK_DELETE', 'media', ids.join(','), { ids }, null, req.ip);
  setFlash(req, 'success', 'تم حذف الملفات المحددة');
  res.redirect('/admin/media');
});

router.post('/:id/delete', (req, res) => {
  const db = getDb();
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (media) {
    safeUnlink(media.path);
    db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
    logAction(req.session.admin.id, 'DELETE', 'media', req.params.id, null, media, req.ip);
  }

  if (req.xhr || (req.headers.accept || '').includes('json')) {
    return res.json({ success: true });
  }

  setFlash(req, 'success', 'تم حذف الملف بنجاح');
  res.redirect('/admin/media');
});

module.exports = router;
