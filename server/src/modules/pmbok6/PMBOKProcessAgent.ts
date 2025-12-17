// JS/TS wrapper for PMBOK process agent using project AIService
import { runProcessWithAI } from './aiUtil'
import { PMBOK6_PROCESSES } from '../../../../types/pmbok6-data'

export class PMBOKProcessAgent {
  code: string
  name: string
  description: string
  inputs: string[]
  tools: string[]
  outputs: string[]
  knowledgeArea: string

  constructor(code: string, name: string, description: string, inputs: string[], tools: string[], outputs: string[], knowledgeArea: string) {
    this.code = code
    this.name = name
    this.description = description
    this.inputs = inputs
    this.tools = tools
    this.outputs = outputs
    this.knowledgeArea = knowledgeArea
  }

  async run(data: any, userId?: string, projectId?: string, documentId?: string) {
    // Compose a prompt for this process
    const prompt = `You are executing PMBOK process ${this.code} (${this.name}).\nDescription: ${this.description}\nInputs: ${JSON.stringify(this.inputs)}\nTools: ${JSON.stringify(this.tools)}\nOutputs: ${JSON.stringify(this.outputs)}\nContext: ${JSON.stringify(data)}\nPlease perform this process and return the result.`
    return runProcessWithAI(this.code, prompt, userId, projectId, documentId)
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
