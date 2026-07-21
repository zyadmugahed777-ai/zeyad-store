const crypto = require('crypto');

function csrfProtection(req, res, next) {
  if (!req.session) return next();

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const submittedToken = req.body._csrf || req.get('x-csrf-token');
  if (submittedToken && submittedToken === req.session.csrfToken) {
    return next();
  }

  req.session.flash = { type: 'danger', message: 'انتهت صلاحية النموذج. الرجاء المحاولة مرة أخرى.' };
  return res.redirect(req.get('referer') || '/admin');
}

module.exports = csrfProtection;
