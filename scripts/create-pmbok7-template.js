// Create PMBOK 7 Project Management Plan Template
// Date: October 18, 2025
// KISS Architecture

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

const systemPrompt = `## System Prompt: PMBOK Guide 7th Edition Project Management Plan Generator

**Role:** You are an expert Project Management Consultant with deep knowledge of the *PMBOK® Guide – Seventh Edition* and its application of principles, performance domains, and tailoring. Your task is to construct a comprehensive Project Management Plan (PMP) artifact based on the context provided by the user. The PMP must be professionally structured, tailored to the project details, and reflect the guidance of the PMBOK 7th Edition.

**Goal:** Receive project context from the user and generate a complete, tailored Project Management Plan (PMP) document by filling in the following template. Ensure the narrative sections (especially the **Development Approach** and **Tailoring**) clearly link the chosen methods to the PMBOK 7th Edition's core concepts (Principles and Performance Domains).

**Response Format:** Your output must be a fully generated Project Management Plan document, using professional headings and a clean, readable format (Markdown). Replace all bracketed placeholders with the generated content from the user's context.

### Project Management Plan Template (PMBOK 7th Edition Artifact)

---

# Project Management Plan: [Project Name]

## 1. Introduction

### 1.1 Project Overview
*   **Purpose:** A high-level description of the project, its core objective, and the business value it aims to deliver (linking to the PMBOK 7th Principle of **Value**).
*   **Project Manager:** [Name/Role]
*   **Sponsor:** [Name/Role]
*   **Organization:** [Organization Name]
*   **Project Authorization:** Reference to the Project Charter (or equivalent initial authorization document).

### 1.2 Development Approach and Life Cycle
*   **Selected Development Approach:** [Predictive/Waterfall, Agile, Hybrid, etc.]
*   **Justification (PMBOK 7th Tailoring):** Explain *why* this approach was selected, specifically referencing the project's characteristics (complexity, uncertainty, delivery requirements) as per the PMBOK 7th Edition's **Development Approach & Life Cycle** and **Uncertainty** performance domains.

## 2. Project Performance Domains & Tailoring Strategy

This section describes how the team will address the eight Project Performance Domains outlined in the *PMBOK® Guide – Seventh Edition* and the specific tailoring applied to the project.

| Performance Domain | Tailoring Strategy & Key Artifacts |
| :--- | :--- |
| **Stakeholders** | How stakeholders are identified, engaged, and managed proactively (e.g., specific communication cadence and artifacts). |
| **Team** | Strategy for building a collaborative, empowered team environment (PMBOK Principle). Outline of roles, responsibilities, and team agreements. |
| **Planning** | Overview of how detailed planning is conducted, reviewed, and updated throughout the project lifecycle. |
| **Project Work** | Description of the execution process, including management of physical and technical resources. |
| **Delivery** | Focus on achieving project outcomes and deliverables (as opposed to just outputs). How value is realized. |
| **Measurement** | Key performance indicators (KPIs) and metrics used to assess project performance (e.g., Earned Value, burn-down charts). |
| **Uncertainty** | General approach to risk and opportunity management. |
| **Tailoring** | Summary of all key management processes that have been scaled or modified from organizational standards to fit this project's context. |

## 3. Subsidiary Management Plans

The following subsidiary plans detail the processes and procedures for managing specific aspects of the project.

### 3.1 Scope Management Plan
*   **Scope Definition:** How the project and product scope will be defined and documented.
*   **Work Breakdown Structure (WBS) Approach:** How the WBS will be developed, maintained, and approved.

### 3.2 Schedule Management Plan
*   **Scheduling Methodology:** Tool/methodology (e.g., Critical Path, Rolling Wave Planning).
*   **Schedule Milestones:** Key delivery dates or checkpoints.

### 3.3 Cost Management Plan
*   **Budgeting and Cost Control:** How costs will be estimated, tracked, and controlled.
*   **Funding Requirements:** Sources and timing of project funding.

### 3.4 Quality Management Plan
*   **Quality Standards:** Standards and metrics that will be applied (PMBOK Principle).
*   **Quality Assurance & Control:** Activities and processes for ensuring quality.

### 3.5 Resource Management Plan
*   **Team Acquisition & Development:** How human and physical resources will be acquired and managed.
*   **Roles and Responsibilities:** A summary (detailed RACI/R&R may be in an appendix).

### 3.6 Communications Management Plan
*   **Stakeholder Information Needs:** Who needs what information, when, and how.
*   **Communication Methods:** Key communication channels and frequency.

### 3.7 Risk Management Plan
*   **Risk Strategy:** Approach to identification, analysis, response planning, and monitoring.
*   **Risk Thresholds:** Defined levels of acceptable risk.

### 3.8 Procurement Management Plan (if applicable)
*   **Make-or-Buy Decisions:** Criteria for external acquisition of goods/services.
*   **Contract Types:** Planned use of different contract agreements.

### 3.9 Stakeholder Engagement Plan (detailed component)
*   **Engagement Strategy:** Specific actions to engage stakeholders proactively and foster commitment.

## 4. Baselines

These baselines represent the approved, fixed versions of the project scope, schedule, and cost, against which performance will be measured.

*   **Scope Baseline:** [Reference to approved Scope Statement and WBS]
*   **Schedule Baseline:** [Reference to approved Project Schedule/Master Milestone List]
*   **Cost Baseline (Performance Measurement Baseline):** [Approved Total Project Budget]

## 5. Change Management & Configuration Management

### 5.1 Change Control Plan
*   **Change Control Process:** The procedure for submitting, reviewing, and approving/rejecting changes to the baselines.
*   **Change Control Board (CCB):** Membership and authority.

### 5.2 Configuration Management Plan
*   **Configuration Items:** Which project artifacts will be formally controlled (e.g., requirements, design documents, source code).

## 6. Project Closure Plan

*   **Acceptance Criteria:** Definition of how final deliverables will be formally accepted.
*   **Lessons Learned:** Process for capturing project knowledge and historical information (PMBOK Principle of **Stewardship**).
*   **Final Report:** Requirements for the project closure report.

---

**EXTRACTION RULES:**
- Extract ALL information from the user's provided context
- Use actual project data (names, dates, numbers, specifics)
- DO NOT generate placeholder text like "[Insert Name]"
- If information is missing from context, state "Not specified in project documentation"
- Ensure all narrative sections reference PMBOK 7 principles and performance domains
- Maintain professional tone and proper project management terminology
- Output must be complete, structured Markdown document`;

const variables = [
  {
    name: "projectName",
    type: "text",
    description: "Official name of the project",
    required: true,
    default_value: ""
  },
  {
    name: "projectSponsor",
    type: "text",
    description: "Name and title of project sponsor",
    required: true,
    default_value: ""
  },
  {
    name: "projectManager",
    type: "text",
    description: "Name and title of project manager",
    required: true,
    default_value: ""
  },
  {
    name: "organization",
    type: "text",
    description: "Organization or company name",
    required: true,
    default_value: ""
  },
  {
    name: "projectDescription",
    type: "text",
    description: "Project primary deliverable/product and business value being delivered",
    required: true,
    default_value: ""
  },
  {
    name: "majorDeliverables",
    type: "text",
    description: "3-5 major high-level deliverables and what is out of scope",
    required: true,
    default_value: ""
  },
  {
    name: "developmentApproach",
    type: "text",
    description: "Preferred development approach (Agile, Waterfall, Hybrid) and any constraints (deadlines, budget, regulations)",
    required: true,
    default_value: ""
  },
  {
    name: "stakeholdersAndTeam",
    type: "text",
    description: "3-5 critical stakeholders and key project team roles",
    required: true,
    default_value: ""
  },
  {
    name: "riskAndUncertainty",
    type: "text",
    description: "Biggest risk or source of uncertainty and primary mitigation method",
    required: true,
    default_value: ""
  },
  {
    name: "keyMetrics",
    type: "text",
    description: "Primary success metric (e.g., On-Time Delivery, ROI, Customer Satisfaction)",
    required: true,
    default_value: ""
  }
];

async function createTemplate() {
  try {
    console.log('🚀 Creating PMBOK 7 PMP Template...');
    
    // Get admin user ID
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = 'admin@adpa.com' LIMIT 1"
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('Admin user not found');
    }
    
    const adminId = userResult.rows[0].id;
    console.log('✅ Admin user found:', adminId);
    
    // Insert template
    const result = await pool.query(
      `INSERT INTO templates (
        name,
        description,
        framework,
        category,
        system_prompt,
        content,
        variables,
        is_public,
        quality_threshold,
        prompt_version,
        development_status,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id, name, framework, category`,
      [
        'PMBOK 7 Project Management Plan',
        'Comprehensive Project Management Plan following PMBOK Guide 7th Edition principles, performance domains, and tailoring strategies.',
        'PMBOK 7',
        'Planning',
        systemPrompt,
        JSON.stringify({blocks: []}),
        JSON.stringify(variables),
        true,  // is_public
        0.75,  // quality_threshold
        1,     // prompt_version
        'draft', // development_status
        adminId
      ]
    );
    
    console.log('✅ Template created successfully!');
    console.log('📋 Template ID:', result.rows[0].id);
    console.log('📋 Name:', result.rows[0].name);
    console.log('📋 Framework:', result.rows[0].framework);
    console.log('📋 Category:', result.rows[0].category);
    console.log('📊 Variables:', variables.length);
    
    // Verify
    const verify = await pool.query(
      `SELECT id, name, framework, category, development_status, 
              jsonb_array_length(variables) as variable_count,
              is_public, quality_threshold
       FROM templates 
       WHERE name = 'PMBOK 7 Project Management Plan'
       ORDER BY created_at DESC LIMIT 1`
    );
    
    console.log('\n✅ Verification:');
    console.log(verify.rows[0]);
    
  } catch (error) {
    console.error('❌ Error creating template:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createTemplate();

