import { validateInlineExtractionContract } from '../../../modules/inline-extraction/inlineExtractionContract';

describe('Production Resilience Guards: Inline H8 Extraction', () => {
  it('MUST NOT bypass the inline extraction and dual-store invariants (REQ-001, REQ-002)', async () => {
    const contract = await validateInlineExtractionContract();
    
    if (!contract.ok) {
      throw new Error(`
        🚨 GOVERNANCE VIOLATION: Critical Production Feature Broken!
        
        The Inline Entity Extraction & Storage pipeline has been compromised:
        ${contract.errors.join('\n        - ')}
        
        WHY THIS MATTERS: This pipeline feeds the RAG Context Injection. If entities are not 
        parsed correctly or are orphaned from the Vector Store, semantic search fails.
        
        HOW TO FIX: Review your changes to 'InlineEntityParserService' or the dual-store
        persistence logic to ensure they comply with the spec at:
        docs/superpowers/specs/2026-06-14-inline-h8-extraction-guards-design.md
      `);
    }
    
    expect(contract.ok).toBe(true);
  });
});
