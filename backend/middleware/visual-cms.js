const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { getDb } = require('../config/database');

function visualCmsMiddleware(req, res, next) {
  // Skip API, Admin, and non-GET requests
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/admin-assets')) return next();
  
  let reqPath = req.path === '/' ? '/index.html' : req.path;
  
  // Auto-append .html if extension is missing and file exists
  if (!path.extname(reqPath)) {
    const htmlPath = path.join(__dirname, '..', '..', reqPath + '.html');
    if (fs.existsSync(htmlPath)) {
      reqPath += '.html';
    }
  }

  // Only intercept HTML files
  if (reqPath.endsWith('.html')) {
    const fullPath = path.join(__dirname, '..', '..', reqPath);
    if (fs.existsSync(fullPath)) {
      try {
        const html = fs.readFileSync(fullPath, 'utf8');
        const $ = cheerio.load(html, { decodeEntities: false });
        
        try {
          const db = getDb();
          const overrides = db.prepare('SELECT key, value, type FROM theme_content').all();
          // console.log(`Found ${overrides.length} overrides for CMS`);
          overrides.forEach(item => {
             const el = $(`[data-vid="${item.key}"]`);
             // console.log(`Applying ${item.key} to element count: ${el.length}`);
             if (el.length) {
               if (item.type === 'image') el.attr('src', item.value);
               else if (item.type === 'bg-image') {
                 let style = el.attr('style') || '';
                 style = style.replace(/background-image:\s*url\([^)]+\);?/, '');
                 el.attr('style', `background-image: url('${item.value}'); ${style}`.trim());
               }
               else if (item.type === 'link') el.attr('href', item.value);
               else el.html(item.value); // Text or HTML
             }
          });
        } catch (dbErr) {
          console.error('Visual CMS DB Error:', dbErr);
        }

        // Inject Editor Client Script if accessed via Editor
        if (req.query.visual_editor === 'true') { // Admin validation happens in iframe parent
           $('head').append('<script src="/admin-assets/visual-editor-client.js"></script>');
           $('head').append('<link rel="stylesheet" href="/admin-assets/visual-editor-client.css">');
        }

        return res.send($.html());
      } catch (err) {
        return next(err);
      }
    }
  }

  // Proceed to express.static for other files
  next();
}

module.exports = visualCmsMiddleware;
