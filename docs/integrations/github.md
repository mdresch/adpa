# GitHub Integration

The GitHub integration allows ADPA to synchronize templates and documents with GitHub repositories, enabling version control, collaboration, and automated workflows for architecture documentation.

## Features

### Core Functionality
- **Repository Synchronization**: Sync templates from GitHub repositories
- **Template Version Control**: Track template changes and history
- **Pull Request Management**: Create and manage pull requests for template changes
- **Issue Tracking**: Create and track issues related to documentation
- **Branch Management**: Work with different branches for template development

### Supported Operations
- Sync templates from GitHub repository to ADPA
- Upload ADPA documents to GitHub repository
- Create pull requests for document changes
- Create and manage GitHub issues
- View repository structure and file contents
- Track version history for templates

## Setup

### Prerequisites
1. GitHub account with repository access
2. Personal Access Token with appropriate permissions
3. Repository with templates (optional - can be created)

### Required Permissions
Your GitHub Personal Access Token needs the following scopes:
- `repo` - Full control of private repositories
- `read:org` - Read organization membership (if using organization repositories)

### Configuration Steps

1. **Generate Personal Access Token**
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Click "Generate new token (classic)"
   - Select required scopes: `repo`, `read:org`
   - Copy the generated token

2. **Configure Integration in ADPA**
   - Navigate to Integrations > GitHub
   - Fill in the configuration form:
     - **Repository Owner**: GitHub username or organization name
     - **Repository Name**: Name of the repository
     - **Personal Access Token**: Your GitHub token
     - **Default Branch**: Main branch (usually `main` or `master`)
     - **Templates Path**: Directory containing templates (default: `templates`)

3. **Test Connection**
   - Click "Test Connection" to verify configuration
   - Ensure the repository is accessible

## Usage

### Template Synchronization

#### Automatic Sync
Enable "Auto-sync Templates" to automatically sync templates from GitHub:
- Templates are synced from the configured templates directory
- Supports Markdown (`.md`) and JSON (`.json`) template files
- YAML frontmatter is parsed for template metadata

#### Manual Sync
Use the "Sync Templates" button to manually trigger synchronization:
- Fetches latest templates from the repository
- Creates or updates ADPA documents
- Maintains sync metadata for tracking

#### Template Format
Templates should follow this structure:

```markdown
---
title: "Template Title"
framework: "togaf"
category: "architecture"
description: "Template description"
---

# Template Content

Your template content here...
```

### Repository Management

#### File Explorer
- Browse repository structure
- View file contents
- Download files
- Navigate directories

#### Branch Selection
- Switch between repository branches
- View branch information
- Work with protected branches

### Pull Request Workflow

#### Creating Pull Requests
1. Make changes to templates in ADPA
2. Enable "Create Pull Requests" option
3. Changes are committed to a feature branch
4. Pull request is automatically created

#### Managing Pull Requests
- View open/closed pull requests
- Review pull request details
- Open pull requests in GitHub

### Issue Tracking

#### Creating Issues
- Create GitHub issues from ADPA
- Add labels and assignees
- Link issues to documentation tasks

#### Managing Issues
- View repository issues
- Filter by state (open/closed)
- Track issue progress

## API Endpoints

### Repository Information
```
GET /api/integrations/github/{id}/repository
```

### Pull Requests
```
GET /api/integrations/github/{id}/pull-requests?state=open
POST /api/integrations/github/{id}/pull-request
```

### Issues
```
GET /api/integrations/github/{id}/issues?state=open
POST /api/integrations/github/{id}/issue
```

### Synchronization
```
POST /api/integrations/github/{id}/sync
POST /api/integrations/github/{id}/test
```

## Best Practices

### Repository Structure
Organize your repository with a clear structure:
```
repository/
├── templates/
│   ├── togaf/
│   │   ├── business-architecture.md
│   │   └── application-architecture.md
│   ├── zachman/
│   │   └── enterprise-model.md
│   └── custom/
│       └── custom-template.md
├── docs/
├── README.md
└── .gitignore
```

### Template Management
- Use descriptive filenames
- Include YAML frontmatter for metadata
- Organize templates by framework
- Use consistent naming conventions

### Version Control
- Create feature branches for template changes
- Use meaningful commit messages
- Review changes through pull requests
- Tag releases for template versions

### Security
- Use Personal Access Tokens with minimal required permissions
- Regularly rotate access tokens
- Monitor repository access logs
- Use private repositories for sensitive templates

## Troubleshooting

### Common Issues

#### Connection Failed
- Verify Personal Access Token is valid
- Check token permissions (repo scope required)
- Ensure repository exists and is accessible

#### Sync Errors
- Check repository structure
- Verify templates directory exists
- Ensure template files are valid Markdown/JSON

#### Permission Denied
- Verify token has write access to repository
- Check if repository is private and token has access
- Ensure organization permissions allow token access

### Error Messages

#### "Repository not found"
- Repository name or owner is incorrect
- Repository is private and token lacks access
- Repository has been deleted or moved

#### "Invalid token"
- Personal Access Token is expired or revoked
- Token lacks required permissions
- Token format is incorrect

## Limitations

- Maximum file size for sync: 1MB
- Rate limiting applies based on GitHub API limits
- Binary files are not supported for content preview
- Large repositories may have slower sync times

## Support

For additional support:
1. Check GitHub API documentation
2. Verify repository permissions
3. Review ADPA logs for detailed error messages
4. Contact system administrator for integration issues
