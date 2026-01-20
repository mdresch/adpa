
import { pool } from '../server/src/database/connection';
import { logger } from '../server/src/utils/logger';

async function checkTemplates() {
    try {
        const result = await pool.query("SELECT id, name, description FROM templates");
        console.log("Templates found in database:");
        result.rows.forEach(row => {
            if (row.name.includes("milesotnes") || row.name.includes("Peresona") || row.name.includes("Activiteis") ||
                row.description.includes("milesotnes") || row.description.includes("Peresona") || row.description.includes("Activiteis")) {
                console.log(`MATCH: ID: ${row.id}, Name: ${row.name}, Description: ${row.description}`);
            } else {
                console.log(`ID: ${row.id}, Name: ${row.name}`);
            }
        });
    } catch (error) {
        console.error("Error checking templates:", error);
    } finally {
        await pool.end();
    }
}

checkTemplates();
