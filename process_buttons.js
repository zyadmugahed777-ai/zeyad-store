const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    let $ = cheerio.load(html, { decodeEntities: false });

    // 1. "اطلب الآن" links to checkout.html
    $('a').each((i, el) => {
        if ($(el).text().trim() === 'اطلب الآن' || $(el).text().trim() === 'شراء الآن') {
            $(el).attr('href', 'checkout.html');
        }
        if ($(el).text().trim() === 'باقات الأجهزة' || $(el).text().trim() === 'باقات التجهيز') {
            $(el).attr('href', 'appliances-catalog.html');
        }
    });

    $('button').each((i, el) => {
        if ($(el).text().trim() === 'اطلب الآن' || $(el).text().trim() === 'شراء الآن') {
            $(el).attr('onclick', "window.location.href='checkout.html'");
        }
    });

    // 2. Add compare button to product cards if not present
    $('.product-card').each((i, el) => {
        const actionRow = $(el).find('.stock div, .actions, .card-actions');
        if (actionRow.length > 0 && actionRow.find('.btn-compare').length === 0) {
            actionRow.prepend('<button type="button" class="btn-compare" aria-label="المقارنة" style="position:static; margin-left: 8px; background:none; border:none; cursor:pointer;" onclick="window.ZFB && window.ZFB.Compare && window.ZFB.Compare.toggle(window.productFromElement ? window.productFromElement(this) : {id: $(this).closest(\'[data-product-id]\').attr(\'data-product-id\')})"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 21h5v-5M21 3l-7 7M3 21l7-7"/></svg></button>');
        }
    });

    fs.writeFileSync(filePath, $.html());
    console.log(`Processed ${file}`);
});
