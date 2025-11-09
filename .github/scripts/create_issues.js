#!/usr/bin/env node
// Load .env into process.env if present (optional)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed — it's optional. If you want .env support, install dotenv.
}

const fs = require('fs').promises;
const path = require('path');

const PAYLOADS_DIR = path.join(__dirname, '..', 'ISSUE_PAYLOADS');

async function readPayloadFiles() {
  try {
    const files = await fs.readdir(PAYLOADS_DIR);
    return files.filter(f => f.endsWith('.json')).map(f => path.join(PAYLOADS_DIR, f));
  } catch (err) {
    console.error('Failed to read ISSUE_PAYLOADS directory:', err.message);
    return [];
  }
}

async function loadJson(file) {
  const content = await fs.readFile(file, 'utf8');
  return JSON.parse(content);
}

async function getExistingIssues(owner, repo, token) {
  const perPage = 100;
  let page = 1;
  const issues = [];
  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `token ${token}`, 'User-Agent': 'adpa-issue-uploader' }
    });
    if (!res.ok) {
      // Provide diagnostic info when access is forbidden
      if (res.status === 403) {
        try {
          const info = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${token}`, 'User-Agent': 'adpa-issue-uploader' }
          });
          const scopes = info.headers.get('x-oauth-scopes') || '';
          const login = info.ok ? (await info.json()).login : '(no user)';
          console.error(`403 Forbidden when listing issues. Token appears to belong to: ${login}. Scopes: ${scopes}`);
          console.error('If this is an organization repository, ensure the token is authorized for the organization (SAML SSO) and has the correct scopes (repo/public_repo).');
        } catch (e) {
          // ignore diagnostics
        }
      }
      throw new Error(`Failed to list issues: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    issues.push(...data);
    if (data.length < perPage) break;
    page++;
  }
  return issues;
}

async function createIssue(owner, repo, token, payload) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'adpa-issue-uploader'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      try {
        const info = await fetch('https://api.github.com/user', {
          headers: { Authorization: `token ${token}`, 'User-Agent': 'adpa-issue-uploader' }
        });
        const scopes = info.headers.get('x-oauth-scopes') || '';
        const login = info.ok ? (await info.json()).login : '(no user)';
        console.error(`403 Forbidden when creating issue. Token appears to belong to: ${login}. Scopes: ${scopes}`);
        console.error('Ensure the token has the required scopes (repo or public_repo) and, if using SAML SSO, it is authorized for the organization.');
      } catch (e) {
        // ignore
      }
    }
    throw new Error(`Create issue failed: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node create_issues.js <owner/repo>');
    process.exit(1);
  }
  const [ownerRepo] = args;
  const [owner, repo] = ownerRepo.split('/');
  if (!owner || !repo) {
    console.error('Invalid repo format; expected owner/repo');
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN environment variable not set. Provide a token with minimal repo:issues scope.');
    process.exit(1);
  }

  const payloadFiles = await readPayloadFiles();
  if (payloadFiles.length === 0) {
    console.log('No JSON payloads found in', PAYLOADS_DIR);
    process.exit(0);
  }

  console.log(`Found ${payloadFiles.length} payload(s). Fetching existing issues to dedupe...`);
  const existing = await getExistingIssues(owner, repo, token);
  const titles = new Set(existing.map(i => i.title));

  for (const file of payloadFiles) {
    try {
      const payload = await loadJson(file);
      const title = payload.title || payload.summary || '(no title)';
      if (titles.has(title)) {
        console.log(`Skipping already-existing issue: ${title}`);
        continue;
      }
      console.log(`Creating issue: ${title}`);
      const created = await createIssue(owner, repo, token, payload);
      console.log(`Created: #${created.number} ${created.title}`);
      titles.add(created.title);
    } catch (err) {
      console.error('Error processing', file, err.message);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
