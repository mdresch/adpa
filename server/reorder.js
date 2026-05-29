const fs = require('fs');
const file = 'F:/Source/Repos/adpa/server/src/routes/jobs.ts';
let content = fs.readFileSync(file, 'utf8');

// Find the start of router.get("/:id"
const idRouteIndex = content.indexOf('// Get job by ID\r\nrouter.get("/:id"');
if (idRouteIndex === -1) {
    console.error("Could not find Get job by ID");
    process.exit(1);
}

// Find the start of router.post("/cleanup"
const cleanupRouteIndex = content.indexOf('// Clean up stuck cancelled jobs from queues (admin only)\r\nrouter.post("/cleanup"');
if (cleanupRouteIndex === -1) {
    console.error("Could not find cleanup route");
    process.exit(1);
}

// We need to move everything from cleanupRouteIndex to the end of router.get("/admin/all"
// Find the end of router.get("/admin/all"
// The route ends with:
//       res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
//     }
//   }
// )

const adminRouteIndex = content.indexOf('// Get all jobs (admin only)\r\nrouter.get("/admin/all"');
if (adminRouteIndex === -1) {
    console.error("Could not find admin/all route");
    process.exit(1);
}

// Search for the closing parenthesis of router.get("/admin/all"
// The next text is usually "// Retry failed job" or EOF or another route.
const retryRouteIndex = content.indexOf('/**\r\n * POST /api/jobs/:id/retry');
if (retryRouteIndex === -1) {
    console.error("Could not find retry route");
    process.exit(1);
}

// Extract the chunk from cleanup to right before retry
const chunkToMove = content.substring(cleanupRouteIndex, retryRouteIndex);

// Remove the chunk from its original position
content = content.substring(0, cleanupRouteIndex) + content.substring(retryRouteIndex);

// Insert the chunk right before router.get("/:id"
content = content.substring(0, idRouteIndex) + chunkToMove + '\r\n' + content.substring(idRouteIndex);

fs.writeFileSync(file, content);
console.log("Successfully reordered routes!");
