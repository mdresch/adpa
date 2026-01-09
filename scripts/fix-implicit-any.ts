/**
 * Script to automatically fix implicit 'any' type errors in TypeScript files
 * Targets common patterns like event handlers, array callbacks, and form inputs
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

interface Replacement {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const replacements: Replacement[] = [
  // React event handlers - Input onChange
  {
    pattern: /onChange=\{(\s*)\(e\)(\s*)=>/g,
    replacement: 'onChange={$1(e: React.ChangeEvent<HTMLInputElement>)$2=>',
    description: 'Input onChange handlers'
  },
  // React event handlers - Textarea onChange  
  {
    pattern: /<Textarea([^>]*?)onChange=\{(\s*)\(e: React\.ChangeEvent<HTMLInputElement>\)(\s*)=>/g,
    replacement: '<Textarea$1onChange={$2(e: React.ChangeEvent<HTMLTextAreaElement>)$3=>',
    description: 'Textarea onChange handlers (fix incorrect Input type)'
  },
  // React event handlers - Button onClick
  {
    pattern: /onClick=\{(\s*)(?:async\s+)?\(e\)(\s*)=>/g,
    replacement: 'onClick={$1async (e: React.MouseEvent)$2=>',
    description: 'Button onClick handlers'
  },
  // Form submit handlers
  {
    pattern: /onSubmit=\{(\s*)(?:async\s+)?\(e\)(\s*)=>/g,
    replacement: 'onSubmit={$1async (e: React.FormEvent)$2=>',
    description: 'Form onSubmit handlers'
  },
  // Select onValueChange
  {
    pattern: /onValueChange=\{(\s*)\(value\)(\s*)=>/g,
    replacement: 'onValueChange={$1(value: string)$2=>',
    description: 'Select onValueChange handlers'
  },
  {
    pattern: /onValueChange=\{(\s*)\(v\)(\s*)=>/g,
    replacement: 'onValueChange={$1(v: string)$2=>',
    description: 'Select onValueChange handlers (short param)'
  },
  // Switch onCheckedChange
  {
    pattern: /onCheckedChange=\{(\s*)\(checked\)(\s*)=>/g,
    replacement: 'onCheckedChange={$1(checked: boolean)$2=>',
    description: 'Switch onCheckedChange handlers'
  },
  // Dialog onOpenChange
  {
    pattern: /onOpenChange=\{(\s*)\(open\)(\s*)=>/g,
    replacement: 'onOpenChange={$1(open: boolean)$2=>',
    description: 'Dialog onOpenChange handlers'
  },
  // Array map callbacks - common patterns
  {
    pattern: /\.map\(\(item\)(\s*)=>/g,
    replacement: '.map((item: any)$1=>',
    description: 'Array map callbacks with "item" parameter'
  },
  {
    pattern: /\.map\(\(entry\)(\s*)=>/g,
    replacement: '.map((entry: any)$1=>',
    description: 'Array map callbacks with "entry" parameter'
  },
  {
    pattern: /\.map\(\(i\)(\s*)=>/g,
    replacement: '.map((i: any)$1=>',
    description: 'Array map callbacks with "i" parameter'
  },
  {
    pattern: /\.map\(\(fileId\)(\s*)=>/g,
    replacement: '.map((fileId: any)$1=>',
    description: 'Array map callbacks with "fileId" parameter'
  },
  // Filter callbacks
  {
    pattern: /\.filter\(\(item\)(\s*)=>/g,
    replacement: '.filter((item: any)$1=>',
    description: 'Array filter callbacks with "item" parameter'
  },
  {
    pattern: /\.filter\(\(entry\)(\s*)=>/g,
    replacement: '.filter((entry: any)$1=>',
    description: 'Array filter callbacks with "entry" parameter'
  }
];

async function fixFile(filePath: string): Promise<{ fixed: number; errors: string[] }> {
  const errors: string[] = [];
  let fixed = 0;

  try {
    let content = await fs.readFile(filePath, 'utf-8');
    const originalContent = content;

    for (const { pattern, replacement, description } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        if (typeof replacement === 'function') {
          content = content.replace(pattern, replacement);
        } else {
          content = content.replace(pattern, replacement);
        }
        const newMatches = originalContent.match(pattern);
        if (newMatches && newMatches.length > 0) {
          fixed += newMatches.length;
        }
      }
    }

    if (content !== originalContent) {
      await fs.writeFile(filePath, content, 'utf-8');
    }
  } catch (error) {
    errors.push(`Error processing ${filePath}: ${error}`);
  }

  return { fixed, errors };
}

async function main() {
  console.log('🔍 Finding TypeScript/TSX files...\n');

  const files = await glob('{app,components}/**/*.{ts,tsx}', {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**']
  });

  console.log(`📝 Found ${files.length} files to process\n`);

  let totalFixed = 0;
  let filesModified = 0;
  const allErrors: string[] = [];

  for (const file of files) {
    const { fixed, errors } = await fixFile(file);
    
    if (fixed > 0) {
      filesModified++;
      totalFixed += fixed;
      console.log(`✅ ${file}: Fixed ${fixed} implicit any errors`);
    }
    
    allErrors.push(...errors);
  }

  console.log(`\n✨ Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Total fixes: ${totalFixed}`);
  
  if (allErrors.length > 0) {
    console.log(`\n❌ Errors encountered:`);
    allErrors.forEach(err => console.log(`   ${err}`));
  }
}

main().catch(console.error);
