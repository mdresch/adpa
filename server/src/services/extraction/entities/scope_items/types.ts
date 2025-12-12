/**
 * Scope Items Entity Types
 * 
 * Represents project scope items (both in-scope and out-of-scope).
 */

export interface ScopeItem {
  /** Scope item title */
  title: string
  /** Detailed description */
  description: string
  /** Whether item is in scope or out of scope */
  is_in_scope: boolean
  /** Category (feature, function, module, etc.) */
  category?: string
  /** Justification for scope decision */
  justification?: string
  /** Priority using MoSCoW (Must/Should/Could/Won't have) */
  priority?: 'must_have' | 'should_have' | 'could_have' | 'wont_have'
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

