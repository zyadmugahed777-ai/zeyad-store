const fs = require('fs');
const path = require('path');

const dir = 'd:/played/Zeyad For Business';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.agents')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.html')) results.push(file);
        }
    });
    return results;
}

const htmlFiles = walk(dir);

const corruptedBlock = `          <a class="nav-icon-btn" href="compare.html" aria-label="ط§ظ„ظ…ظ‚ط§ط±ظ†ط©" title="ط§ظ„ظ…ظ‚ط§ط±ظ†ط©">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 3h5v5M4 21v-7M20 8l-7 7M4 14l7-7M4 3h5v5M20 21v-7"/></svg>
          </a>
          <div class="dropdown-wrapper">
            <button class="nav-icon-btn more-menu-btn" aria-expanded="false" aria-label="ط§ظ„ظ…ط²ظٹط¯">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
            <div class="more-dropdown">
              <a href="compare.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 3h5v5M4 21v-7M20 8l-7 7M4 14l7-7M4 3h5v5M20 21v-7"/></svg> ط§ظ„ظ…ظ‚ط§ط±ظ†ط©</a>
              <a href="search.html?q=%D8%A7%D9%84%D8%AC%D8%AF%D9%8A%D8%AF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> ط§ظ„ط¬ط¯ظٹط¯</a>
              <a href="track-order.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> طھطھط¨ط¹ ط§ظ„ط·ظ„ط¨</a>
              <a href="contact.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> طھظˆط§طµظ„ ظ…ط¹ظ†ط§</a>
              <a href="privacy.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ط³ظٹط§ط³ط© ط§ظ„ط®طµظˆطµظٹط©</a>
              <a href="terms.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> ط§ظ„ط´ط±ظˆط· ظˆط§ظ„ط£طظƒط§ظ…</a>
              <a href="returns.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> ط³ظٹط§ط³ط© ط§ظ„ط¥ط±ط¬ط§ط¹</a>
              <a href="faq.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ط§ظ„ط£ط³ط¦ظ„ط© ط§ظ„ط´ط§ط¦ط¹ط©</a>
              <a href="about.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> ظ…ظ† ظ†طظ†</a>
            </div>
          </div>`;

const cleanBlock = `          <a class="nav-icon-btn" href="compare.html" aria-label="المقارنة" title="المقارنة">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 3h5v5M4 21v-7M20 8l-7 7M4 14l7-7M4 3h5v5M20 21v-7"/></svg>
          </a>
          <div class="dropdown-wrapper">
            <button class="nav-icon-btn more-menu-btn" aria-expanded="false" aria-label="المزيد">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
            <div class="more-dropdown">
              <a href="compare.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 3h5v5M4 21v-7M20 8l-7 7M4 14l7-7M4 3h5v5M20 21v-7"/></svg> المقارنة</a>
              <a href="search.html?q=%D8%A7%D9%84%D8%AC%D8%AF%D9%8A%D8%AF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> الجديد</a>
              <a href="track-order.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تتبع الطلب</a>
              <a href="contact.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> تواصل معنا</a>
              <a href="privacy.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> سياسة الخصوصية</a>
              <a href="terms.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> الشروط والأحكام</a>
              <a href="returns.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> سياسة الإرجاع</a>
              <a href="faq.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> الأسئلة الشائعة</a>
              <a href="about.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> من نحن</a>
            </div>
          </div>`;

let updatedCount = 0;
htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(corruptedBlock) || content.includes('ط§ظ„ظ…ظ‚ط§ط±ظ†ط©')) {
        // Fallback robust replace for corrupted Arabic string just in case spacing is slightly different
        content = content.replace(/ط§ظ„ظ…ظ‚ط§ط±ظ†ط©/g, 'المقارنة');
        content = content.replace(/ط§ظ„ظ…ط²ظٹط¯/g, 'المزيد');
        content = content.replace(/ط§ظ„ط¬ط¯ظٹط¯/g, 'الجديد');
        content = content.replace(/طھطھط¨ط¹ ط§ظ„ط·ظ„ط¨/g, 'تتبع الطلب');
        content = content.replace(/طھظˆط§طµظ„ ظ…ط¹ظ†ط§/g, 'تواصل معنا');
        content = content.replace(/ط³ظٹط§ط³ط© ط§ظ„ط®طµظˆطµظٹط©/g, 'سياسة الخصوصية');
        content = content.replace(/ط§ظ„ط´ط±ظˆط· ظˆط§ظ„ط£طظƒط§ظ…/g, 'الشروط والأحكام');
        content = content.replace(/ط³ظٹط§ط³ط© ط§ظ„ط¥ط±ط¬ط§ط¹/g, 'سياسة الإرجاع');
        content = content.replace(/ط§ظ„ط£ط³ط¦ظ„ط© ط§ظ„ط´ط§ط¦ط¹ط©/g, 'الأسئلة الشائعة');
        content = content.replace(/ظ…ظ† ظ†طظ†/g, 'من نحن');
        
        fs.writeFileSync(file, content, 'utf8');
        updatedCount++;
    }
});

console.log(`Fixed encoding in ${updatedCount} files.`);

// Now fix CSS for max-width on brand-content
const cssFile = path.join(dir, 'styles.css');
let css = fs.readFileSync(cssFile, 'utf8');
css = css.replace('max-width: 250px;', '/* max-width removed */');
fs.writeFileSync(cssFile, css, 'utf8');
console.log('CSS fixed.');
