export type RagSourceType = 'document' | 'project' | 'entity' | 'program' | 'portfolio';

export function buildPortfolioRagText(portfolio: {
  portfolio_name: string;
  description?: string | null;
  status?: string | null;
}): string {
  const lines = [
    `Portfolio: ${portfolio.portfolio_name}`,
    portfolio.status ? `Status: ${portfolio.status}` : null,
    portfolio.description?.trim() ? `Description: ${portfolio.description.trim()}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildProgramRagText(program: {
  name: string;
  description?: string | null;
  status?: string | null;
}): string {
  const lines = [
    `Program: ${program.name}`,
    program.status ? `Status: ${program.status}` : null,
    program.description?.trim() ? `Description: ${program.description.trim()}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildProjectRagText(project: {
  name: string;
  description?: string | null;
  framework?: string | null;
  status?: string | null;
}): string {
  const lines = [
    `Project: ${project.name}`,
    project.framework ? `Framework: ${project.framework}` : null,
    project.status ? `Status: ${project.status}` : null,
    project.description?.trim() ? `Description: ${project.description.trim()}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildEntityRagText(entity: {
  entity_name?: string | null;
  entity_type: string;
  entity_data?: Record<string, unknown> | null;
}): string {
  const name = entity.entity_name?.trim() || 'Unnamed entity';
  const payload =
    entity.entity_data && Object.keys(entity.entity_data).length > 0
      ? JSON.stringify(entity.entity_data)
      : '{}';

  return `[${entity.entity_type}] ${name}\nDetails: ${payload}`;
}
