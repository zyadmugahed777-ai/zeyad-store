const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    let $ = cheerio.load(html, { decodeEntities: false });

    // 1. Inject zfb-config.js before zfb-core.js or at the end of body
    if (!html.includes('zfb-config.js')) {
        const coreScript = $('script[src*="zfb-core.js"]');
        if (coreScript.length > 0) {
            $('<script src="zfb-config.js"></script>\n').insertBefore(coreScript);
        } else {
            $('body').append('<script src="zfb-config.js"></script>\n');
        }
    }

    // 2. Remove Saudi Options from checkout and consultation
    if (file === 'checkout.html' || file === 'book-appointment.html' || file === 'consultation.html') {
        $('option[value="riyadh"], option[value="jeddah"], option[value="dammam"]').remove();
        $('option[value="saudi"]').remove();
        
        // Ensure Yemeni cities are present
        const select = $('select[name="city"], select#city');
        if (select.length > 0 && !select.html().includes('صنعاء')) {
            select.append(`
                <option value="sanaa">صنعاء</option>
                <option value="aden">عدن</option>
                <option value="taiz">تعز</option>
                <option value="ibb">إب</option>
                <option value="hodeidah">الحديدة</option>
            `);
        }
    }

    // 3. Clear hardcoded social links in the footer so JS can inject them
    // Let's find the footer nav that contains about.html, terms.html etc.
    // Wait, the user specifically mentioned "حتى الآن لا توجد روابط التواصل الاجتماعي في الفوتر"
    // So there are NO social links in the footer currently. I will just add an empty div in the footer for social links.
    const footerDiv = $('footer.footer > div').first();
    if (footerDiv.length > 0 && !$('#zfb-social-links').length) {
        footerDiv.append('<div id="zfb-social-links" style="margin-top: 15px; display: flex; gap: 15px;"></div>');
    }

    // 4. Update 'العروض' buttons to point to offers.html
    $('a').each((i, el) => {
        if ($(el).text().trim() === 'العروض' && $(el).attr('href') !== 'offers.html') {
            $(el).attr('href', 'offers.html');
        }
        
        // 5. Update email links and tel links? It's better to let zfb-core.js do this dynamically 
        // to avoid ANY hardcoded data in HTML.
    });

    fs.writeFileSync(filePath, $.html());
    console.log(`Processed ${file}`);
});
