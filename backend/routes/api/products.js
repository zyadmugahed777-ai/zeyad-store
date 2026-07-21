const router = require('express').Router();
const { getDb } = require('../../config/database');
const { parsePagination, paginationInfo } = require('../../utils/helpers');
const Fuse = require('fuse.js');

let fuseInstance = null;
let cachedProducts = [];
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

function normalizeArabic(text) {
  if (!text) return '';
  // Normalize visually similar Arabic characters to improve search matching
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '') // Remove diacritics
    .toLowerCase()
    .trim();
}

function getSearchableProducts(db) {
  const now = Date.now();
  if (fuseInstance && (now - lastCacheTime < CACHE_TTL)) {
    return { fuse: fuseInstance, products: cachedProducts };
  }
  
  const query = `
    SELECT 
      p.id, p.product_id, p.title, p.price, p.category_id, p.is_best_seller, p.reviews_count, p.description,
      c.name_ar as category_name,
      (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as main_image 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  cachedProducts = db.prepare(query).all();
  
  // Create search-optimized fields
  cachedProducts.forEach(p => {
    p.search_title = normalizeArabic(p.title);
    p.search_desc = normalizeArabic(p.description);
    p.search_category = normalizeArabic(p.category_name);
  });
  
  const options = {
    includeScore: true,
    shouldSort: true,
    threshold: 0.6, 
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'search_title', weight: 0.6 },
      { name: 'search_category', weight: 0.25 },
      { name: 'search_desc', weight: 0.15 }
    ]
  };
  
  fuseInstance = new Fuse(cachedProducts, options);
  lastCacheTime = now;
  return { fuse: fuseInstance, products: cachedProducts };
}

router.get('/search/suggestions', (req, res, next) => {
  try {
    const db = getDb();
    const search = req.query.q || '';
    if (!search || search.trim().length < 2) {
      return res.json({ success: true, data: [], suggestions: [] });
    }

    const { fuse } = getSearchableProducts(db);
    const normalizedQuery = normalizeArabic(search);
    const results = fuse.search(normalizedQuery);
    
    // Exact/Very good matches (score <= 0.3)
    let exactMatches = results.filter(r => r.score <= 0.3).map(r => r.item);
    
    // Loose/Fuzzy matches ("Did you mean?" suggestions) (score > 0.3 && score <= 0.55)
    let suggestions = results.filter(r => r.score > 0.3 && r.score <= 0.55).map(r => r.item);

    // If we have some matches but they are all fuzzy, just put the best ones in exact if exact is empty
    if (exactMatches.length === 0 && suggestions.length > 0) {
      exactMatches = suggestions.slice(0, 3);
      suggestions = suggestions.slice(3, 8);
    } else {
      exactMatches = exactMatches.slice(0, 6);
      suggestions = suggestions.slice(0, 4);
    }

    // Boost exact matches if they are best sellers
    exactMatches.sort((a, b) => {
       if (a.is_best_seller && !b.is_best_seller) return -1;
       if (!a.is_best_seller && b.is_best_seller) return 1;
       return 0;
    });

    res.json({ success: true, data: exactMatches, suggestions: suggestions });
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { page, limit, offset } = parsePagination(req.query);
    const { category, search, min_price, max_price, sort } = req.query;

    if (search) {
       const { fuse } = getSearchableProducts(db);
       const normalizedQuery = normalizeArabic(search);
       const results = fuse.search(normalizedQuery);
       
       // For the main search page, we can be a bit more lenient, returning anything under 0.5 threshold
       let sorted = results.filter(r => r.score <= 0.5).map(r => r.item);
       
       if (category) {
          const cat = db.prepare('SELECT id FROM categories WHERE code = ? OR slug = ?').get(category, category);
          if (cat) {
             sorted = sorted.filter(p => p.category_id === cat.id);
          }
       }
       if (min_price) sorted = sorted.filter(p => p.price >= parseFloat(min_price));
       if (max_price) sorted = sorted.filter(p => p.price <= parseFloat(max_price));
       
       if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price);
       if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price);
       if (sort === 'popular') sorted.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0));
       
       const totalItems = sorted.length;
       const paginated = sorted.slice(offset, offset + limit);
       
       return res.json({ success: true, data: paginated, pagination: paginationInfo(page, limit, totalItems) });
    }

    let query = 'SELECT p.*, (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as main_image FROM products p WHERE p.is_active = 1';
    const params = [];
    if (category) {
      const cat = db.prepare('SELECT id FROM categories WHERE code = ? OR slug = ?').get(category, category);
      if (cat) { query += ' AND p.category_id = ?'; params.push(cat.id); }
    }
    if (min_price) { query += ' AND p.price >= ?'; params.push(parseFloat(min_price)); }
    if (max_price) { query += ' AND p.price <= ?'; params.push(parseFloat(max_price)); }

    let sortQuery = ' ORDER BY p.sort_order ASC, p.id DESC';
    if (sort === 'price_asc') sortQuery = ' ORDER BY p.price ASC';
    if (sort === 'price_desc') sortQuery = ' ORDER BY p.price DESC';
    if (sort === 'newest') sortQuery = ' ORDER BY p.id DESC';
    if (sort === 'popular') sortQuery = ' ORDER BY p.is_best_seller DESC, p.reviews_count DESC';
    
    query += sortQuery;
    const countQuery = 'SELECT COUNT(*) as total FROM (' + query + ')';
    const totalItems = db.prepare(countQuery).get(...params).total;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const products = db.prepare(query).all(...params);

    res.json({ success: true, data: products, pagination: paginationInfo(page, limit, totalItems) });
  } catch (error) { next(error); }
});

router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const product = db.prepare('SELECT p.*, c.name_ar as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.product_id = ? AND p.is_active = 1').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'المنتج غير موجود' });

    product.images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC').all(product.id);
    product.specs = db.prepare('SELECT * FROM product_specs WHERE product_id = ? ORDER BY sort_order ASC').all(product.id);
    product.faq = db.prepare('SELECT * FROM product_faq WHERE product_id = ? ORDER BY sort_order ASC').all(product.id);
    product.colors = db.prepare('SELECT * FROM product_colors WHERE product_id = ?').all(product.id);

    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

// Admin endpoint to force refresh the search cache
router.post('/search/refresh', (req, res) => {
  lastCacheTime = 0;
  getSearchableProducts(getDb());
  res.json({ success: true, message: 'Search cache refreshed' });
});

module.exports = router;
