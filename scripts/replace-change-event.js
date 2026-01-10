const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git') continue;
      walk(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts') || full.endsWith('.jsx') || full.endsWith('.js')) {
      let content = fs.readFileSync(full, 'utf8');
      const newContent = content.split("(e) =>").join('(e) =>');
      if (newContent !== content) {
        fs.writeFileSync(full, newContent, 'utf8');
        console.log('Updated', full);
      }
    }
  }
}

walk(process.cwd());
console.log('Done');
