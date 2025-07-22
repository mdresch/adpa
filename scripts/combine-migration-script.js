const fs = require('fs');
const path = require('path');

// Read all parts
const part1 = fs.readFileSync(path.join(__dirname, 'migrate-to-vercel.ts'), 'utf-8');
const part2 = fs.readFileSync(path.join(__dirname, 'migrate-to-vercel-append1.ts'), 'utf-8');
const part3 = fs.readFileSync(path.join(__dirname, 'migrate-to-vercel-append2.ts'), 'utf-8');
const part4 = fs.readFileSync(path.join(__dirname, 'migrate-to-vercel-append3.ts'), 'utf-8');

// Combine all parts
const combined = part1 + '\n' + part2 + '\n' + part3 + '\n' + part4;

// Write the combined file
fs.writeFileSync(path.join(__dirname, 'migrate-to-vercel-final.ts'), combined, 'utf-8');

console.log('Migration script combined successfully!');