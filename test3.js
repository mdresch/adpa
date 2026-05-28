const str = '`json\n######## budget_baseline: {"total": 1}\n`'; console.log(str.replace(/`(?:json|markdown|md)?\n(#{8}\s+[a-zA-Z0-9_-]+:[\s\S]*?)\n`/g, '$1'));
