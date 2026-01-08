#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const glob = require('glob')

function relRequire(fromFile, target) {
  let rel = path.relative(path.dirname(fromFile), target)
  if (!rel.startsWith('.')) rel = './' + rel
  return rel.replace(/\\/g, '/')
}

const repoRoot = path.resolve(__dirname, '..')
const dbTarget = path.join(repoRoot, 'src', 'lib', 'db')

const matches = glob.sync('server/**', { nodir: true, cwd: path.resolve('.') })
const files = matches.filter(f => f.endsWith('.js') || f.endsWith('.ts'))

console.log('Found', files.length, 'files to scan')

files.forEach(fileRel => {
  const filePath = path.resolve(fileRel)
  const content = fs.readFileSync(filePath, 'utf8')
  if (!content.includes('new Pool(') && !content.includes('require(\'pg\')') && !content.includes("from 'pg'") ) return
  if (filePath.includes(path.join('src','database','connection'))) return

  const backup = filePath + '.bak'
  fs.writeFileSync(backup, content, 'utf8')

  let out = content

  // Replace common require/import of pg
  out = out.replace(/const\s+\{\s*Pool\s*\}\s*=\s*require\('pg'\)/g, () => {
    const rel = relRequire(filePath, dbTarget)
    return `const db = require('${rel}')`
  })
  out = out.replace(/const\s+Pool\s*=\s*require\('pg'\)\.?Pool?/g, () => {
    const rel = relRequire(filePath, dbTarget)
    return `const db = require('${rel}')`
  })
  out = out.replace(/import\s+\{\s*Pool\s*\}\s+from\s+'pg'/g, () => {
    const rel = relRequire(filePath, dbTarget)
    return `const db = require('${rel}')`
  })

  // Replace pool.query -> db.query
  out = out.replace(/\bpool\.query\s*\(/g, 'db.query(')

  // Remove simple pool end calls (left backups)
  out = out.replace(/await\s+pool\.end\s*\(\s*\)\s*;?/g, `try { await db.end() } catch (e) {}`)

  // Add initDb if file performs queries but doesn't call init
  if (out.includes('db.query(') && !out.includes('db.initDb(')) {
    // attempt to inject after dotenv config line or at top
    if (out.includes("require('dotenv')") || out.includes('dotenv')) {
      out = out.replace(/(require\('dotenv'\)[\s\S]*?\n)/, `$1\n(async function(){ try{ await db.initDb() } catch(e){} })();\n`)
    } else {
      out = `;(async function(){ try{ await (require('${relRequire(filePath, dbTarget)}')).initDb() } catch(e){} })();\n` + out
    }
  }

  if (out !== content) {
    fs.writeFileSync(filePath, out, 'utf8')
    console.log('Patched', fileRel)
  }
})

console.log('Done. Backups saved with .bak extension for safety.')
