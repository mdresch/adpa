import { pool } from '../../database/connection';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'guided';
export type AgentPhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type AgentEventType = 'thought' | 'action' | 'observation' | 'error' | 'review' | 'consensus' | 'phase_start' | 'phase_end' | 'run_start' | 'run_end';

export interface AgentRun {
    id: string;
    project_id?: string;
    goal: string;
    status: AgentRunStatus;
    summary?: string;
    consensus_score?: number;
    created_at: Date;
    completed_at?: Date;
}

export interface AgentRunPhase {
    id: string;
    run_id: string;
    phase_number: number;
    phase_name: string;
    domain?: string;
    status: AgentPhaseStatus;
    final_answer?: string;
    duration_ms?: number;
    started_at?: Date;
    completed_at?: Date;
}

export interface AgentRunEvent {
    id: string;
    phase_id: string;
    run_id: string;
    type: AgentEventType;
    content: any;
    timestamp: Date;
}

export class AgentRunStore {
    public async createRun(goal: string, projectId?: string): Promise<string> {
        try {
            const result = await pool.query(
                `INSERT INTO agent_runs (project_id, goal, status) VALUES ($1, $2, 'pending') RETURNING id`,
                [projectId, goal]
            );
            const runId = result.rows[0].id;
            logger.info({ runId, projectId, goal }, '[AgentRunStore] Created new agent run');
            return runId;
        } catch (error) {
            logger.error({ error, goal, projectId }, '[AgentRunStore] Failed to create agent run');
            throw error;
        }
    }

    public async updateRun(runId: string, data: Partial<Omit<AgentRun, 'id' | 'created_at'>>): Promise<void> {
        try {
            const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at');
            if (fields.length === 0) return;

            const setClauses = fields.map((field, i) => `"${field}" = $${i + 2}`).join(', ');
            const values = fields.map(field => (data as any)[field]);

            await pool.query(`UPDATE agent_runs SET ${setClauses} WHERE id = $1`, [runId, ...values]);
            logger.info({ runId, ...data }, '[AgentRunStore] Updated agent run');
        } catch (error) {
            logger.error({ error, runId, data }, '[AgentRunStore] Failed to update agent run');
            throw error;
        }
    }

    public async createPhase(runId: string, phase: Omit<AgentRunPhase, 'id' | 'run_id' | 'status'>): Promise<string> {
        try {
            const result = await pool.query(
                `INSERT INTO agent_run_phases (run_id, phase_number, phase_name, domain, status, started_at) 
                 VALUES ($1, $2, $3, $4, 'running', CURRENT_TIMESTAMP) RETURNING id`,
                [runId, phase.phase_number, phase.phase_name, phase.domain]
            );
            const phaseId = result.rows[0].id;
            logger.info({ runId, phaseId, phaseName: phase.phase_name }, '[AgentRunStore] Created new run phase');
            return phaseId;
        } catch (error) {
            logger.error({ error, runId, phase }, '[AgentRunStore] Failed to create run phase');
            throw error;
        }
    }
    
    public async updatePhase(phaseId: string, data: Partial<Omit<AgentRunPhase, 'id'>>): Promise<void> {
        try {
            const fields = Object.keys(data).filter(k => k !== 'id');
            if (fields.length === 0) return;

            const setClauses = fields.map((field, i) => `"${field}" = $${i + 2}`).join(', ');
            const values = fields.map(field => (data as any)[field]);

            await pool.query(`UPDATE agent_run_phases SET ${setClauses} WHERE id = $1`, [phaseId, ...values]);
             logger.debug({ phaseId, ...data }, '[AgentRunStore] Updated run phase');
        } catch (error) {
            logger.error({ error, phaseId, data }, '[AgentRunStore] Failed to update run phase');
            throw error;
        }
    }


    public async appendEvent(phaseId: string, runId: string, type: AgentEventType, content: any): Promise<void> {
        try {
            await pool.query(
                `INSERT INTO agent_run_events (phase_id, run_id, type, content) VALUES ($1, $2, $3, $4)`,
                [phaseId, runId, type, JSON.stringify(content)]
            );
        } catch (error) {
            logger.error({ error, phaseId, type }, '[AgentRunStore] Failed to append event');
            // Do not re-throw, as event logging is non-critical to agent execution
        }
    }

    public async getRunWithPhases(runId: string): Promise<AgentRun & { phases: AgentRunPhase[] }> {
        const runResult = await pool.query('SELECT * FROM agent_runs WHERE id = $1', [runId]);
        if (runResult.rows.length === 0) {
            throw new Error('Agent run not found');
        }
        const phasesResult = await pool.query('SELECT * FROM agent_run_phases WHERE run_id = $1 ORDER BY phase_number ASC', [runId]);
        
        return {
            ...runResult.rows[0],
            phases: phasesResult.rows
        };
    }
    
    public async listProjectRuns(projectId: string, limit: number = 20, offset: number = 0): Promise<AgentRun[]> {
        const result = await pool.query(
            'SELECT * FROM agent_runs WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [projectId, limit, offset]
        );
        return result.rows;
    }
}

export const agentRunStore = new AgentRunStore();
