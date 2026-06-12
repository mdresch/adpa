const fs = require('fs');
const filePath = 'app/projects/[id]/components/project-workspace.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the multiline signature
content = content.replace(/export default function ProjectDetail\([\s\S]*?\}\) \{/, 
  'export default function ProjectWorkspaceOrchestrator({ projectId }: { projectId: string }) {\n  // Create mock searchParams since we don\'t have them readily available in the wrapper component yet\n  const resolvedSearchParams = { tab: \'overview\' };\n');

// Also need to remove the React.use() calls
content = content.replace(/const resolvedParams = React\.use\(params\)/, '');
content = content.replace(/const resolvedSearchParams = React\.use\(searchParams\)/, '');
content = content.replace(/const projectId = resolvedParams\.id/, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Signature fixed.");
