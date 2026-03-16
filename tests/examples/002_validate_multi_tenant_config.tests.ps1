<#
Pester test: validate multi-tenant configuration JSON is present and parseable
Run with: pwsh -Command "Invoke-Pester -Script .\tests-examples\pester\002_validate_multi_tenant_config.tests.ps1"
#>
Import-Module Pester -ErrorAction SilentlyContinue

$RepoRoot = Resolve-Path -Path "$PSScriptRoot\..\.." | Select-Object -ExpandProperty Path
$configPath = Join-Path $RepoRoot 'implementation-automation\config\multi-tenant-config.json'

Describe "Multi-tenant configuration" {
    It "config file exists" {
        Test-Path $configPath | Should -BeTrue -Because "Expected multi-tenant config at $configPath"
    }

    It "config is valid JSON" -Skip:$([string]::IsNullOrEmpty((Resolve-Path $configPath -ErrorAction SilentlyContinue))) {
        $content = Get-Content -Path $configPath -Raw
        { $null = $content | ConvertFrom-Json } | Should -Not -Throw
    }
}
