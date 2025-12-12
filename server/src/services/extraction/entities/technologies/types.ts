/**
 * Technologies Entity Types
 * 
 * Represents technologies used in the project across different architectural layers.
 */

export interface Technology {
  /** Technology name (e.g., React, PostgreSQL, AWS) */
  name: string
  /** Category */
  category: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'devops' | 'testing' | 'monitoring' | 'other'
  /** What this technology does in the project */
  description?: string
  /** Version number or range (e.g., 18.3, 15.x, latest) */
  version?: string
  /** Why this technology was chosen for the project */
  purpose?: string
  /** License type (MIT, Apache 2.0, BSD, Proprietary, Commercial, Open Source) */
  license?: string
  /** Provider (AWS, Microsoft, Google, HashiCorp, Open Source Community, etc.) */
  vendor?: string
  /** Where deployed (production, staging, development, all, cloud, on-premises) */
  deployment_environment?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

