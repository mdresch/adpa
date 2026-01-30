# Visio Template Setup Guide

The **Visio Generation Service** requires a base template file to function. This ensures that the generated diagrams adhere to your corporate standards, fonts, and colors.

## 1. Create the Template
1.  Open **Microsoft Visio**.
2.  Create a new blank diagram (or open an existing standard diagram).
3.  Add **Masters/Stencils** to the "Document Stencil" (Local Stencil).
    *   Drag the shapes you want to use (e.g., a "Zone" container, a "Sensor" icon) onto the page, then delete them. This adds them to the Document Stencil.
    *   **Crucial**: Rename the Masters in the Document Stencil to match your `asset_type` values:
        *   `zone`
        *   `sensor`
        *   `product_station`
        *   `infrastructure`
        *   `Dynamic Connector` (Standard Visio name)
4.  Save the file as `.vsdx`.

## 2. Deploy the Template
Save the file to:
`server/templates/digital_twin_template.vsdx`

## 3. How it Works
The system will:
1.  Load this `.vsdx` file.
2.  Find the Masters by name (`zone`, `sensor`, etc.).
3.  Inject your Digital Twin assets as new Shapes referencing these Masters.
4.  Return the modified file for download.
