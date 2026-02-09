
// Script to test ragService import
try {
    const { ragService } = require('../src/services/ragService');
    console.log("RagService imported successfully");
} catch (e) {
    console.error("Error importing RagService:", e);
    process.exit(1);
}
