// JS/TS wrapper for PMBOK process agent using project AIService
import { BaseAgent, AgentObservation } from '../agents/BaseAgent'
import { PMBOK6_PROCESSES } from '../../../../types/pmbok6-data'

export class PMBOKProcessAgent extends BaseAgent {
  code: string
  name: string
  description: string
  inputs: string[]
  pmbokTools: string[]
  outputs: string[]
  knowledgeArea: string

  constructor(code: string, name: string, description: string, inputs: string[], tools: string[], outputs: string[], knowledgeArea: string) {
    super()

    this.code = code
    this.name = name
    this.description = description
    this.inputs = inputs
    this.pmbokTools = tools
    this.outputs = outputs
    this.knowledgeArea = knowledgeArea

    this.systemPrompt = `You are a PMBOK Process Specialist executing the ${code} (${name}) process.
Knowledge Area: ${knowledgeArea}
Description: ${description}
Standard Inputs: ${inputs.join(', ')}
Standard Tools & Techniques: ${tools.join(', ')}
Standard Outputs: ${outputs.join(', ')}

Your goal is to execute this process correctly and produce the required outputs based on the provided data.`
  }

  protected constructPrompt(goal: string, context: any, history: AgentObservation[]): string {
    const historyLog = history
      .map(o => `[${o.type.toUpperCase()}] ${o.content}`)
      .join('\n')

    return `
Process: ${this.name} (${this.code})
Goal: ${goal}
Available Information: ${JSON.stringify(context)}

History:
${historyLog}

Plan your next step. You can think, use a tool, or provide the final answer.
`
  }
}

/**
 * Factory to create all PMBOK 6 process agents
 */
export function createPmbokAgents(): Record<string, PMBOKProcessAgent> {
  const agents: Record<string, PMBOKProcessAgent> = {}

  PMBOK6_PROCESSES.forEach(p => {
    agents[p.code] = new PMBOKProcessAgent(
      p.code,
      p.name,
      p.description,
      p.inputs,
      p.tools,
      p.outputs,
      p.knowledgeArea
    )
  })

  return agents
}

