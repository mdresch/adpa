# GitHub Copilot Custom Agents

This directory contains custom GitHub Copilot agent configurations for the ADPA Framework. These specialized agents provide focused assistance for specific tasks and maintain expertise in particular areas of the codebase.

## Available Agents

### 🧹 Cleanup Specialist (`cleanup-specialist.md`)

A specialized agent designed to maintain code quality and remove technical debt.

**Capabilities:**
- Remove dead and unused code
- Eliminate code duplication
- Refactor messy patterns
- Improve code formatting and consistency
- Clean up documentation and comments

**When to Use:**
- After major feature additions to clean up leftover code
- During code review to identify cleanup opportunities
- As part of regular maintenance sprints
- Before releases to ensure code quality

**Example Usage:**
```bash
# Via GitHub CLI
gh copilot agent cleanup-specialist "Clean up unused imports in server/src"

# Via GitHub web interface
# Navigate to an issue/PR and select the cleanup-specialist agent
```

See [`cleanup-specialist.md`](./cleanup-specialist.md) for detailed documentation.

## How to Use Custom Agents

### Method 1: GitHub Web Interface

1. Navigate to your repository on GitHub
2. Go to an issue or pull request
3. Click the Copilot icon
4. Select the desired agent from the dropdown
5. Describe the task you want the agent to perform

### Method 2: GitHub CLI

```bash
# General syntax
gh copilot agent <agent-name> "<task description>"

# Examples
gh copilot agent cleanup-specialist "Remove dead code from the frontend"
gh copilot agent cleanup-specialist "Refactor complex functions in server modules"
```

### Method 3: In Pull Request Comments

```markdown
@github-copilot cleanup-specialist please review this PR for cleanup opportunities
```

## Creating New Agents

To create a new custom agent for this repository:

1. Create a new Markdown file in this directory (`.github/agents/`)
2. Add YAML frontmatter with agent metadata:
   ```yaml
   ---
   name: agent-name
   description: Brief description of what the agent does
   tools: ['read', 'edit', 'search', 'bash']
   ---
   ```
3. Add detailed instructions for the agent's behavior
4. Include project-specific context and constraints
5. Provide examples of good practices
6. Commit the file to the repository

The agent will become available in GitHub Copilot interfaces after the file is committed.

## Agent Development Guidelines

When creating or modifying custom agents:

### ✅ Do:
- Provide clear, specific instructions
- Include project-specific context and conventions
- Define clear boundaries (what the agent should/shouldn't do)
- Add examples of good practices
- Document limitations and constraints
- Specify which tools the agent needs

### ❌ Don't:
- Make agents too broad in scope (keep them focused)
- Skip project-specific conventions
- Forget to define what the agent should NOT do
- Leave out examples
- Make assumptions about project structure

## Best Practices

1. **Single Responsibility**: Each agent should have a clear, focused purpose
2. **Project Context**: Include relevant project-specific conventions and standards
3. **Safety Constraints**: Clearly define what the agent should not modify
4. **Examples**: Provide concrete examples of good outcomes
5. **Documentation**: Keep agent configurations well-documented and up-to-date

## Resources

- [GitHub Copilot Custom Agents Documentation](https://docs.github.com/en/copilot/tutorials/customization-library/custom-agents)
- [Creating Custom Agents Guide](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [Awesome GitHub Copilot](https://github.com/github/awesome-copilot) - Community-curated agent examples

## Support

If you have questions or issues with custom agents:

1. Check the agent's documentation file
2. Review the GitHub Copilot documentation
3. Open an issue in this repository
4. Contact the development team

---

**Note**: Custom agents are part of GitHub Copilot and require appropriate licensing and permissions to use.
