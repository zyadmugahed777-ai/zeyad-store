const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const solarCalcHtml = `
<section class="calculator-section" style="padding: 40px 20px; background: var(--surface); margin: 20px 0; border-radius: 12px; border: 1px solid #eee;">
    <h2 style="margin-bottom: 20px; text-align: center;">احسب نظامك الشمسي</h2>
    <form action="/api/calculate-solar" method="POST" style="max-width: 600px; margin: 0 auto; display: grid; gap: 15px;">
        <label>إجمالي الأجهزة المنزلية (وات)</label>
        <input type="number" name="power" placeholder="مثال: 1500" required style="padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
        
        <label>ساعات التشغيل اليومية التقريبية</label>
        <input type="number" name="hours" placeholder="مثال: 8" required style="padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
        
        <input type="hidden" name="appliances" value="1">
        
        <button type="submit" class="btn-primary" style="padding: 12px; border-radius: 6px; cursor: pointer;">احسب الآن</button>
    </form>
</section>
`;

const majlisCalcHtml = `
<section class="calculator-section" style="padding: 40px 20px; background: var(--surface); margin: 20px 0; border-radius: 12px; border: 1px solid #eee;">
    <h2 style="margin-bottom: 20px; text-align: center;">احسب تكلفة مجلسك</h2>
    <form action="/api/calculate-majlis" method="POST" style="max-width: 600px; margin: 0 auto; display: grid; gap: 15px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <label>نوع القماش</label>
                <select name="type" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
                    <option value="standard">قياسي</option>
                    <option value="luxury">فاخر</option>
                    <option value="royal">ملكي</option>
                </select>
            </div>
            <div>
                <label>نوع الخشب</label>
                <select name="wood" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
                    <option value="standard">خشب عادي</option>
                    <option value="premium">خشب ممتاز</option>
                </select>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div>
                <label>الطول (متر)</label>
                <input type="number" name="length" step="0.1" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
            </div>
            <div>
                <label>العرض (متر)</label>
                <input type="number" name="width" step="0.1" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
            </div>
            <div>
                <label>الارتفاع (متر)</label>
                <input type="number" name="height" step="0.1" value="0.5" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
            </div>
        </div>
        
        <button type="submit" class="btn-primary" style="padding: 12px; border-radius: 6px; cursor: pointer;">احسب التكلفة</button>
    </form>
</section>
`;

const kitchenCalcHtml = `
<section class="calculator-section" style="padding: 40px 20px; background: var(--surface); margin: 20px 0; border-radius: 12px; border: 1px solid #eee;">
    <h2 style="margin-bottom: 20px; text-align: center;">احسب تكلفة مطبخك</h2>
    <form action="/api/calculate-kitchen" method="POST" style="max-width: 600px; margin: 0 auto; display: grid; gap: 15px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div>
                <label>نوع المطبخ</label>
                <select name="type" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
                    <option value="l_shape">حرف L</option>
                    <option value="u_shape">حرف U</option>
                    <option value="straight">مستقيم</option>
                </select>
            </div>
            <div>
                <label>نوع الخامة</label>
                <select name="material" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
                    <option value="aluminumStandard">ألمنيوم عادي</option>
                    <option value="aluminumPremium">ألمنيوم فاخر</option>
                    <option value="woodMDF">خشب MDF</option>
                    <option value="woodOak">خشب بلوط</option>
                </select>
            </div>
            <div>
                <label>اللون</label>
                <input type="text" name="color" placeholder="مثال: بني غامق" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <label>الطول (متر)</label>
                <input type="number" name="length" step="0.1" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
            </div>
            <div>
                <label>العرض (متر)</label>
                <input type="number" name="width" step="0.1" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
            </div>
        </div>
        
        <button type="submit" class="btn-primary" style="padding: 12px; border-radius: 6px; cursor: pointer;">احسب التكلفة</button>
    </form>
</section>
`;

files.forEach(file => {
    const filePath = path.join(dir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    let $ = cheerio.load(html, { decodeEntities: false });
    let modified = false;

    // Solar Calculator
    if (file.includes('solar') || file === 'index.html') {
        const link = $('a[href*="calculate"], a:contains("احسب نظامك")');
        if (link.length > 0 && !$('.calculator-section').length) {
            link.closest('section').after(solarCalcHtml);
            link.attr('href', '#').attr('onclick', "$('html, body').animate({scrollTop: $('.calculator-section').offset().top - 100}, 500); return false;");
            modified = true;
        }
    }

    // Majlis Calculator
    if (file.includes('majalis') || file.includes('furniture')) {
        const link = $('a[href*="calculate"], a:contains("احسب تكلفة مجلسك")');
        if (link.length > 0 && !$('.calculator-section').length) {
            link.closest('section').after(majlisCalcHtml);
            link.attr('href', '#').attr('onclick', "$('html, body').animate({scrollTop: $('.calculator-section').offset().top - 100}, 500); return false;");
            modified = true;
        }
    }

    // Kitchen Calculator
    if (file.includes('kitchen')) {
        const link = $('a[href*="calculate"], a:contains("احسب تكلفة مطبخك")');
        if (link.length > 0 && !$('.calculator-section').length) {
            link.closest('section').after(kitchenCalcHtml);
            link.attr('href', '#').attr('onclick', "$('html, body').animate({scrollTop: $('.calculator-section').offset().top - 100}, 500); return false;");
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, $.html());
        console.log(`Injected calculators in ${file}`);
    }
});
