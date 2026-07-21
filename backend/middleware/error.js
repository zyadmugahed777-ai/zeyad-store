/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const status = err.status || 500;

  // API error response
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({
      success: false,
      error: err.message || 'حدث خطأ في الخادم',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    if (req.path.startsWith('/api/')) {
      return res.status(413).json({ success: false, error: 'حجم الملف كبير جداً' });
    }
    req.session.flash = { type: 'error', message: 'حجم الملف كبير جداً (الحد الأقصى 10MB)' };
    return res.redirect('back');
  }

  // Admin panel error
  if (req.path.startsWith('/admin')) {
    return res.status(status).render('admin/error', {
      title: 'خطأ',
      error: err.message,
      status
    });
  }

  // Default
  res.status(status).json({ success: false, error: 'حدث خطأ غير متوقع' });
}

module.exports = errorHandler;
