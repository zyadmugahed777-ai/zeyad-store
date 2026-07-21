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
let updatedHtmlCount = 0;
htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Check for hardcoded #f6f2ec or #fdfbf7 in <style>
    if (content.includes('background: #f6f2ec;') || content.includes('background-color: #f6f2ec;')) {
        content = content.replace(/background:\s*#f6f2ec;/gi, 'background: var(--paper);');
        content = content.replace(/background-color:\s*#f6f2ec;/gi, 'background-color: var(--paper);');
        changed = true;
    }
    if (content.includes('background: #fdfbf7;') || content.includes('background-color: #fdfbf7;')) {
        content = content.replace(/background:\s*#fdfbf7;/gi, 'background: var(--paper);');
        content = content.replace(/background-color:\s*#fdfbf7;/gi, 'background-color: var(--paper);');
        changed = true;
    }

    // Fix the btn-submit in track-order.html and contact.html
    // It has `color: #fff;` but we need `color: var(--surface);` or something that contrasts with `var(--ink)`
    // Wait, let's just make btn-submit background var(--olive-deep) and color #fff
    if (content.includes('.btn-submit { background: var(--ink); color: #fff;')) {
        content = content.replace(/\.btn-submit\s*\{\s*background:\s*var\(--ink\);\s*color:\s*#fff;/g, '.btn-submit { background: var(--olive-deep); color: #fff;');
        changed = true;
    }
    // contact.html might have similar button
    if (content.includes('.contact-submit {') && content.includes('background: var(--ink);')) {
        content = content.replace(/background:\s*var\(--ink\);/g, 'background: var(--olive-deep);');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        updatedHtmlCount++;
    }
});
console.log('Fixed more hardcoded backgrounds in HTML files:', updatedHtmlCount);
