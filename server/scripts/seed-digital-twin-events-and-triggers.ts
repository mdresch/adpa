#!/usr/bin/env ts-node
/**
 * Seed Digital Twin events and triggers (example data).
 * Creates sample events, trigger rules, and document triggers for a Construction
 * project (e.g. Microsoft Experience Centers Amsterdam).
 *
 * Usage: cd server && npm run seed:digital-twin-events-and-triggers
 * Optional: PROJECT_NAME="Microsoft Experience Centers Amsterdam" npm run seed:digital-twin-events-and-triggers
 */

import { Pool } from "pg";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const ssl =
  connectionString &&
  (connectionString.includes("supabase") || connectionString.includes("neon"))
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString,
  ssl: connectionString ? (ssl as any) : false,
});

const PROJECT_NAME =
  process.env.PROJECT_NAME ?? "Microsoft Experience Centers Amsterdam";
const PLATFORM = "Generic";

type AssetRow = { id: string; name: string; asset_type: string | null; metadata: Record<string, unknown> };
type EventRow = { id: string; asset_id: string; event_type: string };
type RuleRow = { id: string; trigger_type: string; rule_config: Record<string, unknown> };

async function run() {
  const client = await pool.connect();
  try {
    const proj = await client.query(
      `SELECT id, name FROM projects WHERE name = $1`,
      [PROJECT_NAME]
    );
    if (proj.rows.length === 0) {
      console.log(`Project "${PROJECT_NAME}" not found. Create it first (e.g. seed:retail-shop-franchise).`);
      return;
    }
    const projectId = (proj.rows[0] as { id: string }).id;

    const assetsRes = await client.query(
      `SELECT id, name, asset_type, metadata FROM digital_twin_assets
       WHERE project_id = $1 AND deleted_at IS NULL
       ORDER BY asset_type, name LIMIT 20`,
      [projectId]
    );
    const assets = assetsRes.rows as AssetRow[];
    if (assets.length === 0) {
      console.log(`No assets in project "${PROJECT_NAME}".`);
      return;
    }

    const now = new Date();
    const events: EventRow[] = [];
    const eventTypeOptions = ["state_change", "attribute_change", "alert"] as const;

    // Build example events (1–2 per asset, spread across first 10 assets)
    for (let i = 0; i < Math.min(10, assets.length); i++) {
      const a = assets[i];
      const meta = a.metadata || {};
      const count = i % 3 === 0 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const eventType = eventTypeOptions[i % 3];
        let payload: Record<string, unknown> = { _seed: true, asset_name: a.name };
        if (a.asset_type === "sensor") {
          const t = (meta.sensor_type as string) ?? "generic";
          payload = { ...payload, type: t, value: t === "HVAC/temperature" ? 22.1 : 1, unit: "°C" };
        } else if (a.asset_type === "zone") {
          payload = { ...payload, occupancy: (i + k) % 8, zone_id: meta.zone_id ?? "unknown" };
        } else {
          payload = { ...payload, status: "active", demo_units: 2 };
        }
        const ts = new Date(now.getTime() - (i * 60 + k * 30) * 60 * 1000);
        const platformEventId = `seed-ev-${uuidv4()}`;
        const eventSummary = `${eventType}: ${a.name}${k > 0 ? ` (${k + 1})` : ""}`;
        const ins = await client.query(
          `INSERT INTO digital_twin_events (
            asset_id, event_type, event_payload, event_summary,
            platform_event_id, platform_type, event_timestamp,
            processing_status, processed_at
          ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, 'completed', $7)
          RETURNING id, asset_id, event_type`,
          [a.id, eventType, JSON.stringify(payload), eventSummary, platformEventId, PLATFORM, ts]
        );
        events.push(ins.rows[0] as EventRow);
      }
    }

    console.log(`Inserted ${events.length} example event(s).`);

    // Trigger rules (examples) — insert if not already present (by name)
    const rulesInput: { name: string; description: string; trigger_type: string; rule_config: Record<string, unknown> }[] = [
      {
        name: "Temperature threshold (example)",
        description: "Example: fire when sensor value > 25",
        trigger_type: "threshold_breach",
        rule_config: { attribute_path: "value", operator: "gt", threshold: 25 },
      },
      {
        name: "State change (example)",
        description: "Example: fire on state_change events",
        trigger_type: "state_change",
        rule_config: { event_type: "state_change" },
      },
      {
        name: "Occupancy alert (example)",
        description: "Example: fire when occupancy > 15",
        trigger_type: "attribute_change",
        rule_config: { attribute_path: "occupancy", operator: "gt", threshold: 15 },
      },
    ];

    const rules: RuleRow[] = [];
    const existingRules = await client.query(
      `SELECT id, name, trigger_type, rule_config FROM digital_twin_trigger_rules WHERE project_id = $1`,
      [projectId]
    );
    const existingByName = new Map(
      (existingRules.rows as { id: string; name: string; trigger_type: string; rule_config: Record<string, unknown> }[]).map(
        (r) => [r.name, r]
      )
    );
    for (const r of rulesInput) {
      const existing = existingByName.get(r.name);
      if (existing) {
        rules.push({ id: existing.id, trigger_type: existing.trigger_type, rule_config: existing.rule_config });
        continue;
      }
      const res = await client.query(
        `INSERT INTO digital_twin_trigger_rules (
          project_id, name, description, rule_config, trigger_type, template_id, is_active
        ) VALUES ($1, $2, $3, $4::jsonb, $5, NULL, true)
        RETURNING id, trigger_type, rule_config`,
        [projectId, r.name, r.description, JSON.stringify(r.rule_config), r.trigger_type]
      );
      if (res.rows.length > 0) rules.push(res.rows[0] as RuleRow);
    }
    if (rules.length === 0) {
      for (const row of existingRules.rows as RuleRow[]) {
        rules.push({ id: (row as any).id, trigger_type: (row as any).trigger_type, rule_config: (row as any).rule_config });
      }
    }
    console.log(`Using ${rules.length} trigger rule(s).`);

    // Document triggers (link some events to rules)
    let docTriggerCount = 0;
    for (let i = 0; i < Math.min(5, events.length) && rules.length > 0; i++) {
      const ev = events[i];
      const rule = rules[i % rules.length];
      const triggeredAt = new Date(now.getTime() - (events.length - i) * 60 * 1000);
      await client.query(
        `INSERT INTO digital_twin_document_triggers (
          asset_id, event_id, trigger_rule, trigger_type,
          template_id, document_id, status, triggered_at, completed_at
        ) VALUES ($1, $2, $3::jsonb, $4, NULL, NULL, 'completed', $5, $5)`,
        [
          ev.asset_id,
          ev.id,
          JSON.stringify(rule.rule_config),
          rule.trigger_type,
          triggeredAt,
        ]
      );
      docTriggerCount++;
    }
    console.log(`Inserted ${docTriggerCount} example document trigger(s).`);
    console.log(`Project: ${PROJECT_NAME} (${projectId}).`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Seed failed:", err?.message ?? err);
  process.exit(1);
});
