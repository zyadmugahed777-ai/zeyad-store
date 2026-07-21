/**
 * Zeyad For Business - Frontend Cache Synchronizer
 * Syncs SQLite database tables directly to products_db.json, products_db.js, and zfb-config.js.
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/database');

const PRODUCTS_JSON_PATH = path.join(__dirname, '..', '..', 'products_db.json');
const PRODUCTS_JS_PATH = path.join(__dirname, '..', '..', 'products_db.js');
const CONFIG_JS_PATH = path.join(__dirname, '..', '..', 'zfb-config.js');

function syncFrontend() {
  console.log('Synchronizing database to frontend cache...');
  try {
    const db = getDb();
    
    // 1. QUERY PRODUCTS
    const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, id DESC').all();
    
    const formattedProducts = products.map(p => {
      // Fetch sub-items
      const images = db.prepare('SELECT image_path FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC').all(p.id);
      const specs = db.prepare('SELECT label, value FROM product_specs WHERE product_id = ? ORDER BY sort_order ASC').all(p.id);
      const faq = db.prepare('SELECT question as q, answer as a FROM product_faq WHERE product_id = ? ORDER BY sort_order ASC').all(p.id);
      const colors = db.prepare('SELECT name, hex FROM product_colors WHERE product_id = ?').all(p.id);
      
      return {
        id: p.product_id,
        title: p.title,
        price: p.price,
        oldPrice: p.old_price,
        rating: String(p.rating || '0.0'),
        reviewsCount: p.reviews_count || 0,
        brand: p.brand || '',
        origin: p.origin || '',
        sku: p.sku || '',
        warranty: p.warranty || '',
        shipping: p.shipping || '',
        deliveryTime: p.delivery_time || '',
        installation: p.installation ? (p.installation === 1 || p.installation === '1' ? 'متوفر' : p.installation) : 'غير متوفر',
        weight: p.weight || '',
        gallery: images.map(img => img.image_path),
        video: p.video || '',
        colors: colors.map(c => ({ name: c.name, hex: c.hex })),
        sizes: [],
        isNew: p.is_new === 1,
        isBestSeller: p.is_best_seller === 1,
        description: p.description || '',
        specs: specs.map(s => ({ label: s.label, value: s.value })),
        faq: faq.map(f => ({ q: f.q, a: f.a }))
      };
    });

    // Write products JSON
    fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(formattedProducts, null, 2), 'utf8');
    
    // Write products JS fallback
    fs.writeFileSync(PRODUCTS_JS_PATH, `window.PRODUCTS_DB = ${JSON.stringify(formattedProducts, null, 2)};\n`, 'utf8');
    console.log(`  Synced ${formattedProducts.length} products to static cache.`);

    // 2. QUERY SETTINGS
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value || '';
    });

    // Build central configuration payload
    const storeName = settings.site_name || 'زياد للتجارة';
    const currency = settings.default_currency || 'YER';
    
    const contact = {
      phone: settings.contact_phone || '+967775010726',
      whatsapp: settings.contact_whatsapp || '967775010726',
      email: settings.contact_email || 'zeyad775010@gmail.com',
      address: settings.contact_address || 'صنعاء، اليمن'
    };

    const social = [
      { id: 'facebook', name: 'Facebook', url: settings.social_facebook || 'https://facebook.com/zeyad', icon: 'fab fa-facebook-f', active: !!settings.social_facebook },
      { id: 'instagram', name: 'Instagram', url: settings.social_instagram || 'https://instagram.com/zeyad', icon: 'fab fa-instagram', active: !!settings.social_instagram },
      { id: 'tiktok', name: 'TikTok', url: settings.social_tiktok || 'https://tiktok.com/@zeyad', icon: 'fab fa-tiktok', active: !!settings.social_tiktok },
      { id: 'whatsapp', name: 'WhatsApp', url: `https://wa.me/${contact.whatsapp}`, icon: 'fab fa-whatsapp', active: true },
      { id: 'telegram', name: 'Telegram', url: settings.social_telegram || 'https://t.me/zeyad', icon: 'fab fa-telegram-plane', active: !!settings.social_telegram },
      { id: 'youtube', name: 'YouTube', url: settings.social_youtube || 'https://youtube.com/@zeyad', icon: 'fab fa-youtube', active: !!settings.social_youtube },
      { id: 'x', name: 'X (Twitter)', url: settings.social_x || 'https://x.com/zeyad', icon: 'fab fa-twitter', active: !!settings.social_x },
      { id: 'snapchat', name: 'Snapchat', url: settings.social_snapchat || 'https://snapchat.com/add/zeyad', icon: 'fab fa-snapchat-ghost', active: !!settings.social_snapchat }
    ];

    // Build the dynamic configuration file
    const configContent = `/**
 * Zeyad For Business - Central Configuration (Simulated Database/Backend Payload)
 * Auto-generated from SQLite database settings on ${new Date().toISOString()}
 */

window.ZFB_CONFIG = {
    storeName: ${JSON.stringify(storeName)},
    currency: ${JSON.stringify(currency)},
    exchangeRate: ${Number(settings.exchange_rate) || 140},
    
    contact: ${JSON.stringify(contact, null, 4)},

    social: ${JSON.stringify(social, null, 4)},

    calculators: {
        solar: {
            panel400w: 150,
            battery200a: 250,
            inverterBase: 500,
            conversionRateToLocal: 3.75
        },
        majlis: {
            fabricStandard: 300,
            fabricLuxury: 450,
            fabricRoyal: 600,
            woodStandard: 150,
            woodPremium: 250
        },
        kitchen: {
            aluminumStandard: 800,
            aluminumPremium: 1200,
            woodMDF: 1500,
            woodOak: 2200
        }
    },

    features: {
        enableVoiceSearch: true,
        enableImageSearch: false,
        showCartPopup: true
    }
};
`;

    fs.writeFileSync(CONFIG_JS_PATH, configContent, 'utf8');
    console.log('  Synced settings to zfb-config.js.');
    console.log('Synchronization complete!');
    return true;
  } catch (error) {
    console.error('Error synchronizing database to frontend:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  syncFrontend();
}

module.exports = { syncFrontend };
