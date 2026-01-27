#!/usr/bin/env ts-node
/**
 * Seed Digital Twin asset states.
 * Inserts initial state snapshots for assets that have no current state
 * (e.g. layout-only assets from seed-retail-shop-franchise).
 *
 * Usage: cd server && npm run seed:digital-twin-states
 * Optional: PROJECT_NAME="Microsoft Experience Centers Amsterdam" npm run seed:digital-twin-states
 */

import { Pool } from "pg";
import * as path from "path";
import dotenv from "dotenv";
import { calculateStateHash } from "../src/utils/digitalTwinStateUtils";

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

const PROJECT_NAME = process.env.PROJECT_NAME ?? null; // optional filter

type AssetRow = {
  id: string;
  name: string;
  external_id: string;
  asset_type: string | null;
  metadata: Record<string, unknown>;
};

function buildStateSnapshot(asset: AssetRow, now: string): Record<string, unknown> {
  const meta = asset.metadata || {};
  const base = {
    _seed: true,
    last_updated: now,
    asset_name: asset.name,
    external_id: asset.external_id,
  };

  switch (asset.asset_type) {
    case "zone": {
      const zoneId = (meta.zone_id as string) ?? "unknown";
      return {
        ...base,
        status: "active",
        occupancy: 0,
        capacity_estimate: zoneId === "workshop" ? 20 : 50,
        zone_id: zoneId,
      };
    }
    case "sensor": {
      const sensorType = (meta.sensor_type as string) ?? "generic";
      const unit =
        sensorType === "HVAC/temperature"
          ? "°C"
          : sensorType === "Humidity"
            ? "%"
            : sensorType === "CO₂"
              ? "ppm"
              : sensorType === "Ambient light"
                ? "lux"
                : sensorType === "Power"
                  ? "W"
                  : null;
      return {
        ...base,
        type: sensorType,
        value: sensorType === "HVAC/temperature" ? 21.5 : sensorType === "Humidity" ? 45 : sensorType === "Occupancy" ? 0 : 1,
        unit,
        status: "ok",
      };
    }
    case "product_station": {
      const stationId = (meta.station_id as string) ?? "unknown";
      return {
        ...base,
        status: "active",
        demo_units_available: 2,
        station_id: stationId,
      };
    }
    default:
      return { ...base, status: "active" };
  }
}

async function run() {
  const client = await pool.connect();
  try {
    let query: string;
    let params: unknown[];
    if (PROJECT_NAME) {
      query = `
        SELECT a.id, a.name, a.external_id, a.asset_type, a.metadata
        FROM digital_twin_assets a
        JOIN projects p ON p.id = a.project_id
        WHERE a.deleted_at IS NULL
          AND a.current_state_id IS NULL
          AND p.name = $1
      `;
      params = [PROJECT_NAME];
    } else {
      query = `
        SELECT id, name, external_id, asset_type, metadata
        FROM digital_twin_assets
        WHERE deleted_at IS NULL AND current_state_id IS NULL
      `;
      params = [];
    }

    const { rows } = await client.query(query, params);
    const assets = rows as AssetRow[];

    if (assets.length === 0) {
      console.log(
        PROJECT_NAME
          ? `No assets without state found in project "${PROJECT_NAME}".`
          : "No assets without state found."
      );
      return;
    }

    const now = new Date().toISOString();
    let inserted = 0;

    for (const asset of assets) {
      const stateSnapshot = buildStateSnapshot(asset, now);
      const stateHash = calculateStateHash(stateSnapshot);

      await client.query(
        `INSERT INTO digital_twin_asset_states (
          asset_id, state_snapshot, state_version, changed_fields,
          previous_state_id, source_event_id, is_current, state_hash, change_summary,
          timestamp
        ) VALUES ($1, $2::jsonb, 1, '[]'::jsonb, NULL, NULL, true, $3, NULL, $4::timestamptz)`,
        [asset.id, JSON.stringify(stateSnapshot), stateHash, now]
      );
      inserted++;
    }

    console.log(`Inserted ${inserted} state snapshot(s) for assets without state.`);
    if (PROJECT_NAME) {
      console.log(`Project filter: "${PROJECT_NAME}".`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Seed failed:", err?.message ?? err);
  process.exit(1);
});
