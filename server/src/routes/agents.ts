import { Router, Request, Response } from 'express';
import { GeneralPurposeAgent } from '../modules/agents/GeneralPurposeAgent';
import { OrchestratorAgent } from '../modules/agents/OrchestratorAgent';

const router = Router();

// Cache for active agent instances
const agentCache = new Map<string, any>();

/**
 * POST /api/agents/orchestrate
 * Orchestrate a complex goal across multiple agents
 */
router.post('/orchestrate', async (req: Request, res: Response) => {
  const { goal, context, sessionId = 'default' } = req.body;

  if (!goal) {
    return res.status(400).json({ success: false, error: 'Goal is required' });
  }

  const startTime = Date.now();
  try {
    const orchestrator = new OrchestratorAgent();
    const result = await orchestrator.orchestrate(goal, context || {});

    return res.json({
      success: true,
      data: {
        goal,
        result,
        durationMs: Date.now() - startTime
      }
    });
  } catch (error: any) {
    console.error('Orchestration failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal orchestration error'
    });
  }
});

/**
 * POST /api/agents/chat
 * Standard single-agent interaction
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { goal, sessionId = 'default' } = req.body;

  if (!goal) {
    return res.status(400).json({ error: 'Goal is required' });
  }

  try {
    let agent = agentCache.get(sessionId);
    if (!agent) {
      agent = new GeneralPurposeAgent();
      agentCache.set(sessionId, agent);
    }

    // Set up observation callback to stream intermediate steps (in a real app, use WebSockets)
    // For now, we'll return the final result and some tracing info
    const startTime = Date.now();
    const result = await agent.run(goal);
    const duration = Date.now() - startTime;

    // In this basic implementation, we just return the final response.
    // In the UI, we might want to see the "Plan" and "Actions" taken.
    // The BaseAgent actually keeps an internal history of its log.
    
    return res.json({
      success: true,
      data: {
        goal,
        response: result,
        trace: {
            durationMs: duration,
            steps: agent.getHistory ? agent.getHistory() : [] 
        }
      }
    });
  } catch (error: any) {
    console.error('Agent execution failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal agent error'
    });
  }
});

export default router;
