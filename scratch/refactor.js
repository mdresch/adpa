const fs = require('fs');

const filePath = 'app/projects/[id]/components/project-workspace.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change component name
content = content.replace('export default function ProjectDetail({ params }: { params: { id: string } }) {', 
  'export default function ProjectWorkspaceOrchestrator({ projectId }: { projectId: string }) {\n  const resolvedSearchParams = { tab: \'overview\' }; // mock');

// Also remove React.use(params) since we pass projectId directly
content = content.replace(/const resolvedParams = React\.use\(params\)\n/, '');
content = content.replace(/const resolvedSearchParams = React\.use\(searchParams\)\n/, '');
content = content.replace(/const projectId = resolvedParams\.id\n/, '');

// 2. Add React.lazy imports for Tabs
const lazy_imports = `
import React, { Suspense } from 'react';
import { ProjectSocketRoom } from './ProjectSocketRoom';
import OverviewTabWrapper from './tabs/OverviewTabWrapper';
import DocumentsTabWrapper from './tabs/DocumentsTabWrapper';
import StakeholdersTabWrapper from './tabs/StakeholdersTabWrapper';

// Lazy loaded tabs
const ProjectContextTab = React.lazy(() => import('../ProjectContextTab').then(m => ({ default: m.ProjectContextTab })));
const ProjectExtractionTab = React.lazy(() => import('../ProjectExtractionTab').then(m => ({ default: m.ProjectExtractionTab })));
const ProjectLessonsLearnedTab = React.lazy(() => import('../ProjectLessonsLearnedTab').then(m => ({ default: m.ProjectLessonsLearnedTab })));
const PerformanceDashboard = React.lazy(() => import('@/components/project/PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard })));
const ProjectPortfolioScoringTab = React.lazy(() => import('../ProjectPortfolioScoringTab').then(m => ({ default: m.ProjectPortfolioScoringTab })));
const ProjectStrategicAlignmentTab = React.lazy(() => import('../ProjectStrategicAlignmentTab').then(m => ({ default: m.ProjectStrategicAlignmentTab })));
const TeamAgreementsTab = React.lazy(() => import('./TeamAgreementsTab').then(m => ({ default: m.TeamAgreementsTab })));
const DevelopmentApproachTab = React.lazy(() => import('./DevelopmentApproachTab').then(m => ({ default: m.DevelopmentApproachTab })));
const BaselineManagement = React.lazy(() => import('./BaselineManagement').then(m => ({ default: m.BaselineManagement })));
const ProjectPmbok6Tab = React.lazy(() => import('../ProjectPmbok6Tab').then(m => ({ default: m.ProjectPmbok6Tab })));
const ProjectFinancialsTab = React.lazy(() => import('../ProjectFinancialsTab').then(m => ({ default: m.ProjectFinancialsTab })));
const VariablesTab = React.lazy(() => import('../VariablesTab').then(m => ({ default: m.VariablesTab })));
const TimelineTab = React.lazy(() => import('../TimelineTab').then(m => ({ default: m.TimelineTab })));
const ProjectRisksTab = React.lazy(() => import('../ProjectRisksTab').then(m => ({ default: m.ProjectRisksTab })));
const ProjectIssuesTab = React.lazy(() => import('../ProjectIssuesTab').then(m => ({ default: m.ProjectIssuesTab })));
const ComplianceSecurityTab = React.lazy(() => import('../ComplianceSecurityTab').then(m => ({ default: m.ComplianceSecurityTab })));
const IntegrationsTab = React.lazy(() => import('../IntegrationsTab').then(m => ({ default: m.IntegrationsTab })));
const DigitalTwinAnalyticsTab = React.lazy(() => import('../DigitalTwinAnalyticsTab').then(m => ({ default: m.DigitalTwinAnalyticsTab })));
`;

content = content.replace('import * as React from "react"', lazy_imports + '\nimport { useState, useEffect, useRef } from "react"');

// 3. Replace <OverviewTab ... /> with <OverviewTabWrapper projectId={projectId} />
content = content.replace(/<OverviewTab[\s\S]*?\/>/, '<OverviewTabWrapper projectId={projectId} />');

// 4. Replace <DocumentsTab ... /> with <DocumentsTabWrapper projectId={projectId} />
content = content.replace(/<DocumentsTab[\s\S]*?\/>/, '<DocumentsTabWrapper projectId={projectId} />');

// 5. Replace <StakeholdersTab ... /> with <StakeholdersTabWrapper projectId={projectId} />
content = content.replace(/<StakeholdersTab[\s\S]*?\/>/, '<StakeholdersTabWrapper projectId={projectId} />');

// 6. Fix the return layout wrappers
// Main return
content = content.replace(
  /<div className="flex h-screen bg-background">\s*<Sidebar \/>\s*<div className="flex-1 flex flex-col overflow-hidden">\s*<Header \/>\s*<main className="flex-1 overflow-y-auto p-6">\s*<AnimatedLayout className="space-y-6">/,
  '<ProjectSocketRoom projectId={projectId}>\n            <div className="space-y-6 w-full relative">'
);

// Invalid Project error return
content = content.replace(
  /<div className="flex h-screen bg-background">\s*<Sidebar \/>\s*<div className="flex-1 flex flex-col overflow-hidden">\s*<Header title=\{project\?\.name \|\| "Project Dashboard"\} \/>\s*<main className="flex-1 flex items-center justify-center">/g,
  '<div className="w-full flex items-center justify-center">'
);
content = content.replace(
  /<\/div>\n          <\/main>\n        <\/div>\n      <\/div>\n    \)\n  \}\n\n  if \(loading\)/,
  '</div>\n      </div>\n    )\n  }\n\n  if (loading)'
);

// Loading state return
content = content.replace(
  /<div className="flex h-screen bg-background">\s*<Sidebar \/>\s*<div className="flex-1 flex flex-col overflow-hidden">\s*<Header title="Loading project\.\.\." \/>\s*<main className="flex-1 overflow-y-auto p-6">/g,
  '<div className="w-full">'
);
content = content.replace(
  /<\/div>\n          <\/div>\n        <\/main>\n      <\/div>\n    <\/div>\n    \)\n  \}\n\n  if \(\!project\)/,
  '</div>\n        </div>\n      </div>\n    )\n  }\n\n  if (!project)'
);

// Failed to load error return
content = content.replace(
  /<div className="flex h-screen bg-background">\s*<Sidebar \/>\s*<div className="flex-1 flex flex-col overflow-hidden">\s*<Header title="Project Dashboard" \/>\s*<main className="flex-1 flex items-center justify-center">/g,
  '<div className="w-full flex items-center justify-center">'
);
content = content.replace(
  /<\/div>\n            <\/div>\n          <\/main>\n        <\/div>\n      <\/div>\n    \)\n  \}\n\n  const progress/,
  '</div>\n          </div>\n        </div>\n    )\n  }\n\n  const progress'
);


// Fix the end of the main return statement:
// </AnimatedLayout>
// </main>
// </div>
// {/* Smart Document Versioning - Template Conflict Dialog */}
// ...
// </div>
// )

content = content.replace(
  /<\/AnimatedLayout>\s*<\/main>\s*<\/div>/,
  '  </div>\n            </ProjectSocketRoom>'
);

// At the very end of the file, there is a final </div> that matched the outermost div.
// Replace `</div>\n  )\n}` with `<>\n  )\n}` and add `<>` right after `return (` to wrap the ProjectSocketRoom and the Dialog.
content = content.replace(/return \(\s*<ProjectSocketRoom/, 'return (\n    <>\n      <ProjectSocketRoom');
content = content.replace(/<\/div>\s*\)\s*\}\s*$/, '    </>\n  )\n}');

// 7. Add Suspense around all <TabsContent>
content = content.replace(/(<TabsContent value="[^"]+"[^>]*>)/g, '$1\n                  <Suspense fallback={<div>Loading tab...</div>}>');
content = content.replace(/<\/TabsContent>/g, '                  </Suspense>\n                </TabsContent>');

// 8. Remove the old unused imports
content = content.replace(/import \{ OverviewTab \}.*?\n/, '');
content = content.replace(/import \{ DocumentsTab \}.*?\n/, '');
content = content.replace(/import \{ StakeholdersTab \}.*?\n/, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Refactoring complete.");
