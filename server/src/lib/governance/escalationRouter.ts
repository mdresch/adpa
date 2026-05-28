// server/src/lib/governance/escalationRouter.ts

export interface EscalationPayload {
  ruleCode: string;
  title: string;
  score: number;
  previousStatus: string;
  currentStatus: string;
  totalInvocations: number;
  overrideRate: string;
}

export async function dispatchGovernanceEscalation(payload: EscalationPayload): Promise<void> {
  const { ruleCode, title, score, currentStatus, overrideRate } = payload;
  
  console.warn(`🚨 GOVERNANCE ESCALATION: Control ${ruleCode} has degraded to ${currentStatus} (Score: ${score})`);

  // Define your enterprise target webhook (Slack, Teams, PagerDuty, Internal Audit Log)
  const webhookUrl = process.env.GOVERNANCE_ALERTS_WEBHOOK;
  if (!webhookUrl) {
    console.log("⚠️ Escalation Webhook unconfigured. Skipping outbound notification dispatch.");
    return;
  }

  try {
    const message = {
      text: `🚨 *ADPA Governance Engine Exception Alert* 🚨\n` +
            `*Control Objective Failure Detected at Runtime.*\n\n` +
            `• *Rule Code:* \`${ruleCode}\`\n` +
            `• *Title:* ${title}\n` +
            `• *Maturity Status:* \`${currentStatus}\` (${score})\n` +
            `• *User Override Rate:* ${overrideRate}\n\n` +
            `*Action Required:* Review Policy Library Dashboard immediately to adjust prompt alignment or audit bypass patterns.`
    };

    // Fast, non-blocking outbound HTTP dispatch
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (error) {
    console.error(`❌ Failed to dispatch outbound governance alert for ${ruleCode}:`, error);
  }
}
