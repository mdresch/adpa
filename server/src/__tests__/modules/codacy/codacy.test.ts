import { buildArguments, formatWorkspacePath } from '../../../modules/codacy/codacyService';

describe('Codacy CLI & Test Integration', () => {
  const mockEnvUnix = {
    platform: 'linux',
    cwd: () => '/home/user/project'
  };

  const mockEnvWin = {
    platform: 'win32',
    cwd: () => 'C:\\Users\\MennoDrescher\\Source\\Repos\\adpa'
  };

  // REQ-001: Local binary presence command mapping
  it('should identify local binary presence and build arguments for local binary execution', () => {
    // REQ-001
    const result = buildArguments({}, true, mockEnvUnix);
    expect(result.command).toBe('codacy-analysis-cli');
    expect(result.args).toContain('analyze');
    expect(result.args).toContain('--project-type');
    expect(result.args).toContain('typescript');
  });

  // REQ-002: Fallback to executing via Docker when local binary is missing
  it('should construct correct Docker fallback arguments when local binary is missing', () => {
    // REQ-002
    const result = buildArguments({}, false, mockEnvUnix);
    expect(result.command).toBe('docker');
    expect(result.args).toContain('run');
    expect(result.args).toContain('--rm');
    expect(result.args).toContain('codacy/codacy-analysis-cli:latest');
    expect(result.args).toContain('--directory');
    expect(result.args).toContain('/src');
  });

  // REQ-003: Map provider (gh), organization (mdresch), and repository (adpa) defaults
  it('should enforce provider, org, and repo default bindings in both local and Docker execution', () => {
    // REQ-003
    const localResult = buildArguments({}, true, mockEnvUnix);
    expect(localResult.args).toContain('--provider');
    expect(localResult.args).toContain('gh');
    expect(localResult.args).toContain('--username');
    expect(localResult.args).toContain('mdresch');
    expect(localResult.args).toContain('--project');
    expect(localResult.args).toContain('adpa');

    const dockerResult = buildArguments({}, false, mockEnvUnix);
    expect(dockerResult.args).toContain('--provider');
    expect(dockerResult.args).toContain('gh');
    expect(dockerResult.args).toContain('--username');
    expect(dockerResult.args).toContain('mdresch');
    expect(dockerResult.args).toContain('--project');
    expect(dockerResult.args).toContain('adpa');
  });

  // REQ-003: Accept overrides for provider, organization, and repository parameters
  it('should allow overriding default provider, organization, and repository bindings', () => {
    // REQ-003
    const result = buildArguments({
      provider: 'gl',
      organization: 'other-org',
      repository: 'other-repo'
    }, true, mockEnvUnix);
    expect(result.args).toContain('gl');
    expect(result.args).toContain('other-org');
    expect(result.args).toContain('other-repo');
  });

  // REQ-004: Single file mode relative path mapping
  it('should map relative file paths correctly in local mode and Docker mode', () => {
    // REQ-004
    const fileArg = 'server/src/server.ts';
    
    const localResult = buildArguments({ file: fileArg }, true, mockEnvUnix);
    expect(localResult.args).not.toContain('--file');
    expect(localResult.args).toContain(fileArg);

    const dockerResult = buildArguments({ file: fileArg }, false, mockEnvUnix);
    expect(dockerResult.args).not.toContain('--file');
    expect(dockerResult.args).toContain('server/src/server.ts');
  });

  // REQ-005: Dependency security audit tool selection (trivy)
  it('should format Trivy tool argument for security scanning', () => {
    // REQ-005
    const localResult = buildArguments({ tool: 'trivy' }, true, mockEnvUnix);
    expect(localResult.args).toContain('--tool');
    expect(localResult.args).toContain('trivy');

    const dockerResult = buildArguments({ tool: 'trivy' }, false, mockEnvUnix);
    expect(dockerResult.args).toContain('--tool');
    expect(dockerResult.args).toContain('trivy');
  });

  // REQ-006: Standard non-URL-encoded workspace path mapping (e.g. windows paths)
  it('should ensure rootPath is not URL encoded and backslashes are normalized in volume mounts', () => {
    // REQ-006
    const winPath = 'C:\\Users\\MennoDrescher\\Source\\Repos\\adpa';
    const formatted = formatWorkspacePath(winPath);
    expect(formatted).toBe('C:/Users/MennoDrescher/Source/Repos/adpa');
    expect(formatted).not.toContain('%20');
    
    // Windows Docker arguments mapping
    const result = buildArguments({}, false, mockEnvWin);
    expect(result.args).toContain('-v');
    expect(result.args).toContain('C:/Users/MennoDrescher/Source/Repos/adpa:/src');
    expect(result.args).toContain('//var/run/docker.sock:/var/run/docker.sock');
  });
});
