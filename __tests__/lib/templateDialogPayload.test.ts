import {
  buildTemplateDialogPayload,
  getTemplatePromptVersionValue,
} from "@/lib/templates/templateDialogPayload"

describe("template dialog payload", () => {
  it("includes cleared prompt fields in update payloads", () => {
    const payload = buildTemplateDialogPayload({
      mode: "update",
      name: "Edited template",
      description: "Edited description",
      framework: "BABOK v3",
      category: "Requirements",
      promptVersion: "3",
      systemPrompt: "",
      templateParagraphs: [],
    })

    expect(payload).toMatchObject({
      name: "Edited template",
      description: "Edited description",
      framework: "BABOK v3",
      category: "Requirements",
      prompt_version: 3,
      system_prompt: "",
      template_paragraphs: [],
    })
  })

  it("does not send create-only defaults when updating an existing template", () => {
    const payload = buildTemplateDialogPayload({
      mode: "update",
      name: "Metadata only",
      description: "",
      framework: "PMBOK 7",
      category: "",
      promptVersion: "1",
      systemPrompt: "Prompt",
      templateParagraphs: [],
    })

    expect(payload).not.toHaveProperty("content")
    expect(payload).not.toHaveProperty("variables")
    expect(payload).not.toHaveProperty("is_public")
  })

  it("keeps defaults for create payloads", () => {
    const payload = buildTemplateDialogPayload({
      mode: "create",
      name: "New template",
      description: "",
      framework: "TOGAF",
      category: "Architecture",
      promptVersion: "1.0",
      systemPrompt: "",
      templateParagraphs: [],
    })

    expect(payload).toMatchObject({
      content: { blocks: [] },
      variables: [],
      is_public: false,
      prompt_version: 1,
      system_prompt: "",
      template_paragraphs: [],
    })
  })

  it("prefers prompt_version over legacy version compatibility fields", () => {
    expect(
      getTemplatePromptVersionValue({
        prompt_version: 4,
        version: "legacy",
      }),
    ).toBe("4")
  })
})
