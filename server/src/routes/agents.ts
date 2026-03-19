/**
 * Agent API Routes
 * Handles REST endpoints for agent orchestration and streaming via Socket.IO.
 */

import { Router, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { agentRunStore } from '../modules/agents/AgentRunStore';
import { ProjectPhaseOrchestrator } from '../modules/agents/ProjectPhaseOrchestrator';
import { GeneralPurposeAgent } from '../modules/agents/GeneralPurposeAgent';
import { globalToolRegistry } from '../modules/agents/ToolRegistry';
import { logger } from '../utils/logger';
import { streamingBus } from '../modules/agents/StreamingBus';

const router = Router();

// This function will be called from server.ts to attach the socket.io server
export function attachAgentRoutes(io: SocketIOServer) {

  // The streaming bus needs access to the main io server instance
  // We are not using the bus's internal server, just its event emitter capability
  // in combination with the main server's socket manager.

  io.of('/agents').on('connection', (socket) => {
    logger.info(`[AgentSocket] Client connected: ${socket.id}`);

    socket.on('subscribeToRun', (runId: string) => {
      logger.info(`[AgentSocket] Client ${socket.id} subscribed to run ${runId}`);
      socket.join(runId);
    });

    socket.on('guide_run', (data: { runId: string, message: string }) => {
      logger.info(`[AgentSocket] Guidance received for run ${data.runId}: ${data.message}`);
      // This emits an event that can be listened to by the orchestrator
      streamingBus.emit(`guide_${data.runId}`, data.message);
      agentRunStore.appendEvent(data.runId, data.runId, 'guidance', { message: data.message });
    });

    socket.on('disconnect', () => {
      logger.info(`[AgentSocket] Client disconnected: ${socket.id}`);
    });
  });
}


// --- REST Endpoints ---

// Fix: Creates a fresh agent per request to prevent state leakage
router.post('/chat', async (req: Request, res: Response) => {
  const { goal, context } = req.body;
  if (!goal) return res.status(400).json({ error: 'Goal is required' });

  try {
    const agent = new GeneralPurposeAgent();
    const response = await agent.run(goal, context);
    res.json({ success: true, response });
  } catch (error: any) {
    logger.error('Agent chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// New: Launch a 10-phase project orchestration run
router.post('/project/:id/run', async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const { goal } = req.body;
  if (!goal) return res.status(400).json({ error: 'Goal for the run is required' });

  try {
    const runId = await agentRunStore.createRun(goal, projectId);

    // Respond immediately so the client can subscribe to the WebSocket stream
    res.status(202).json({ success: true, runId });

    // Start the orchestration asynchronously
    const orchestrator = new ProjectPhaseOrchestrator();
    orchestrator.run(runId, projectId).catch(err => {
      logger.error({ err, runId, projectId }, "Project orchestration background run failed.");
    });

  } catch (error: any) {
    logger.error('Failed to start project run:', error);
    res.status(500).json({ error: 'Failed to start project run' });
  }
});

// New: Get paginated history of runs for a specific project
router.get('/project/:id/runs', async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const runs = await agentRunStore.listProjectRuns(projectId, limit, offset);
    res.json({ success: true, runs });
  } catch (error: any) {
    logger.error('Failed to fetch project runs:', error);
    res.status(500).json({ error: 'Failed to fetch project runs' });
  }
});

// New: Get full details for a single run
router.get('/run/:runId', async (req: Request, res: Response) => {
  try {
    const run = await agentRunStore.getRunWithPhases(req.params.runId);
    res.json({ success: true, run });
  } catch (error: any) {
    logger.error('Failed to fetch run details:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.status(500).json({ error: 'Failed to fetch run details' });
  }
});

// New: Inject guidance into a running agent
// Note: The actual event is sent via WebSocket, but a REST endpoint can be useful.
router.post('/run/:runId/guide', (req: Request, res: Response) => {
  const { runId } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Guidance message is required' });

  logger.info(`[AgentREST] Guidance received for run ${runId}: ${message}`);
  streamingBus.emit(`guide_${runId}`, message);
  // We can also persist this event
  agentRunStore.appendEvent(runId, runId, 'guidance', { message });

  res.status(202).json({ success: true, message: "Guidance submitted" });
});

// New: Get the catalog of all available agent tools
router.get('/tools', (req: Request, res: Response) => {
  try {
    const tools = globalToolRegistry.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
    res.json({ success: true, tools });
  } catch (error: any) {
    logger.error('Failed to get tool catalog:', error);
    res.status(500).json({ error: 'Failed to get tool catalog' });
  }
});


export default router;