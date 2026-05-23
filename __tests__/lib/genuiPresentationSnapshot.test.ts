import {
  buildPresentationSnapshotDraft,
  buildRenderRecipe,
  defaultIntegrationArtifactPreference,
  fingerprintSourceMarkdown,
  isGenuiPresentationIntegrationPlatform,
  isPresentationStale,
  resolveGenuiLayoutModeFromPrompt,
} from "@/lib/genui/presentationSnapshot";

describe("fingerprintSourceMarkdown", () => {
  it("is stable for the same content", () => {
    const a = fingerprintSourceMarkdown("# Title\n\nBody");
    const b = fingerprintSourceMarkdown("# Title\n\nBody");
    expect(a).toBe(b);
  });

  it("changes when markdown changes", () => {
    const a = fingerprintSourceMarkdown("version one");
    const b = fingerprintSourceMarkdown("version two");
    expect(a).not.toBe(b);
  });
});

describe("buildRenderRecipe", () => {
  it("marks focused layout from prompt", () => {
    const recipe = buildRenderRecipe("from this report, generate a gantt chart, no cover");
    expect(recipe.layoutMode).toBe("focused");
    expect(recipe.specVersion).toBe("1");
  });
});

describe("resolveGenuiLayoutModeFromPrompt", () => {
  it("detects full document render intent", () => {
    expect(
      resolveGenuiLayoutModeFromPrompt("render the full document with cover and table of contents")
    ).toBe("full");
  });
});

describe("buildPresentationSnapshotDraft", () => {
  it("returns null without source markdown", () => {
    expect(
      buildPresentationSnapshotDraft({
        projectId: "p1",
        documentId: "d1",
        documentVersion: 1,
        documentTitle: "Doc",
        sourceMarkdown: "   ",
        lastUserLayoutPrompt: "timeline",
      })
    ).toBeNull();
  });

  it("includes fingerprint and recipe", () => {
    const draft = buildPresentationSnapshotDraft(
      {
        projectId: "p1",
        documentId: "d1",
        documentVersion: 2,
        documentTitle: "Schedule Plan",
        sourceMarkdown: "## Intro\n\nText",
        lastUserLayoutPrompt: "show timeline only",
      },
      { openuiLang: "root = Stack([])" }
    );
    expect(draft).not.toBeNull();
    expect(draft!.documentVersion).toBe(2);
    expect(draft!.sourceContentFingerprint).toMatch(/^djb2-/);
    expect(draft!.renderRecipe.layoutMode).toBe("focused");
    expect(draft!.payloads.openuiLang).toContain("Stack");
  });
});

describe("isPresentationStale", () => {
  it("detects content drift", () => {
    const fp = fingerprintSourceMarkdown("original");
    expect(isPresentationStale(fp, "original")).toBe(false);
    expect(isPresentationStale(fp, "updated")).toBe(true);
  });
});

describe("presentation integrations (Step 3 reserve)", () => {
  it("recognizes integration platform ids", () => {
    expect(isGenuiPresentationIntegrationPlatform("confluence")).toBe(true);
    expect(isGenuiPresentationIntegrationPlatform("jira")).toBe(true);
    expect(isGenuiPresentationIntegrationPlatform("slack")).toBe(false);
  });

  it("defaults integration artifacts to presentation deliverables", () => {
    expect(defaultIntegrationArtifactPreference()).toEqual({
      confluence: "html_snapshot",
      jira: "pdf",
      sharepoint: "pdf",
      projectwise: "pdf",
    });
  });
});
