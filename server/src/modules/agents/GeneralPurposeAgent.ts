/**
 * General Purpose ADPA Agent
 * A concrete implementation of BaseAgent with a standard prompt
 */

import { BaseAgent, AgentObservation } from './BaseAgent'

export class GeneralPurposeAgent extends BaseAgent {
  protected constructPrompt(goal: string, context: any, history: AgentObservation[]): string {
    const tools = this.toolRegistry.getToolSchemas()
    const toolsDescription = tools.map(t => `- ${t.name}: ${t.description}. Params: ${JSON.stringify(t.parameters)}`).join('\n')

    const historyLog = history.map(h => {
      switch (h.type) {
        case 'thought': return `Thought: ${h.content}`
        case 'action': return `Action: ${h.content}`
        case 'observation': return `Observation: ${h.content}`
        case 'error': return `Error: ${h.content}`
        default: return h.content
      }
    }).join('\n')

    return `
      Goal: ${goal}
      Context: ${JSON.stringify(context)}
      
      Available Tools:
      ${toolsDescription || "No tools available."}
      
      Loop Instructions:
      1. Analyze the current state and goal.
      2. Decide which tool to use.
      3. Format your action exactly like: Action: ToolName({"param": "value"})
      4. If you have the answer, respond with: Final Answer: [Your answer here]
      
      Current Progress:
      ${historyLog}
      
      Next Thought:
    `
  }
}
