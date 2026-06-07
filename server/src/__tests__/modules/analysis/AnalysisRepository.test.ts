import { AnalysisRepository } from "../../../modules/analysis/AnalysisRepository";

describe("AnalysisRepository.getEntitiesByDocument", () => {
  it("queries only entities saved on the requested document", async () => {
    const fakeRows = [
      { id: "e1", document_id: "doc-1", entity_type: "risk", entity_name: "Budget risk" },
    ];

    const query = jest.fn().mockResolvedValue({ rows: fakeRows });
    const repository = new AnalysisRepository({ query } as never);

    const result = await repository.getEntitiesByDocument("doc-1");

    expect(result).toEqual(fakeRows);
    expect(query).toHaveBeenCalledTimes(1);

    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual(["doc-1"]);
    expect(sql).toContain("document_id = $1");
    expect(sql).not.toContain("source_document_ids");
  });
});

