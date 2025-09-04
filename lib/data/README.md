# Data Services

This directory contains data access services that provide an abstraction layer between the application and the database.

## Project Service

The `ProjectService` class in `projects.ts` provides CRUD operations for projects with built-in caching, access control, and team management.

### Features

- **Project CRUD with ownership validation**: All operations validate that the user has appropriate permissions
- **Team member management**: Add and remove team members from projects
- **User-specific project filtering**: Filter projects by status, framework, priority, or search term
- **Framework-based categorization**: Projects can be categorized by framework
- **Project status management**: Track project status (active, completed, etc.)
- **Budget and timeline tracking**: Store and retrieve project budget and timeline information
- **Intelligent caching**: All queries are cached for 10 minutes (600 seconds)

### Access Control

- **Owner permissions**: Project owners have full access to their projects
- **Team member permissions**: Team members have read/update access to projects they're part of
- **Admin override**: Users with the 'admin' role have access to all projects
- **Role-based feature access**: Different operations require different permission levels

### Caching Strategy

- **Cache user's project lists**: Project lists are cached with user-specific keys
- **Cache individual projects**: Individual projects are cached by ID
- **Invalidate on team changes**: Cache is invalidated when team members are added or removed
- **Filter-specific caching**: Different filter combinations have separate cache entries

### Usage Examples

```typescript
import { ProjectService } from '@/lib/data/projects';

// Get all projects for a user
const projects = await ProjectService.getProjects(userId);

// Get projects with filters
const activeProjects = await ProjectService.getProjects(userId, { status: 'active' });

// Get a specific project
const project = await ProjectService.getProjectById(projectId, userId);

// Create a new project
const newProject = await ProjectService.createProject({
  name: 'New Project',
  description: 'Project description',
  framework: 'next',
  priority: 'high',
  start_date: new Date(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  budget: 10000
}, userId);

// Update a project
const updatedProject = await ProjectService.updateProject(projectId, {
  name: 'Updated Project Name',
  status: 'completed'
}, userId);

// Team management
await ProjectService.addTeamMember(projectId, userId, teamMemberId);
await ProjectService.removeTeamMember(projectId, userId, teamMemberId);
const teamMembers = await ProjectService.getProjectTeamMembers(projectId, userId);
```

## Testing

Tests for the data services are located in the `__tests__` directory. Run the tests with:

```bash
npm test -- lib/data
```