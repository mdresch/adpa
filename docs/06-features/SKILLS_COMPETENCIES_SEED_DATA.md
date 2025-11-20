# Skills and Competencies Seed Data

## Overview

This document describes the comprehensive seed data for Skills and Competencies that populates the ADPA database. The seed script ensures that the majority of skills and competencies mentioned in projects as required are available in the system.

## Seed Script Location

- **TypeScript**: `server/src/database/seed-skills-competencies.ts`
- **PowerShell**: `server/scripts/seed-skills-competencies.ps1`
- **NPM Script**: `npm run seed:skills` (root) or `cd server && npm run seed:skills`

## Running the Seed Script

### Option 1: Using NPM (Recommended)
```bash
# From project root
npm run seed:skills

# Or from server directory
cd server
npm run seed:skills
```

### Option 2: Using PowerShell Script
```powershell
.\server\scripts\seed-skills-competencies.ps1
```

### Option 3: Direct TypeScript Execution
```bash
cd server
npx tsx src/database/seed-skills-competencies.ts
```

## Skills Catalog (Total: ~80+ Skills)

### Programming Languages (13 skills)
- JavaScript
- TypeScript
- Python
- Java
- C#
- SQL
- HTML/CSS
- React
- Node.js
- Next.js
- Express.js
- Vue.js
- Angular

### Tools & Platforms (20+ skills)
- Microsoft Excel
- Microsoft Project
- Jira
- Confluence
- SharePoint
- Git
- GitHub
- Azure DevOps
- Docker
- Kubernetes
- AWS
- Azure
- Google Cloud
- PostgreSQL
- MySQL
- MongoDB
- Redis
- Power BI
- Tableau
- Puppeteer
- Puppeteer PDF
- REST API
- GraphQL
- JSON
- Markdown
- Word
- PowerPoint
- Visio
- Lucidchart
- Figma
- Adobe Acrobat
- PDF Generation
- Document Generation
- API Integration
- Web Scraping
- Test Automation
- CI/CD
- Linux
- Windows Server
- Network Administration
- Security
- Cybersecurity

### Project Management Skills (13 skills)
- Agile Scrum
- Agile Kanban
- Waterfall
- Hybrid Methodology
- Earned Value Management
- Risk Management
- Stakeholder Management
- Resource Management
- Budget Management
- Schedule Management
- Quality Management
- Change Management
- Scope Management

### Business Analysis Skills (8 skills)
- Requirements Elicitation
- Process Modeling
- Data Modeling
- Use Case Development
- User Story Writing
- Business Process Improvement
- Gap Analysis
- Stakeholder Analysis

### Data Management Skills (7 skills)
- Data Governance
- Data Quality
- Data Modeling
- ETL
- Data Warehousing
- Data Analytics
- Data Visualization

## Competencies Catalog (Total: ~30+ Competencies)

### PMBOK 8 Performance Domains (8 competencies)
1. **Stakeholders Performance Domain** - Engaging stakeholders effectively throughout the project lifecycle
2. **Team Performance Domain** - Building and leading high-performing project teams
3. **Development Approach and Life Cycle Performance Domain** - Selecting and adapting development approaches and life cycles
4. **Planning Performance Domain** - Developing and maintaining project plans
5. **Project Work Performance Domain** - Executing project work and managing project activities
6. **Delivery Performance Domain** - Delivering project value and outcomes
7. **Measurement Performance Domain** - Measuring project performance and progress
8. **Uncertainty Performance Domain** - Managing project uncertainty, risk, and opportunity

### BABOK Underlying Competencies (6 competencies)
1. **Analytical Thinking & Problem Solving** - Creative thinking, decision making, learning, problem solving, and systems thinking
2. **Behavioral Characteristics** - Ethics, personal accountability, trustworthiness, organization, and adaptability
3. **Business Knowledge** - Business acumen, industry knowledge, organization knowledge, solution knowledge
4. **Communication Skills** - Verbal, non-verbal, written, and listening communication
5. **Interaction Skills** - Facilitation, leadership, negotiation, and teaching
6. **Tools & Technology** - Business analysis tools and technology proficiency

### BABOK Knowledge Areas (6 competencies)
1. **Business Analysis Planning & Monitoring** - Planning and monitoring business analysis activities
2. **Elicitation & Collaboration** - Eliciting requirements and collaborating with stakeholders
3. **Requirements Life Cycle Management** - Managing requirements throughout their lifecycle
4. **Strategy Analysis** - Analyzing business strategy and needs
5. **Requirements Analysis & Design Definition** - Analyzing and designing requirements and solutions
6. **Solution Evaluation** - Evaluating solutions and their value

### DMBOK Competencies (11 competencies)
1. **Data Governance** - Establishing data governance frameworks and policies
2. **Data Architecture** - Designing and managing data architecture
3. **Data Modeling & Design** - Data modeling and database design practices
4. **Data Storage & Operations** - Managing data storage and operations
5. **Data Security** - Implementing data security and privacy controls
6. **Data Integration** - Integrating data across systems and platforms
7. **Document & Content Management** - Managing documents and content
8. **Reference & Master Data** - Managing reference and master data
9. **Data Warehousing & Business Intelligence** - Data warehousing and BI capabilities
10. **Metadata Management** - Managing metadata and data dictionaries
11. **Data Quality** - Ensuring data quality and integrity

### General Professional Competencies (8 competencies)
1. **Leadership** - Leading teams and driving organizational change
2. **Strategic Thinking** - Strategic planning and long-term vision
3. **Communication** - Effective verbal and written communication
4. **Negotiation** - Negotiating agreements and resolving conflicts
5. **Facilitation** - Facilitating meetings and workshops
6. **Presentation Skills** - Delivering effective presentations
7. **Time Management** - Managing time and priorities effectively
8. **Critical Thinking** - Analyzing situations and making informed decisions

## Coverage Summary

### Skills Coverage
- ✅ **Technical Skills**: Programming languages, frameworks, tools
- ✅ **Project Management Tools**: Jira, MS Project, Confluence, SharePoint
- ✅ **Development Tools**: Git, GitHub, Docker, CI/CD
- ✅ **Cloud Platforms**: AWS, Azure, Google Cloud
- ✅ **Databases**: PostgreSQL, MySQL, MongoDB, Redis
- ✅ **Methodologies**: Agile, Scrum, Kanban, Waterfall
- ✅ **PM Skills**: EVM, Risk, Stakeholder, Resource, Budget, Schedule, Quality, Change, Scope Management
- ✅ **BA Skills**: Requirements, Process Modeling, Use Cases, User Stories
- ✅ **Data Skills**: Data Governance, Quality, Modeling, ETL, Analytics, Visualization

### Competencies Coverage
- ✅ **PMBOK 8**: All 8 Performance Domains
- ✅ **BABOK**: All 6 Underlying Competencies + All 6 Knowledge Areas
- ✅ **DMBOK**: 11 core data management competencies
- ✅ **Professional**: Leadership, Strategic Thinking, Communication, etc.

## Integration with seed-all.ts

The skills and competencies seeding is automatically included in the full database seeding process:

```typescript
// server/src/database/seed-all.ts
await seedSkillsAndCompetencies()  // Step 3
```

This ensures that when setting up a new environment, skills and competencies are populated automatically.

## Data Quality

### Skills
- All skills are **tool/technology-specific**
- All skills are **demonstrable** (can be tested/verified)
- All skills have **proficiency levels**: beginner, intermediate, advanced, expert
- Skills are **categorized** for easy filtering

### Competencies
- All competencies are **framework-aligned** (PMBOK, BABOK, DMBOK)
- All competencies are **behavioral/professional** in nature
- All competencies have **descriptions** explaining their scope
- Competencies are **categorized** by framework

## Usage After Seeding

Once seeded, you can:

1. **Assign Skills to Roles**: Go to `/app/roles` and assign required skills to each role
2. **Assign Competencies to Roles**: Assign required competencies to roles
3. **Assign Skills to Stakeholders**: In stakeholder detail dialog → Skills tab
4. **Assign Competencies to Stakeholders**: In stakeholder detail dialog → Competencies tab
5. **Match Stakeholders to Roles**: Use the "Check Match" feature to see skill/competency alignment

## Maintenance

### Adding New Skills
Edit `server/src/database/seed-skills-competencies.ts` and add to the appropriate category array:
- `programmingSkills`
- `toolSkills`
- `projectManagementSkills`
- `businessAnalysisSkills`
- `dataManagementSkills`
- `additionalSkills`

### Adding New Competencies
Edit `server/src/database/seed-skills-competencies.ts` and add to the appropriate category array:
- `pmbokCompetencies`
- `babokCompetencies`
- `babokKnowledgeAreas`
- `dmbokCompetencies`
- `generalCompetencies`

Then re-run the seed script. The script uses `ON CONFLICT` handling, so existing entries won't be duplicated.

## Verification

After running the seed script, verify the data:

```sql
-- Check skills count
SELECT category, COUNT(*) as count 
FROM skills 
GROUP BY category 
ORDER BY count DESC;

-- Check competencies count
SELECT category, COUNT(*) as count 
FROM competencies 
GROUP BY category 
ORDER BY count DESC;

-- View all skills
SELECT name, category, description 
FROM skills 
ORDER BY category, name;

-- View all competencies
SELECT name, category, description 
FROM competencies 
ORDER BY category, name;
```

## Expected Results

After successful seeding:
- **~80+ Skills** across multiple categories
- **~30+ Competencies** covering PMBOK, BABOK, DMBOK, and professional competencies
- All entries have proper descriptions and categories
- No duplicates (handled by unique constraints)

## Notes

- The seed script is **idempotent** - safe to run multiple times
- Existing entries are **skipped** (not overwritten)
- New entries are **created** if they don't exist
- The script logs all operations for debugging

