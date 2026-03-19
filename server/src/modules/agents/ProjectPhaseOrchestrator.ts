import { logger } from '../../utils/logger';
import { agentRunStore, AgentRunPhase } from './AgentRunStore';
import { streamingBus } from './StreamingBus';
import { ProjectContextResolver } from './ProjectContextResolver';
import { GeneralPurposeAgent } from './GeneralPurposeAgent';

const PHASES = [
  { number: 1, name: "Project Discovery", domain: "discovery", goal: "Ingest and understand all project documents, integrations, and linked systems to form a comprehensive knowledge base." },
  { number: 2, name: "Stakeholder Analysis", domain: "pmbok", goal: "Identify all project stakeholders, analyze their expectations, influence, and interest, and formulate a communication plan." },
  { number: 3, name: "Scope & Requirements", domain: "pmbok", goal: "Define a clear project scope baseline and decompose high-level goals into detailed functional and non-functional requirements." },
  { number: 4, name: "Risk Assessment", domain: "pmbok", goal: "Identify potential risks, score them based on probability and impact using the PMBOK framework, and devise initial mitigation strategies." },
  { number: 5, name: "Work Breakdown Structure", domain: "pmbok", goal: "Decompose the project scope and deliverables into a complete Work Breakdown Structure (WBS) following PMBOK 5.4 standards." },
  { number: 6, name: "Resource & Timeline Planning", domain: "pmbok", goal: "Map required resources to WBS items, estimate effort and duration, and produce a preliminary project schedule." },
  { number: 7, name: "Integration & Sync", domain: "integration", goal: "Synchronize the generated plans, tasks, and documentation with external systems like Jira, GitHub, and Confluence using available tools." },
  { number: 8, name: "Quality & Governance", domain: "pmbok", goal: "Define quality metrics, establish governance rules and compliance checkpoints, and set up an audit trail for the project." },
  { number: 9, name: "Execution Monitoring Setup", domain: "discovery", goal: "Configure drift detection monitors, set up progress tracking mechanisms, and flag potential anomalies based on the established baselines." },
  { number: 10, name: "Synthesis & Reporting", domain: "general", goal: "Synthesize all gathered information, provide an ECS-evaluated project health report, and generate a final summary of the orchestrated plan." },
];

export class ProjectPhaseOrchestrator {
  public async run(runId: string, projectId: string) {
    logger.info({ runId, projectId }, '[Orchestrator] Starting 10-phase project orchestration.');
    streamingBus.emitToRun(runId, 'run_start', { runId, projectId });
    await agentRunStore.updateRun(runId, { status: 'running' });

    try {
      const contextResolver = new ProjectContextResolver(projectId);
      const fullContext = await contextResolver.getFullContext();

      for (const phaseInfo of PHASES) {
        const phaseId = await agentRunStore.createPhase(runId, phaseInfo);
        streamingBus.emitToRun(runId, 'phase_start', { runId, phaseId, ...phaseInfo });

        const startTime = Date.now();

        try {
          // Create a fresh agent for each phase to ensure isolation
          const agent = new GeneralPurposeAgent();
          const prompt = `PROJECT GOAL: ${(await agentRunStore.getRunWithPhases(runId)).goal}

` +
            `CURRENT PHASE: ${phaseInfo.name} (${phaseInfo.domain} domain)
` +
            `PHASE GOAL: ${phaseInfo.goal}

` +
            `AVAILABLE CONTEXT:
${fullContext}`;

          // The agent's execution will emit events. We need to listen to them.
          // This requires the agent to be an EventEmitter or have a similar mechanism.
          // For now, we simulate this by having the agent directly call the bus and store.
          const finalAnswer = await agent.runPhase(prompt, {
            runId,
            phaseId,
            streamingBus,
            agentRunStore
          });

          const durationMs = Date.now() - startTime;
          await agentRunStore.updatePhase(phaseId, {
            status: 'completed',
            final_answer: finalAnswer,
            duration_ms: durationMs,
            completed_at: new Date()
          });
          streamingBus.emitToRun(runId, 'phase_end', { runId, phaseId, status: 'completed' });

        } catch (error: any) {
          const durationMs = Date.now() - startTime;
          logger.error({ runId, phaseId, error }, `[Orchestrator] Phase ${phaseInfo.number} failed.`);
          await agentRunStore.updatePhase(phaseId, { status: 'failed', duration_ms: durationMs, final_answer: error.message, completed_at: new Date() });
          streamingBus.emitToRun(runId, 'phase_end', { runId, phaseId, status: 'failed', error: error.message });

          // Stop the entire run on phase failure
          throw new Error(`Orchestration failed at phase ${phaseInfo.number}: ${phaseInfo.name}`);
        }
      }

      await agentRunStore.updateRun(runId, { status: 'completed', completed_at: new Date() });
      streamingBus.emitToRun(runId, 'run_end', { runId, status: 'completed' });
      logger.info({ runId, projectId }, '[Orchestrator] Orchestration completed successfully.');

    } catch (error: any) {
      logger.error({ runId, projectId, error }, '[Orchestrator] Orchestration failed.');
      await agentRunStore.updateRun(runId, { status: 'failed', summary: error.message, completed_at: new Date() });
      streamingBus.emitToRun(runId, 'run_end', { runId, status: 'failed', error: error.message });
    }
  }
}