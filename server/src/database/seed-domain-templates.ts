import { connectDatabase, getDatabasePool } from "./connection"
import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

async function seedDomainTemplates() {
    try {
        logger.info("Starting domain-specific template seeding...")

        await connectDatabase()
        const db = getDatabasePool()

        const adminId = "3a82e0e8-c54d-4f99-b1d7-e651ce101341" // From seed.ts

        // Infrastructure Templates (Bentley Focus)
        const infrastructureTemplates = [
            {
                id: "b2f1a3d4-e5c6-4d7e-8f9a-0b1c2d3e4f5a",
                name: "Construction Safety Plan (OSHA)",
                description: "Standard OSHA-compliant safety plan for construction sites.",
                framework: "OSHA",
                category: "Infrastructure",
                sub_category: "Safety",
                content: {
                    sections: [
                        { title: "Project Overview", content: "# Construction Safety Plan\n\n**Project:** {{project_name}}\n**Location:** {{location}}\n", required: true },
                        { title: "Safety Responsibilities", content: "## 1. Responsibilities\n{{responsibilities}}\n", required: true },
                        { title: "Hazard Communication", content: "## 2. Hazard Communication\n{{hazard_communication}}\n", required: true },
                        { title: "Emergency Procedures", content: "## 3. Emergency Response\n{{emergency_procedures}}\n", required: true },
                        { title: "Personal Protective Equipment", content: "## 4. PPE Requirements\n{{ppe_requirements}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "project_name", type: "text", required: true },
                    { name: "location", type: "text", required: true },
                    { name: "responsibilities", type: "text", required: true },
                    { name: "hazard_communication", type: "text", required: true },
                    { name: "emergency_procedures", type: "text", required: true },
                    { name: "ppe_requirements", type: "text", required: true }
                ]
            },
            {
                id: "c3d4e5f6-a7b8-4901-9c02-d3e4f5a6b7c8",
                name: "Environmental Management Plan (EMP)",
                description: "Plan for managing environmental impacts of infrastructure projects.",
                framework: "ISO 14001",
                category: "Infrastructure",
                sub_category: "Environment",
                content: {
                    sections: [
                        { title: "Environmental Policy", content: "# Environmental Management Plan\n{{environmental_policy}}\n", required: true },
                        { title: "Regulatory Requirements", content: "## Compliance Obligations\n{{regulations}}\n", required: true },
                        { title: "Mitigation Strategies", content: "## Impact Mitigation\n{{mitigation_strategies}}\n", required: true },
                        { title: "Monitoring and Reporting", content: "## Monitoring Plan\n{{monitoring_plan}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "environmental_policy", type: "text", required: true },
                    { name: "regulations", type: "text", required: true },
                    { name: "mitigation_strategies", type: "text", required: true },
                    { name: "monitoring_plan", type: "text", required: true }
                ]
            },
            {
                id: "d4e5f6a7-b8c9-4012-ade3-f4a5b6c7d8e9",
                name: "Method Statement (Construction)",
                description: "Step-by-step procedure for a specific construction task.",
                framework: "Best Practice",
                category: "Infrastructure",
                sub_category: "Operations",
                content: {
                    sections: [
                        { title: "Task Description", content: "# Method Statement: {{task_name}}\n\n{{description}}\n", required: true },
                        { title: "Sequence of Works", content: "## Step-by-Step Procedure\n{{sequence}}\n", required: true },
                        { title: "Equipment Required", content: "## Resources & Equipment\n{{equipment}}\n", required: true },
                        { title: "Quality Control", content: "## QA/QC Checks\n{{qc_measures}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "task_name", type: "text", required: true },
                    { name: "description", type: "text", required: true },
                    { name: "sequence", type: "text", required: true },
                    { name: "equipment", type: "text", required: true },
                    { name: "qc_measures", type: "text", required: true }
                ]
            },
            {
                id: "e5f6a7b8-c9d0-4123-beef-0123456789ab",
                name: "Risk Assessment & Method Statement (RAMS)",
                description: "Combined document for risk management and technical methodology.",
                framework: "HSE",
                category: "Infrastructure",
                sub_category: "Safety",
                content: {
                    sections: [
                        { title: "Hazard Identification", content: "# RAMS: {{activity_name}}\n\n## Hazard Assessment\n{{hazards}}\n", required: true },
                        { title: "Risk Rating", content: "## Risk Matrix\n{{risk_rating}}\n", required: true },
                        { title: "Control Measures", content: "## Mitigation & Controls\n{{controls}}\n", required: true },
                        { title: "Methodology", content: "## Execution Method\n{{methodology}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "activity_name", type: "text", required: true },
                    { name: "hazards", type: "text", required: true },
                    { name: "risk_rating", type: "text", required: true },
                    { name: "controls", type: "text", required: true },
                    { name: "methodology", type: "text", required: true }
                ]
            },
            {
                id: "f6a7b8c9-d0e1-4234-cafe-1234567890cd",
                name: "Materials Approval Register",
                description: "Tracking register for construction material compliance and approval.",
                framework: "QA/QC",
                category: "Infrastructure",
                sub_category: "Quality",
                content: {
                    sections: [
                        { title: "Material Details", content: "# Materials Approval: {{material_name}}\n\n**Supplier:** {{supplier}}\n**Specification:** {{spec_ref}}\n", required: true },
                        { title: "Compliance Status", content: "## Testing Results\n{{test_results}}\n", required: true },
                        { title: "Approval Signature", content: "## Status\n**Approved By:** {{approved_by}}\n**Date:** {{approval_date}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "material_name", type: "text", required: true },
                    { name: "supplier", type: "text", required: true },
                    { name: "spec_ref", type: "text", required: true },
                    { name: "test_results", type: "text", required: true },
                    { name: "approved_by", type: "text", required: true },
                    { name: "approval_date", type: "text", required: true }
                ]
            },
            {
                id: "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5",
                name: "Quality Assurance Plan (QAP)",
                description: "Framework for ensuring engineering and construction quality.",
                framework: "ISO 9001",
                category: "Infrastructure",
                sub_category: "Quality",
                content: {
                    sections: [
                        { title: "Quality Objectives", content: "# Quality Assurance Plan\n{{objectives}}\n", required: true },
                        { title: "Inspection & Test Plan", content: "## ITP Requirements\n{{itp}}\n", required: true },
                        { title: "Non-Conformance Handling", content: "## NCR Procedure\n{{ncr_procedure}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "objectives", type: "text", required: true },
                    { name: "itp", type: "text", required: true },
                    { name: "ncr_procedure", type: "text", required: true }
                ]
            },
            {
                id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
                name: "FIDIC Contract Schedule",
                description: "Schedule template for FIDIC-based international construction contracts.",
                framework: "FIDIC",
                category: "Infrastructure",
                sub_category: "Contract",
                content: {
                    sections: [
                        { title: "Contract Data", content: "# FIDIC Contract Schedule\n**Employer:** {{employer}}\n**Contractor:** {{contractor}}\n", required: true },
                        { title: "Milestones", content: "## Key Milestones\n{{milestones}}\n", required: true },
                        { title: "Payment Terms", content: "## Payment Schedule\n{{payment_terms}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "employer", type: "text", required: true },
                    { name: "contractor", type: "text", required: true },
                    { name: "milestones", type: "text", required: true },
                    { name: "payment_terms", type: "text", required: true }
                ]
            },
            {
                id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
                name: "Engineering Design Basis Report",
                description: "Foundational engineering parameters for infrastructure design.",
                framework: "Engineering Standards",
                category: "Infrastructure",
                sub_category: "Design",
                content: {
                    sections: [
                        { title: "Design Codes", content: "# Design Basis Report\n**Project Type:** {{project_type}}\n**Applicable Codes:** {{codes}}\n", required: true },
                        { title: "Core Parameters", content: "## Primary Loadings & Specs\n{{parameters}}\n", required: true },
                        { title: "Materials", content: "## Material Properties\n{{materials}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "project_type", type: "text", required: true },
                    { name: "codes", type: "text", required: true },
                    { name: "parameters", type: "text", required: true },
                    { name: "materials", type: "text", required: true }
                ]
            },
            {
                id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8g",
                name: "Testing & Commissioning Plan",
                description: "Procedures for testing and handover of completed assets.",
                framework: "Commissioning",
                category: "Infrastructure",
                sub_category: "Operations",
                content: {
                    sections: [
                        { title: "Pre-commissioning", content: "# Testing & Commissioning Plan\n## Static Checks\n{{static_checks}}\n", required: true },
                        { title: "Functional Performance", content: "## Operating Tests\n{{functional_tests}}\n", required: true },
                        { title: "Handover Acceptance", content: "## Final Certification\n{{handover_criteria}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "static_checks", type: "text", required: true },
                    { name: "functional_tests", type: "text", required: true },
                    { name: "handover_criteria", type: "text", required: true }
                ]
            },
            {
                id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8g9h",
                name: "Sustainability/Carbon Footprint Report (Construction)",
                description: "Environmental impact and carbon tracking for infrastructure projects.",
                framework: "GRI/LEED",
                category: "Infrastructure",
                sub_category: "Sustainability",
                content: {
                    sections: [
                        { title: "Embodied Carbon", content: "# Sustainability Report\n## Material Footprint\n{{embodied_carbon}}\n", required: true },
                        { title: "Site Operations", content: "## Operational Emissions\n{{operational_emissions}}\n", required: true },
                        { title: "Waste Management", content: "## Circularity Metrics\n{{waste_metrics}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "embodied_carbon", type: "text", required: true },
                    { name: "operational_emissions", type: "text", required: true },
                    { name: "waste_metrics", type: "text", required: true }
                ]
            }
        ];

        // Supply Chain Templates (Azure Focus)
        const supplyChainTemplates = [
            {
                id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8g9h0i",
                name: "Inventory Status Report",
                description: "Real-time inventory levels and warehouse status.",
                framework: "Logistics",
                category: "Supply Chain",
                sub_category: "Inventory",
                content: {
                    sections: [
                        { title: "Summary", content: "# Inventory Status: {{warehouse_id}}\n**Date:** {{report_date}}\n", required: true },
                        { title: "Stock Levels", content: "## Stock On Hand\n{{stock_levels}}\n", required: true },
                        { title: "Discrepancy Log", content: "## Audit Results\n{{discrepancies}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "warehouse_id", type: "text", required: true },
                    { name: "report_date", type: "text", required: true },
                    { name: "stock_levels", type: "text", required: true },
                    { name: "discrepancies", type: "text", required: true }
                ]
            },
            {
                id: "1a2b3c4d-5e6f-4a7b-8c9d-e0f1a2b3c4d5",
                name: "Asset Tracking Summary",
                description: "Visibility into asset location and status across the supply chain.",
                framework: "Asset Management",
                category: "Supply Chain",
                sub_category: "Operations",
                content: {
                    sections: [
                        { title: "Tracking Overview", content: "# Asset Tracking Summary\n**Category:** {{asset_category}}\n", required: true },
                        { title: "Current Locations", content: "## Geographic Distribution\n{{locations}}\n", required: true },
                        { title: "Movement History", content: "## Recent Transitions\n{{transitions}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "asset_category", type: "text", required: true },
                    { name: "locations", type: "text", required: true },
                    { name: "transitions", type: "text", required: true }
                ]
            },
            {
                id: "2b3c4d5e-6f7g-4a7b-8c9d-e0f1a2b3c4d5",
                name: "Sustainability/ESG Report (Supply Chain)",
                description: "Environmental and social governance reporting for supply chain nodes.",
                framework: "GRI",
                category: "Supply Chain",
                sub_category: "Sustainability",
                content: {
                    sections: [
                        { title: "Carbon Emissions", content: "# Supply Chain ESG Report\n## Scope 3 Emissions\n{{carbon_footprint}}\n", required: true },
                        { title: "Labor Standards", content: "## Supplier Compliance\n{{labor_ethics}}\n", required: true },
                        { title: "Water Scarcity", content: "## Environmental Risk\n{{water_risk}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "carbon_footprint", type: "text", required: true },
                    { name: "labor_ethics", type: "text", required: true },
                    { name: "water_risk", type: "text", required: true }
                ]
            },
            {
                id: "3c4d5e6f-7g8h-4a7b-8c9d-e0f1a2b3c4d5",
                name: "Supply Chain Risk Assessment",
                description: "Identification and mitigation of supply chain disruptions.",
                framework: "Risk Management",
                category: "Supply Chain",
                sub_category: "Security",
                content: {
                    sections: [
                        { title: "Risk Identification", content: "# Risk Assessment: {{business_unit}}\n{{risks}}\n", required: true },
                        { title: "Impact Analysis", content: "## Financial & Operational Impact\n{{impact_rating}}\n", required: true },
                        { title: "Mitigation Plan", content: "## Contingency Strategies\n{{mitigation}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "business_unit", type: "text", required: true },
                    { name: "risks", type: "text", required: true },
                    { name: "impact_rating", type: "text", required: true },
                    { name: "mitigation", type: "text", required: true }
                ]
            },
            {
                id: "4d5e6f7g-8h9i-4a7b-8c9d-e0f1a2b3c4d5",
                name: "Warehouse Operations Report",
                description: "Performance metrics and operational health of warehouse nodes.",
                framework: "WMS",
                category: "Supply Chain",
                sub_category: "Operations",
                content: {
                    sections: [
                        { title: "Operational Metrics", content: "# Warehouse Report: {{site_name}}\n**KPIs:** {{kpis}}\n", required: true },
                        { title: "Staff Utilization", content: "## Labor Resources\n{{labor_data}}\n", required: true },
                        { title: "Safety Incidents", content: "## Incident Log\n{{incidents}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "site_name", type: "text", required: true },
                    { name: "kpis", type: "text", required: true },
                    { name: "labor_data", type: "text", required: true },
                    { name: "incidents", type: "text", required: true }
                ]
            },
            {
                id: "5e6f7g8h-9i0j-4a7b-8c9d-e0f1a2b3c4d5",
                name: "Quality Control Documentation (Logistics)",
                description: "Verification of goods quality during transit and storage.",
                framework: "Quality",
                category: "Supply Chain",
                sub_category: "Quality",
                content: {
                    sections: [
                        { title: "Inspection Log", content: "# Logistics QC: {{shipment_id}}\n{{inspection_details}}\n", required: true },
                        { title: "Damaged Goods", content: "## Exception Report\n{{damage_report}}\n", required: true },
                        { title: "Final Disposition", content: "## Acceptance Status\n{{disposition}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "shipment_id", type: "text", required: true },
                    { name: "inspection_details", type: "text", required: true },
                    { name: "damage_report", type: "text", required: true },
                    { name: "disposition", type: "text", required: true }
                ]
            },
            {
                id: "6f7g8h9i-0j1k-4a7b-8c9d-e0f1a2b3c4d5",
                name: "Supplier Compliance Report",
                description: "Assessment of supplier adherence to contractual and quality standards.",
                framework: "Procurement",
                category: "Supply Chain",
                sub_category: "Compliance",
                content: {
                    sections: [
                        { title: "Supplier Overview", content: "# Supplier Compliance: {{supplier_name}}\n", required: true },
                        { title: "Performance Scorecard", content: "## Delivery & Quality Metrics\n{{metrics}}\n", required: true },
                        { title: "Audit Result", content: "## Compliance Findings\n{{findings}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "supplier_name", type: "text", required: true },
                    { name: "metrics", type: "text", required: true },
                    { name: "findings", type: "text", required: true }
                ]
            },
            {
                id: "7g8h9i0j-1k2l-4a7b-8c9d-e0f1a2b3c4d5",
                name: "Logistics Performance Metrics",
                description: "End-to-end logistics efficiency and cost analysis.",
                framework: "Logistics",
                category: "Supply Chain",
                sub_category: "Analytics",
                content: {
                    sections: [
                        { title: "Cost Analysis", content: "# Logistics Performance\n## Freight & Storage Costs\n{{costs}}\n", required: true },
                        { title: "On-Time Delivery", content: "## OTD Metrics\n{{otd_data}}\n", required: true },
                        { title: "Carrier Performance", content: "## Carrier Scorecard\n{{carrier_ranking}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "costs", type: "text", required: true },
                    { name: "otd_data", type: "text", required: true },
                    { name: "carrier_ranking", type: "text", required: true }
                ]
            },
            {
                id: "8h9i0j1k-2l3m-4a7b-8c9d-e0f1a2b3c4d5",
                name: "Carbon Emissions Report (Logistics)",
                description: "Detailed carbon tracking for transportation and freight.",
                framework: "Sustainability",
                category: "Supply Chain",
                sub_category: "Sustainability",
                content: {
                    sections: [
                        { title: "Mode Analysis", content: "# Logistics Carbon Report\n## Air vs Sea vs Road\n{{mode_emissions}}\n", required: true },
                        { title: "Regional Footprint", content: "## Geographic Impact\n{{regional_data}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "mode_emissions", type: "text", required: true },
                    { name: "regional_data", type: "text", required: true }
                ]
            },
            {
                id: "9i0j1k2l-3m4n-4a7b-8c9d-e0f1a2b3c4d5",
                name: "IoT Device Status Report",
                description: "Health and telemetry status of IoT nodes in the supply chain.",
                framework: "Technology",
                category: "Supply Chain",
                sub_category: "Operations",
                content: {
                    sections: [
                        { title: "Device Fleet Status", content: "# IoT Device Health\n**Total Devices:** {{total_devices}}\n**Active:** {{active_devices}}\n", required: true },
                        { title: "Connectivity Log", content: "## Signal Health\n{{connectivity_data}}\n", required: true },
                        { title: "Battery/Power Analysis", content: "## Device Maintenance\n{{maintenance_tags}}\n", required: true }
                    ]
                },
                variables: [
                    { name: "total_devices", type: "text", required: true },
                    { name: "active_devices", type: "text", required: true },
                    { name: "connectivity_data", type: "text", required: true },
                    { name: "maintenance_tags", type: "text", required: true }
                ]
            }
        ];

        const allTemplates = [...infrastructureTemplates, ...supplyChainTemplates];

        for (const template of allTemplates) {
            await db.query(`
        INSERT INTO templates (id, name, description, framework, category, sub_category, content, variables, is_public, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          framework = EXCLUDED.framework,
          category = EXCLUDED.category,
          sub_category = EXCLUDED.sub_category,
          content = EXCLUDED.content,
          variables = EXCLUDED.variables,
          is_public = EXCLUDED.is_public
      `, [
                template.id,
                template.name,
                template.description,
                template.framework,
                template.category,
                template.sub_category || null,
                JSON.stringify(template.content),
                JSON.stringify(template.variables),
                true,
                adminId
            ]);
        }

        logger.info(`Successfully seeded ${allTemplates.length} domain-specific templates.`);

    } catch (error) {
        logger.error("Domain template seeding failed:", error);
        throw error;
    } finally {
        try {
            const db = getDatabasePool();
            await db.end();
        } catch {
            // ignore
        }
    }
}

if (require.main === module) {
    seedDomainTemplates()
        .then(() => {
            console.log("Domain templates seeding completed");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Domain templates seeding failed:", error);
            process.exit(1);
        });
}

export { seedDomainTemplates };
