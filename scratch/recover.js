const { execSync } = require('child_process');
const fs = require('fs');

try {
  const originalContent = execSync('git show HEAD:"app/projects/[id]/page.tsx"').toString();
  fs.writeFileSync('app/projects/[id]/components/project-workspace.tsx', originalContent, 'utf8');
  console.log("Copied from HEAD!");
} catch (e) {
  console.error("Failed", e.message);
}
