const fs = require('fs');
const path = require('path');

const files = [
    'lib/morphic/config/models/default.json',
    'lib/morphic/config/models/cloud.json'
];

function check(o, filePath, path = '') {
    for (const k in o) {
        const v = o[k];
        const newPath = path ? path + '.' + k : k;
        if (typeof v === 'string') {
            if (v.trim() !== v) {
                console.log(`[${filePath}] Found dirty string at ${newPath}: "${v}"`);
                console.log(`[${filePath}] Char codes: ${v.split('').map(c => c.charCodeAt(0)).join(', ')}`);
            }
        }
        if (typeof v === 'object' && v !== null) {
            check(v, filePath, newPath);
        }
    }
}

files.forEach(f => {
    try {
        const content = fs.readFileSync(f, 'utf8');
        const obj = JSON.parse(content);
        check(obj, f);
        console.log(`Checked ${f}`);
    } catch (e) {
        console.error(`Error checking ${f}:`, e.message);
    }
});
