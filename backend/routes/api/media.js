const router = require('express').Router();
const { getDb } = require('../../config/database');
const upload = require('../../middleware/upload');
const { parsePagination, paginationInfo } = require('../../utils/helpers');

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    
    const totalItems = db.prepare('SELECT COUNT(*) as total FROM media').get().total;
    const media = db.prepare('SELECT * FROM media ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);

    res.json({ 
      success: true, 
      data: media,
      pagination: paginationInfo(page, limit, totalItems)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', upload.array('files', 10), (req, res, next) => {
  try {
    const db = getDb();
    const results = [];
    
    if (req.files && req.files.length > 0) {
      const insert = db.prepare('INSERT INTO media (filename, original_name, mime_type, size, path) VALUES (?, ?, ?, ?, ?)');
      for (const f of req.files) {
        const filePath = '/uploads/media/' + f.filename; // Assuming default subfolder
        const info = insert.run(f.filename, f.originalname, f.mimetype, f.size, filePath);
        results.push({
          id: info.lastInsertRowid,
          filename: f.filename,
          original_name: f.originalname,
          url: filePath
        });
      }
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;