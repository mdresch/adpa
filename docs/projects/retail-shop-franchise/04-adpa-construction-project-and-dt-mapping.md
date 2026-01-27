# ADPA Construction Project & Layout → Digital Twin Mapping

**Document type:** Implementation guide & capability assessment  
**Project:** Microsoft Experience Centers Amsterdam (Experience Centers · Innovation Hub · Customer Engagement Programs)  
**Purpose:** Register the pilot as an ADPA **Construction** project, map shop layout schematics to **Digital Twin** assets, and assess whether ADPA can “turn” the layout into a digital twin.

---

## 1. Construction Project in ADPA

### 1.1 Framework

ADPA supports a **Construction** project framework. Use it when creating the Microsoft Experience Centers Amsterdam project (via UI or API) so it is clearly a construction/facility pilot.

- **Create Project dialog:** Framework dropdown includes **Construction**.
- **API:** `POST /api/projects` with `framework: "Construction"`.

### 1.2 Creating the Project via Seed Script

A seed script creates the **Microsoft Experience Centers Amsterdam** project and populates Digital Twin assets from the shop layout.

**Run from repo root:**

```bash
cd server && npm run seed:retail-shop-franchise
```

**What it does:**

1. Resolves an **owner** (first admin, else first user).
2. Inserts a **project** with:
   - **Name:** Microsoft Experience Centers Amsterdam  
   - **Framework:** Construction  
   - **Description:** Microsoft Experience Centers (Amsterdam) pilot; references `docs/projects/retail-shop-franchise/`.  
   - **Status:** active, **Priority:** high.
3. Registers **Digital Twin assets** for all layout entities (zones, product stations, sensors).  
   - If the project already exists, it skips the project insert.  
   - If an asset already exists (same `project_id`, `external_id`, `platform_type`), it skips that asset.

**Output:** Project ID, project URL, Digital Twins URL, and counts of inserted vs skipped assets.

### 1.3 Where to Find It in ADPA

- **Project:** [Projects](http://localhost:3000/projects) → **Microsoft Experience Centers Amsterdam**  
- **Digital Twins:** Project → **Digital Twins** tab or **Manage Digital Twins** → `/projects/{id}/digital-twins`

---

## 2. Shop Layout → Digital Twin Asset Mapping

The [shop layout](./03-shop-layout-customer-flow-sensors.md) defines **zones**, **product stations**, and **environmental sensors**. These are represented as **Digital Twin assets** in ADPA.

### 2.1 Asset Model

| Layout entity   | DT asset_type    | external_id pattern        | platform_type |
|-----------------|------------------|----------------------------|---------------|
| Zone            | `zone`           | `mec-amsterdam::zone-{id}`   | Generic       |
| Product station | `product_station`| `mec-amsterdam::station-{id}`| Generic       |
| Sensor          | `sensor`         | `mec-amsterdam::sensor-{id}` | Generic       |

`metadata` stores `layout_source`, `zone_id` / `station_id` / `sensor_id`, and similar layout-specific fields.

### 2.2 Zones (7)

| external_id                | name            | description                                      |
|----------------------------|-----------------|--------------------------------------------------|
| mec-amsterdam::zone-entrance  | Entrance        | Customer entry; footfall, door sensors           |
| mec-amsterdam::zone-retail    | Retail Zone     | Surface line, accessories, Xbox, licensing       |
| mec-amsterdam::zone-showcase  | Product Showcase| Launch stage, kiosks, Azure Media content        |
| mec-amsterdam::zone-azure-demo| Azure Demo Zone | IoT wall, dashboards, AI/DT demos                |
| mec-amsterdam::zone-workshop  | Workshop Area   | 10–20 pax; modular desks, Surface hubs          |
| mec-amsterdam::zone-tech-bench| Tech Bench      | Diagnostics, setup, migration                    |
| mec-amsterdam::zone-exit      | Exit / Checkout | Transaction, exit footfall                       |

### 2.3 Product Stations (10)

| external_id                  | name                 | zone       |
|------------------------------|----------------------|------------|
| mec-amsterdam::station-PS-01 | Surface Line         | Retail     |
| mec-amsterdam::station-PS-02 | Accessories & Xbox   | Retail     |
| mec-amsterdam::station-PS-03 | Licensing            | Retail     |
| mec-amsterdam::station-PS-04 | Launch / Demo Stage  | Showcase   |
| mec-amsterdam::station-PS-05 | Kiosks & Screens     | Showcase   |
| mec-amsterdam::station-PS-06 | IoT Wall             | Azure Demo |
| mec-amsterdam::station-PS-07 | Touch Dashboards     | Azure Demo |
| mec-amsterdam::station-PS-08 | Instructor Station   | Workshop   |
| mec-amsterdam::station-PS-09 | Participant Stations | Workshop   |
| mec-amsterdam::station-PS-10 | Diagnostics & Setup  | Tech Bench |

### 2.4 Environmental Sensors (8)

| external_id                 | type               | purpose                    |
|-----------------------------|--------------------|----------------------------|
| mec-amsterdam::sensor-ENV-01| HVAC/temperature   | Comfort, energy            |
| mec-amsterdam::sensor-ENV-02| Humidity           | Workshop, Azure comfort    |
| mec-amsterdam::sensor-ENV-03| CO₂                | Workshop ventilation       |
| mec-amsterdam::sensor-ENV-04| Ambient light      | Lighting, energy           |
| mec-amsterdam::sensor-ENV-05| Occupancy          | Per-zone utilization       |
| mec-amsterdam::sensor-ENV-06| Footfall           | Entrance, zone boundaries  |
| mec-amsterdam::sensor-ENV-07| Door               | Entrance, exit traffic     |
| mec-amsterdam::sensor-ENV-08| Power              | Demo stations, workshop    |

---

## 3. Can ADPA “Turn” the Shop Layout into a Digital Twin?

### 3.1 What “Turn Layout into Digital Twin” Means Here

- **Asset registry:** Layout entities (zones, stations, sensors) exist as first-class assets in a project-scoped Digital Twin.  
- **State & events:** Assets can have state snapshots and event-driven updates.  
- **Operational use:** Triggers, ingestion, and (where built) connectors support monitoring, alerts, and automation.

### 3.2 What ADPA Supports Today

| Capability                         | Status | Notes                                                                 |
|------------------------------------|--------|-----------------------------------------------------------------------|
| **Construction project**           | Yes    | Framework “Construction” + seed script.                               |
| **Layout → asset registry**        | Yes    | Zones, stations, sensors as DT assets; seed script implements mapping.|
| **Asset state (JSON)**             | Yes    | Current state, history, state hash, changed fields.                   |
| **Events**                         | Yes    | Ingest events, process → state, retry.                                |
| **Trigger rules**                  | Yes    | Rules + document triggers.                                            |
| **Ingestion sources**              | Yes    | iTwin, Azure DT, Generic; start/pause.                                |
| **JSON state viewer**              | Yes    | Per-asset state view in Digital Twins UI.                             |
| **3D / floor plan viewer**         | No     | No iTwin Viewer or spatial view in current POC.                       |
| **Schematic import (CAD/BIM)**     | No     | No automated import of drawings into DT assets.                       |
| **Live sensor telemetry**          | Partial| Ingestion + events exist; needs Azure IoT / connector to push data.   |

### 3.3 Summary

- **Yes:** ADPA **is** enabled to represent the shop layout as a **structured Digital Twin**: construction project + 25 layout-derived assets (zones, stations, sensors). You can view assets, state, and events in the Digital Twins UI and use triggers/ingestion for downstream logic.
- **Partial:** “Turn” is **manual** today: run the seed script (or equivalent) to create the project and assets from the layout spec. There is no automated import of 2D/3D schematics.
- **Not yet:** No 3D or floor-plan visualization, no CAD/BIM ingestion, and no live sensor pipelines until Azure IoT (or similar) connectors are wired to ingestion.

### 3.4 Next Steps to Strengthen “Layout → Digital Twin”

1. **Run the seed**  
   Ensure the construction project and all layout assets exist:  
   `cd server && npm run seed:retail-shop-franchise`

2. **Use the Digital Twins UI**  
   Open the project → Digital Twins → Assets. Confirm zones, stations, and sensors. Optionally add trigger rules and ingestion sources (e.g. Generic → Azure IoT later).

3. **Connect real telemetry**  
   Add an ingestion source (e.g. Azure IoT Hub) and event payloads that reference these assets (`asset_id` or `external_id`). Process events to update state.

4. **Optional: 3D / spatial**  
   Per the [implementation plan](../../../plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md), iTwin Viewer is out of scope for the current POC. For a spatial twin, you’d need to add iTwin Viewer (or similar) and link views to existing DT assets.

---

## 4. References

- [01-project-ideation](./01-project-ideation.md)  
- [02-business-case](./02-business-case.md)  
- [03-shop-layout-customer-flow-sensors](./03-shop-layout-customer-flow-sensors.md)  
- [DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED](../../../plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md)  
- [digital-twin-implementation.SKILL](../../../skills/digital-twin-implementation.SKILL.md)
