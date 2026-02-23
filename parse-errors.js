const fs = require('fs');
const lines = fs.readFileSync('server/logs/combined.log', 'utf8').split('\n').filter(Boolean);
const errors = lines.filter(l => l.includes('"error":"{\\"error\\"')).slice(-3);
errors.forEach(e => {
    try {
        const logEntry = JSON.parse(e);
        console.log("Document ID:", logEntry.documentId);
        console.log("Error JSON:", JSON.parse(logEntry.error));
    } catch (err) {
        console.log("Could not parse:", e);
    }
});
