#!/usr/bin/env ts-node
/**
 * Seed: Microsoft Experience Centers Amsterdam
 * Creates a Construction project in ADPA and registers Digital Twin assets
 * from the shop layout (zones, product stations, environmental sensors).
 *
 * See: docs/projects/retail-shop-franchise/
 *
 * Usage: cd server && npm run seed:retail-shop-franchise
 */

import { Pool } from 'pg';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PROJECT_NAME = 'Microsoft Experience Centers Amsterdam';
const PROJECT_DESCRIPTION = `Microsoft Experience Centers Amsterdam — Experience Centers, Innovation Hub, Customer Engagement Programs. Experiential retail + workshops + Azure demos + Digital Twin. See docs/projects/retail-shop-franchise/ for ideation, business case, and shop layout (customer flow, product stations, environmental sensors).`;
const EXTERNAL_PREFIX = 'mec-amsterdam::';
const PLATFORM = 'Generic';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const ssl =
  connectionString && (connectionString.includes('supabase') || connectionString.includes('neon'))
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString,
  ssl: connectionString ? (ssl as any) : false,
});

interface LayoutAsset {
  external_id: string;
  name: string;
  description: string | null;
  asset_type: string;
  metadata: Record<string, unknown>;
}

function zone(id: string, name: string, desc: string): LayoutAsset {
  return {
    external_id: `${EXTERNAL_PREFIX}zone-${id}`,
    name,
    description: desc,
    asset_type: 'zone',
    metadata: { layout_source: '03-shop-layout-customer-flow-sensors', zone_id: id },
  };
}

function station(id: string, name: string, zoneName: string, purpose: string): LayoutAsset {
  return {
    external_id: `${EXTERNAL_PREFIX}station-${id}`,
    name,
    description: purpose,
    asset_type: 'product_station',
    metadata: { layout_source: '03-shop-layout-customer-flow-sensors', station_id: id, zone: zoneName },
  };
}

function sensor(id: string, type: string, purpose: string): LayoutAsset {
  return {
    external_id: `${EXTERNAL_PREFIX}sensor-${id}`,
    name: `${id} (${type})`,
    description: purpose,
    asset_type: 'sensor',
    metadata: { layout_source: '03-shop-layout-customer-flow-sensors', sensor_id: id, sensor_type: type },
  };
}

const LAYOUT_ASSETS: LayoutAsset[] = [
  zone('entrance', 'Entrance', 'Customer entry; footfall, door sensors'),
  zone('retail', 'Retail Zone', 'Surface line, accessories, Xbox, licensing'),
  zone('showcase', 'Product Showcase', 'Launch stage, kiosks, Azure Media content'),
  zone('azure-demo', 'Azure Demo Zone', 'IoT wall, dashboards, AI/DT demos'),
  zone('workshop', 'Workshop Area', '10–20 pax; modular desks, Surface hubs'),
  zone('tech-bench', 'Tech Bench', 'Diagnostics, setup, migration'),
  zone('exit', 'Exit / Checkout', 'Transaction, exit footfall'),
  station('PS-01', 'Surface Line', 'Retail', 'Surface Pro, Laptop, Studio, Go, Duo'),
  station('PS-02', 'Accessories & Xbox', 'Retail', 'Pens, keyboards, docks, Xbox'),
  station('PS-03', 'Licensing', 'Retail', 'M365, Windows, Defender, Azure credits'),
  station('PS-04', 'Launch / Demo Stage', 'Showcase', 'Events, feature demos'),
  station('PS-05', 'Kiosks & Screens', 'Showcase', 'Self-serve demos, Azure Media'),
  station('PS-06', 'IoT Wall', 'Azure Demo', 'Sensors, live data, scenarios'),
  station('PS-07', 'Touch Dashboards', 'Azure Demo', 'AI, IoT, Digital Twins demos'),
  station('PS-08', 'Instructor Station', 'Workshop', 'Facilitator, Surface hubs, livestream'),
  station('PS-09', 'Participant Stations', 'Workshop', '10–20 modular desks + demo devices'),
  station('PS-10', 'Diagnostics & Setup', 'Tech Bench', 'Support, migration, accessory testing'),
  sensor('ENV-01', 'HVAC/temperature', 'Comfort, energy optimisation'),
  sensor('ENV-02', 'Humidity', 'Workshop, Azure Demo comfort'),
  sensor('ENV-03', 'CO₂', 'Workshop ventilation'),
  sensor('ENV-04', 'Ambient light', 'Lighting zones, energy'),
  sensor('ENV-05', 'Occupancy', 'Per-zone utilization'),
  sensor('ENV-06', 'Footfall', 'Entrance, zone boundaries'),
  sensor('ENV-07', 'Door', 'Entrance, exit traffic'),
  sensor('ENV-08', 'Power', 'Demo stations, workshop usage'),
];

async function run() {
  const client = await pool.connect();
  try {
    const userResult = await client.query(
      `SELECT id, email FROM users WHERE role IN ('super_admin', 'admin') ORDER BY role LIMIT 1`
    );
    if (userResult.rows.length === 0) {
      const fallback = await client.query(`SELECT id, email FROM users ORDER BY created_at LIMIT 1`);
      if (fallback.rows.length === 0) {
        console.error('No users found. Create a user first.');
        process.exit(1);
      }
      userResult.rows = fallback.rows;
    }
    const owner = userResult.rows[0] as { id: string; email: string };

    const existing = await client.query(
      `SELECT id, name FROM projects WHERE name = $1`,
      [PROJECT_NAME]
    );
    let projectId: string;
    if (existing.rows.length > 0) {
      projectId = (existing.rows[0] as { id: string }).id;
      console.log(`Project "${PROJECT_NAME}" already exists (${projectId}). Skipping project insert.`);
    } else {
      projectId = uuidv4();
      const start = new Date();
      const end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await client.query(
        `INSERT INTO projects (
          id, name, description, framework, status, priority, owner_id,
          start_date, end_date, budget, team_members
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          projectId,
          PROJECT_NAME,
          PROJECT_DESCRIPTION,
          'Construction',
          'active',
          'high',
          owner.id,
          start.toISOString().split('T')[0],
          end.toISOString().split('T')[0],
          null,
          JSON.stringify([]),
        ]
      );
      console.log(`Created project "${PROJECT_NAME}" (${projectId}).`);
    }

    let inserted = 0;
    let skipped = 0;
    for (const a of LAYOUT_ASSETS) {
      const exists = await client.query(
        `SELECT 1 FROM digital_twin_assets WHERE project_id = $1 AND external_id = $2 AND platform_type = $3 AND deleted_at IS NULL`,
        [projectId, a.external_id, PLATFORM]
      );
      if (exists.rows.length > 0) {
        skipped++;
        continue;
      }
      await client.query(
        `INSERT INTO digital_twin_assets (
          project_id, external_id, platform_type, name, description, asset_type, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          projectId,
          a.external_id,
          PLATFORM,
          a.name,
          a.description,
          a.asset_type,
          JSON.stringify(a.metadata),
        ]
      );
      inserted++;
    }

    console.log(`Digital Twin assets: ${inserted} inserted, ${skipped} already present.`);
    console.log(`\nProject: http://localhost:3000/projects/${projectId}`);
    console.log(`Digital Twins: http://localhost:3000/projects/${projectId}/digital-twins`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
