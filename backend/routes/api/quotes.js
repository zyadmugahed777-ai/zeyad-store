const router = require('express').Router();
const { getDb } = require('../../config/database');
const { sanitize, normalizePhone } = require('../../utils/helpers');
const upload = require('../../middleware/upload');

router.post('/', upload.single('boqFile'), (req, res, next) => {
  try {
    const db = getDb();
    const { fullName, phone, companyName, email, projectType, productsDetails } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    let boqPath = '';
    if (req.file) {
      boqPath = '/uploads/quotes/' + req.file.filename;
      db.prepare('INSERT INTO media (filename, original_name, mime_type, size, path) VALUES (?, ?, ?, ?, ?)').run(
        req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, boqPath
      );
    }

    const result = db.prepare(`
      INSERT INTO quote_requests (full_name, phone, company_name, email, project_type, products_details, boq_file)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sanitize(fullName), normalizePhone(phone), sanitize(companyName), sanitize(email), sanitize(projectType), sanitize(productsDetails), boqPath);

    db.prepare('INSERT INTO notifications (type, reference_id, title, message) VALUES (?, ?, ?, ?)').run(
      'quote', result.lastInsertRowid, 'طلب تسعير جديد', `طلب تسعير ${companyName ? 'من شركة ' + sanitize(companyName) : 'من ' + sanitize(fullName)}`
    );

    res.json({ success: true, message: 'تم إرسال طلب عرض السعر بنجاح' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;