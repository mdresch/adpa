import axios, { AxiosInstance } from "axios"
import { logger } from "../utils/logger"

export interface GitHubConfig {
  baseUrl?: string
  apiToken: string
  owner: string
  repo: string
  defaultBranch?: string
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description?: string
  private: boolean
  default_branch: string
  owner: {
    login: string
    id: number
    avatar_url: string
  }
  html_url: string
  created_at: string
  updated_at: string
}

export interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

export interface GitHubContent {
  name: string
  path: string
  sha: string
  size: number
  type: "file" | "dir" | "symlink" | "submodule"
  content?: string
  encoding?: string
  download_url?: string
  html_url: string
  git_url: string
  url: string
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  state: "open" | "closed"
  body?: string
  html_url: string
  user: {
    login: string
    id: number
    avatar_url: string
  }
  created_at: string
  updated_at: string
  closed_at?: string
  merged_at?: string
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    sha: string
  }
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  state: "open" | "closed"
  body?: string
  html_url: string
  user: {
    login: string
    id: number
    avatar_url: string
  }
  labels: Array<{
    id: number
    name: string
    color: string
  }>
  assignees: Array<{
    login: string
    id: number
    avatar_url: string
  }>
  created_at: string
  updated_at: string
  closed_at?: string
}

export interface GitHubCommit {
  sha: string
  commit: {
    author: {
      name: string
      email: string
      date: string
    }
    committer: {
      name: string
      email: string
      date: string
    }
    message: string
  }
  html_url: string
  author: {
    login: string
    id: number
    avatar_url: string
  }
  committer: {
    login: string
    id: number
    avatar_url: string
  }
}

export class GitHubService {
  private client: AxiosInstance
  private config: GitHubConfig

  constructor(config: GitHubConfig) {
    this.config = config
    
    this.client = axios.create({
      baseURL: config.baseUrl || "https://api.github.com",
      headers: {
        Authorization: `token ${config.apiToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    this.client.interceptors.response.use(
      (response) => {
        logger.info(`GitHub API Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        logger.error("GitHub API Response Error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          data: error.response?.data,
        })
        return Promise.reject(error)
      }
    )
  }

  /**
   * Test the connection to GitHub
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get("/user")
      return response.status === 200
    } catch (error) {
      logger.error("GitHub connection test failed:", error)
      return false
    }
  }

  /**
   * Get repository information
   */
  async getRepository(): Promise<GitHubRepository> {
    try {
      const response = await this.client.get(`/repos/${this.config.owner}/${this.config.repo}`)
      return response.data
    } catch (error) {
      logger.error(`Failed to get repository ${this.config.owner}/${this.config.repo}:`, error)
      throw new Error(`Failed to get repository: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * List branches in the repository
   */
  async listBranches(): Promise<GitHubBranch[]> {
    try {
      const response = await this.client.get(`/repos/${this.config.owner}/${this.config.repo}/branches`)
      return response.data
    } catch (error) {
      logger.error(`Failed to list branches for ${this.config.owner}/${this.config.repo}:`, error)
      throw new Error(`Failed to list branches: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get contents of a file or directory
   */
  async getContents(path: string, ref?: string): Promise<GitHubContent | GitHubContent[]> {
    try {
      const params: any = {}
      if (ref) params.ref = ref

      const response = await this.client.get(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
        { params }
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to get contents at path ${path}:`, error)
      throw new Error(`Failed to get contents: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create or update a file in the repository
   */
  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    branch?: string,
    sha?: string
  ): Promise<{ commit: GitHubCommit; content: GitHubContent }> {
    try {
      const params = {
        message,
        content: Buffer.from(content).toString("base64"),
        branch: branch || this.config.defaultBranch || "main",
      }

      if (sha) {
        // If sha is provided, it's an update operation
        params["sha"] = sha
      }

      const response = await this.client.put(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
        params
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to create/update file at path ${path}:`, error)
      throw new Error(`Failed to create/update file: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * List pull requests
   */
  async listPullRequests(state: "open" | "closed" | "all" = "open"): Promise<GitHubPullRequest[]> {
    try {
      const response = await this.client.get(
        `/repos/${this.config.owner}/${this.config.repo}/pulls`,
        { params: { state } }
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to list pull requests:`, error)
      throw new Error(`Failed to list pull requests: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<GitHubPullRequest> {
    try {
      const response = await this.client.post(
        `/repos/${this.config.owner}/${this.config.repo}/pulls`,
        { title, body, head, base }
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to create pull request:`, error)
      throw new Error(`Failed to create pull request: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * List issues
   */
  async listIssues(state: "open" | "closed" | "all" = "open"): Promise<GitHubIssue[]> {
    try {
      const response = await this.client.get(
        `/repos/${this.config.owner}/${this.config.repo}/issues`,
        { params: { state } }
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to list issues:`, error)
      throw new Error(`Failed to list issues: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get a specific issue by number
   */
  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    try {
      const response = await this.client.get(
        `/repos/${this.config.owner}/${this.config.repo}/issues/${issueNumber}`
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to get issue #${issueNumber}:`, error)
      throw new Error(`Failed to get issue: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Create an issue
   */
  async createIssue(
    title: string,
    body: string,
    labels?: string[],
    assignees?: string[]
  ): Promise<GitHubIssue> {
    try {
      const params: any = { title, body }
      if (labels) params.labels = labels
      if (assignees) params.assignees = assignees

      const response = await this.client.post(
        `/repos/${this.config.owner}/${this.config.repo}/issues`,
        params
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to create issue:`, error)
      throw new Error(`Failed to create issue: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Get commit history for a file
   */
  async getFileCommitHistory(path: string): Promise<GitHubCommit[]> {
    try {
      const response = await this.client.get(
        `/repos/${this.config.owner}/${this.config.repo}/commits`,
        { params: { path } }
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to get commit history for ${path}:`, error)
      throw new Error(`Failed to get commit history: ${error.response?.data?.message || error.message}`)
    }
  }
}
