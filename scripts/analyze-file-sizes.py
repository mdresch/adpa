import os

files = {
    'page.tsx': r'app\projects\[id]\page.tsx',
    'BaselineManagement': r'app\projects\[id]\components\BaselineManagement.tsx',
    'StakeholdersTab': r'app\projects\[id]\components\StakeholdersTab.tsx',
    'VariablesTab': r'app\projects\[id]\components\VariablesTab.tsx',
    'TimelineTab': r'app\projects\[id]\components\TimelineTab.tsx',
    'OverviewTab': r'app\projects\[id]\components\OverviewTab.tsx',
    'DocumentsTab': r'app\projects\[id]\components\DocumentsTab.tsx'
}

print('Current File Sizes:')
print('=' * 60)
total_lines = 0
needs_work = []
optimal = []

for name, path in files.items():
    if os.path.exists(path):
        lines = len(open(path, 'r', encoding='utf-8').readlines())
        total_lines += lines
        status = 'OK' if lines <= 500 else 'WARN' if lines <= 800 else 'SPLIT'
        label = '[OPTIMAL]' if lines <= 500 else '[ACCEPTABLE]' if lines <= 800 else '[NEEDS SPLIT]'
        print(f'[{status:5}] {name:20} {lines:5} lines  {label}')
        
        if lines > 500:
            needs_work.append((name, lines))
        else:
            optimal.append((name, lines))

print('=' * 60)
print(f'Total lines: {total_lines}')
print(f'Optimal files (≤500 lines): {len(optimal)}')
print(f'Files needing work: {len(needs_work)}')

if needs_work:
    print('\nFiles to refactor:')
    for name, lines in needs_work:
        print(f'  - {name}: {lines} lines')

