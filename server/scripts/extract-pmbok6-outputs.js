const fs = require('fs');
const content = fs.readFileSync('../AI-Foundry-Projects/pmbok/process_registry.py', 'utf8');
// Extract the _PROCESS_DATA list content
const startIdx = content.indexOf('_PROCESS_DATA');
const endIdx = content.indexOf('PMBOK_PROCESSES');
const dataSection = content.substring(startIdx, endIdx);

// Regex to find outputs within the tuple
const outputRegex = /\[(.*?)\]/g;
let match;
const allOutputs = [];
while ((match = outputRegex.exec(dataSection)) !== null) {
    const outputsStr = match[1].replace(/\"/g, '').split(', ');
    outputsStr.forEach(o => {
        if (o.trim()) allOutputs.push(o.trim());
    });
}

console.log('Total Outputs Count:', allOutputs.length);
console.log('Unique Outputs Count:', [...new Set(allOutputs)].length);
console.log('Unique Deliverables:');
console.log(JSON.stringify([...new Set(allOutputs)].sort(), null, 2));
