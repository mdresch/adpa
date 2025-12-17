import { NextResponse } from 'next/server';
import { PMBOK6_PROCESSES } from '@/types/pmbok6-data';

// This API returns all PMBOK processes for the Gantt chart
export async function GET() {
  // Map to Gantt item format (status, start, end, result are placeholders)
  const processes = PMBOK6_PROCESSES.map(process => ({
    code: process.code,
    name: process.name,
    group: process.knowledgeArea || '',
    start: null,
    end: null,
    status: 'not_started',
    result: ''
  }));
  return NextResponse.json(processes);
}
