#!/usr/bin/env node

/**
 * End-to-End Demo: Emergency Meeting Auto-Scheduling
 * 
 * This script demonstrates the complete workflow of the emergency meeting
 * auto-scheduling feature without requiring a live database connection.
 * 
 * It shows:
 * 1. Budget overrun detection
 * 2. Alert generation with severity classification
 * 3. Automatic meeting scheduling
 * 4. Notification queue generation
 * 5. Complete workflow from detection to resolution
 */

console.log('\n🚀 Emergency Meeting Auto-Scheduling - End-to-End Demo\n');
console.log('This demo shows how the system automatically schedules emergency meetings');
console.log('when critical budget overruns are detected.\n');

// Simulate Budget Overrun Detection
console.log('═══════════════════════════════════════════════════════════════');
console.log('STEP 1: Budget Overrun Detection');
console.log('═══════════════════════════════════════════════════════════════\n');

const projectData = {
  projectId: '123e4567-e89b-12d3-a456-426614174000',
  projectName: 'CRM Upgrade Project',
  approvedBudget: 500000,
  projectedCost: 650000
};

const overrunAmount = projectData.projectedCost - projectData.approvedBudget;
const overrunPercentage = (overrunAmount / projectData.approvedBudget) * 100;

console.log('Project:', projectData.projectName);
console.log('Approved Budget: $' + projectData.approvedBudget.toLocaleString());
console.log('Projected Cost: $' + projectData.projectedCost.toLocaleString());
console.log('Overrun Amount: $' + overrunAmount.toLocaleString());
console.log('Overrun Percentage:', overrunPercentage.toFixed(1) + '%');

// Classify Severity
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('STEP 2: Severity Classification');
console.log('═══════════════════════════════════════════════════════════════\n');

let severity, schedulingWindow, escalationTargets;

if (overrunPercentage >= 25) {
  severity = 'EMERGENCY';
  schedulingWindow = '12 hours';
  escalationTargets = ['CEO', 'CFO', 'Board Finance Committee', 'Project Sponsor'];
} else if (overrunPercentage >= 10) {
  severity = 'CRITICAL';
  schedulingWindow = '24 hours';
  escalationTargets = ['CFO', 'Project Sponsor', 'CTO', 'Program Manager'];
} else {
  severity = 'WARNING';
  schedulingWindow = '72 hours';
  escalationTargets = ['Project Manager', 'Finance Controller', 'Project Sponsor'];
}

console.log('Severity Level: 🚨', severity);
console.log('Meeting Scheduled Within:', schedulingWindow);
console.log('Escalated To:', escalationTargets.join(', '));

// Generate Alert
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('STEP 3: Alert Generation');
console.log('═══════════════════════════════════════════════════════════════\n');

const alert = {
  id: 'alert-001',
  severity: severity,
  title: `🚨 ${severity}: Budget Overrun Detected - ${projectData.projectName}`,
  description: `Project exceeding budget by $${overrunAmount.toLocaleString()} (${overrunPercentage.toFixed(1)}%)`,
  rootCause: {
    category: 'Scope Creep',
    description: 'Added 4 unapproved features in month 3',
    preventable: true
  }
};

console.log(alert.title);
console.log('\nRoot Cause:');
console.log('  Category:', alert.rootCause.category);
console.log('  Description:', alert.rootCause.description);
console.log('  Preventable:', alert.rootCause.preventable ? 'Yes' : 'No');

// Generate Corrective Options
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('STEP 4: Corrective Options Analysis');
console.log('═══════════════════════════════════════════════════════════════\n');

const correctiveOptions = [
  {
    option: '1. Approve additional $150K funding',
    recommendation: false,
    reasoning: 'Rewards poor scope control'
  },
  {
    option: '2. Reduce scope to baseline',
    recommendation: true,
    reasoning: 'Maintains fiscal discipline while delivering core value'
  },
  {
    option: '3. Partial approval ($75K for priority features)',
    recommendation: false,
    reasoning: 'Compromise may not satisfy stakeholders'
  },
  {
    option: '4. Cancel project',
    recommendation: false,
    reasoning: 'Only if project no longer strategic'
  }
];

correctiveOptions.forEach(option => {
  const prefix = option.recommendation ? '✓ RECOMMENDED' : '  ';
  console.log(`${prefix} ${option.option}`);
  console.log(`     Reasoning: ${option.reasoning}\n`);
});

// Schedule Emergency Meeting
console.log('═══════════════════════════════════════════════════════════════');
console.log('STEP 5: Emergency Meeting Auto-Scheduling');
console.log('═══════════════════════════════════════════════════════════════\n');

const now = new Date();
const meetingTime = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now

const meeting = {
  id: 'meeting-001',
  title: `${severity === 'EMERGENCY' ? '🚨 EMERGENCY' : '🚨 URGENT'}: Budget Review - ${projectData.projectName}`,
  meetingType: 'emergency_budget_overrun',
  scheduledStart: meetingTime,
  duration: 60,
  agenda: [
    { order: 0, topic: '🚨 Emergency Budget Overrun Review', duration: 5 },
    { order: 1, topic: 'Review Alert and Analysis', duration: 15 },
    { order: 2, topic: 'Root Cause Discussion', duration: 15 },
    { order: 3, topic: 'Review Corrective Options', duration: 20 },
    { order: 4, topic: 'Make Decision', duration: 15 },
    { order: 5, topic: 'Approve Change Request', duration: 10 }
  ],
  attendees: escalationTargets.map(role => ({
    name: role,
    email: `${role.toLowerCase().replace(/ /g, '.')}@company.com`,
    role: ['CEO', 'CFO', 'Project Sponsor'].includes(role) ? 'decision_maker' : 'required',
    rsvpStatus: 'pending'
  })),
  autoGenerated: true,
  autoScheduledReason: `Auto-scheduled due to ${severity.toLowerCase()} budget overrun (${overrunPercentage.toFixed(1)}% over budget)`
};

console.log('✓ Emergency Meeting Scheduled');
console.log('\nMeeting ID:', meeting.id);
console.log('Title:', meeting.title);
console.log('Scheduled:', meetingTime.toLocaleString());
console.log('Duration:', meeting.duration, 'minutes');
console.log('Auto-Generated: Yes');

console.log('\nAgenda:');
meeting.agenda.forEach(item => {
  console.log(`  ${item.order}. ${item.topic} (${item.duration} min)`);
});

console.log(`\nAttendees (${meeting.attendees.length}):`);
meeting.attendees.forEach(attendee => {
  const rolePrefix = attendee.role === 'decision_maker' ? '★' : ' ';
  console.log(`  ${rolePrefix} ${attendee.name} (${attendee.role}) - ${attendee.email}`);
});

// Queue Notifications
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('STEP 6: Multi-Channel Notifications');
console.log('═══════════════════════════════════════════════════════════════\n');

const notifications = meeting.attendees.map(attendee => ({
  type: 'meeting_invitation',
  recipient: attendee.email,
  subject: `${severity === 'EMERGENCY' ? '🚨 EMERGENCY' : '🚨'} Meeting Invitation: Budget Review Required`,
  priority: severity === 'EMERGENCY' ? 'emergency' : 'urgent',
  channels: severity === 'EMERGENCY' ? ['email', 'slack', 'sms', 'dashboard'] : ['email', 'slack', 'dashboard'],
  status: 'pending'
}));

console.log(`✓ ${notifications.length} Notifications Queued\n`);
notifications.forEach(notif => {
  console.log(`  To: ${notif.recipient}`);
  console.log(`     Priority: ${notif.priority}`);
  console.log(`     Channels: ${notif.channels.join(', ')}`);
  console.log(`     Status: ${notif.status}\n`);
});

// Workflow Summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('STEP 7: Complete Workflow Summary');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('✓ Budget overrun detected → 30% over baseline');
console.log('✓ Alert generated → EMERGENCY severity');
console.log('✓ Meeting auto-scheduled → Within 12 hours');
console.log('✓ Stakeholders notified → Multi-channel (email, Slack, SMS)');
console.log('✓ Corrective options prepared → 4 options with recommendations');
console.log('✓ Change Request linked → For approval workflow');

// Next Steps
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('Next Steps in Production');
console.log('═══════════════════════════════════════════════════════════════\n');

const nextSteps = [
  { step: 'Stakeholders receive notifications', status: 'automated' },
  { step: 'Attendees RSVP to meeting', status: 'user action' },
  { step: 'Meeting occurs (emergency review)', status: 'scheduled' },
  { step: 'Decision made on corrective action', status: 'user action' },
  { step: 'Change Request approved/rejected', status: 'user action' },
  { step: 'Alert resolved and closed', status: 'automated' }
];

nextSteps.forEach((item, index) => {
  console.log(`${index + 1}. ${item.step} (${item.status})`);
});

// API Endpoints
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('API Endpoints Available');
console.log('═══════════════════════════════════════════════════════════════\n');

const endpoints = [
  { method: 'POST', path: '/api/meetings/alerts/budget-overrun', desc: 'Create budget overrun alert' },
  { method: 'GET', path: '/api/meetings/project/:projectId', desc: 'List meetings for project' },
  { method: 'GET', path: '/api/meetings/:id', desc: 'Get meeting details' },
  { method: 'PATCH', path: '/api/meetings/:id/rsvp', desc: 'Update RSVP status' },
  { method: 'PATCH', path: '/api/meetings/:id/cancel', desc: 'Cancel meeting' },
  { method: 'GET', path: '/api/meetings/alerts/project/:projectId', desc: 'List alerts for project' },
  { method: 'PATCH', path: '/api/meetings/alerts/:alertId/acknowledge', desc: 'Acknowledge alert' },
  { method: 'PATCH', path: '/api/meetings/alerts/:alertId/resolve', desc: 'Resolve alert' }
];

endpoints.forEach(endpoint => {
  console.log(`${endpoint.method.padEnd(6)} ${endpoint.path}`);
  console.log(`         ${endpoint.desc}\n`);
});

// Success Summary
console.log('\n✅ Demo Complete!\n');
console.log('The emergency meeting auto-scheduling feature is fully implemented and ready for testing.');
console.log('Run the tests with: cd server && npm test -- meeting-scheduler.test\n');

console.log('📚 Documentation: docs/06-features/EMERGENCY_MEETING_AUTO_SCHEDULING.md\n');

