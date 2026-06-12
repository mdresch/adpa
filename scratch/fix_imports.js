const fs = require('fs');
const filePath = 'app/projects/[id]/components/project-workspace.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const tabs = [
  'ProjectContextTab', 'ProjectExtractionTab', 'ProjectLessonsLearnedTab',
  'PerformanceDashboard', 'ProjectPortfolioScoringTab', 'ProjectStrategicAlignmentTab',
  'ProjectTeamAgreementsTab', 'ProjectDevelopmentApproachTab', 'ProjectBaselineTab',
  'ProjectPmbok6Tab', 'ProjectFinancialsTab', 'ProjectVariablesTab', 'TimelineTab',
  'ProjectRisksTab', 'ProjectIssuesTab', 'ProjectComplianceSecurityTab', 'ProjectIntegrationsTab',
  'ProjectDigitalTwinsTab', 'ProjectAnalyticsDriftTab'
];

for (const tab of tabs) {
  const regex = new RegExp(`import\\s+\\{?\\s*${tab}\\s*\\}?\\s+from\\s+['"][^'"]+['"];?\\n?`, 'g');
  content = content.replace(regex, '');
}

// Remove OverviewTab, DocumentsTab, StakeholdersTab if they were not removed correctly
content = content.replace(/import\s+\{?\s*OverviewTab\s*\}?\s+from\s+['"][^'"]+['"];?\n?/g, '');
content = content.replace(/import\s+\{?\s*DocumentsTab\s*\}?\s+from\s+['"][^'"]+['"];?\n?/g, '');
content = content.replace(/import\s+\{?\s*StakeholdersTab\s*\}?\s+from\s+['"][^'"]+['"];?\n?/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Imports fixed.");
