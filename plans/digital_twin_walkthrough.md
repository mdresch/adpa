# Walkthrough - Digital Twin POC Phase 1, 2 & 3

I have successfully implemented everything up to **Phase 3 (Visio Generation)**.

## Phase 3: Visio Export (New)

I have enabled the **repeatable creation** of Visio diagrams from the system data.

### 1. New Features
-   **"Export Visio" Button**: Located on the Digital Twin Dashboard (`/projects/[id]/digital-twins`).
-   **Template-Based Generation**: The system uses a standard `.vsdx` template to ensure corporate styling is preserved.
-   **Full Round-Trip**:
    1.  Upload Visio (Phase 2) -> Assets in DB.
    2.  Assets in DB -> Download new Visio (Phase 3).

### 2. Backend Logic (`VisioGenerationService`)
-   **Template Injection**: Instead of generating XML from scratch, we inject data into `server/templates/digital_twin_template.vsdx`.
-   **Shape Mapping**: Assets are mapped to proper Visio Masters (`Zone`, `Sensor`).
-   **Metadata**: All asset properties are embedded as **Visio Shape Data**, ensuring context is preserved.

### 3. Usage Instructions
1.  **Prepare Template**: Place your standard Visio template at `server/templates/digital_twin_template.vsdx`. (See `server/templates/README_VISIO_TEMPLATE.md`).
2.  **Generate**: Go to the dashboard and click "Export Visio".
3.  **Result**: You get a fully editable `.vsdx` file with all your assets and metadata.

## Next Steps
-   **Phase 4**: **Document Triggers**. Now that we have the data loop (Visio <-> System), we can set up rules to trigger document generation based on changes.
