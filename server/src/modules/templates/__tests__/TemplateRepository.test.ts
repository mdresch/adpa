import { TemplateRepository } from '../TemplateRepository';

describe('TemplateRepository', () => {
  it('normalizes JSONB update values before sending them to Postgres', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: 'template-1' }] });
    const repository = new TemplateRepository({ query } as any);

    await repository.update('template-1', {
      content: '{"blocks":[]}',
      variables: [{ name: 'projectName', type: 'text' }],
      template_paragraphs: '',
      gkg_context_strategy: null,
    });

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];

    expect(sql).toContain('UPDATE templates SET');
    expect(params).toEqual([
      'template-1',
      '{"blocks":[]}',
      JSON.stringify([{ name: 'projectName', type: 'text' }]),
      null,
      null,
    ]);
  });
});
