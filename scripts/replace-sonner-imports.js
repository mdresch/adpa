#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const filepath = path.join(dir, file)
    const stat = fs.statSync(filepath)
    if (stat.isDirectory()) {
      // skip node_modules and .next
      if (file === 'node_modules' || file === '.next') return
      walk(filepath, filelist)
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      filelist.push(filepath)
    }
  })
  return filelist
}

function replaceInFile(filepath) {
  let src = fs.readFileSync(filepath, 'utf8')
  let changed = false

  // Replace import from sonner
  if (/from\s+['\"]sonner['\"]/g.test(src)) {
    src = src.replace(/from\s+['\"]sonner['\"]/g, "from '@/lib/notify'")
    changed = true
  }

  // Replace jest.mock('@/lib/notify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } })) in tests
  if (/jest\.mock\(['\"]sonner['\"]\)/g.test(src)) {
    src = src.replace(/jest\.mock\(['\"]sonner['\"]\)/g, "jest.mock('@/lib/notify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }))")
    changed = true
  }

  if (changed) {
    fs.writeFileSync(filepath, src, 'utf8')
    console.log('Updated', filepath)
  }
}

const root = path.resolve(__dirname, '..')
const files = walk(root)
files.forEach(replaceInFile)
console.log('Done')
