export interface IntegrationFormState {
  confluence_space_key: string
  confluence_parent_page_id: string
  jira_project_key: string
  jira_issue_type_default: string
}

export interface IntegrationFormErrors {
  confluence_space_key?: string
  confluence_parent_page_id?: string
  jira_project_key?: string
  jira_issue_type_default?: string
}

export interface ValidationResult {
  valid: boolean
  errors: IntegrationFormErrors
}

// Reasonable, permissive patterns matching typical Atlassian formats
const JIRA_PROJECT_KEY_RE = /^[A-Z][A-Z0-9_]{1,9}$/ // 2-10 chars, start letter
const CONFLUENCE_SPACE_KEY_RE = /^[A-Z][A-Z0-9_]{1,29}$/ // up to 30, start letter
const NUMERIC_ID_RE = /^\d+$/

export function validateIntegrationForm(state: IntegrationFormState): ValidationResult {
  const errors: IntegrationFormErrors = {}

  // Confluence space key (optional but if present validate)
  if (state.confluence_space_key) {
    const v = state.confluence_space_key.trim()
    if (!CONFLUENCE_SPACE_KEY_RE.test(v)) {
      errors.confluence_space_key =
        'Space key must be 2-30 chars, uppercase letters/numbers/underscore, starting with a letter'
    }
  }

  // Confluence parent page id (optional numeric)
  if (state.confluence_parent_page_id) {
    const v = state.confluence_parent_page_id.trim()
    if (!NUMERIC_ID_RE.test(v)) {
      errors.confluence_parent_page_id = 'Parent page id must be numeric'
    }
  }

  // Jira project key (optional format)
  if (state.jira_project_key) {
    const v = state.jira_project_key.trim()
    if (!JIRA_PROJECT_KEY_RE.test(v)) {
      errors.jira_project_key =
        'Project key must be 2-10 chars, uppercase letters/numbers/underscore, starting with a letter'
    }
  }

  // Jira default issue type (optional but if provided ensure non-empty after trim)
  if (typeof state.jira_issue_type_default === 'string' && state.jira_issue_type_default.trim().length === 0) {
    // treat empty string as not provided, no error
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
