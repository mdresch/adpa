const match = '######## stakeholders: {"name": "test"}'.trim().match(/^########\s+([a-zA-Z0-9_-]+):\s*(.+)$/); console.log(match);
