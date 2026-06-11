import {
  buildEntityRagText,
  buildPortfolioRagText,
  buildProgramRagText,
  buildProjectRagText,
} from '../../lib/mongoRagText';

describe('mongoRagText', () => {
  it('buildProjectRagText includes name, framework, status, and description', () => {
    const text = buildProjectRagText({
      name: 'ADPA Demo',
      description: 'Governance pilot',
      framework: 'PMBOK',
      status: 'active',
    });

    expect(text).toContain('Project: ADPA Demo');
    expect(text).toContain('Framework: PMBOK');
    expect(text).toContain('Status: active');
    expect(text).toContain('Description: Governance pilot');
  });

  it('buildPortfolioRagText includes portfolio name and description', () => {
    const text = buildPortfolioRagText({
      portfolio_name: 'Enterprise PMO',
      description: 'Strategic portfolio',
      status: 'active',
    });

    expect(text).toContain('Portfolio: Enterprise PMO');
    expect(text).toContain('Description: Strategic portfolio');
  });

  it('buildProgramRagText includes program name and status', () => {
    const text = buildProgramRagText({
      name: 'Digital Transformation',
      description: 'FY26 program',
      status: 'green',
    });

    expect(text).toContain('Program: Digital Transformation');
    expect(text).toContain('Status: green');
  });

  it('buildEntityRagText formats type, name, and payload', () => {
    const text = buildEntityRagText({
      entity_name: 'Budget Owner',
      entity_type: 'stakeholder',
      entity_data: { role: 'sponsor' },
    });

    expect(text).toContain('[stakeholder] Budget Owner');
    expect(text).toContain('"role":"sponsor"');
  });
});
