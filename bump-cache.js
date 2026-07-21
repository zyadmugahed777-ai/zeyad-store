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
const newVersion = "styles.css?v=" + new Date().toISOString().replace(/\D/g, '').slice(0, 14);

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/styles\.css\?v=[0-9\-a-zA-Z]+/g, newVersion);
    fs.writeFileSync(file, content, 'utf8');
});

console.log("Cache buster bumped to " + newVersion);
