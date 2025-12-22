import { pool } from './connection'

export interface ProjectIntegration {
  project_id: string
  jira_project_key: string | null
  jira_issue_type_default: string | null
  confluence_space_key: string | null
  confluence_parent_page_id: string | null
  created_at: string
  updated_at: string
}

export async function getByProjectId(projectId: string): Promise<ProjectIntegration | null> {
  const res = await pool.query<ProjectIntegration>(
    `SELECT project_id, jira_project_key, jira_issue_type_default, confluence_space_key, confluence_parent_page_id, created_at, updated_at
     FROM project_integrations WHERE project_id = $1`,
    [projectId]
  )
  return res.rows[0] ?? null
}

export type UpsertInput = Partial<Pick<ProjectIntegration,
  'jira_project_key' | 'jira_issue_type_default' | 'confluence_space_key' | 'confluence_parent_page_id'>> & {
    project_id: string
  }

export async function upsert(input: UpsertInput): Promise<ProjectIntegration> {
  const { project_id, jira_project_key = null, jira_issue_type_default = null, confluence_space_key = null, confluence_parent_page_id = null } = input
  const res = await pool.query<ProjectIntegration>(
    `INSERT INTO project_integrations (
        project_id, jira_project_key, jira_issue_type_default, confluence_space_key, confluence_parent_page_id
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (project_id) DO UPDATE SET
        jira_project_key = EXCLUDED.jira_project_key,
        jira_issue_type_default = EXCLUDED.jira_issue_type_default,
        confluence_space_key = EXCLUDED.confluence_space_key,
        confluence_parent_page_id = EXCLUDED.confluence_parent_page_id,
        updated_at = now()
     RETURNING project_id, jira_project_key, jira_issue_type_default, confluence_space_key, confluence_parent_page_id, created_at, updated_at`,
    [project_id, jira_project_key, jira_issue_type_default, confluence_space_key, confluence_parent_page_id]
  )
  return res.rows[0]
}

export async function remove(projectId: string): Promise<void> {
  await pool.query(`DELETE FROM project_integrations WHERE project_id = $1`, [projectId])
}
