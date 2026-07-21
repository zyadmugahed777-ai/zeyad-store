const fs = require('fs');
const css = fs.readFileSync('d:/played/Zeyad For Business/styles.css', 'utf8');

let braceCount = 0;
let inComment = false;
let inString = false;
let stringChar = '';

for (let i = 0; i < css.length; i++) {
    if (!inComment && !inString) {
        if (css[i] === '/' && css[i+1] === '*') {
            inComment = true;
            i++;
            continue;
        }
        if (css[i] === '"' || css[i] === "'") {
            inString = true;
            stringChar = css[i];
            continue;
        }
        if (css[i] === '{') braceCount++;
        if (css[i] === '}') {
            braceCount--;
            if (braceCount < 0) {
                console.log('Negative brace count at pos', i);
                console.log(css.substring(Math.max(0, i - 100), i + 50));
                braceCount = 0; // reset to keep finding others
            }
        }
    } else if (inComment) {
        if (css[i] === '*' && css[i+1] === '/') {
            inComment = false;
            i++;
        }
    } else if (inString) {
        if (css[i] === '\\') {
            i++;
        } else if (css[i] === stringChar) {
            inString = false;
        }
    }
}
