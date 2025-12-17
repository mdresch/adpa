import { NextResponse } from 'next/server';
import { createPmbokAgents } from '@/server/src/modules/pmbok6/PMBOKProcessAgent';

// This API returns all PMBOK processes for the Gantt chart
export async function GET() {
  // Get all agents from the factory
  const agents = createPmbokAgents();
  // Map to Gantt item format (status, start, end, result are placeholders)
  const processes = Object.values(agents).map(agent => ({
    code: agent.code,
    name: agent.name,
    group: agent.knowledgeArea || '',
    start: null,
    end: null,
    status: 'not_started',
    result: ''
  }));
  return NextResponse.json(processes);
}
