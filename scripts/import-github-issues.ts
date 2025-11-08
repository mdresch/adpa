#!/usr/bin/env tsx
/**
 * GitHub Issues Importer
 * 
 * Programmatically imports roadmap tasks to GitHub Issues using the GitHub REST API.
 * Uses the ROADMAP_TASKS_EXTRACTED.json file as the data source.
 * 
 * Prerequisites:
 * - GitHub Personal Access Token with 'repo' scope
 * - Set as environment variable: GITHUB_TOKEN=ghp_xxxxx
 * 
 * Usage:
 *   npm run import-issues -- --batch sprint-1
 *   npm run import-issues -- --priority high --status planned
 *   npm run import-issues -- --dry-run
 */

import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  effort?: string;
  labels: string[];
  source: string;
  section?: string;
}

interface TaskData {
  metadata: {
    generated: string;
    totalTasks: number;
    statistics: Record<string, any>;
  };
  tasks: Task[];
}

interface ImportOptions {
  batch?: string;
  priority?: string;
  status?: string;
  limit?: number;
  dryRun?: boolean;
  labels?: string[];
  milestone?: string;
  assignee?: string;
}

class GitHubIssuesImporter {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private tasksData: TaskData;

  constructor() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    this.octokit = new Octokit({ auth: token });
    
    // Extract from git config or use defaults
    this.owner = process.env.GITHUB_OWNER || 'mdresch';
    this.repo = process.env.GITHUB_REPO || 'adpa';

    // Load tasks data
    const dataPath = path.join(process.cwd(), 'docs/roadmap/ROADMAP_TASKS_EXTRACTED.json');
    this.tasksData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    console.log(`✓ Loaded ${this.tasksData.metadata.totalTasks} tasks from data file`);
  }

  /**
   * Filter tasks based on import options
   */
  private filterTasks(options: ImportOptions): Task[] {
    let filtered = [...this.tasksData.tasks];

    // Batch filters (predefined task sets)
    if (options.batch) {
      filtered = this.applyBatchFilter(filtered, options.batch);
    }

    // Priority filter
    if (options.priority) {
      const priorities = options.priority.split(',').map(p => p.trim().toLowerCase());
      filtered = filtered.filter(task => 
        priorities.includes(task.priority.toLowerCase())
      );
    }

    // Status filter
    if (options.status) {
      const statuses = options.status.split(',').map(s => s.trim().toLowerCase());
      filtered = filtered.filter(task => 
        statuses.includes(task.status.toLowerCase())
      );
    }

    // Label filter
    if (options.labels && options.labels.length > 0) {
      filtered = filtered.filter(task =>
        task.labels.some(label => options.labels!.includes(label))
      );
    }

    // Limit results
    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Apply predefined batch filters
   */
  private applyBatchFilter(tasks: Task[], batch: string): Task[] {
    const batchFilters: Record<string, (task: Task) => boolean> = {
      'sprint-1': (task) => 
        task.priority.toLowerCase() === 'high' &&
        task.status.toLowerCase() === 'planned' &&
        (task.labels.includes('documentation') || 
         task.labels.includes('backend') ||
         task.labels.includes('frontend')),
      
      'critical-high': (task) =>
        ['critical', 'high'].includes(task.priority.toLowerCase()) &&
        task.status.toLowerCase() === 'planned',
      
      'entity-types': (task) =>
        task.labels.includes('entity-types') &&
        task.status.toLowerCase() === 'planned',
      
      'portfolio': (task) =>
        task.labels.includes('portfolio-management') &&
        task.status.toLowerCase() === 'planned',
      
      'ai-search': (task) =>
        (task.labels.includes('ai') || task.labels.includes('search')) &&
        task.status.toLowerCase() === 'planned',
      
      'baseline': (task) =>
        task.labels.includes('baseline-management') &&
        task.status.toLowerCase() === 'planned',
      
      'testing': (task) =>
        task.labels.includes('testing') &&
        task.status.toLowerCase() === 'planned',
    };

    const filter = batchFilters[batch];
    if (!filter) {
      console.warn(`⚠ Unknown batch: ${batch}. Available batches: ${Object.keys(batchFilters).join(', ')}`);
      return tasks;
    }

    return tasks.filter(filter);
  }

  /**
   * Create a single GitHub issue
   */
  private async createIssue(task: Task, options: ImportOptions): Promise<void> {
    const body = this.formatIssueBody(task);
    const labels = this.formatLabels(task, options);

    const issueData = {
      owner: this.owner,
      repo: this.repo,
      title: task.title,
      body,
      labels,
      ...(options.milestone && { milestone: parseInt(options.milestone) }),
      ...(options.assignee && { assignees: [options.assignee] }),
    };

    if (options.dryRun) {
      console.log(`[DRY RUN] Would create issue:`, {
        id: task.id,
        title: task.title,
        labels: labels.join(', '),
      });
      return;
    }

    try {
      const response = await this.octokit.issues.create(issueData);
      console.log(`✓ Created issue #${response.data.number}: ${task.title} (${task.id})`);
    } catch (error: any) {
      console.error(`✗ Failed to create ${task.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format issue body with metadata
   */
  private formatIssueBody(task: Task): string {
    let body = `## Task Details\n\n`;
    body += `**Task ID**: \`${task.id}\`\n`;
    body += `**Source**: ${task.source}\n`;
    if (task.section) {
      body += `**Section**: ${task.section}\n`;
    }
    body += `**Priority**: ${task.priority}\n`;
    body += `**Status**: ${task.status}\n`;
    if (task.effort) {
      body += `**Effort Estimate**: ${task.effort}\n`;
    }
    body += `\n---\n\n`;
    body += `## Description\n\n`;
    body += task.description || '_No description provided_';
    body += `\n\n---\n\n`;
    body += `## Acceptance Criteria\n\n`;
    body += `- [ ] Task implementation complete\n`;
    body += `- [ ] Tests written and passing\n`;
    body += `- [ ] Documentation updated\n`;
    body += `- [ ] Code reviewed and approved\n`;
    body += `\n---\n\n`;
    body += `_Generated from ADPA Roadmap Task Extraction_\n`;
    body += `_Source file: \`docs/roadmap/${task.source}\`_\n`;

    return body;
  }

  /**
   * Format labels for GitHub
   */
  private formatLabels(task: Task, options: ImportOptions): string[] {
    const labels = new Set<string>();

    // Add task labels
    task.labels.forEach(label => labels.add(label));

    // Add priority as label
    labels.add(task.priority.toLowerCase());

    // Add status as label
    labels.add(`status:${task.status.toLowerCase()}`);

    // Add roadmap label
    labels.add('roadmap');

    // Add custom labels from options
    if (options.labels && options.labels.length > 0) {
      options.labels.forEach(label => labels.add(label));
    }

    return Array.from(labels);
  }

  /**
   * Import multiple issues with rate limiting
   */
  async importIssues(options: ImportOptions): Promise<void> {
    const tasks = this.filterTasks(options);

    console.log(`\n📋 Import Summary:`);
    console.log(`   Total tasks in file: ${this.tasksData.metadata.totalTasks}`);
    console.log(`   Filtered tasks: ${tasks.length}`);
    console.log(`   Target repository: ${this.owner}/${this.repo}`);
    console.log(`   Dry run: ${options.dryRun ? 'YES' : 'NO'}\n`);

    if (tasks.length === 0) {
      console.log('⚠ No tasks match the specified filters.');
      return;
    }

    if (!options.dryRun) {
      console.log(`⚠ This will create ${tasks.length} GitHub issues.`);
      console.log(`   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const batchSize = 10; // GitHub API rate limit consideration
    const delayMs = 1000; // 1 second between batches

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)} (${batch.length} tasks)...`);

      // Process batch in parallel
      await Promise.all(
        batch.map(task => this.createIssue(task, options))
      );

      // Rate limiting delay between batches
      if (i + batchSize < tasks.length) {
        console.log(`   ⏱ Waiting ${delayMs / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log(`\n✅ Import complete! Created ${tasks.length} issues.`);
  }

  /**
   * Show statistics about available tasks
   */
  showStatistics(): void {
    const stats = this.tasksData.metadata.statistics;

    console.log(`\n📊 Task Statistics:\n`);
    
    console.log(`By Status:`);
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log(`\nBy Priority:`);
    Object.entries(stats.byPriority).forEach(([priority, count]) => {
      console.log(`   ${priority}: ${count}`);
    });

    console.log(`\nBy Label:`);
    Object.entries(stats.byLabel)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .forEach(([label, count]) => {
        console.log(`   ${label}: ${count}`);
      });

    console.log(`\nAvailable Batches:`);
    console.log(`   sprint-1: Core features (high priority, planned)`);
    console.log(`   critical-high: Critical and high priority tasks`);
    console.log(`   entity-types: Entity type development`);
    console.log(`   portfolio: Portfolio management features`);
    console.log(`   ai-search: AI and search features`);
    console.log(`   baseline: Baseline management`);
    console.log(`   testing: Testing tasks`);
  }
}

// CLI Argument Parsing
function parseArgs(): ImportOptions & { help?: boolean; stats?: boolean } {
  const args = process.argv.slice(2);
  const options: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--stats') {
      options.stats = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--batch' && i + 1 < args.length) {
      options.batch = args[++i];
    } else if (arg === '--priority' && i + 1 < args.length) {
      options.priority = args[++i];
    } else if (arg === '--status' && i + 1 < args.length) {
      options.status = args[++i];
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[++i]);
    } else if (arg === '--labels' && i + 1 < args.length) {
      options.labels = args[++i].split(',').map(l => l.trim());
    } else if (arg === '--milestone' && i + 1 < args.length) {
      options.milestone = args[++i];
    } else if (arg === '--assignee' && i + 1 < args.length) {
      options.assignee = args[++i];
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
GitHub Issues Importer - ADPA Roadmap Tasks

Usage:
  npm run import-issues -- [options]

Options:
  --help, -h              Show this help message
  --stats                 Show task statistics only (no import)
  --dry-run              Preview what would be created without creating issues
  
  --batch <name>         Import predefined batch of tasks
                         Available: sprint-1, critical-high, entity-types, 
                                   portfolio, ai-search, baseline, testing
  
  --priority <level>     Filter by priority (comma-separated)
                         Values: high, medium, low
  
  --status <status>      Filter by status (comma-separated)
                         Values: planned, completed, backlog
  
  --labels <labels>      Filter by labels (comma-separated)
                         Values: documentation, ai, testing, backend, frontend, etc.
  
  --limit <number>       Limit number of issues to create
  
  --milestone <id>       Assign issues to milestone (milestone number)
  --assignee <username>  Assign issues to user

Environment Variables:
  GITHUB_TOKEN           Required: GitHub Personal Access Token with 'repo' scope
  GITHUB_OWNER           Optional: Repository owner (default: mdresch)
  GITHUB_REPO            Optional: Repository name (default: adpa)

Examples:
  # Show statistics
  npm run import-issues -- --stats

  # Dry run for Sprint 1
  npm run import-issues -- --batch sprint-1 --dry-run

  # Import high priority planned tasks (limit 50)
  npm run import-issues -- --priority high --status planned --limit 50

  # Import entity type tasks and assign to milestone 1
  npm run import-issues -- --batch entity-types --milestone 1

  # Import AI and search tasks with custom label
  npm run import-issues -- --batch ai-search --labels "sprint-2"
`);
}

// Main execution
async function main() {
  try {
    const options = parseArgs();

    if (options.help) {
      showHelp();
      process.exit(0);
    }

    const importer = new GitHubIssuesImporter();

    if (options.stats) {
      importer.showStatistics();
      process.exit(0);
    }

    await importer.importIssues(options);

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.message.includes('GITHUB_TOKEN')) {
      console.log(`\nPlease set your GitHub token:`);
      console.log(`  export GITHUB_TOKEN=ghp_your_token_here\n`);
    }
    process.exit(1);
  }
}

main();

