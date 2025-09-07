# AI Provider Configuration CLI

## Overview

The AI Provider Configuration CLI is an interactive command-line tool that allows developers to easily select and configure AI providers for the ADPA framework. This tool automatically updates environment files based on user selections and maintains backward compatibility with existing configurations.

## Features

- 🔧 **Interactive Configuration**: Easy-to-use menu system for configuring AI providers
- 📋 **View Current Settings**: Display currently configured providers and their settings
- 🧪 **Connection Testing**: Basic validation of provider configurations
- 🗑️ **Remove Configurations**: Clean removal of provider settings
- 🔄 **Auto-Update .env**: Automatically updates environment files
- 🔒 **Secure Input**: Password-masked input for API keys
- ✅ **Validation**: Built-in validation for API key formats

## Supported Providers

### OpenAI
- **Models**: GPT-4, GPT-4-turbo, GPT-3.5-turbo, GPT-3.5-turbo-16k
- **Required**: API Key (starts with `sk-`)
- **Optional**: Organization ID

### Google AI (Gemini)
- **Models**: Gemini Pro, Gemini Pro Vision, Gemini 1.5 Pro, Gemini 1.5 Flash
- **Required**: API Key

### Anthropic (Claude)
- **Models**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Required**: API Key (starts with `sk-ant-`)

## Usage

### From Root Directory

```bash
# Run the TypeScript version (recommended)
npm run ai-config

# Or run the JavaScript version
npm run select-provider
```

### From Scripts Directory

```bash
cd scripts
npm install
npm run select-provider
```

### Direct Execution

```bash
# TypeScript version
tsx scripts/ai-provider-selector.ts

# JavaScript version
node scripts/ai-provider-selector.js
```

## Menu Options

### 🔧 Configure a new provider
- Select from available AI providers
- Enter API keys and configuration
- Choose default model
- Automatically save to environment files

### 📋 View current configuration
- Display all configured providers
- Show masked API keys and settings
- View enabled status and default models

### 🧪 Test provider connection
- Basic validation of configuration
- Check for required API keys
- Verify key formats

### 🗑️ Remove provider configuration
- Select provider to remove
- Confirmation prompt for safety
- Clean removal from environment files

## Environment Files

The CLI tool manages the following environment files:
- `.env.local` (primary)
- `.env` (fallback)
- `server/.env` (server-specific)

## Environment Variables

### OpenAI
```bash
OPENAI_API_KEY="sk-..."
OPENAI_ORGANIZATION="org-..."  # Optional
OPENAI_DEFAULT_MODEL="gpt-4"
OPENAI_ENABLED="true"
```

### Google AI
```bash
GOOGLE_AI_API_KEY="..."
GOOGLE_DEFAULT_MODEL="gemini-pro"
GOOGLE_ENABLED="true"
```

### Anthropic
```bash
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_DEFAULT_MODEL="claude-3-sonnet-20240229"
ANTHROPIC_ENABLED="true"
```

## Security Features

- API keys are masked in display output
- Password-type input for sensitive fields
- Validation of API key formats
- Secure file handling

## Backward Compatibility

The CLI tool maintains backward compatibility by:
- Reading existing environment configurations
- Preserving existing settings when updating
- Supporting multiple environment file locations
- Non-destructive updates (only modifies specified keys)

## Error Handling

- Graceful handling of missing files
- Validation of user inputs
- Clear error messages
- Safe exit on interruption (Ctrl+C)

## Development

### File Structure
```
scripts/
├── ai-provider-selector.ts    # TypeScript version (recommended)
├── ai-provider-selector.js    # JavaScript version
├── package.json              # CLI dependencies
└── AI_PROVIDER_CLI_README.md  # This documentation
```

### Dependencies
- `inquirer`: Interactive CLI prompts
- `chalk`: Colored terminal output
- `dotenv`: Environment file handling
- `fs`: File system operations
- `path`: Path utilities

## Integration with ADPA Framework

The CLI tool integrates with the existing ADPA AI provider system:
- Compatible with server-side provider modules
- Uses same environment variable naming conventions
- Supports the same provider types and models
- Works with existing database provider storage

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure write permissions to environment files
2. **Missing Dependencies**: Run `npm install` in the scripts directory
3. **Invalid API Keys**: Check key format and validity
4. **File Not Found**: Ensure you're running from the correct directory

### Getting Help

Run the CLI tool and select the appropriate menu option. The tool provides:
- Clear prompts and instructions
- Validation messages
- Success/error feedback
- Graceful error handling

## Activity Information

- **Activity ID**: ACT-003
- **Activity Name**: Implement Provider Choice Menu
- **Deliverable**: Menu in CLI interface, configuration update logic
- **Effort Estimate**: 12 hours
- **Skills Required**: Node.js, CLI development
- **Constraints**: Backward compatibility
- **Assumptions**: Providers already integrated