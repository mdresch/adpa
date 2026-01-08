const fs = require('fs')
const glob = require('glob')

const files = glob.sync('server/**', { nodir: true, cwd: '.' }).filter(f => f.endsWith('.js') || f.endsWith('.ts'))

files.forEach(rel => {
  const p = require('path').resolve(rel)
  let s = fs.readFileSync(p, 'utf8')
  const iifeRegex = /;\(async function\(\)\{ try\{ await \(require\((['"])(.+?)\1\)\)\.initDb\(\) } catch\(e\)\{\} \)\(\);/g
  let m
  let changed = false
  while ((m = iifeRegex.exec(s)) !== null) {
    const reqPath = m[2]
    // skip if file already has const db
    if (/const\s+db\s*=/.test(s) || /import\s+db\s+from/.test(s)) continue
    const replacement = `const db = require('${reqPath}');\n;(async function(){ try{ await db.initDb() } catch(e){} })();`
    s = s.slice(0, m.index) + replacement + s.slice(m.index + m[0].length)
    changed = true
  }
  if (changed) {
    fs.writeFileSync(p, s, 'utf8')
    console.log('Fixed', rel)
  }
})

console.log('Done')
