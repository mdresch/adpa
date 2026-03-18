
import * as fs from 'fs';
import * as path from 'path';

async function testImports() {
  const serverPath = 'd:/Source/adpa/server/src/server.ts';
  const content = fs.readFileSync(serverPath, 'utf8');
  
  const importRegex = /import\s+(?:(\w+)|\{(\s*\w+\s*(?:,\s*\w+\s*)*)\})\s+from\s+["'](.+?)["']/g;
  let match;
  
  const results: any[] = [];
  
  while ((match = importRegex.exec(content)) !== null) {
    const defaultImport = match[1];
    const namedImports = match[2];
    const importPath = match[3];
    
    if (!importPath.startsWith('.') || importPath.includes('middleware') || importPath.includes('utils')) continue;
    
    let fullPath = path.resolve('d:/Source/adpa/server/src', importPath);
    if (!fs.existsSync(fullPath) && !fs.existsSync(fullPath + '.ts') && !fs.existsSync(fullPath + '/index.ts')) {
        continue;
    }

    try {
      const module = require(fullPath);
      const res: any = { path: importPath };
      
      if (defaultImport) {
        const val = module.default;
        res.default = { type: typeof val, isArray: Array.isArray(val) };
      }
      if (namedImports) {
        const names = namedImports.split(',').map(n => n.trim());
        res.named = {};
        for (const name of names) {
          const val = module[name];
          res.named[name] = { type: typeof val, isArray: Array.isArray(val) };
        }
      }
      results.push(res);
    } catch (err) {
      results.push({ path: importPath, error: err.message });
    }
  }
  
  fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
  console.log('Results written to test_results.json');
  process.exit(0);
}

testImports();
