# Visio Generation Technical Specification

## 1. Overview
This specification defines the architecture for the **Visio Generation Service** (Phase 3).
The service transforms **L0 (Assets)**, **L1 (Relationships)**, and **L2 (Telemetry)** data from the ADPA database into a downloadable **Visio (.vsdx)** file.

## 2. Architectural decision: Template vs. Scratch
To generate a valid Visio diagram, we must tackle significant complexity:
-   **Master Definitions**: Defining vector shapes, geometries, connection points, and stencils from pure XML is extremely error-prone.
-   **OPC Package Structure**: Managing the complex relationships (`_rels`) between pages, masters, images, and styles in the ZIP archive.

**Chosen Strategy: Template Injection**
By using a "Golden Master" file (`server/templates/digital_twin_template.vsdx`):
1.  **Complexity Reuse**: We reuse the complex definitions of Stencils/Masters already present in the file.
2.  **Standardization**: We ensure corporate compliance (fonts, logos, layers) natively.
3.  **Stability**: We avoid generating invalid XML for shapes; we only inject *instances* of existing shapes.

## 3. Requirement: The "Digital Twin Template"
-   We require a base file: `server/templates/digital_twin_template.vsdx`.
-   This file acts as the source of truth for "How an Asset looks" (The Visio Master).
-   It must contain **Stencils/Masters** for:
    -   `Zone` (e.g., a Container shape)
    -   `ProductStation` (e.g., a Square)
    -   `Sensor` (e.g., a Circle with an icon)
    -   `Infrastructure` (e.g., a Cog/Gear)
    -   `Connector` (Standard Dynamic Connector)

## 4. File Structure (OPC/ZIP)
A `.vsdx` file is a ZIP archive containing:
1.  `[Content_Types].xml`: Defines MIME types.
2.  `visio/pages/page1.xml`: **The Diagram Content** (This is what we modify).
3.  `visio/masters/master*.xml`: The definitions of the shapes (Read-only for us).
4.  `visio/pages/_rels/page1.xml.rels`: Relationships between the page and masters.

## 4. XML Mapping Strategy

### 4.1 L0: Assets -> Shapes
Each `DtAsset` becomes a `<Shape>` element in `page1.xml`.

**Mapping Table:**

| ADPA Field | Visio XML Element | Path / Attribute | Logic |
|---|---|---|---|
| `external_id` | `<Shape>` | `@NameU` / `@Name` | Stable ID mapping. |
| `id` (DB UUID) | `<Shape>` | `@ID` | Visio requires numeric IDs. We map UUID -> Int. |
| `name` | `<Text>` | Inner Text | The label shown on the shape. |
| `asset_type` | `<Shape>` | `@Master` | Maps to the internal Master ID (e.g., "2") based on type. |
| `location` | `<Cell>` | `@N='PinX'`, `@N='PinY'` | Coordinates. Requires scaling (e.g., 100px -> 1 inch). |

**XML Snippet (Generated):**
```xml
<Shape ID="5" NameU="zone-retail" Name="zone-retail" Type="Shape" Master="2">
    <Cell N="PinX" V="4.5"/>
    <Cell N="PinY" V="3.0"/>
    <Text>Retail Zone</Text>
    <!-- Shape Data Section (L2) -->
    <Section N="Property">...</Section>
</Shape>
```

### 4.2 L1: Relationships -> Connectors
Relationships (`contains`, `connected_to`) are visualized using **Dynamic Connectors**.

1.  **Connector Shape**: A 1D Shape instance (Master = Dynamic Connector).
2.  **Connections**: Entries in the `<Connects>` collection at the top of the file.

**Mapping Table:**

| ADPA Relationship | Visio XML | Attributes | Logic |
|---|---|---|---|
| `source` asset | `<Connect>` | `@FromSheet`, `@ToSheet` | `FromSheet`=ConnectorID, `ToSheet`=SourceShapeID. `FromCell`="BeginX". |
| `target` asset | `<Connect>` | `@FromSheet`, `@ToSheet` | `FromSheet`=ConnectorID, `ToSheet`=TargetShapeID. `FromCell`="EndX". |

**XML Snippet:**
```xml
<PageContents>
    <Connects>
        <Connect FromSheet="100" FromCell="BeginX" FromPart="9" ToSheet="5" ToCell="PinX" ToPart="3"/>
        <Connect FromSheet="100" FromCell="EndX" FromPart="12" ToSheet="6" ToCell="PinX" ToPart="3"/>
    </Connects>
    <Shapes>
        ...
        <Shape ID="100" Type="Shape" Master="1">...</Shape> <!-- The Connector Line -->
    </Shapes>
</PageContents>
```

### 4.3 L2: Telemetry -> Shape Data
Visio "Shape Data" is stored in the `Property` section. This allows users to right-click a shape and see "Define Shape Data".

**Mapping Table:**

| ADPA Data | Visio XML Section | Row | Values |
|---|---|---|---|
| `external_id` | `<Section N='Property'>` | `<Row N='Prop.external_id'>` | `<Cell N='Value' V='...'/> <Cell N='Label' V='External ID'/>` |
| `platform_type` | `<Section N='Property'>` | `<Row N='Prop.platform'>` | `<Cell N='Value' V='iTwin'/>` |
| **Telemetry** (e.g. `temp`) | `<Section N='Property'>` | `<Row N='Prop.telemetry_temp'>` | `<Cell N='Value' V='24.5'/> <Cell N='Label' V='Temperature'/>` |

## 5. Implementation Plan

### 5.1 Technology Stack
-   **jszip**: To unzip `template.vsdx` and re-zip the result.
-   **xml2js** or **fast-xml-parser**: To parse `page1.xml` into a JS object, modify it, and build it back to XML string.

### 5.2 Algorithm (`VisioGenerationService.ts`)
1.  **Load Master**: Read `server/templates/digital_twin_template.vsdx`.
2.  **Unzip**: Extract `visio/pages/page1.xml`.
3.  **Map IDs**: Create a lookup `Map<ExternalID, VisioID>`.
4.  **Loop Assets (L0)**:
    -   Allocate new VisioID.
    -   Determine MasterID (by `asset_type`).
    -   Generate `<Shape>` object with `PinX/PinY` (auto-layout grid if location unknown).
    -   Inject **Shape Data** (Properties) from Asset Metadata.
    -   Push to `PageContents.Shapes`.
5.  **Loop Relationships (L1)**:
    -   Allocate ConnectorID.
    -   Create Connector `<Shape>`.
    -   Push to `PageContents.Shapes`.
    -   Create 2 `<Connect>` entries (Begin->Source, End->Target).
    -   Push to `PageContents.Connects`.
6.  **Rebuild**:
    -   `builder.buildObject(xmlObj)`.
    -   `zip.file("visio/pages/page1.xml", newXml)`.
    -   `zip.generateAsync({ type: "nodebuffer" })`.
7.  **Return**: Buffer to API.
