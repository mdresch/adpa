const fs = require('fs');
const content = fs.readFileSync('../AI-Foundry-Projects/pmbok/process_registry.py', 'utf8');

const startIdx = content.indexOf('_PROCESS_DATA');
const endIdx = content.indexOf('PMBOK_PROCESSES');
const dataSection = content.substring(startIdx, endIdx);

// Match process tuple: ("code", "name", area, group, [outputs])
const processRegex = /\(\"([\d\.]+)\",\s*\"(.*?)\",\s*KnowledgeArea\.\w+,\s*ProcessGroup\.\w+,\s*\[(.*?)\]\)/g;
let match;
const processOutputs = [];
while ((match = processRegex.exec(dataSection)) !== null) {
    const code = match[1];
    const name = match[2];
    const outputs = match[3].replace(/\"/g, '').split(', ').map(o => o.trim()).filter(Boolean);
    processOutputs.push({ code, name, outputs });
}

console.log('Total Processes Found:', processOutputs.length);
let totalDeliverableSlots = 0;
const uniqueDeliverables = new Set();

processOutputs.forEach(p => {
    totalDeliverableSlots += p.outputs.length;
    p.outputs.forEach(o => uniqueDeliverables.add(o));
});

console.log('Total Deliverable Slots across all processes:', totalDeliverableSlots);
console.log('Total Unique Deliverables:', uniqueDeliverables.size);

// Find duplicates or similar names that might be merged
const sortedUnique = [...uniqueDeliverables].sort();
console.log('Unique Deliverables:');
console.log(JSON.stringify(sortedUnique, null, 2));
