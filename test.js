const md = require('markdown-it')(); const tokens = md.parse('######## stakeholders: {"name": "test"}', {}); console.dir(tokens, {depth: null});
