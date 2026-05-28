
import "dotenv/config";
import { InlineEntityParserService } from "../src/services/inlineEntityParserService";
import { pool, connectDatabase } from "../src/database/connection";

async function run() {
  await connectDatabase();
  const md = `
Some section content
######## stakeholders: {"name": "AI Vendor (TBD)", "role": "Vendor", "interest_level": "medium", "influence_level": "medium"}
  `;
  try {
    const res = await InlineEntityParserService.parseAndProcess({
      projectId: "3b4f0455-78ba-4b31-836c-5f57ef6cf533",
      userId: "42ca7333-b37e-4e1b-bd50-ac04abd7e682",
      markdown: md
    });
    console.log("Result:", res);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await pool.end();
  }
}
run();

