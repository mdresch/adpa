import { validateIntegrationForm } from '@/lib/utils/projectIntegrationValidation'

describe('validateIntegrationForm', () => {
  it('accepts empty optional fields', () => {
    const { valid, errors } = validateIntegrationForm({
      confluence_space_key: '',
      confluence_parent_page_id: '',
      jira_project_key: '',
      jira_issue_type_default: '',
    })
    expect(valid).toBe(true)
    expect(errors).toEqual({})
  })

  it('validates Confluence space key format', () => {
    expect(validateIntegrationForm({
      confluence_space_key: 'AD',
      confluence_parent_page_id: '',
      jira_project_key: '',
      jira_issue_type_default: '',
    }).valid).toBe(true)

    expect(validateIntegrationForm({
      confluence_space_key: 'ad', // lowercase not allowed
      confluence_parent_page_id: '',
      jira_project_key: '',
      jira_issue_type_default: '',
    }).valid).toBe(false)
  })

  it('validates numeric parent page id', () => {
    expect(validateIntegrationForm({
      confluence_space_key: '',
      confluence_parent_page_id: '12345',
      jira_project_key: '',
      jira_issue_type_default: '',
    }).valid).toBe(true)

    const bad = validateIntegrationForm({
      confluence_space_key: '',
      confluence_parent_page_id: '12a45',
      jira_project_key: '',
      jira_issue_type_default: '',
    })
    expect(bad.valid).toBe(false)
    expect(bad.errors.confluence_parent_page_id).toBeDefined()
  })

  it('validates Jira project key format', () => {
    expect(validateIntegrationForm({
      confluence_space_key: '',
      confluence_parent_page_id: '',
      jira_project_key: 'WA',
      jira_issue_type_default: '',
    }).valid).toBe(true)

    expect(validateIntegrationForm({
      confluence_space_key: '',
      confluence_parent_page_id: '',
      jira_project_key: 'w', // too short, lowercase
      jira_issue_type_default: '',
    }).valid).toBe(false)
  })
})
