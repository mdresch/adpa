import { DocumentRepository } from '../../../modules/documents/DocumentRepository';

describe('DocumentRepository.findAllStatusCounts', () => {
  it('returns published, reviewed, and draft totals for the filtered fleet', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ published: '12', reviewed: '5', draft: '3', archived: '2' }],
    });
    const repo = new DocumentRepository({ query } as never);

    const counts = await repo.findAllStatusCounts({
      userId: 'user-1',
      isSuperAdmin: true,
      userCompanyId: null,
      framework: 'PMBOK7',
    });

    expect(counts).toEqual({ published: 12, reviewed: 5, draft: 3, archived: 2 });
    expect(query).toHaveBeenCalledTimes(1);
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("FILTER (WHERE LOWER(COALESCE(d.status, 'draft')) = 'published')");
    expect(sql).toContain("FILTER (WHERE LOWER(d.status) = 'archived')");
    expect(sql).not.toContain('d.status = $');
  });
});
