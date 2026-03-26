import bcrypt from "bcryptjs"
import { connectDatabase, getDatabasePool } from "./connection"
import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

async function seedDatabase() {
  try {
    logger.info("Starting database seeding...")

    // connection.ts initializes pool lazily; seed must connect explicitly
    await connectDatabase()
    const db = getDatabasePool()

    // Create admin user with fixed UUID
    const adminId = "3a82e0e8-c54d-4f99-b1d7-e651ce101341"
    const adminPassword = await bcrypt.hash("admin123", 12)

    await db.query(`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `, [
      adminId,
      "admin@adpa.com",
      adminPassword,
      "System Administrator",
      "admin",
      JSON.stringify({
        "users.create": true,
        "users.update": true,
        "users.delete": true,
        "projects.create": true,
        "projects.update": true,
        "projects.delete": true,
        "documents.create": true,
        "documents.update": true,
        "documents.delete": true,
        "templates.create": true,
        "templates.update": true,
        "templates.delete": true,
        "ai.generate": true,
        "ai.configure": true,
        "analytics.system": true,
        "security.view": true,
        "security.manage": true,
        "security.audit": true,
        "integrations.create": true,
        "integrations.update": true,
        "integrations.delete": true,
        "integrations.view": true,
        "integrations.manage": true,
        "integrations.test": true,
        "integrations.sync": true,
        "jobs.stats": true,
        "jobs.admin": true,
      })
    ])

    // Create demo user with fixed UUID
    const userId = "b1f3d2c4-e5a6-4b7c-8d9e-f0a1b2c3d4e5"
    const userPassword = await bcrypt.hash("demo123", 12)

    await db.query(`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `, [
      userId,
      "demo@adpa.com",
      userPassword,
      "Demo User",
      "user",
      JSON.stringify({
        "projects.create": true,
        "projects.update": true,
        "documents.create": true,
        "documents.update": true,
        "templates.create": true,
        "templates.update": true,
        "ai.generate": true,
      })
    ])

    // Create test user with fixed UUID (for testing integrations)
    const testUserId = "672e6d7b-0655-48eb-b33c-9eb8bcc6f9b8"
    const testPassword = await bcrypt.hash("password123", 12)

    await db.query(`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `, [
      testUserId,
      "test@example.com",
      testPassword,
      "Test User",
      "admin",
      JSON.stringify({
        "jobs.admin": true,
        "jobs.stats": true,
        "ai.generate": true,
        "ai.configure": true,
        "users.create": true,
        "users.delete": true,
        "users.update": true,
        "security.view": true,
        "security.audit": true,
        "projects.create": true,
        "projects.delete": true,
        "projects.update": true,
        "security.manage": true,
        "analytics.system": true,
        "documents.create": true,
        "documents.delete": true,
        "documents.update": true,
        "templates.create": true,
        "templates.delete": true,
        "templates.update": true,
        "integrations.read": true,
        "integrations.sync": true,
        "integrations.test": true,
        "integrations.create": true,
        "integrations.delete": true,
        "integrations.manage": true,
        "integrations.update": true
      })
    ])

    // Create sample AI providers
    const openaiId = "f1e2d3c4-b5a6-4978-8c9d-e0f1a2b3c4d5"

    // Check if OpenAI provider exists
    const openaiExists = await db.query("SELECT id FROM ai_providers WHERE name = $1", ["OpenAI GPT"])
    if (openaiExists.rows.length === 0) {
      await db.query(`
        INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        openaiId,
        "OpenAI GPT",
        "openai",
        Buffer.from("your-openai-api-key").toString("base64"),
        JSON.stringify({
          organization: "",
          baseURL: "https://api.openai.com/v1",
        }),
        false // Disabled by default until real API key is provided
      ])
    }

    const googleId = "a2b3c4d5-e6f7-4890-9abc-def123456789"

    // Check if Google provider exists
    const googleExists = await db.query("SELECT id FROM ai_providers WHERE name = $1", ["Google Gemini"])
    if (googleExists.rows.length === 0) {
      await db.query(`
        INSERT INTO ai_providers (id, name, provider_type, api_key_encrypted, configuration, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        googleId,
        "Google Gemini",
        "google",
        Buffer.from("your-google-api-key").toString("base64"),
        JSON.stringify({}),
        false // Disabled by default until real API key is provided
      ])
    }

    // Create sample templates
    const togafTemplateId = "c1d2e3f4-a5b6-4789-8cde-f012345678ab"

    // Check if TOGAF template exists
    const togafExists = await db.query("SELECT id FROM templates WHERE name = $1", ["TOGAF Business Architecture Document"])
    if (togafExists.rows.length === 0) {
      await db.query(`
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        togafTemplateId,
      "TOGAF Business Architecture Document",
      "Standard template for TOGAF business architecture documentation",
      "TOGAF",
      "Business Architecture",
      JSON.stringify({
        sections: [
          {
            title: "Executive Summary",
            content: "{{executive_summary}}",
            required: true
          },
          {
            title: "Business Goals and Objectives",
            content: "{{business_goals}}",
            required: true
          },
          {
            title: "Current State Architecture",
            content: "{{current_state}}",
            required: false
          },
          {
            title: "Future State Architecture",
            content: "{{future_state}}",
            required: true
          },
          {
            title: "Gap Analysis",
            content: "{{gap_analysis}}",
            required: true
          },
          {
            title: "Implementation Roadmap",
            content: "{{roadmap}}",
            required: true
          }
        ]
      }),
      JSON.stringify([
        {
          name: "executive_summary",
          type: "text",
          required: true,
          description: "High-level summary of the business architecture"
        },
        {
          name: "business_goals",
          type: "text",
          required: true,
          description: "Key business goals and objectives"
        },
        {
          name: "current_state",
          type: "text",
          required: false,
          description: "Description of current business architecture"
        },
        {
          name: "future_state",
          type: "text",
          required: true,
          description: "Description of target business architecture"
        },
        {
          name: "gap_analysis",
          type: "text",
          required: true,
          description: "Analysis of gaps between current and future state"
        },
        {
          name: "roadmap",
          type: "text",
          required: true,
          description: "Implementation roadmap and timeline"
        }
      ]),
      true,
      adminId
    ])
    }

    const sabsaTemplateId = "d2e3f4a5-b6c7-4890-9def-012345678abc"

    // Check if SABSA template exists
    const sabsaExists = await db.query("SELECT id FROM templates WHERE name = $1", ["SABSA Security Architecture Framework"])
    if (sabsaExists.rows.length === 0) {
      await db.query(`
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        sabsaTemplateId,
      "SABSA Security Architecture Framework",
      "Template for SABSA security architecture documentation",
      "SABSA",
      "Security Architecture",
      JSON.stringify({
        sections: [
          {
            title: "Business Requirements",
            content: "{{business_requirements}}",
            required: true
          },
          {
            title: "Risk Assessment",
            content: "{{risk_assessment}}",
            required: true
          },
          {
            title: "Security Architecture",
            content: "{{security_architecture}}",
            required: true
          },
          {
            title: "Implementation Plan",
            content: "{{implementation_plan}}",
            required: true
          }
        ]
      }),
      JSON.stringify([
        {
          name: "business_requirements",
          type: "text",
          required: true,
          description: "Business security requirements"
        },
        {
          name: "risk_assessment",
          type: "text",
          required: true,
          description: "Security risk assessment and analysis"
        },
        {
          name: "security_architecture",
          type: "text",
          required: true,
          description: "Detailed security architecture design"
        },
        {
          name: "implementation_plan",
          type: "text",
          required: true,
          description: "Security implementation plan and timeline"
        }
      ]),
      true,
      adminId
    ])
    }

    // ---------------------------------------------------------------------
    // Construction / Digital Twin "Level" templates (for DT asset extraction)
    // ---------------------------------------------------------------------
    const dtLevel0TemplateId = "4b1f8a4c-2c70-4c7b-a9d0-2e6e2f5a1a01"
    const dtLevel1TemplateId = "4b1f8a4c-2c70-4c7b-a9d0-2e6e2f5a1a02"
    const dtLevel2TemplateId = "4b1f8a4c-2c70-4c7b-a9d0-2e6e2f5a1a03"

    const dtLevel0Exists = await db.query(
      "SELECT id FROM templates WHERE name = $1",
      ["Construction Digital Twin L0 — Layout & Asset Register"]
    )
    if (dtLevel0Exists.rows.length === 0) {
      await db.query(
        `
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, template_scope, is_read_only, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          dtLevel0TemplateId,
          "Construction Digital Twin L0 — Layout & Asset Register",
          "Level 0: Define zones/stations/sensors with a strict DT Assets block (YAML) suitable for deterministic extraction into the Digital Twin registry.",
          "Construction",
          "Digital Twin",
          JSON.stringify({
            sections: [
              {
                title: "Title",
                content:
                  "# Digital Twin Level 0: Layout & Asset Register\n\n**Project:** {{project_name}}\n\n**Purpose:** Define the canonical Digital Twin asset inventory (what exists) in an extractable format.\n",
                required: true
              },
              {
                title: "Instructions",
                content:
                  "## Instructions (read before filling)\n\n- All assets MUST be listed in the `dt_assets` YAML block below.\n- Every asset MUST include `asset_type`, `external_id`, `name`, and `platform_type`.\n- Use stable `external_id` values. Use the `{{external_id_prefix}}` variable (default `mec-amsterdam::`). The prefix MUST use a **double colon** (e.g. `mec-amsterdam::`). Do NOT use a single hyphen (e.g. `mec-amsterdam-`).\n- L1 and L2 documents will reference these exact `external_id` strings; keep them consistent.\n- Keep the YAML strictly valid.\n",
                required: true
              },
              {
                title: "Digital Twin Assets",
                content:
                  "## Digital Twin Assets (extractable)\n\n```yaml\ndt_assets:\n  # Zones\n  - asset_type: zone\n    external_id: \"{{external_id_prefix}}zone-entrance\"\n    name: \"Entrance\"\n    description: \"Customer entry; footfall/door sensing\"\n    platform_type: \"Generic\"\n    location:\n      zone: \"entrance\"\n    metadata:\n      source: \"layout\"\n      layout_document_title: \"{{document_title}}\"\n\n  # Product stations\n  - asset_type: product_station\n    external_id: \"{{external_id_prefix}}station-PS-01\"\n    name: \"Surface Line\"\n    description: \"Surface Pro/Laptop/Studio/Go\"\n    platform_type: \"Generic\"\n    location:\n      zone: \"retail\"\n    metadata:\n      source: \"layout\"\n      station_id: \"PS-01\"\n\n  # Sensors\n  - asset_type: sensor\n    external_id: \"{{external_id_prefix}}sensor-ENV-01\"\n    name: \"ENV-01 (Temperature)\"\n    description: \"Comfort monitoring\"\n    platform_type: \"Generic\"\n    location:\n      zone: \"workshop\"\n    metadata:\n      source: \"telemetry\"\n      sensor_type: \"temperature\"\n      unit: \"°C\"\n```\n",
                required: true
              },
              {
                title: "Notes",
                content:
                  "## Notes\n\n- This document is the *source of truth* for asset creation. Downstream documents (L1/L2/L3) must reference assets by these exact `external_id` values only—no new IDs, and the same prefix format (e.g. `mec-amsterdam::`).\n",
                required: false
              }
            ]
          }),
          JSON.stringify([
            { name: "project_name", type: "text", required: false, description: "Project name (auto-injected where available)" },
            { name: "document_title", type: "text", required: false, description: "Document title (optional)" },
            { name: "external_id_prefix", type: "text", required: false, default: "mec-amsterdam::", description: "Prefix for external_ids; MUST use double colon (e.g. mec-amsterdam::), not hyphen" }
          ]),
          true,
          "standard",
          true,
          adminId
        ]
      )
    }

    const dtLevel1Exists = await db.query(
      "SELECT id FROM templates WHERE name = $1",
      ["Construction Digital Twin L1 — Topology & Relationships"]
    )
    if (dtLevel1Exists.rows.length === 0) {
      await db.query(
        `
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, template_scope, is_read_only, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          dtLevel1TemplateId,
          "Construction Digital Twin L1 — Topology & Relationships",
          "Level 1: Define relationships between existing assets (contains/adjacent_to/served_by) using stable external_id references.",
          "Construction",
          "Digital Twin",
          JSON.stringify({
            sections: [
              {
                title: "Title",
                content:
                  "# Digital Twin Level 1: Topology & Relationships\n\n**Project:** {{project_name}}\n\n**Purpose:** Describe how assets relate (zone contains station, sensor belongs_to zone, etc.) using stable external IDs.\n",
                required: true
              },
              {
                title: "Instructions",
                content:
                  "## Instructions\n\n- Do NOT invent new assets. Use ONLY `external_id` values from the project's **Level 0 Asset Register** document.\n- Use the EXACT same `external_id` strings as L0 (same prefix and format). The prefix MUST use **double colon** (e.g. `mec-amsterdam::`), never a hyphen (e.g. `mec-amsterdam-` or `msft-amsterdam-`).\n- **Allowed (if in L0):** zones (e.g. zone-entrance, zone-retail, zone-workshop, zone-azure-demo, zone-staff), stations (e.g. station-PS-01, station-XB-01, station-HL-01, station-AZ-01), sensors (e.g. sensor-ENV-01, sensor-ENV-02, sensor-FF-01, sensor-DOOR-01). **Forbidden:** zone-demo, zone-cafe, hvac-*, or any asset not in L0. Relationship targets (e.g. IoT Hub) are valid only if registered in L0.\n- Every `source_external_id` and `target_external_id` in `dt_relationships` MUST exist in L0. If the project has an L0 document, use only the `external_id` values from its `dt_assets` block.\n- Keep the YAML strictly valid.\n",
                required: true
              },
              {
                title: "Digital Twin Relationships",
                content:
                  "## Digital Twin Relationships (extractable)\n\n```yaml\n# Use ONLY L0 assets. Prefix: double colon (e.g. mec-amsterdam::). No zone-demo, zone-cafe, hvac-*, or invented IDs.\ndt_relationships:\n  - type: contains\n    source_external_id: \"{{external_id_prefix}}zone-retail\"\n    target_external_id: \"{{external_id_prefix}}station-PS-01\"\n\n  - type: belongs_to\n    source_external_id: \"{{external_id_prefix}}sensor-ENV-01\"\n    target_external_id: \"{{external_id_prefix}}zone-workshop\"\n\n  - type: adjacent_to\n    source_external_id: \"{{external_id_prefix}}zone-entrance\"\n    target_external_id: \"{{external_id_prefix}}zone-retail\"\n```\n",
                required: true
              },
              {
                title: "Notes",
                content:
                  "## Notes\n\n- Relationship types: `contains`, `belongs_to`, `adjacent_to`, `served_by`, `connected_to` only. Keep relationships directional (source → target).\n- Do not use zone-demo, zone-cafe, hvac-*, or other invented assets. Use `mec-amsterdam::`-style prefix (double colon), not hyphen-only. Link only L0-registered assets.\n",
                required: false
              }
            ]
          }),
          JSON.stringify([
            { name: "project_name", type: "text", required: false, description: "Project name" },
            { name: "external_id_prefix", type: "text", required: false, default: "mec-amsterdam::", description: "MUST match L0; double colon (mec-amsterdam::), not hyphen" }
          ]),
          true,
          "standard",
          true,
          adminId
        ]
      )
    }

    const dtLevel2Exists = await db.query(
      "SELECT id FROM templates WHERE name = $1",
      ["Construction Digital Twin L2 — Telemetry & State Mapping"]
    )
    if (dtLevel2Exists.rows.length === 0) {
      await db.query(
        `
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, template_scope, is_read_only, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [
          dtLevel2TemplateId,
          "Construction Digital Twin L2 — Telemetry & State Mapping",
          "Level 2: Define telemetry/state keys per sensor/equipment and map each sensor to a target asset external_id for consistent state updates.",
          "Construction",
          "Digital Twin",
          JSON.stringify({
            sections: [
              {
                title: "Title",
                content:
                  "# Digital Twin Level 2: Telemetry & State Mapping\n\n**Project:** {{project_name}}\n\n**Purpose:** Define what changes over time (state keys), sensor units, sampling, and thresholds.\n",
                required: true
              },
              {
                title: "Instructions",
                content:
                  "## Instructions\n\n- Do NOT invent new assets. Reference ONLY sensors and zones from the **Level 0 Asset Register**. Use the exact same `external_id` format as L0: prefix must use **double colon** (e.g. `mec-amsterdam::`). Never use a hyphen only (e.g. `msft-amsterdam-` or `mec-amsterdam-`).\n- **Allowed sensors** (use only if present in L0): `sensor-ENV-01`, `sensor-ENV-02`, `sensor-FF-01`, `sensor-DOOR-01`. Do NOT invent ENV-03, OCC-*, ENER-*, EQP-*, or any other sensors.\n- **Allowed target assets**: L0 zones only, e.g. `zone-entrance`, `zone-retail`, `zone-workshop`, `zone-azure-demo`, `zone-staff`. Do NOT use `zone-demo` (use `zone-azure-demo`). Do NOT reference `hvac-*` or other infrastructure unless it exists in L0.\n- Every `sensor_external_id` and `target_asset_external_id` in `dt_telemetry` MUST exist in the L0 Asset Register. If the project has an L0 document, use only the `external_id` values from its `dt_assets` block.\n- Use consistent `state_key` naming (snake_case). Keep the YAML strictly valid.\n",
                required: true
              },
              {
                title: "Telemetry Plan",
                content:
                  "## Telemetry Plan (extractable)\n\n```yaml\ndt_telemetry:\n  # Canonical state keys (snake_case). Use only keys relevant to L0 sensors.\n  state_keys:\n    - temperature_c\n    - humidity_percent\n    - occupancy_count\n    - foot_traffic\n    - door_events\n\n  # Sensor mapping → ONLY L0 sensors and zones. Prefix must use double colon (e.g. mec-amsterdam::).\n  # Allowed: sensor-ENV-01, ENV-02, FF-01, DOOR-01; zones: entrance, retail, workshop, azure-demo, staff.\n  # Forbidden: ENV-03, OCC-*, ENER-*, EQP-*, zone-demo, hvac-*.\n  sensors:\n    - sensor_external_id: \"{{external_id_prefix}}sensor-ENV-01\"\n      target_asset_external_id: \"{{external_id_prefix}}zone-workshop\"\n      measures: \"temperature\"\n      state_key: \"temperature_c\"\n      unit: \"°C\"\n      sampling_seconds: 30\n      thresholds:\n        warn: 26\n        critical: 30\n\n    - sensor_external_id: \"{{external_id_prefix}}sensor-ENV-02\"\n      target_asset_external_id: \"{{external_id_prefix}}zone-retail\"\n      measures: \"humidity\"\n      state_key: \"humidity_percent\"\n      unit: \"%\"\n      sampling_seconds: 60\n      thresholds:\n        warn: 65\n        critical: 80\n\n    - sensor_external_id: \"{{external_id_prefix}}sensor-FF-01\"\n      target_asset_external_id: \"{{external_id_prefix}}zone-entrance\"\n      measures: \"footfall\"\n      state_key: \"foot_traffic\"\n      unit: \"count\"\n      sampling_seconds: 300\n      thresholds:\n        warn: 100\n        critical: 150\n```\n",
                required: true
              },
              {
                title: "Notes",
                content:
                  "## Notes\n\n- Use only L0-registered sensors and zones in `dt_telemetry`. Do not invent ENV-03, OCC-*, ENER-*, EQP-*, zone-demo, or hvac-*. Use `mec-amsterdam::`-style prefix (double colon), not hyphen-only. Ingestion/events update `state_key` values; thresholds can trigger alerts.\n",
                required: false
              }
            ]
          }),
          JSON.stringify([
            { name: "project_name", type: "text", required: false, description: "Project name" },
            { name: "external_id_prefix", type: "text", required: false, default: "mec-amsterdam::", description: "MUST match L0; double colon (mec-amsterdam::), not hyphen" }
          ]),
          true,
          "standard",
          true,
          adminId
        ]
      )
    }

    // Ensure existing Construction DT templates use system standard scope and are read-only (visible to all, readable, not editable)
    await db.query(
      `
      UPDATE templates
      SET template_scope = 'standard', is_read_only = true, company_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id IN ($1, $2, $3) AND (template_scope IS DISTINCT FROM 'standard' OR is_read_only IS NOT TRUE)
      `,
      [dtLevel0TemplateId, dtLevel1TemplateId, dtLevel2TemplateId]
    )

    // Always sync Construction template content/variables (L0, L1, L2) so existing DBs get audit fixes and regeneration rules
    const syncConstructionTemplate = async (id: string, content: object, variables: object) => {
      await db.query(
        `UPDATE templates SET content = $1, variables = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [JSON.stringify(content), JSON.stringify(variables), id]
      )
    }
    const dtL0Content = { sections: [
      { title: "Title", content: "# Digital Twin Level 0: Layout & Asset Register\n\n**Project:** {{project_name}}\n\n**Purpose:** Define the canonical Digital Twin asset inventory (what exists) in an extractable format.\n", required: true },
      { title: "Instructions", content: "## Instructions (read before filling)\n\n- All assets MUST be listed in the `dt_assets` YAML block below.\n- Every asset MUST include `asset_type`, `external_id`, `name`, and `platform_type`.\n- Use stable `external_id` values. Use the `{{external_id_prefix}}` variable (default `mec-amsterdam::`). The prefix MUST use a **double colon** (e.g. `mec-amsterdam::`). Do NOT use a single hyphen (e.g. `mec-amsterdam-`).\n- L1 and L2 documents will reference these exact `external_id` strings; keep them consistent.\n- Keep the YAML strictly valid.\n", required: true },
      { title: "Digital Twin Assets", content: "## Digital Twin Assets (extractable)\n\n```yaml\ndt_assets:\n  # Zones\n  - asset_type: zone\n    external_id: \"{{external_id_prefix}}zone-entrance\"\n    name: \"Entrance\"\n    description: \"Customer entry; footfall/door sensing\"\n    platform_type: \"Generic\"\n    location:\n      zone: \"entrance\"\n    metadata:\n      source: \"layout\"\n      layout_document_title: \"{{document_title}}\"\n\n  # Product stations\n  - asset_type: product_station\n    external_id: \"{{external_id_prefix}}station-PS-01\"\n    name: \"Surface Line\"\n    description: \"Surface Pro/Laptop/Studio/Go\"\n    platform_type: \"Generic\"\n    location:\n      zone: \"retail\"\n    metadata:\n      source: \"layout\"\n      station_id: \"PS-01\"\n\n  # Sensors\n  - asset_type: sensor\n    external_id: \"{{external_id_prefix}}sensor-ENV-01\"\n    name: \"ENV-01 (Temperature)\"\n    description: \"Comfort monitoring\"\n    platform_type: \"Generic\"\n    location:\n      zone: \"workshop\"\n    metadata:\n      source: \"telemetry\"\n      sensor_type: \"temperature\"\n      unit: \"°C\"\n```\n", required: true },
      { title: "Notes", content: "## Notes\n\n- This document is the *source of truth* for asset creation. Downstream documents (L1/L2/L3) must reference assets by these exact `external_id` values only—no new IDs, and the same prefix format (e.g. `mec-amsterdam::`).\n", required: false }
    ]}
    const dtL0Vars = [
      { name: "project_name", type: "text", required: false, description: "Project name (auto-injected where available)" },
      { name: "document_title", type: "text", required: false, description: "Document title (optional)" },
      { name: "external_id_prefix", type: "text", required: false, default: "mec-amsterdam::", description: "Prefix for external_ids; MUST use double colon (e.g. mec-amsterdam::), not hyphen" }
    ]
    const dtL1Content = { sections: [
      { title: "Title", content: "# Digital Twin Level 1: Topology & Relationships\n\n**Project:** {{project_name}}\n\n**Purpose:** Describe how assets relate (zone contains station, sensor belongs_to zone, etc.) using stable external IDs.\n", required: true },
      { title: "Instructions", content: "## Instructions\n\n- Do NOT invent new assets. Use ONLY `external_id` values from the project's **Level 0 Asset Register** document.\n- Use the EXACT same `external_id` strings as L0 (same prefix and format). The prefix MUST use **double colon** (e.g. `mec-amsterdam::`), never a hyphen (e.g. `mec-amsterdam-` or `msft-amsterdam-`).\n- **Allowed (if in L0):** zones (e.g. zone-entrance, zone-retail, zone-workshop, zone-azure-demo, zone-staff), stations (e.g. station-PS-01, station-XB-01, station-HL-01, station-AZ-01), sensors (e.g. sensor-ENV-01, sensor-ENV-02, sensor-FF-01, sensor-DOOR-01). **Forbidden:** zone-demo, zone-cafe, hvac-*, or any asset not in L0. Relationship targets (e.g. IoT Hub) are valid only if registered in L0.\n- Every `source_external_id` and `target_external_id` in `dt_relationships` MUST exist in L0. If the project has an L0 document, use only the `external_id` values from its `dt_assets` block.\n- Keep the YAML strictly valid.\n", required: true },
      { title: "Digital Twin Relationships", content: "## Digital Twin Relationships (extractable)\n\n```yaml\n# Use ONLY L0 assets. Prefix: double colon (e.g. mec-amsterdam::). No zone-demo, zone-cafe, hvac-*, or invented IDs.\ndt_relationships:\n  - type: contains\n    source_external_id: \"{{external_id_prefix}}zone-retail\"\n    target_external_id: \"{{external_id_prefix}}station-PS-01\"\n\n  - type: belongs_to\n    source_external_id: \"{{external_id_prefix}}sensor-ENV-01\"\n    target_external_id: \"{{external_id_prefix}}zone-workshop\"\n\n  - type: adjacent_to\n    source_external_id: \"{{external_id_prefix}}zone-entrance\"\n    target_external_id: \"{{external_id_prefix}}zone-retail\"\n```\n", required: true },
      { title: "Notes", content: "## Notes\n\n- Relationship types: `contains`, `belongs_to`, `adjacent_to`, `served_by`, `connected_to` only. Keep relationships directional (source → target).\n- Do not use zone-demo, zone-cafe, hvac-*, or other invented assets. Use `mec-amsterdam::`-style prefix (double colon), not hyphen-only. Link only L0-registered assets.\n", required: false }
    ]}
    const dtL1Vars = [
      { name: "project_name", type: "text", required: false, description: "Project name" },
      { name: "external_id_prefix", type: "text", required: false, default: "mec-amsterdam::", description: "MUST match L0; double colon (mec-amsterdam::), not hyphen" }
    ]
    const dtL2Content = { sections: [
      { title: "Title", content: "# Digital Twin Level 2: Telemetry & State Mapping\n\n**Project:** {{project_name}}\n\n**Purpose:** Define what changes over time (state keys), sensor units, sampling, and thresholds.\n", required: true },
      { title: "Instructions", content: "## Instructions\n\n- Do NOT invent new assets. Reference ONLY sensors and zones from the **Level 0 Asset Register**. Use the exact same `external_id` format as L0: prefix must use **double colon** (e.g. `mec-amsterdam::`). Never use a hyphen only (e.g. `msft-amsterdam-` or `mec-amsterdam-`).\n- **Allowed sensors** (use only if present in L0): `sensor-ENV-01`, `sensor-ENV-02`, `sensor-FF-01`, `sensor-DOOR-01`. Do NOT invent ENV-03, OCC-*, ENER-*, EQP-*, or any other sensors.\n- **Allowed target assets**: L0 zones only, e.g. `zone-entrance`, `zone-retail`, `zone-workshop`, `zone-azure-demo`, `zone-staff`. Do NOT use `zone-demo` (use `zone-azure-demo`). Do NOT reference `hvac-*` or other infrastructure unless it exists in L0.\n- Every `sensor_external_id` and `target_asset_external_id` in `dt_telemetry` MUST exist in the L0 Asset Register. If the project has an L0 document, use only the `external_id` values from its `dt_assets` block.\n- Use consistent `state_key` naming (snake_case). Keep the YAML strictly valid.\n", required: true },
      { title: "Telemetry Plan", content: "## Telemetry Plan (extractable)\n\n```yaml\ndt_telemetry:\n  # Canonical state keys (snake_case). Use only keys relevant to L0 sensors.\n  state_keys:\n    - temperature_c\n    - humidity_percent\n    - occupancy_count\n    - foot_traffic\n    - door_events\n\n  # Sensor mapping → ONLY L0 sensors and zones. Prefix must use double colon (e.g. mec-amsterdam::).\n  # Allowed: sensor-ENV-01, ENV-02, FF-01, DOOR-01; zones: entrance, retail, workshop, azure-demo, staff.\n  # Forbidden: ENV-03, OCC-*, ENER-*, EQP-*, zone-demo, hvac-*.\n  sensors:\n    - sensor_external_id: \"{{external_id_prefix}}sensor-ENV-01\"\n      target_asset_external_id: \"{{external_id_prefix}}zone-workshop\"\n      measures: \"temperature\"\n      state_key: \"temperature_c\"\n      unit: \"°C\"\n      sampling_seconds: 30\n      thresholds:\n        warn: 26\n        critical: 30\n\n    - sensor_external_id: \"{{external_id_prefix}}sensor-ENV-02\"\n      target_asset_external_id: \"{{external_id_prefix}}zone-retail\"\n      measures: \"humidity\"\n      state_key: \"humidity_percent\"\n      unit: \"%\"\n      sampling_seconds: 60\n      thresholds:\n        warn: 65\n        critical: 80\n\n    - sensor_external_id: \"{{external_id_prefix}}sensor-FF-01\"\n      target_asset_external_id: \"{{external_id_prefix}}zone-entrance\"\n      measures: \"footfall\"\n      state_key: \"foot_traffic\"\n      unit: \"count\"\n      sampling_seconds: 300\n      thresholds:\n        warn: 100\n        critical: 150\n```\n", required: true },
      { title: "Notes", content: "## Notes\n\n- Use only L0-registered sensors and zones in `dt_telemetry`. Do not invent ENV-03, OCC-*, ENER-*, EQP-*, zone-demo, or hvac-*. Use `mec-amsterdam::`-style prefix (double colon), not hyphen-only. Ingestion/events update `state_key` values; thresholds can trigger alerts.\n", required: false }
    ]}
    const dtL2Vars = [
      { name: "project_name", type: "text", required: false, description: "Project name" },
      { name: "external_id_prefix", type: "text", required: false, default: "mec-amsterdam::", description: "MUST match L0; double colon (mec-amsterdam::), not hyphen" }
    ]
    await syncConstructionTemplate(dtLevel0TemplateId, dtL0Content, dtL0Vars)
    await syncConstructionTemplate(dtLevel1TemplateId, dtL1Content, dtL1Vars)
    await syncConstructionTemplate(dtLevel2TemplateId, dtL2Content, dtL2Vars)

    // Create sample project
    const projectId = "e3f4a5b6-c7d8-4901-adef-123456789bcd"

    // Check if project exists
    const projectExists = await db.query("SELECT id FROM projects WHERE name = $1", ["Digital Transformation Initiative"])
    if (projectExists.rows.length === 0) {
      await db.query(`
        INSERT INTO projects (id, name, description, framework, status, priority, owner_id, team_members)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        projectId,
      "Digital Transformation Initiative",
      "Enterprise-wide digital transformation project using TOGAF framework",
      "TOGAF",
      "active",
      "high",
      adminId,
      JSON.stringify([userId])
    ])
    }

    // Create sample document
    const documentId = "f4a5b6c7-d8e9-4012-bcde-23456789abcd"

    // Get the actual project ID (in case it already existed)
    const actualProject = await db.query("SELECT id FROM projects WHERE name = $1", ["Digital Transformation Initiative"])
    if (actualProject.rows.length === 0) {
      logger.warn("Project not found, skipping document creation")
      return
    }
    const actualProjectId = actualProject.rows[0].id

    // Get the actual template ID (in case it already existed)
    const actualTemplate = await db.query("SELECT id FROM templates WHERE name = $1", ["TOGAF Business Architecture Document"])
    const actualTemplateId = actualTemplate.rows.length > 0 ? actualTemplate.rows[0].id : null

    // Check if document exists
    const documentExists = await db.query("SELECT id FROM documents WHERE project_id = $1 AND name = $2", [actualProjectId, "Business Architecture Overview"])
    if (documentExists.rows.length === 0) {
      await db.query(`
        INSERT INTO documents (id, project_id, name, content, template_id, status, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        documentId,
        actualProjectId,
      "Business Architecture Overview",
      JSON.stringify({
        executive_summary: "This document outlines the business architecture for our digital transformation initiative.",
        business_goals: "Improve operational efficiency, enhance customer experience, and reduce costs.",
        current_state: "Legacy systems with manual processes and limited integration.",
        future_state: "Integrated digital platform with automated workflows and real-time analytics.",
        gap_analysis: "Key gaps include system integration, process automation, and data analytics capabilities.",
        roadmap: "Phase 1: Assessment (Q1), Phase 2: Design (Q2), Phase 3: Implementation (Q3-Q4)"
      }),
      actualTemplateId,
      "draft",
      adminId,
      adminId
    ])
    }

    // Create demo portfolio
    const portfolioId = uuidv4()
    await db.query(`
      INSERT INTO portfolio_governance (id, portfolio_name, description, status, owner_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [
      portfolioId,
      "Global IT Strategy 2024",
      "Core IT infrastructure and digital transformation portfolio",
      "active",
      userId
    ])

    // Create demo program
    const programId = uuidv4()
    await db.query(`
      INSERT INTO programs (id, name, description, status, start_date, end_date, owner_id, created_by, portfolio_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `, [
      programId,
      "Enterprise AI Transformation",
      "Strategic program to implement AI across all business units",
      "green",
      "2024-01-01",
      "2025-12-31",
      userId,
      adminId,
      portfolioId
    ])

    // Assign ADPA project to this program if it exists
    await db.query(`
      UPDATE projects 
      SET program_id = $1 
      WHERE name = 'ADPA Framework'
    `, [programId])

    logger.info("Database seeding completed successfully")
    logger.info("Demo accounts created:")
    logger.info("  Admin: admin@adpa.com / admin123")
    logger.info("  User:  demo@adpa.com / demo123")
    logger.info("  Test:  test@example.com / password123")

  } catch (error) {
    logger.error("Seeding failed:", error)
    throw error
  } finally {
    // CLI cleanup: close the DB pool when running as a script
    try {
      const db = getDatabasePool()
      await db.end()
    } catch {
      // ignore
    }
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("Seeding completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Seeding failed:", error)
      process.exit(1)
    })
}

export { seedDatabase }
