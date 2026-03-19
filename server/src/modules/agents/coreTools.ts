/**
 * Core ADPA Tools for Agents
 */

import { globalToolRegistry, BaseTool } from './ToolRegistry'
import * as taskService from '../../services/taskManagementService'
import * as goalService from '../../services/goalService'
import { discoveryService } from '../../services/discoveryService'
import './integrationTools'

// Sentinel UUID used when no authenticated user ID is available in a tool call.
// Tool implementations should prefer extracting the caller's ID from context args
// (e.g. args.requestedBy or args.userId) before falling back to this value.
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Extract the best available user/caller ID from tool arguments.
 * Agents should pass `requestedBy` or `userId` in their args when possible
 * so that created resources are attributed to the correct user.
 */
function resolveUserId(args: any): string {
  return args.requestedBy || args.userId || SYSTEM_USER_ID
}

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
      goalId: { type: 'string' },
      requestedBy: { type: 'string', description: 'ID of the user requesting this action' }
    },
    required: ['projectId', 'taskName']
  }

  async execute(args: any) {
    return taskService.createTask(args, resolveUserId(args))
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
      taskId: { type: 'string' },
      requestedBy: { type: 'string', description: 'ID of the user requesting this action' }
    },
    required: ['taskId']
  }

  async execute(args: any) {
    return taskService.decomposeTask(args.taskId, resolveUserId(args))
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
      goalId: { type: 'string' },
      requestedBy: { type: 'string', description: 'ID of the user requesting this action' }
    },
    required: ['goalId']
  }

  async execute(args: any) {
    return goalService.decomposeGoal(args.goalId, resolveUserId(args))
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
