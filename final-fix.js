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

    if (content.includes('var(--card-bg, #fff)')) {
        content = content.replace(/var\(--card-bg,\s*#fff\)/gi, 'var(--surface)');
        changed = true;
    }
    if (content.includes('background-color: #fff;')) {
        content = content.replace(/background-color:\s*#fff;/gi, 'background-color: var(--surface);');
        changed = true;
    }
    if (content.includes('background-color: white;')) {
        content = content.replace(/background-color:\s*white;/gi, 'background-color: var(--surface);');
        changed = true;
    }
    // Check for hardcoded color in track-order and contact
    if (content.includes('background: #fff;')) {
        content = content.replace(/background:\s*#fff;/gi, 'background: var(--surface);');
        changed = true;
    }
    if (content.includes('background: white;')) {
        content = content.replace(/background:\s*white;/gi, 'background: var(--surface);');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        updatedHtmlCount++;
    }
});
console.log('Fixed more hardcoded backgrounds in HTML files:', updatedHtmlCount);
