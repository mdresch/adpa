import 'dotenv/config';
import { pool, connectDatabase } from '../src/database/connection';

async function updateTemplate() {
  try {
    await connectDatabase();

    const templateParagraphs = [
      {
        order: 1,
        required: true,
        section_name: "Document Overview & Executive Summary",
        section_type: "paragraph",
        description: "Overview, purpose, scope, strategic context, business drivers, and alignment with PMBOK 7 principles.",
        prompt_guidance: "Provide the document purpose, scope, alignment with PMBOK 7 principles, and the strategic risk management transformation vision."
      },
      {
        order: 2,
        required: true,
        section_name: "Project Objectives & Success Criteria",
        section_type: "paragraph",
        description: "Core project objectives, KPIs, and success validation & governance.",
        prompt_guidance: "Define measurable project objectives, specific KPIs (e.g. reduction in MTTR, risk scoring accuracy), and validation methods."
      },
      {
        order: 3,
        required: true,
        section_name: "Stakeholder Engagement & Governance Framework",
        section_type: "paragraph",
        description: "Stakeholder engagement strategy, analysis matrix, project governance structure, CCB, and compliance framework (EU AI Act, NIST AI RMF, ISO 23894).",
        prompt_guidance: "Detail roles and responsibilities, CCB structure, and regulatory compliance frameworks like ISO/IEC 23894 and NIST AI RMF."
      },
      {
        order: 4,
        required: true,
        section_name: "Agile Approach & User Story Mapping Methodology",
        section_type: "paragraph",
        description: "Agile framework, delivery philosophy, epic structure hierarchy, estimation/sizing, MoSCoW prioritization, and requirements life cycle (DoR/DoD).",
        prompt_guidance: "Explain story sizing, MoSCoW framework, the requirements workflow, and Definitions of Ready (DoR) and Done (DoD)."
      },
      {
        order: 5,
        required: true,
        section_name: "Key Components & Detailed User Stories",
        section_type: "paragraph",
        description: "Pillars of functionality (AI-driven risk identification, issue escalation, triaging, RCA, prescriptive recommendations, scenario modeling, HITL, Explainable AI) with detailed stories.",
        prompt_guidance: "Write detailed user stories in 'As a... I want to... So that...' format complete with specific acceptance criteria for each major feature pillar."
      },
      {
        order: 6,
        required: true,
        section_name: "Implementation Roadmap, Budget, & Milestones",
        section_type: "paragraph",
        description: "Phased implementation strategy, pilot testing program, resource allocation, staffing plan, detailed budget, and milestone schedule with dependencies.",
        prompt_guidance: "Provide a phased roadmap timeline, milestone schedule, resource staffing requirements, and estimated budget allocation."
      },
      {
        order: 7,
        required: true,
        section_name: "Risk Register & Uncertainty Management",
        section_type: "paragraph",
        description: "Qualitative risk assessment methodology, detailed risk register, and strategies for managing ambiguity, complexity, and volatility.",
        prompt_guidance: "List potential project risks with probability/impact ratings, mitigation plans, and uncertainty management methods."
      },
      {
        order: 8,
        required: true,
        section_name: "Performance Monitoring & Solution Evaluation",
        section_type: "paragraph",
        description: "Post-implementation evaluation framework, operational metrics table, feedback loops, model governance, and reporting cadence.",
        prompt_guidance: "Detail monitoring metrics (precision, recall, auto-resolution rates), model governance rules, feedback mechanisms, and reporting schedules."
      }
    ];

    console.log("Updating User Stories template paragraphs in database...");
    const res = await pool.query(
      `UPDATE templates
       SET template_paragraphs = $1
       WHERE id = '46e71974-5f12-43ca-b3c4-6419a0fe1e5e'
       RETURNING name, id, template_paragraphs`,
      [JSON.stringify(templateParagraphs)]
    );

    if (res.rows.length > 0) {
      console.log(`Successfully updated template: ${res.rows[0].name} (${res.rows[0].id})`);
      console.log(`Template Paragraphs Count: ${res.rows[0].template_paragraphs.length}`);
    } else {
      console.log("Template with ID 46e71974-5f12-43ca-b3c4-6419a0fe1e5e not found!");
    }

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

updateTemplate();
