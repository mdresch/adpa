#!/usr/bin/env node
/**
 * Task Cost System - Example & Testing Script
 * 
 * Demonstrates task-level resource cost calculations
 * Shows the complete flow from task assignment to cost aggregation
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Example data for testing
const EXAMPLE_DATA = {
  task1: {
    id: 'task-001',
    name: 'Implement Payment Gateway',
    projectId: 'project-001',
  },
  resources: [
    {
      roleId: 'role-001',
      roleName: 'Senior Developer',
      hourlyRate: 150,
      allocationPercentage: 100,
      plannedHours: 80,
    },
    {
      roleId: 'role-002',
      roleName: 'QA Engineer',
      hourlyRate: 100,
      allocationPercentage: 50,
      plannedHours: 40,
    },
    {
      roleId: 'role-003',
      roleName: 'DevOps Engineer',
      hourlyRate: 130,
      allocationPercentage: 25,
      plannedHours: 20,
    },
  ],
};

interface ResourceCost {
  roleName: string;
  plannedHours: number;
  allocationPercentage: number;
  hourlyRate: number;
  effectiveHours: number;
  plannedCost: number;
}

function calculateResourceCost(resource: any): ResourceCost {
  const effectiveHours = (resource.plannedHours * resource.allocationPercentage) / 100;
  const plannedCost = effectiveHours * resource.hourlyRate;

  return {
    roleName: resource.roleName,
    plannedHours: resource.plannedHours,
    allocationPercentage: resource.allocationPercentage,
    hourlyRate: resource.hourlyRate,
    effectiveHours,
    plannedCost,
  };
}

function displayCostBreakdown(): void {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║              TASK-LEVEL RESOURCE COST CALCULATION EXAMPLE                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  console.log(`\n📋 Task: ${EXAMPLE_DATA.task1.name}`);
  console.log(`   Project ID: ${EXAMPLE_DATA.task1.projectId}`);

  console.log('\n┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('│ RESOURCE COST BREAKDOWN                                                  │');
  console.log('├──────────────────────────────────────────────────────────────────────────┤');
  console.log('│ Role               Planned Hours  Alloc%  Rate      Effective  Cost      │');
  console.log('├──────────────────────────────────────────────────────────────────────────┤');

  let totalPlannedHours = 0;
  let totalEffectiveHours = 0;
  let totalCost = 0;

  for (const resource of EXAMPLE_DATA.resources) {
    const calc = calculateResourceCost(resource);

    const roleDisplay = calc.roleName.padEnd(17);
    const plannedDisplay = `${calc.plannedHours.toFixed(0)}h`.padStart(12);
    const allocDisplay = `${calc.allocationPercentage.toFixed(0)}%`.padStart(6);
    const rateDisplay = `$${calc.hourlyRate}/h`.padStart(10);
    const effectiveDisplay = `${calc.effectiveHours.toFixed(1)}h`.padStart(10);
    const costDisplay = `$${calc.plannedCost.toFixed(0)}`.padStart(8);

    console.log(
      `│ ${roleDisplay} ${plannedDisplay} ${allocDisplay} ${rateDisplay} ${effectiveDisplay} ${costDisplay} │`
    );

    totalPlannedHours += calc.plannedHours;
    totalEffectiveHours += calc.effectiveHours;
    totalCost += calc.plannedCost;
  }

  console.log('├──────────────────────────────────────────────────────────────────────────┤');
  const totalPlannedDisplay = `${totalPlannedHours.toFixed(0)}h`.padStart(12);
  const totalEffectiveDisplay = `${totalEffectiveHours.toFixed(1)}h`.padStart(10);
  const totalCostDisplay = `$${totalCost.toFixed(0)}`.padStart(8);
  console.log(
    `│ TOTAL                                                 ${totalEffectiveDisplay} ${totalCostDisplay} │`
  );
  console.log('└──────────────────────────────────────────────────────────────────────────┘');

  console.log('\n📊 Cost Breakdown Analysis');
  console.log('─'.repeat(78));
  console.log(`  Planned Hours (Total):  ${totalPlannedHours.toFixed(1)} hours`);
  console.log(`  Effective Hours:        ${totalEffectiveHours.toFixed(1)} hours (after allocation)`);
  console.log(`  Task Total Cost:        $${totalCost.toFixed(2)}`);
  console.log(`  Average Rate:           $${(totalCost / totalEffectiveHours).toFixed(2)}/hour`);

  // Cost by allocation
  console.log('\n💰 Cost Distribution by Role');
  console.log('─'.repeat(78));
  for (const resource of EXAMPLE_DATA.resources) {
    const calc = calculateResourceCost(resource);
    const percentage = ((calc.plannedCost / totalCost) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(parseFloat(percentage) / 2)) + '░'.repeat(50 - Math.round(parseFloat(percentage) / 2));
    console.log(`  ${calc.roleName.padEnd(20)} ${bar} ${percentage}%`);
  }

  // Allocation impact
  console.log('\n⚡ Allocation Impact');
  console.log('─'.repeat(78));
  const allocationFactor = totalEffectiveHours / totalPlannedHours;
  console.log(`  Total planned hours: ${totalPlannedHours.toFixed(1)}`);
  console.log(`  Total effective hours: ${totalEffectiveHours.toFixed(1)}`);
  console.log(`  Average allocation: ${(allocationFactor * 100).toFixed(1)}%`);
  console.log(`  Cost savings from partial allocation: $${(totalPlannedHours * 150 - totalCost).toFixed(2)}`);
  console.log('  (Team members working on other tasks = lower task cost)');
}

async function testAPI(): Promise<void> {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        TESTING API ENDPOINTS                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  console.log(`\n🌐 API Base URL: ${API_URL}`);

  console.log('\n1️⃣  Testing: GET /api/tasks/:taskId/cost');
  console.log('─'.repeat(78));
  console.log('Fetches complete cost breakdown for a task...');

  try {
    const response = await fetch(
      `${API_URL}/tasks/550e8400-e29b-41d4-a716-446655440000/cost`
    );

    if (response.ok) {
      const data = (await response.json()) as any;
      console.log('✅ Success!');
      console.log(`   Task: ${data.data?.taskName || 'N/A'}`);
      console.log(`   Planned Cost: $${data.data?.plannedTotalCost || 0}`);
      console.log(`   Resources: ${data.data?.resourceCount || 0}`);
    } else {
      console.log(`⚠️  Response: ${response.status}`);
      if (response.status === 404) {
        console.log('   (Task not found - this is expected for testing)');
      }
    }
  } catch (err) {
    console.log(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  console.log('\n2️⃣  Testing: GET /api/projects/:projectId/tasks/costs');
  console.log('─'.repeat(78));
  console.log('Fetches costs for all tasks in a project...');

  try {
    const response = await fetch(
      `${API_URL}/projects/770e8400-e29b-41d4-a716-446655440000/tasks/costs`
    );

    if (response.ok) {
      const data = (await response.json()) as any;
      console.log('✅ Success!');
      console.log(`   Total Tasks: ${data.data?.totals?.taskCount || 0}`);
      console.log(`   Total Planned Cost: $${data.data?.totals?.plannedTotalCost || 0}`);
      console.log(`   Total Actual Cost: $${data.data?.totals?.actualTotalCost || 0}`);
    } else {
      console.log(`⚠️  Response: ${response.status}`);
      if (response.status === 404) {
        console.log('   (Project not found - this is expected for testing)');
      }
    }
  } catch (err) {
    console.log(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  console.log('\n3️⃣  Testing: POST /api/tasks/:taskId/resources/cost-impact');
  console.log('─'.repeat(78));
  console.log('Calculates cost impact of proposed changes...');

  try {
    const response = await fetch(
      `${API_URL}/tasks/550e8400-e29b-41d4-a716-446655440000/resources/660e8400-e29b-41d4-a716-446655440001/cost-impact`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedHours: 100,
          hourlyRate: 175,
          allocationPercentage: 75,
        }),
      }
    );

    if (response.ok) {
      const data = (await response.json()) as any;
      console.log('✅ Success!');
      console.log(`   Current Cost: $${data.data?.currentCost || 0}`);
      console.log(`   New Cost: $${data.data?.newCost || 0}`);
      console.log(`   Difference: $${data.data?.costDifference || 0}`);
      console.log(`   Change: ${data.data?.percentageChange?.toFixed(1) || 0}%`);
    } else {
      console.log(`⚠️  Response: ${response.status}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  console.log('\n4️⃣  Testing: POST /api/tasks/:taskId/resources');
  console.log('─'.repeat(78));
  console.log('Creates/updates task assignment with cost calculation...');

  try {
    const response = await fetch(
      `${API_URL}/tasks/550e8400-e29b-41d4-a716-446655440000/resources`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceAssignmentId: 'assignment-001',
          userId: 'user-001',
          userName: 'Jane Developer',
          roleId: 'role-001',
          roleName: 'Senior Developer',
          plannedHours: 80,
          hourlyRate: 150,
          allocationPercentage: 50,
          scheduledStartDate: '2025-11-21T00:00:00Z',
          scheduledEndDate: '2025-12-19T00:00:00Z',
        }),
      }
    );

    if (response.ok) {
      const data = (await response.json()) as any;
      console.log('✅ Success!');
      console.log(`   Assignment ID: ${data.data?.assignmentId?.substring(0, 8)}...`);
      console.log(`   Planned Cost: $${data.data?.plannedCost || 0}`);
      console.log(`   Effective Hours: ${data.data?.effectiveHours || 0}`);
    } else {
      console.log(`⚠️  Response: ${response.status}`);
      const errorData = (await response.json()) as any;
      console.log(`   Error: ${errorData.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

async function main(): Promise<void> {
  console.log('\n\n');
  console.log('█'.repeat(80));
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█' + '  TASK-LEVEL RESOURCE COST SYSTEM - EXAMPLES & TESTING'.padEnd(78) + '█');
  console.log('█' + ' '.repeat(78) + '█');
  console.log('█'.repeat(80));

  // Show calculation examples
  displayCostBreakdown();

  // Test API endpoints
  if (process.argv.includes('--test-api')) {
    await testAPI();
  } else {
    console.log('\n💡 Tip: Add --test-api flag to test actual API endpoints');
    console.log('        npx tsx server/scripts/examples-task-cost.ts --test-api');
  }

  console.log('\n\n');
  console.log('✨ Cost Calculation Key Formula:');
  console.log('─'.repeat(80));
  console.log('  Effective Hours = Planned Hours × (Allocation % / 100)');
  console.log('  Planned Cost = Effective Hours × Hourly Rate');
  console.log('  Task Total = Sum of all resource costs');
  console.log('  Variance = Actual Cost - Planned Cost');
  console.log('\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
