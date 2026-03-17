/**
 * Core ADPA Tools for Agents
 */

import { globalToolRegistry, BaseTool } from './ToolRegistry'
import * as taskService from '../../services/taskManagementService'
import * as goalService from '../../services/goalService'
import { discoveryService } from '../../services/discoveryService'
import './integrationTools'

/**
 * Register Task Creation Tool
 */
class CreateTaskTool extends BaseTool {
  name = 'createTask'
  description = 'Create a new project task'
  parameters = {
    type: 'object',
    properties: {
      projectId: { type: 'string' },
      taskName: { type: 'string' },
      description: { type: 'string' },
      estimatedHours: { type: 'number' },
      goalId: { type: 'string' }
    },
    required: ['projectId', 'taskName']
  }

  async execute(args: any) {
    return taskService.createTask(args, '00000000-0000-0000-0000-000000000000')
  }
}

/**
 * Register Task Decomposition Tool
 */
class DecomposeTaskTool extends BaseTool {
  name = 'decomposeTask'
  description = 'Decompose a complex task into smaller sub-tasks'
  parameters = {
    type: 'object',
    properties: {
      taskId: { type: 'string' }
    },
    required: ['taskId']
  }

  async execute(args: any) {
    return taskService.decomposeTask(args.taskId, '00000000-0000-0000-0000-000000000000')
  }
}

/**
 * Register Goal Decomposition Tool
 */
class DecomposeGoalTool extends BaseTool {
  name = 'decomposeGoal'
  description = 'Decompose a high-level project goal into actionable tasks'
  parameters = {
    type: 'object',
    properties: {
      goalId: { type: 'string' }
    },
    required: ['goalId']
  }

  async execute(args: any) {
    return goalService.decomposeGoal(args.goalId, '00000000-0000-0000-0000-000000000000')
  }
}

/**
 * Register Discovery Search Tool
 */
class SearchTool extends BaseTool {
  name = 'search'
  description = 'Search for internal documents and external project management knowledge'
  parameters = {
    type: 'object',
    properties: {
      query: { type: 'string' },
      source: { type: 'string', enum: ['all', 'internal', 'external'] }
    },
    required: ['query']
  }

  // Phase 4 Contract
  contract = {
    capability: 'search_documents' as const,
    domain: 'discovery' as const,
    reliabilityScore: 0.9,
    validateInput: (args: any) => {
      if (!args.query) throw new Error('Search query is required')
      return {
        query: args.query.trim(),
        source: args.source || 'all'
      }
    }
  }

  async execute(args: any) {
    return discoveryService.search(args.query, { source: args.source as any })
  }
}

// Register core tools
globalToolRegistry.registerTool(new CreateTaskTool())
globalToolRegistry.registerTool(new DecomposeTaskTool())
globalToolRegistry.registerTool(new DecomposeGoalTool())
globalToolRegistry.registerTool(new SearchTool())
