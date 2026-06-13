import path from 'path';

export interface AnalyzeOptions {
  file?: string;
  tool?: string;
  directory?: string;
  format?: string;
  provider?: string;
  organization?: string;
  repository?: string;
  docker?: boolean;
}

export interface Environment {
  platform: string;
  cwd: () => string;
}

export const DEFAULT_PROVIDER = 'gh';
export const DEFAULT_ORGANIZATION = 'mdresch';
export const DEFAULT_REPOSITORY = 'adpa';

/**
 * Standardize path to use forward slashes (especially for Docker volume mapping on Windows)
 */
export function formatWorkspacePath(rootPath: string): string {
  // REQ-006: MUST be standard, non-URL-encoded
  return rootPath.replace(/\\/g, '/');
}

/**
 * Build execution arguments for either local CLI binary or Docker fallback
 */
export function buildArguments(
  options: AnalyzeOptions,
  useLocalBinary: boolean,
  env: Environment = { platform: process.platform, cwd: () => process.cwd() }
): { command: string; args: string[] } {
  const rootPath = env.cwd();
  
  // REQ-003: Default bindings mapping
  const provider = options.provider || DEFAULT_PROVIDER;
  const org = options.organization || DEFAULT_ORGANIZATION;
  const repo = options.repository || DEFAULT_REPOSITORY;
  const tool = options.tool;
  const file = options.file;
  const format = options.format || 'text';

  if (useLocalBinary) {
    const args = ['analyze', '--project-type', 'typescript'];
    args.push('--provider', provider);
    args.push('--username', org);
    args.push('--project', repo);

    // REQ-005: tool configuration mapping
    if (tool) {
      args.push('--tool', tool);
    }
    // REQ-004: single file mode (positional argument)
    if (file) {
      args.push(file);
    }
    if (format === 'json') {
      args.push('--format', 'json');
    }
    return { command: 'codacy-analysis-cli', args };
  } else {
    // REQ-002: Docker fallback route
    const winWorkspace = formatWorkspacePath(rootPath);
    
    // REQ-006: standard non-URL-encoded path mapping
    const dockerSockMount = env.platform === 'win32'
      ? '//var/run/docker.sock:/var/run/docker.sock'
      : '/var/run/docker.sock:/var/run/docker.sock';

    const args = [
      'run', '--rm',
      '-v', `${winWorkspace}:/src`,
      '-v', dockerSockMount,
      'codacy/codacy-analysis-cli:latest',
      'analyze',
      '--directory', '/src',
      '--provider', provider,
      '--username', org,
      '--project', repo
    ];

    // REQ-005: tool configuration mapping
    if (tool) {
      args.push('--tool', tool);
    }
    // REQ-004: single file mode relative path mapping (positional argument)
    if (file) {
      const absoluteFile = path.resolve(rootPath, file);
      const relativeFile = path.relative(rootPath, absoluteFile).replace(/\\/g, '/');
      args.push(relativeFile);
    }
    if (format === 'json') {
      args.push('--format', 'json');
    }

    return { command: 'docker', args };
  }
}
