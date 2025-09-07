#!/usr/bin/env tsx

/**
 * AI Provider Selection CLI (TypeScript)
 * 
 * Interactive CLI menu for selecting and configuring AI providers.
 * Automatically updates .env files based on user selection.
 * 
 * Activity: ACT-003 - Implement Provider Choice Menu
 * Deliverable: Menu in CLI interface, configuration update logic
 */

import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Type definitions
interface ProviderEnvKey {
  description: string;
  required: boolean;
  validate?: (value: string) => string | boolean;
}

interface AIProvider {
  name: string;
  description: string;
  envKeys: Record<string, ProviderEnvKey>;
  models: string[];
  defaultModel: string;
}

interface ProviderConfig {
  [key: string]: string;
}

// Available AI providers configuration
const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5-turbo models',
    envKeys: {
      'OPENAI_API_KEY': {
        description: 'OpenAI API Key (starts with sk-)',
        required: true,
        validate: (value: string) => value.startsWith('sk-') || 'OpenAI API key must start with "sk-"'
      },
      'OPENAI_ORGANIZATION': {
        description: 'OpenAI Organization ID (optional)',
        required: false
      }
    },
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    defaultModel: 'gpt-4'
  },
  google: {
    name: 'Google AI (Gemini)',
    description: 'Gemini Pro, Gemini Pro Vision models',
    envKeys: {
      'GOOGLE_AI_API_KEY': {
        description: 'Google AI API Key',
        required: true,
        validate: (value: string) => value.length > 10 || 'Google AI API key must be valid'
      }
    },
    models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-pro'
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    description: 'Claude 3 models',
    envKeys: {
      'ANTHROPIC_API_KEY': {
        description: 'Anthropic API Key (starts with sk-ant-)',
        required: true,
        validate: (value: string) => value.startsWith('sk-ant-') || 'Anthropic API key must start with "sk-ant-"'
      }
    },
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-sonnet-20240229'
  }
};

// Environment file paths
const ENV_FILES = [
  path.join(__dirname, '..', '.env.local'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', 'server', '.env')
];

class AIProviderSelector {
  private currentConfig: ProviderConfig = {};

  constructor() {
    this.currentConfig = this.loadCurrentConfig();
  }

  /**
   * Load current configuration from environment files
   */
  private loadCurrentConfig(): ProviderConfig {
    const config: ProviderConfig = {};
    
    for (const envFile of ENV_FILES) {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').replace(/^["']|["']$/g, '');
              config[key] = value;
            }
          }
        }
      }
    }
    
    return config;
  }

  /**
   * Get currently configured providers
   */
  private getCurrentProviders(): Array<{id: string, name: string, description: string}> {
    const configured: Array<{id: string, name: string, description: string}> = [];
    
    for (const [providerId, provider] of Object.entries(AI_PROVIDERS)) {
      const isConfigured = Object.keys(provider.envKeys).some(key => 
        this.currentConfig[key] && this.currentConfig[key].trim() !== ''
      );
      
      if (isConfigured) {
        configured.push({
          id: providerId,
          name: provider.name,
          description: provider.description
        });
      }
    }
    
    return configured;
  }

  /**
   * Display welcome message and current status
   */
  private displayWelcome(): void {
    console.log(chalk.blue.bold('\n🤖 AI Provider Configuration Tool\n'));
    console.log(chalk.gray('Configure AI providers for the ADPA framework.\n'));
    
    const currentProviders = this.getCurrentProviders();
    
    if (currentProviders.length > 0) {
      console.log(chalk.green('✅ Currently configured providers:'));
      currentProviders.forEach(provider => {
        console.log(chalk.green(`   • ${provider.name} - ${provider.description}`));
      });
      console.log();
    } else {
      console.log(chalk.yellow('⚠️  No AI providers are currently configured.\n'));
    }
  }

  /**
   * Main menu for provider selection
   */
  async showMainMenu(): Promise<void> {
    const choices = [
      {
        name: '🔧 Configure a new provider',
        value: 'configure'
      },
      {
        name: '📋 View current configuration',
        value: 'view'
      },
      {
        name: '🧪 Test provider connection',
        value: 'test'
      },
      {
        name: '🗑️  Remove provider configuration',
        value: 'remove'
      },
      {
        name: '❌ Exit',
        value: 'exit'
      }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices
      }
    ]);

    switch (action) {
      case 'configure':
        await this.configureProvider();
        break;
      case 'view':
        await this.viewConfiguration();
        break;
      case 'test':
        await this.testProvider();
        break;
      case 'remove':
        await this.removeProvider();
        break;
      case 'exit':
        console.log(chalk.blue('\n👋 Goodbye!\n'));
        process.exit(0);
        break;
    }

    // Show menu again unless exiting
    if (action !== 'exit') {
      await this.showMainMenu();
    }
  }

  /**
   * Configure a new AI provider
   */
  private async configureProvider(): Promise<void> {
    console.log(chalk.blue('\n🔧 Configure AI Provider\n'));

    const providerChoices = Object.entries(AI_PROVIDERS).map(([id, provider]) => ({
      name: `${provider.name} - ${provider.description}`,
      value: id
    }));

    const { providerId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'providerId',
        message: 'Select an AI provider to configure:',
        choices: providerChoices
      }
    ]);

    const provider = AI_PROVIDERS[providerId];
    const config: ProviderConfig = {};

    console.log(chalk.yellow(`\nConfiguring ${provider.name}...\n`));

    // Collect configuration for each required environment variable
    for (const [envKey, envConfig] of Object.entries(provider.envKeys)) {
      const currentValue = this.currentConfig[envKey] || '';
      
      const { value } = await inquirer.prompt([
        {
          type: envKey.toLowerCase().includes('key') ? 'password' : 'input',
          name: 'value',
          message: `${envConfig.description}:`,
          default: currentValue,
          validate: (input: string) => {
            if (envConfig.required && (!input || input.trim() === '')) {
              return 'This field is required';
            }
            if (envConfig.validate && input) {
              return envConfig.validate(input);
            }
            return true;
          }
        }
      ]);

      if (value && value.trim() !== '') {
        config[envKey] = value.trim();
      }
    }

    // Select default model
    if (provider.models && provider.models.length > 0) {
      const { selectedModel } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedModel',
          message: 'Select default model:',
          choices: provider.models,
          default: provider.defaultModel
        }
      ]);

      config[`${providerId.toUpperCase()}_DEFAULT_MODEL`] = selectedModel;
    }

    // Set provider as active
    config[`${providerId.toUpperCase()}_ENABLED`] = 'true';

    // Confirm configuration
    console.log(chalk.yellow('\nConfiguration summary:'));
    Object.entries(config).forEach(([key, value]) => {
      const displayValue = key.toLowerCase().includes('key') ? 
        value.substring(0, 8) + '...' : value;
      console.log(chalk.gray(`  ${key}=${displayValue}`));
    });

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Save this configuration?',
        default: true
      }
    ]);

    if (confirm) {
      await this.updateEnvironmentFiles(config);
      console.log(chalk.green(`\n✅ ${provider.name} configured successfully!\n`));
    } else {
      console.log(chalk.yellow('\n❌ Configuration cancelled.\n'));
    }
  }

  /**
   * View current configuration
   */
  private async viewConfiguration(): Promise<void> {
    console.log(chalk.blue('\n📋 Current Configuration\n'));

    const currentProviders = this.getCurrentProviders();
    
    if (currentProviders.length === 0) {
      console.log(chalk.yellow('No providers are currently configured.\n'));
      return;
    }

    for (const provider of currentProviders) {
      console.log(chalk.green.bold(`${provider.name}:`));
      
      const providerConfig = AI_PROVIDERS[provider.id];
      Object.keys(providerConfig.envKeys).forEach(key => {
        const value = this.currentConfig[key];
        if (value) {
          const displayValue = key.toLowerCase().includes('key') ? 
            value.substring(0, 8) + '...' : value;
          console.log(chalk.gray(`  ${key}: ${displayValue}`));
        }
      });

      // Show model configuration
      const modelKey = `${provider.id.toUpperCase()}_DEFAULT_MODEL`;
      const enabledKey = `${provider.id.toUpperCase()}_ENABLED`;
      
      if (this.currentConfig[modelKey]) {
        console.log(chalk.gray(`  Default Model: ${this.currentConfig[modelKey]}`));
      }
      
      if (this.currentConfig[enabledKey]) {
        console.log(chalk.gray(`  Enabled: ${this.currentConfig[enabledKey]}`));
      }
      
      console.log();
    }
  }

  /**
   * Test provider connection
   */
  private async testProvider(): Promise<void> {
    console.log(chalk.blue('\n🧪 Test Provider Connection\n'));

    const currentProviders = this.getCurrentProviders();
    
    if (currentProviders.length === 0) {
      console.log(chalk.yellow('No providers are configured to test.\n'));
      return;
    }

    const { providerId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'providerId',
        message: 'Select provider to test:',
        choices: currentProviders.map(p => ({ name: p.name, value: p.id }))
      }
    ]);

    console.log(chalk.yellow(`\nTesting ${AI_PROVIDERS[providerId].name} connection...\n`));

    try {
      // This is a basic test - in a real implementation, you'd call the actual API
      const provider = AI_PROVIDERS[providerId];
      const requiredKeys = Object.keys(provider.envKeys).filter(key => 
        provider.envKeys[key].required
      );

      let allKeysPresent = true;
      for (const key of requiredKeys) {
        if (!this.currentConfig[key] || this.currentConfig[key].trim() === '') {
          console.log(chalk.red(`❌ Missing required configuration: ${key}`));
          allKeysPresent = false;
        }
      }

      if (allKeysPresent) {
        console.log(chalk.green('✅ Configuration appears valid'));
        console.log(chalk.gray('Note: This is a basic validation. Actual API testing requires server-side implementation.\n'));
      } else {
        console.log(chalk.red('❌ Configuration is incomplete\n'));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Test failed: ${(error as Error).message}\n`));
    }
  }

  /**
   * Remove provider configuration
   */
  private async removeProvider(): Promise<void> {
    console.log(chalk.blue('\n🗑️  Remove Provider Configuration\n'));

    const currentProviders = this.getCurrentProviders();
    
    if (currentProviders.length === 0) {
      console.log(chalk.yellow('No providers are configured to remove.\n'));
      return;
    }

    const { providerId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'providerId',
        message: 'Select provider to remove:',
        choices: currentProviders.map(p => ({ name: p.name, value: p.id }))
      }
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove ${AI_PROVIDERS[providerId].name} configuration?`,
        default: false
      }
    ]);

    if (confirm) {
      const provider = AI_PROVIDERS[providerId];
      const keysToRemove = [
        ...Object.keys(provider.envKeys),
        `${providerId.toUpperCase()}_DEFAULT_MODEL`,
        `${providerId.toUpperCase()}_ENABLED`
      ];

      await this.removeFromEnvironmentFiles(keysToRemove);
      console.log(chalk.green(`\n✅ ${provider.name} configuration removed successfully!\n`));
    } else {
      console.log(chalk.yellow('\n❌ Removal cancelled.\n'));
    }
  }

  /**
   * Update environment files with new configuration
   */
  private async updateEnvironmentFiles(config: ProviderConfig): Promise<void> {
    const primaryEnvFile = ENV_FILES[0]; // .env.local

    try {
      // Read existing content
      let content = '';
      if (fs.existsSync(primaryEnvFile)) {
        content = fs.readFileSync(primaryEnvFile, 'utf8');
      }

      // Update or add each configuration key
      for (const [key, value] of Object.entries(config)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}="${value}"`;

        if (regex.test(content)) {
          // Update existing line
          content = content.replace(regex, newLine);
        } else {
          // Add new line
          if (content && !content.endsWith('\n')) {
            content += '\n';
          }
          content += `${newLine}\n`;
        }
      }

      // Write back to file
      fs.writeFileSync(primaryEnvFile, content, 'utf8');

      // Reload current config
      this.currentConfig = this.loadCurrentConfig();

    } catch (error) {
      throw new Error(`Failed to update environment file: ${(error as Error).message}`);
    }
  }

  /**
   * Remove keys from environment files
   */
  private async removeFromEnvironmentFiles(keysToRemove: string[]): Promise<void> {
    const primaryEnvFile = ENV_FILES[0]; // .env.local

    try {
      if (!fs.existsSync(primaryEnvFile)) {
        return;
      }

      let content = fs.readFileSync(primaryEnvFile, 'utf8');

      // Remove each key
      for (const key of keysToRemove) {
        const regex = new RegExp(`^${key}=.*$\\n?`, 'm');
        content = content.replace(regex, '');
      }

      // Write back to file
      fs.writeFileSync(primaryEnvFile, content, 'utf8');

      // Reload current config
      this.currentConfig = this.loadCurrentConfig();

    } catch (error) {
      throw new Error(`Failed to update environment file: ${(error as Error).message}`);
    }
  }

  /**
   * Start the CLI application
   */
  async start(): Promise<void> {
    try {
      this.displayWelcome();
      await this.showMainMenu();
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${(error as Error).message}\n`));
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.blue('\n\n👋 Goodbye!\n'));
  process.exit(0);
});

// Start the application
if (require.main === module) {
  const selector = new AIProviderSelector();
  selector.start();
}

export default AIProviderSelector;