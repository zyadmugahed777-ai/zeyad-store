const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');

// Ensure upload directories exist
const dirs = ['', 'products', 'banners', 'offers', 'media', 'consultations', 'quotes'];
dirs.forEach(dir => {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine subfolder based on route
    let subfolder = 'media';
    if (req.baseUrl.includes('products') || req.path.includes('product')) subfolder = 'products';
    else if (req.baseUrl.includes('banners') || req.path.includes('banner')) subfolder = 'banners';
    else if (req.baseUrl.includes('offers') || req.path.includes('offer')) subfolder = 'offers';
    else if (req.baseUrl.includes('consultation')) subfolder = 'consultations';
    else if (req.baseUrl.includes('quote')) subfolder = 'quotes';

    const dest = path.join(UPLOAD_DIR, subfolder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح'), false);
  }
};

const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

// Export configured multer instances
const upload = multer({ storage, fileFilter, limits: { fileSize: maxSize } });

module.exports = upload;
