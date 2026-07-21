/**
 * Import products from products_db.json into SQLite database
 * Run: node utils/import-products.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { getDb, initDatabase } = require('../config/database');

const PRODUCTS_JSON_PATH = path.join(__dirname, '..', '..', 'products_db.json');

// Category code → category table id mapping
const CATEGORY_MAP = {
  'appl': 'appl',
  'fur': 'fur',
  'bed': 'bed',
  'maj': 'maj',
  'kit': 'kit',
  'sol': 'sol',
  'kid': 'kid',
  'gen': 'gen'
};

function importProducts() {
  console.log('Starting product import...');

  // Initialize database first
  initDatabase();
  const db = getDb();

  // Check if products already exist
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (existingCount.count > 0) {
    console.log(`Database already has ${existingCount.count} products. Skipping import.`);
    console.log('To re-import, delete existing products first.');
    return;
  }

  // Read products JSON
  if (!fs.existsSync(PRODUCTS_JSON_PATH)) {
    console.error(`Products file not found: ${PRODUCTS_JSON_PATH}`);
    process.exit(1);
  }

  let products;
  try {
    const raw = fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8');
    products = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse products_db.json:', e.message);
    process.exit(1);
  }

  console.log(`Found ${products.length} products to import.`);

  // Load category IDs
  const categories = {};
  db.prepare('SELECT id, code FROM categories').all().forEach(cat => {
    categories[cat.code] = cat.id;
  });

  // Prepare statements
  const insertProduct = db.prepare(`
    INSERT INTO products (
      product_id, category_id, title, description, price, old_price,
      sku, brand, origin, warranty, shipping, delivery_time,
      installation, weight, video, rating, reviews_count,
      is_new, is_best_seller, stock_status
    ) VALUES (
      @product_id, @category_id, @title, @description, @price, @old_price,
      @sku, @brand, @origin, @warranty, @shipping, @delivery_time,
      @installation, @weight, @video, @rating, @reviews_count,
      @is_new, @is_best_seller, @stock_status
    )
  `);

  const insertImage = db.prepare(`
    INSERT INTO product_images (product_id, image_path, sort_order, is_primary)
    VALUES (?, ?, ?, ?)
  `);

  const insertSpec = db.prepare(`
    INSERT INTO product_specs (product_id, label, value, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertFaq = db.prepare(`
    INSERT INTO product_faq (product_id, question, answer, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertColor = db.prepare(`
    INSERT INTO product_colors (product_id, name, hex)
    VALUES (?, ?, ?)
  `);

  // Import in a transaction for speed
  let imported = 0;
  let skipped = 0;

  const importAll = db.transaction(() => {
    for (const p of products) {
      try {
        // Determine category from product ID prefix
        const prefix = (p.id || '').split('-')[0];
        const categoryId = categories[prefix] || categories['gen'] || null;

        // Insert product
        const result = insertProduct.run({
          product_id: p.id || `gen-${imported + 1}`,
          category_id: categoryId,
          title: p.title || 'منتج بدون عنوان',
          description: p.description || '',
          price: parseFloat(p.price) || 0,
          old_price: p.oldPrice ? parseFloat(p.oldPrice) : null,
          sku: p.sku || '',
          brand: p.brand || '',
          origin: p.origin || '',
          warranty: p.warranty || '',
          shipping: p.shipping || '',
          delivery_time: p.deliveryTime || '',
          installation: p.installation || '',
          weight: p.weight || '',
          video: p.video || '',
          rating: parseFloat(p.rating) || 0,
          reviews_count: parseInt(p.reviewsCount) || 0,
          is_new: p.isNew ? 1 : 0,
          is_best_seller: p.isBestSeller ? 1 : 0,
          stock_status: 'in-stock'
        });

        const dbProductId = result.lastInsertRowid;

        // Insert images
        if (Array.isArray(p.gallery)) {
          p.gallery.forEach((img, idx) => {
            insertImage.run(dbProductId, img, idx, idx === 0 ? 1 : 0);
          });
        }

        // Insert specs
        if (Array.isArray(p.specs)) {
          p.specs.forEach((spec, idx) => {
            if (spec.label && spec.value) {
              insertSpec.run(dbProductId, spec.label, spec.value, idx);
            }
          });
        }

        // Insert FAQ
        if (Array.isArray(p.faq)) {
          p.faq.forEach((faq, idx) => {
            if (faq.q && faq.a) {
              insertFaq.run(dbProductId, faq.q, faq.a, idx);
            }
          });
        }

        // Insert colors
        if (Array.isArray(p.colors)) {
          p.colors.forEach(color => {
            if (color.name && color.hex) {
              insertColor.run(dbProductId, color.name, color.hex);
            }
          });
        }

        imported++;
      } catch (err) {
        console.warn(`  Skipped product ${p.id}: ${err.message}`);
        skipped++;
      }
    }
  });

  importAll();

  console.log(`\nImport complete:`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total in DB: ${db.prepare('SELECT COUNT(*) as c FROM products').get().c}`);
}

// Run if called directly
if (require.main === module) {
  importProducts();
}

module.exports = { importProducts };
