import re

file_path = 'app/projects/[id]/components/project-workspace.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change component name
content = content.replace('export default function ProjectDetail({ params }: { params: { id: string } }) {', 
                          'export default function ProjectWorkspaceOrchestrator({ projectId, currentTab }: { projectId: string, currentTab?: string }) {')

# 2. Add React.lazy imports for Tabs
lazy_imports = """
import React, { Suspense } from 'react';
import { ProjectSocketRoom } from './ProjectSocketRoom';
import OverviewTabWrapper from './tabs/OverviewTabWrapper';
import DocumentsTabWrapper from './tabs/DocumentsTabWrapper';
import StakeholdersTabWrapper from './tabs/StakeholdersTabWrapper';

// Lazy loaded tabs
const ProjectContextTab = React.lazy(() => import('./ProjectContextTab').then(m => ({ default: m.ProjectContextTab })));
const ProjectExtractionTab = React.lazy(() => import('./ProjectExtractionTab').then(m => ({ default: m.ProjectExtractionTab })));
const ProjectLessonsLearnedTab = React.lazy(() => import('./ProjectLessonsLearnedTab').then(m => ({ default: m.ProjectLessonsLearnedTab })));
const PerformanceDashboard = React.lazy(() => import('./PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard })));
const ProjectPortfolioScoringTab = React.lazy(() => import('./ProjectPortfolioScoringTab').then(m => ({ default: m.ProjectPortfolioScoringTab })));
const ProjectStrategicAlignmentTab = React.lazy(() => import('./ProjectStrategicAlignmentTab').then(m => ({ default: m.ProjectStrategicAlignmentTab })));
const ProjectTeamAgreementsTab = React.lazy(() => import('./ProjectTeamAgreementsTab').then(m => ({ default: m.ProjectTeamAgreementsTab })));
const ProjectDevelopmentApproachTab = React.lazy(() => import('./ProjectDevelopmentApproachTab').then(m => ({ default: m.ProjectDevelopmentApproachTab })));
const ProjectBaselineTab = React.lazy(() => import('./ProjectBaselineTab').then(m => ({ default: m.ProjectBaselineTab })));
const ProjectPmbok6Tab = React.lazy(() => import('./ProjectPmbok6Tab').then(m => ({ default: m.ProjectPmbok6Tab })));
const ProjectFinancialsTab = React.lazy(() => import('./ProjectFinancialsTab').then(m => ({ default: m.ProjectFinancialsTab })));
const ProjectVariablesTab = React.lazy(() => import('./ProjectVariablesTab').then(m => ({ default: m.ProjectVariablesTab })));
const TimelineTab = React.lazy(() => import('./TimelineTab').then(m => ({ default: m.TimelineTab })));
const ProjectRisksTab = React.lazy(() => import('./ProjectRisksTab').then(m => ({ default: m.ProjectRisksTab })));
const ProjectIssuesTab = React.lazy(() => import('./ProjectIssuesTab').then(m => ({ default: m.ProjectIssuesTab })));
const ProjectComplianceSecurityTab = React.lazy(() => import('./ProjectComplianceSecurityTab').then(m => ({ default: m.ProjectComplianceSecurityTab })));
const ProjectIntegrationsTab = React.lazy(() => import('./ProjectIntegrationsTab').then(m => ({ default: m.ProjectIntegrationsTab })));
const ProjectDigitalTwinsTab = React.lazy(() => import('./ProjectDigitalTwinsTab').then(m => ({ default: m.ProjectDigitalTwinsTab })));
const ProjectAnalyticsDriftTab = React.lazy(() => import('./ProjectAnalyticsDriftTab').then(m => ({ default: m.ProjectAnalyticsDriftTab })));
"""

content = content.replace('import React, { useState, useEffect, useRef } from "react"', lazy_imports + '\nimport { useState, useEffect, useRef } from "react"')

# 3. Replace <OverviewTab ... /> with <OverviewTabWrapper projectId={projectId} />
content = re.sub(r'<OverviewTab[^>]+>', '<OverviewTabWrapper projectId={projectId} />', content)
content = content.replace('</OverviewTab>', '')

# 4. Replace <DocumentsTab ... /> with <DocumentsTabWrapper projectId={projectId} />
content = re.sub(r'<DocumentsTab[\s\S]*?/>', '<DocumentsTabWrapper projectId={projectId} />', content)

# 5. Replace <StakeholdersTab ... /> with <StakeholdersTabWrapper projectId={projectId} />
content = re.sub(r'<StakeholdersTab[\s\S]*?/>', '<StakeholdersTabWrapper projectId={projectId} />', content)

# 6. Remove the AnimatedLayout, Header, Sidebar wrappers
# Since it's huge, I'll just find the start of return (
#   <AnimatedLayout> and replace it with return ( <ProjectSocketRoom projectId={projectId}>
content = content.replace('<AnimatedLayout>', '<ProjectSocketRoom projectId={projectId}>')
content = content.replace('</AnimatedLayout>', '</ProjectSocketRoom>')

content = re.sub(r'<div className="flex flex-col flex-1 overflow-hidden bg-muted/30">.*?<Header />', '', content, flags=re.DOTALL)
content = re.sub(r'<Sidebar />', '', content)
content = re.sub(r'<main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">', '<main className="w-full relative">', content)

# 7. Add Suspense around all <TabsContent>
content = re.sub(r'(<TabsContent value="[^"]+"[^>]*>)', r'\1\n                  <Suspense fallback={<div>Loading tab...</div>}>', content)
content = content.replace('</TabsContent>', '                  </Suspense>\n                </TabsContent>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Transformation complete.")
