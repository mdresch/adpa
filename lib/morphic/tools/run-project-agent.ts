import { tool } from 'ai'
import { z } from 'zod'

export function createRunProjectAgentTool() {
    return tool({
        description: 'Initiate a specialized 10-phase AI agent to work on a specific project. Use this tool only when the user explicitly asks an agent to execute a comprehensive project task, such as creating a PRD, refactoring, or writing a long document. This tool triggers an asynchronous workflow. Do not wait for it to finish; let the user know it has started successfully.',
        parameters: z.object({
            projectId: z.string().describe('The UUID of the project for the agent to work on.'),
            goal: z.string().describe('The primary goal or objective that the 10-phase agent should accomplish.')
        }),
        execute: async ({ projectId, goal }) => {
            try {
                // Determine the base URL depending on the environment
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
                
                const response = await fetch(`${baseUrl}/api/agents/project/${projectId}/run`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ goal })
                })
                
                if (!response.ok) {
                    const errorMsg = await response.text();
                    console.error('[RunProjectAgentTool] Failed to start agent run:', errorMsg);
                    return {
                        error: `Failed to start agent run: ${response.statusText}`
                    }
                }

                const data = await response.json()
                
                // Return structured data for the UI component to render the tracking widget
                return {
                    status: 'started',
                    runId: data.runId,
                    projectId,
                    goal,
                    message: `Agent execution started successfully with run ID ${data.runId}.`
                }
            } catch (error) {
                console.error('[RunProjectAgentTool] Exception starting agent run:', error);
                return {
                    error: `Exception starting agent run: ${error instanceof Error ? error.message : String(error)}`
                }
            }
        }
    })
}
