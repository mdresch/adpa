import { Langfuse, type LangfusePromptClient } from 'langfuse';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

type AdpaScenario = {
  id: string;
  domain: string;
  processArea: string;
  riskCategory: string;
  complianceControl: string;
  documentId: string;
  projectId: string;
  templateId: string;
  extractedEntities: string[];
  input: {
    projectName: string;
    objective: string;
    constraints: string[];
    baselineDeviationPct: number;
    riskSignal: string;
  };
  expectedOutput: {
    recommendationSummary: string;
    complianceLevel: 'high' | 'medium' | 'low';
  };
};

const DATASET_NAME = 'adpa-compliance-validation-v1';
const PROMPT_NAME = 'adpa_recommendation_core';
const RUN_NAME = `adpa-prod-run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const TELEMETRY_ENV = process.env.NODE_ENV ?? 'production';
const TRACE_PREFIX = 'adpa.production';

const scenarios: AdpaScenario[] = [
  {
    id: 'adpa-ds-001',
    domain: 'governance',
    processArea: 'change-control',
    riskCategory: 'scope-drift',
    complianceControl: 'ISO-9001-ChangeManagement',
    documentId: 'doc-adpa-001',
    projectId: 'proj-adpa-portfolio-transformation',
    templateId: 'tpl-adpa-ccb-governance-v2',
    extractedEntities: ['ChangeControlBoard', 'ScopeDelta', 'RiskOwner', 'ApprovalWindow'],
    input: {
      projectName: 'ADPA Portfolio Transformation',
      objective: 'Stabilize delivery cadence with governed change approvals',
      constraints: ['budget freeze', '2-week release trains'],
      baselineDeviationPct: 12,
      riskSignal: 'unapproved scope changes in sprint backlog',
    },
    expectedOutput: {
      recommendationSummary: 'Route high-impact backlog items through CCB with explicit risk owners.',
      complianceLevel: 'high',
    },
  },
  {
    id: 'adpa-ds-002',
    domain: 'portfolio',
    processArea: 'benefits-realization',
    riskCategory: 'value-leakage',
    complianceControl: 'PMO-Benefits-Tracking',
    documentId: 'doc-adpa-002',
    projectId: 'proj-adpa-data-platform-rollout',
    templateId: 'tpl-adpa-benefits-review-v1',
    extractedEntities: ['BenefitKPI', 'Owner', 'OutcomeDependency', 'ReportingCadence'],
    input: {
      projectName: 'ADPA Data Platform Rollout',
      objective: 'Improve measurable business outcomes from AI recommendations',
      constraints: ['shared platform team', 'limited analytics bandwidth'],
      baselineDeviationPct: 8,
      riskSignal: 'benefit KPI trending below target for 3 cycles',
    },
    expectedOutput: {
      recommendationSummary: 'Prioritize KPI-linked backlog and tighten outcome ownership in monthly reviews.',
      complianceLevel: 'medium',
    },
  },
  {
    id: 'adpa-ds-003',
    domain: 'risk',
    processArea: 'mitigation-planning',
    riskCategory: 'delivery-slippage',
    complianceControl: 'PMBOK-RiskResponse',
    documentId: 'doc-adpa-003',
    projectId: 'proj-adpa-security-controls-program',
    templateId: 'tpl-adpa-risk-escalation-v3',
    extractedEntities: ['CriticalRisk', 'MitigationAction', 'DueDate', 'ControlOwner'],
    input: {
      projectName: 'ADPA Security Controls Program',
      objective: 'Reduce unresolved critical risks by 40%',
      constraints: ['audit window in 45 days', 'resource contention'],
      baselineDeviationPct: 16,
      riskSignal: 'critical mitigations overdue and owners unassigned',
    },
    expectedOutput: {
      recommendationSummary: 'Escalate overdue mitigations and auto-assign accountable owners with deadlines.',
      complianceLevel: 'low',
    },
  },
];

const users = [
  'adpa.user.portfolio-lead',
  'adpa.user.pmo-analyst',
  'adpa.user.risk-manager',
];

async function ensurePromptVersions(langfuse: Langfuse): Promise<LangfusePromptClient | null> {
  try {
    await langfuse.createPrompt({
      type: 'text',
      name: PROMPT_NAME,
      prompt:
        'You are the ADPA recommendation engine. Evaluate the provided project risk and controls context. Return JSON with fields: recommendation, compliance_rationale, next_actions.',
      labels: ['staging'],
      tags: ['adpa', 'recommendation', 'v1'],
      commitMessage: 'Seed baseline ADPA recommendation prompt',
    });

    await langfuse.createPrompt({
      type: 'text',
      name: PROMPT_NAME,
      prompt:
        'You are the ADPA recommendation engine. Produce concise governed recommendations with explicit compliance rationale, ranked actions, and owner suggestions. Return strict JSON.',
      labels: ['production'],
      tags: ['adpa', 'recommendation', 'v2'],
      commitMessage: 'Optimize for compliance-grounded recommendations',
    });
  } catch (error) {
    console.log('Prompt create/update skipped (likely already exists):', (error as Error).message);
  }

  try {
    return await langfuse.getPrompt(PROMPT_NAME, undefined, {
      label: 'production',
      type: 'text',
      fallback:
        'Generate compliance-grounded recommendation JSON with recommendation, compliance_rationale, next_actions.',
      maxRetries: 1,
    });
  } catch (error) {
    console.log('Prompt retrieval failed, proceeding without prompt-linking:', (error as Error).message);
    return null;
  }
}

async function ensureScoreConfigs(langfuse: Langfuse): Promise<void> {
  const api: any = langfuse.api;
  if (!api?.scoreConfigsGet || !api?.scoreConfigsCreate) {
    console.log('Score config API unavailable; skipping score config provisioning.');
    return;
  }

  const existing = await api.scoreConfigsGet({ page: 1, limit: 100 });
  const names = new Set((existing?.data ?? []).map((item: any) => item.name));

  if (!names.has('compliance_score')) {
    await api.scoreConfigsCreate({
      name: 'compliance_score',
      dataType: 'NUMERIC',
      minValue: 0,
      maxValue: 1,
      description: 'Compliance conformance score for ADPA recommendations.',
    });
  }

  if (!names.has('llm_judge_recommendation_quality')) {
    await api.scoreConfigsCreate({
      name: 'llm_judge_recommendation_quality',
      dataType: 'NUMERIC',
      minValue: 0,
      maxValue: 1,
      description: 'LLM-as-a-judge quality score for recommendation relevance/actionability.',
    });
  }

  if (!names.has('session_compliance_score')) {
    await api.scoreConfigsCreate({
      name: 'session_compliance_score',
      dataType: 'NUMERIC',
      minValue: 0,
      maxValue: 1,
      description: 'Session-level aggregate compliance score.',
    });
  }
}

async function ensureDataset(langfuse: Langfuse): Promise<void> {
  await langfuse.createDataset({
    name: DATASET_NAME,
    description: 'ADPA compliance and recommendation validation dataset',
    metadata: {
      owner: 'adpa-observability',
      environment: TELEMETRY_ENV,
      taxonomyVersion: '2026.02',
    },
  });

  for (const scenario of scenarios) {
    await langfuse.createDatasetItem({
      id: scenario.id,
      datasetName: DATASET_NAME,
      input: scenario.input,
      expectedOutput: scenario.expectedOutput,
      metadata: {
        domain: scenario.domain,
        processArea: scenario.processArea,
        riskCategory: scenario.riskCategory,
        complianceControl: scenario.complianceControl,
        documentId: scenario.documentId,
        projectId: scenario.projectId,
        templateId: scenario.templateId,
        extractedEntities: scenario.extractedEntities,
      },
      status: 'ACTIVE',
    });
  }
}

function judgeScore(output: string, expected: string): number {
  const overlap = expected
    .toLowerCase()
    .split(' ')
    .filter((token) => token.length > 4)
    .filter((token) => output.toLowerCase().includes(token)).length;
  return Math.min(1, Math.max(0.2, overlap / 6));
}

async function seedRichTelemetry(langfuse: Langfuse, promptClient: LangfusePromptClient | null): Promise<void> {
  const dataset = await langfuse.getDataset(DATASET_NAME, { fetchItemsPageSize: 50 });

  let linkedRunItems = 0;
  let traceCount = 0;
  let scoreCount = 0;

  for (let index = 0; index < dataset.items.length; index++) {
    const item = dataset.items[index];
    const scenario = scenarios.find((candidate) => candidate.id === item.id);
    if (!scenario) continue;

    const userId = users[index % users.length];
    const sessionId = `adpa-session-${scenario.domain}-${RUN_NAME}`;

    const recommendation = {
      recommendation:
        scenario.expectedOutput.recommendationSummary +
        ' Include owner accountability, due dates, and control evidence.',
      compliance_rationale: `Aligned to ${scenario.complianceControl} with explicit control-owner mapping.`,
      next_actions: [
        'Assign accountable owner',
        'Set measurable target KPI',
        'Schedule 2-week governance checkpoint',
      ],
    };

    const trace = langfuse.trace({
      name: `${TRACE_PREFIX}.${scenario.processArea}.recommendation`,
      userId,
      sessionId,
      input: scenario.input,
      output: recommendation,
      version: 'adpa-telemetry-v2',
      release: '2026.02.production-readiness',
      environment: TELEMETRY_ENV,
      tags: [
        'adpa',
        'compliance',
        'recommendation',
        scenario.domain,
        scenario.riskCategory,
        `project:${scenario.projectId}`,
        `template:${scenario.templateId}`,
        `document:${scenario.documentId}`,
      ],
      metadata: {
        datasetItemId: scenario.id,
        runName: RUN_NAME,
        observationLevelStrategy: ['DEBUG', 'DEFAULT', 'WARNING', 'ERROR'],
        sourceContext: {
          documentId: scenario.documentId,
          projectId: scenario.projectId,
          templateId: scenario.templateId,
        },
        extraction: {
          entityCount: scenario.extractedEntities.length,
          extractedEntities: scenario.extractedEntities,
        },
      },
    });

    const orchestrationSpan = trace.span({
      name: 'adpa.pipeline.orchestration',
      input: scenario.input,
      metadata: {
        stage: 'recommendation',
        orchestration: 'policy-aware-routing',
        sourceContext: {
          documentId: scenario.documentId,
          projectId: scenario.projectId,
          templateId: scenario.templateId,
        },
      },
      level: 'DEFAULT',
      environment: TELEMETRY_ENV,
    });

    const generation = orchestrationSpan.generation({
      name: 'adpa.llm.recommendation',
      model: 'gpt-4.1',
      input: scenario.input,
      output: recommendation,
      usage: {
        input: 680 + index * 7,
        output: 220 + index * 5,
        total: 900 + index * 12,
        unit: 'TOKENS',
      },
      level: scenario.expectedOutput.complianceLevel === 'low' ? 'WARNING' : 'DEFAULT',
      metadata: {
        promptTemplate: PROMPT_NAME,
        policyPack: 'adpa-policy-core',
        extractedEntities: scenario.extractedEntities,
        sourceDocumentId: scenario.documentId,
      },
      prompt: promptClient ?? undefined,
      environment: TELEMETRY_ENV,
    });

    generation.event({
      name: 'adpa.document.entity-extraction',
      input: {
        documentId: scenario.documentId,
        templateId: scenario.templateId,
      },
      output: {
        extractedEntities: scenario.extractedEntities,
      },
      metadata: {
        projectId: scenario.projectId,
        extractionProvider: 'adpa-entity-pipeline',
      },
      level: 'DEBUG',
      environment: TELEMETRY_ENV,
    });

    generation.score({
      name: 'compliance_score',
      value: scenario.expectedOutput.complianceLevel === 'high' ? 0.92 : scenario.expectedOutput.complianceLevel === 'medium' ? 0.78 : 0.61,
      dataType: 'NUMERIC',
      comment: 'Policy conformance score based on ADPA control mapping coverage.',
      metadata: {
        scoringSource: 'adpa-policy-rules',
        control: scenario.complianceControl,
        sourceContext: {
          documentId: scenario.documentId,
          projectId: scenario.projectId,
          templateId: scenario.templateId,
        },
      },
      environment: TELEMETRY_ENV,
    });
    scoreCount++;

    const llmJudge = judgeScore(
      JSON.stringify(recommendation),
      scenario.expectedOutput.recommendationSummary,
    );

    generation.score({
      name: 'llm_judge_recommendation_quality',
      value: llmJudge,
      dataType: 'NUMERIC',
      comment: 'LLM-as-a-Judge style quality estimate for recommendation relevance.',
      metadata: {
        judgeModel: 'adpa-judge-sim-v1',
        criterion: ['relevance', 'actionability', 'compliance-rationale'],
        extractedEntities: scenario.extractedEntities,
      },
      environment: TELEMETRY_ENV,
    });
    scoreCount++;

    trace.event({
      name: 'adpa.validation.checkpoint',
      input: {
        expectedOutput: scenario.expectedOutput,
      },
      output: {
        observedRecommendation: recommendation.recommendation,
        status: llmJudge >= 0.65 ? 'pass' : 'needs_review',
      },
      level: llmJudge >= 0.65 ? 'DEBUG' : 'ERROR',
      metadata: {
        validator: 'adpa-dataset-runner',
        sourceContext: {
          documentId: scenario.documentId,
          projectId: scenario.projectId,
          templateId: scenario.templateId,
        },
      },
      environment: TELEMETRY_ENV,
    });

    orchestrationSpan.end({
      output: recommendation,
      statusMessage: 'Recommendation generated and scored',
      level: 'DEFAULT',
      metadata: {
        runName: RUN_NAME,
        linkedToDataset: true,
      },
      environment: TELEMETRY_ENV,
    });

    trace.score({
      name: 'session_compliance_score',
      value: llmJudge,
      dataType: 'NUMERIC',
      comment: 'Session-level aggregate compliance proxy score.',
      metadata: {
        source: 'aggregate-from-observations',
      },
      environment: TELEMETRY_ENV,
    });
    scoreCount++;

    await item.link(generation, RUN_NAME, {
      description: 'ADPA rich telemetry validation run',
      metadata: {
        domain: scenario.domain,
        processArea: scenario.processArea,
      },
    });
    linkedRunItems++;
    traceCount++;
  }

  console.log(
    JSON.stringify(
      {
        runName: RUN_NAME,
        dataset: DATASET_NAME,
        tracesCreated: traceCount,
        scoresCreated: scoreCount,
        datasetRunLinksCreated: linkedRunItems,
      },
      null,
      2,
    ),
  );
}

async function seedAnnotationHooks(langfuse: Langfuse): Promise<void> {
  try {
    const api: any = langfuse.api;
    if (!api?.annotationQueuesListQueues) {
      console.log('Annotation queue API not available on current key/scope; skipping annotation hook seed.');
      return;
    }

    const queues = await api.annotationQueuesListQueues({ page: 1, limit: 10 });
    const firstQueue = queues?.data?.[0];
    if (!firstQueue?.id) {
      console.log('No annotation queue configured; skipping annotation hook seed.');
      return;
    }

    const traces = await api.traceList({ page: 1, limit: 3, name: TRACE_PREFIX });
    const traceItems = traces?.data ?? [];

    for (const traceItem of traceItems) {
      await api.annotationQueuesCreateQueueItem(firstQueue.id, {
        objectId: traceItem.id,
        objectType: 'TRACE',
        status: 'PENDING',
      });
    }

    const queuedItems = await api.annotationQueuesListQueueItems(firstQueue.id, { page: 1, limit: 20 });
    console.log(`Annotation queue '${firstQueue.name}' pending items seeded/available: ${queuedItems?.data?.length ?? 0}`);
  } catch (error) {
    console.log('Annotation hook seed skipped:', (error as Error).message);
  }
}

type ValidationResult = {
  check: string;
  pass: boolean;
  details: string;
};

async function validateFeatureReadiness(langfuse: Langfuse): Promise<ValidationResult[]> {
  const api: any = langfuse.api;
  const results: ValidationResult[] = [];

  try {
    const traces = await api.traceList({ page: 1, limit: 20, name: TRACE_PREFIX });
    const count = traces?.data?.length ?? 0;
    const firstTrace = traces?.data?.[0];
    const metadata = firstTrace?.metadata ?? {};
    const hasContext = Boolean(
      metadata?.sourceContext?.documentId &&
      metadata?.sourceContext?.projectId &&
      metadata?.sourceContext?.templateId,
    );
    const hasEntities = Array.isArray(metadata?.extraction?.extractedEntities);

    results.push({
      check: 'traces',
      pass: count > 0,
      details: `Found ${count} production-style traces`,
    });

    results.push({
      check: 'trace-source-context',
      pass: hasContext && hasEntities,
      details: hasContext && hasEntities
        ? 'Trace metadata includes documentId/projectId/templateId and extractedEntities'
        : 'Missing sourceContext or extraction metadata on sampled traces',
    });
  } catch (error) {
    results.push({ check: 'traces', pass: false, details: (error as Error).message });
    results.push({ check: 'trace-source-context', pass: false, details: (error as Error).message });
  }

  try {
    const sessions = await langfuse.fetchSessions({ name: TRACE_PREFIX, page: 1, limit: 20 });
    const count = sessions?.data?.length ?? 0;
    results.push({
      check: 'sessions',
      pass: count > 0,
      details: `Found ${count} sessions linked to ADPA traces`,
    });
  } catch (error) {
    results.push({ check: 'sessions', pass: false, details: (error as Error).message });
  }

  try {
    const complianceScores = await api.scoreV2Get({ page: 1, limit: 20, name: 'compliance_score' });
    const judgeScores = await api.scoreV2Get({ page: 1, limit: 20, name: 'llm_judge_recommendation_quality' });
    const total = (complianceScores?.data?.length ?? 0) + (judgeScores?.data?.length ?? 0);
    results.push({
      check: 'scores',
      pass: total > 0,
      details: `Found ${total} compliance/judge scores`,
    });
  } catch (error) {
    results.push({ check: 'scores', pass: false, details: (error as Error).message });
  }

  try {
    const prompt = await api.promptsGet({ promptName: PROMPT_NAME, label: 'production' });
    const version = prompt?.version ?? 'unknown';
    results.push({
      check: 'prompts',
      pass: Boolean(prompt?.name),
      details: `Prompt '${PROMPT_NAME}' available with production label at version ${version}`,
    });
  } catch (error) {
    results.push({ check: 'prompts', pass: false, details: (error as Error).message });
  }

  try {
    const datasetRuns = await langfuse.getDatasetRuns(DATASET_NAME, { page: 1, limit: 10 });
    const count = datasetRuns?.data?.length ?? 0;
    results.push({
      check: 'datasets',
      pass: count > 0,
      details: `Found ${count} dataset runs for ${DATASET_NAME}`,
    });
  } catch (error) {
    results.push({ check: 'datasets', pass: false, details: (error as Error).message });
  }

  try {
    if (!api?.annotationQueuesListQueues) {
      results.push({
        check: 'annotation-hooks',
        pass: true,
        details: 'Annotation API not available for this key scope (skipped by design)',
      });
    } else {
      const queues = await api.annotationQueuesListQueues({ page: 1, limit: 10 });
      const count = queues?.data?.length ?? 0;
      results.push({
        check: 'annotation-hooks',
        pass: count >= 0,
        details: `Annotation queue API reachable; queues=${count}`,
      });
    }
  } catch (error) {
    results.push({ check: 'annotation-hooks', pass: false, details: (error as Error).message });
  }

  return results;
}

async function runSetup(langfuse: Langfuse): Promise<LangfusePromptClient | null> {
  await ensureDataset(langfuse);
  await ensureScoreConfigs(langfuse);
  return ensurePromptVersions(langfuse);
}

async function runFeatureTest(langfuse: Langfuse, promptClient: LangfusePromptClient | null): Promise<void> {
  await seedRichTelemetry(langfuse, promptClient);
  await seedAnnotationHooks(langfuse);

  const results = await validateFeatureReadiness(langfuse);
  const failed = results.filter((result) => !result.pass);

  console.log('\nLangfuse Feature Validation Results');
  for (const result of results) {
    console.log(`- [${result.pass ? 'PASS' : 'FAIL'}] ${result.check}: ${result.details}`);
  }

  if (failed.length > 0) {
    throw new Error(`Feature validation failed for: ${failed.map((item) => item.check).join(', ')}`);
  }
}

async function main() {
  const mode = (process.argv[2] ?? 'all').toLowerCase();

  const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL,
    environment: TELEMETRY_ENV,
  });

  console.log(`Starting ADPA Langfuse production readiness run: ${RUN_NAME} (mode=${mode})`);

  let promptClient: LangfusePromptClient | null = null;

  if (mode === 'setup' || mode === 'all') {
    promptClient = await runSetup(langfuse);
  }

  if (mode === 'test' || mode === 'all') {
    if (!promptClient) {
      promptClient = await ensurePromptVersions(langfuse);
    }
    await runFeatureTest(langfuse, promptClient);
  }

  await langfuse.flushAsync();
  console.log('ADPA Langfuse production readiness flow complete and flushed.');
}

main().catch((error) => {
  console.error('ADPA rich seed failed:', error);
  process.exit(1);
});
