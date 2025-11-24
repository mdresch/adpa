/**
 * Seed Skills and Competencies
 * 
 * Populates the database with comprehensive skills and competencies
 * covering technical skills, PMBOK competencies, BABOK competencies,
 * and common project management capabilities.
 * 
 * Usage: ts-node server/src/database/seed-skills-competencies.ts
 */

import { pool, connectDatabase } from "./connection"
import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

interface SkillSeed {
  name: string
  description: string
  category: string
}

interface CompetencySeed {
  name: string
  description: string
  category: string
}

// Technical Skills - Programming Languages
const programmingSkills: SkillSeed[] = [
  { name: "JavaScript", description: "JavaScript programming language", category: "Programming Language" },
  { name: "TypeScript", description: "TypeScript programming language", category: "Programming Language" },
  { name: "Python", description: "Python programming language", category: "Programming Language" },
  { name: "Java", description: "Java programming language", category: "Programming Language" },
  { name: "C#", description: "C# programming language", category: "Programming Language" },
  { name: "SQL", description: "Structured Query Language for databases", category: "Programming Language" },
  { name: "HTML/CSS", description: "HTML and CSS for web development", category: "Programming Language" },
  { name: "React", description: "React JavaScript framework", category: "Framework" },
  { name: "Node.js", description: "Node.js runtime environment", category: "Framework" },
  { name: "Next.js", description: "Next.js React framework", category: "Framework" },
  { name: "Express.js", description: "Express.js web framework", category: "Framework" },
  { name: "Vue.js", description: "Vue.js JavaScript framework", category: "Framework" },
  { name: "Angular", description: "Angular framework", category: "Framework" },
]

// Technical Skills - Tools & Platforms
const toolSkills: SkillSeed[] = [
  { name: "Microsoft Excel", description: "Microsoft Excel spreadsheet software", category: "Productivity Tool" },
  { name: "Microsoft Project", description: "Microsoft Project project management software", category: "Project Management Tool" },
  { name: "Jira", description: "Jira project management and issue tracking", category: "Project Management Tool" },
  { name: "Confluence", description: "Confluence collaboration and documentation platform", category: "Collaboration Tool" },
  { name: "SharePoint", description: "Microsoft SharePoint document management", category: "Collaboration Tool" },
  { name: "Git", description: "Git version control system", category: "Development Tool" },
  { name: "GitHub", description: "GitHub code repository and collaboration", category: "Development Tool" },
  { name: "Azure DevOps", description: "Azure DevOps development and deployment platform", category: "Development Tool" },
  { name: "Docker", description: "Docker containerization platform", category: "DevOps Tool" },
  { name: "Kubernetes", description: "Kubernetes container orchestration", category: "DevOps Tool" },
  { name: "AWS", description: "Amazon Web Services cloud platform", category: "Cloud Platform" },
  { name: "Azure", description: "Microsoft Azure cloud platform", category: "Cloud Platform" },
  { name: "Google Cloud", description: "Google Cloud Platform", category: "Cloud Platform" },
  { name: "PostgreSQL", description: "PostgreSQL database management", category: "Database" },
  { name: "MySQL", description: "MySQL database management", category: "Database" },
  { name: "MongoDB", description: "MongoDB NoSQL database", category: "Database" },
  { name: "Redis", description: "Redis in-memory data store", category: "Database" },
  { name: "Power BI", description: "Microsoft Power BI business intelligence", category: "Analytics Tool" },
  { name: "Tableau", description: "Tableau data visualization", category: "Analytics Tool" },
  { name: "Puppeteer", description: "Puppeteer browser automation", category: "Development Tool" },
  { name: "Puppeteer PDF", description: "PDF generation using Puppeteer", category: "Development Tool" },
]

// Project Management Skills
const projectManagementSkills: SkillSeed[] = [
  { name: "Agile Scrum", description: "Agile Scrum methodology", category: "Methodology" },
  { name: "Agile Kanban", description: "Agile Kanban methodology", category: "Methodology" },
  { name: "Waterfall", description: "Waterfall project methodology", category: "Methodology" },
  { name: "Hybrid Methodology", description: "Hybrid project management approach", category: "Methodology" },
  { name: "Earned Value Management", description: "EVM project performance measurement", category: "Project Management" },
  { name: "Risk Management", description: "Project risk identification and mitigation", category: "Project Management" },
  { name: "Stakeholder Management", description: "Stakeholder engagement and communication", category: "Project Management" },
  { name: "Resource Management", description: "Project resource planning and allocation", category: "Project Management" },
  { name: "Budget Management", description: "Project budget planning and control", category: "Project Management" },
  { name: "Schedule Management", description: "Project schedule development and control", category: "Project Management" },
  { name: "Quality Management", description: "Project quality planning and assurance", category: "Project Management" },
  { name: "Change Management", description: "Change control and management processes", category: "Project Management" },
  { name: "Scope Management", description: "Project scope definition and control", category: "Project Management" },
]

// Business Analysis Skills
const businessAnalysisSkills: SkillSeed[] = [
  { name: "Requirements Elicitation", description: "Gathering and documenting business requirements", category: "Business Analysis" },
  { name: "Process Modeling", description: "Business process modeling and documentation", category: "Business Analysis" },
  { name: "Data Modeling", description: "Data modeling and database design", category: "Business Analysis" },
  { name: "Use Case Development", description: "Use case analysis and documentation", category: "Business Analysis" },
  { name: "User Story Writing", description: "Agile user story creation and refinement", category: "Business Analysis" },
  { name: "Business Process Improvement", description: "Analyzing and improving business processes", category: "Business Analysis" },
  { name: "Gap Analysis", description: "Identifying gaps between current and desired state", category: "Business Analysis" },
  { name: "Stakeholder Analysis", description: "Analyzing and mapping stakeholders", category: "Business Analysis" },
]

// Data Management Skills
const dataManagementSkills: SkillSeed[] = [
  { name: "Data Governance", description: "Data governance frameworks and practices", category: "Data Management" },
  { name: "Data Quality", description: "Data quality assessment and improvement", category: "Data Management" },
  { name: "Data Modeling", description: "Data modeling and database design", category: "Data Management" },
  { name: "ETL", description: "Extract, Transform, Load processes", category: "Data Management" },
  { name: "Data Warehousing", description: "Data warehouse design and management", category: "Data Management" },
  { name: "Data Analytics", description: "Data analysis and interpretation", category: "Data Management" },
  { name: "Data Visualization", description: "Creating data visualizations and dashboards", category: "Data Management" },
]

// Additional Common Skills
const additionalSkills: SkillSeed[] = [
  { name: "REST API", description: "RESTful API development and integration", category: "Development Tool" },
  { name: "GraphQL", description: "GraphQL API development", category: "Development Tool" },
  { name: "JSON", description: "JSON data format and processing", category: "Development Tool" },
  { name: "Markdown", description: "Markdown documentation and formatting", category: "Productivity Tool" },
  { name: "Word", description: "Microsoft Word document processing", category: "Productivity Tool" },
  { name: "PowerPoint", description: "Microsoft PowerPoint presentations", category: "Productivity Tool" },
  { name: "Visio", description: "Microsoft Visio diagramming", category: "Productivity Tool" },
  { name: "Lucidchart", description: "Lucidchart diagramming and flowcharts", category: "Productivity Tool" },
  { name: "Figma", description: "Figma design and prototyping", category: "Design Tool" },
  { name: "Adobe Acrobat", description: "Adobe Acrobat PDF processing", category: "Productivity Tool" },
  { name: "PDF Generation", description: "Programmatic PDF generation", category: "Development Tool" },
  { name: "Document Generation", description: "Automated document generation", category: "Development Tool" },
  { name: "API Integration", description: "Integrating with third-party APIs", category: "Development Tool" },
  { name: "Web Scraping", description: "Web scraping and data extraction", category: "Development Tool" },
  { name: "Test Automation", description: "Automated testing frameworks", category: "Development Tool" },
  { name: "CI/CD", description: "Continuous Integration and Continuous Deployment", category: "DevOps Tool" },
  { name: "Linux", description: "Linux operating system administration", category: "Operating System" },
  { name: "Windows Server", description: "Windows Server administration", category: "Operating System" },
  { name: "Network Administration", description: "Network configuration and management", category: "Infrastructure" },
  { name: "Security", description: "Information security practices", category: "Security" },
  { name: "Cybersecurity", description: "Cybersecurity threat management", category: "Security" },
]

// PMBOK 8 Performance Domains (Competencies)
const pmbokCompetencies: CompetencySeed[] = [
  {
    name: "Stakeholders Performance Domain",
    description: "PMBOK 8 Performance Domain: Engaging stakeholders effectively throughout the project lifecycle",
    category: "PMBOK Performance Domain"
  },
  {
    name: "Team Performance Domain",
    description: "PMBOK 8 Performance Domain: Building and leading high-performing project teams",
    category: "PMBOK Performance Domain"
  },
  {
    name: "Development Approach and Life Cycle Performance Domain",
    description: "PMBOK 8 Performance Domain: Selecting and adapting development approaches and life cycles",
    category: "PMBOK Performance Domain"
  },
  {
    name: "Planning Performance Domain",
    description: "PMBOK 8 Performance Domain: Developing and maintaining project plans",
    category: "PMBOK Performance Domain"
  },
  {
    name: "Project Work Performance Domain",
    description: "PMBOK 8 Performance Domain: Executing project work and managing project activities",
    category: "PMBOK Performance Domain"
  },
  {
    name: "Delivery Performance Domain",
    description: "PMBOK 8 Performance Domain: Delivering project value and outcomes",
    category: "PMBOK Performance Domain"
  },
  {
    name: "Measurement Performance Domain",
    description: "PMBOK 8 Performance Domain: Measuring project performance and progress",
    category: "PMBOK Performance Domain"
  },
  {
    name: "Uncertainty Performance Domain",
    description: "PMBOK 8 Performance Domain: Managing project uncertainty, risk, and opportunity",
    category: "PMBOK Performance Domain"
  },
]

// BABOK Underlying Competencies
const babokCompetencies: CompetencySeed[] = [
  {
    name: "Analytical Thinking & Problem Solving",
    description: "BABOK Underlying Competency: Creative thinking, decision making, learning, problem solving, and systems thinking",
    category: "BABOK Underlying Competency"
  },
  {
    name: "Behavioral Characteristics",
    description: "BABOK Underlying Competency: Ethics, personal accountability, trustworthiness, organization, and adaptability",
    category: "BABOK Underlying Competency"
  },
  {
    name: "Business Knowledge",
    description: "BABOK Underlying Competency: Business acumen, industry knowledge, organization knowledge, solution knowledge",
    category: "BABOK Underlying Competency"
  },
  {
    name: "Communication Skills",
    description: "BABOK Underlying Competency: Verbal, non-verbal, written, and listening communication",
    category: "BABOK Underlying Competency"
  },
  {
    name: "Interaction Skills",
    description: "BABOK Underlying Competency: Facilitation, leadership, negotiation, and teaching",
    category: "BABOK Underlying Competency"
  },
  {
    name: "Tools & Technology",
    description: "BABOK Underlying Competency: Business analysis tools and technology proficiency",
    category: "BABOK Underlying Competency"
  },
]

// BABOK Knowledge Areas
const babokKnowledgeAreas: CompetencySeed[] = [
  {
    name: "Business Analysis Planning & Monitoring",
    description: "BABOK Knowledge Area: Planning and monitoring business analysis activities",
    category: "BABOK Knowledge Area"
  },
  {
    name: "Elicitation & Collaboration",
    description: "BABOK Knowledge Area: Eliciting requirements and collaborating with stakeholders",
    category: "BABOK Knowledge Area"
  },
  {
    name: "Requirements Life Cycle Management",
    description: "BABOK Knowledge Area: Managing requirements throughout their lifecycle",
    category: "BABOK Knowledge Area"
  },
  {
    name: "Strategy Analysis",
    description: "BABOK Knowledge Area: Analyzing business strategy and needs",
    category: "BABOK Knowledge Area"
  },
  {
    name: "Requirements Analysis & Design Definition",
    description: "BABOK Knowledge Area: Analyzing and designing requirements and solutions",
    category: "BABOK Knowledge Area"
  },
  {
    name: "Solution Evaluation",
    description: "BABOK Knowledge Area: Evaluating solutions and their value",
    category: "BABOK Knowledge Area"
  },
]

// DMBOK Competencies
const dmbokCompetencies: CompetencySeed[] = [
  {
    name: "Data Governance",
    description: "DMBOK: Establishing data governance frameworks and policies",
    category: "DMBOK"
  },
  {
    name: "Data Architecture",
    description: "DMBOK: Designing and managing data architecture",
    category: "DMBOK"
  },
  {
    name: "Data Modeling & Design",
    description: "DMBOK: Data modeling and database design practices",
    category: "DMBOK"
  },
  {
    name: "Data Storage & Operations",
    description: "DMBOK: Managing data storage and operations",
    category: "DMBOK"
  },
  {
    name: "Data Security",
    description: "DMBOK: Implementing data security and privacy controls",
    category: "DMBOK"
  },
  {
    name: "Data Integration",
    description: "DMBOK: Integrating data across systems and platforms",
    category: "DMBOK"
  },
  {
    name: "Document & Content Management",
    description: "DMBOK: Managing documents and content",
    category: "DMBOK"
  },
  {
    name: "Reference & Master Data",
    description: "DMBOK: Managing reference and master data",
    category: "DMBOK"
  },
  {
    name: "Data Warehousing & Business Intelligence",
    description: "DMBOK: Data warehousing and BI capabilities",
    category: "DMBOK"
  },
  {
    name: "Metadata Management",
    description: "DMBOK: Managing metadata and data dictionaries",
    category: "DMBOK"
  },
  {
    name: "Data Quality",
    description: "DMBOK: Ensuring data quality and integrity",
    category: "DMBOK"
  },
]

// General Professional Competencies
const generalCompetencies: CompetencySeed[] = [
  {
    name: "Leadership",
    description: "Leading teams and driving organizational change",
    category: "Professional Competency"
  },
  {
    name: "Strategic Thinking",
    description: "Strategic planning and long-term vision",
    category: "Professional Competency"
  },
  {
    name: "Communication",
    description: "Effective verbal and written communication",
    category: "Professional Competency"
  },
  {
    name: "Negotiation",
    description: "Negotiating agreements and resolving conflicts",
    category: "Professional Competency"
  },
  {
    name: "Facilitation",
    description: "Facilitating meetings and workshops",
    category: "Professional Competency"
  },
  {
    name: "Presentation Skills",
    description: "Delivering effective presentations",
    category: "Professional Competency"
  },
  {
    name: "Time Management",
    description: "Managing time and priorities effectively",
    category: "Professional Competency"
  },
  {
    name: "Critical Thinking",
    description: "Analyzing situations and making informed decisions",
    category: "Professional Competency"
  },
]

async function seedSkills() {
  logger.info("Seeding skills...")
  
  const allSkills: SkillSeed[] = [
    ...programmingSkills,
    ...toolSkills,
    ...projectManagementSkills,
    ...businessAnalysisSkills,
    ...dataManagementSkills,
    ...additionalSkills,
  ]

  let created = 0
  let skipped = 0

  for (const skill of allSkills) {
    try {
      // Check if skill already exists
      const existing = await pool.query(
        `SELECT id FROM skills WHERE name = $1`,
        [skill.name]
      )

      if (existing.rows.length > 0) {
        skipped++
        logger.debug(`Skill already exists: ${skill.name}`)
        continue
      }

      // Insert skill
      await pool.query(
        `INSERT INTO skills (name, description, category, proficiency_levels)
         VALUES ($1, $2, $3, $4)`,
        [
          skill.name,
          skill.description,
          skill.category,
          ['beginner', 'intermediate', 'advanced', 'expert']
        ]
      )

      created++
      logger.debug(`Created skill: ${skill.name}`)
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        skipped++
        logger.debug(`Skill already exists (unique violation): ${skill.name}`)
      } else {
        logger.error(`Error creating skill ${skill.name}:`, error)
      }
    }
  }

  logger.info(`Skills seeding complete: ${created} created, ${skipped} skipped`)
  return { created, skipped }
}

async function seedCompetencies() {
  logger.info("Seeding competencies...")
  
  const allCompetencies: CompetencySeed[] = [
    ...pmbokCompetencies,
    ...babokCompetencies,
    ...babokKnowledgeAreas,
    ...dmbokCompetencies,
    ...generalCompetencies,
  ]

  let created = 0
  let skipped = 0

  for (const competency of allCompetencies) {
    try {
      // Check if competency already exists
      const existing = await pool.query(
        `SELECT id FROM competencies WHERE name = $1`,
        [competency.name]
      )

      if (existing.rows.length > 0) {
        skipped++
        logger.debug(`Competency already exists: ${competency.name}`)
        continue
      }

      // Insert competency
      await pool.query(
        `INSERT INTO competencies (name, description, category)
         VALUES ($1, $2, $3)`,
        [
          competency.name,
          competency.description,
          competency.category
        ]
      )

      created++
      logger.debug(`Created competency: ${competency.name}`)
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        skipped++
        logger.debug(`Competency already exists (unique violation): ${competency.name}`)
      } else {
        logger.error(`Error creating competency ${competency.name}:`, error)
      }
    }
  }

  logger.info(`Competencies seeding complete: ${created} created, ${skipped} skipped`)
  return { created, skipped }
}

async function seedSkillsAndCompetencies() {
  try {
    logger.info("🚀 Starting skills and competencies seeding...")

    // Connect to database
    await connectDatabase()
    
    if (!pool) {
      throw new Error("Database connection failed - pool is null")
    }

    logger.info("✅ Database connected")

    // Seed skills
    const skillsResult = await seedSkills()

    // Seed competencies
    const competenciesResult = await seedCompetencies()

    logger.info("🎉 Skills and competencies seeding completed successfully!")
    logger.info(`📊 Summary:`)
    logger.info(`   Skills: ${skillsResult.created} created, ${skillsResult.skipped} skipped`)
    logger.info(`   Competencies: ${competenciesResult.created} created, ${competenciesResult.skipped} skipped`)
    logger.info(`   Total Skills: ${skillsResult.created + skillsResult.skipped}`)
    logger.info(`   Total Competencies: ${competenciesResult.created + competenciesResult.skipped}`)

  } catch (error) {
    logger.error("❌ Skills and competencies seeding failed:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedSkillsAndCompetencies()
    .then(() => {
      logger.info("✅ Seeding script completed")
      process.exit(0)
    })
    .catch((error) => {
      logger.error("❌ Seeding script failed:", error)
      process.exit(1)
    })
}

export { seedSkillsAndCompetencies }

