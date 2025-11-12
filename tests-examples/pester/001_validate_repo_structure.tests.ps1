<#
Pester test: validate repository structure
Run with: pwsh -Command "Invoke-Pester -Script .\tests-examples\pester\001_validate_repo_structure.tests.ps1"
#>
Import-Module Pester -ErrorAction SilentlyContinue

$RepoRoot = Resolve-Path -Path "$PSScriptRoot\..\.." | Select-Object -ExpandProperty Path

Describe "Repository structure" {
    It "contains expected top-level directories" {
        $expected = @(
            'docs',
            'blueprint-templates',
            'azure-automation',
            'implementation-automation',
            'src'
        )

        foreach ($d in $expected) {
            $path = Join-Path -Path $RepoRoot -ChildPath $d
            Test-Path $path | Should -BeTrue -Because "Expected $d to exist under repo root"
        }
    }

    It "has a README or docs/README.md" {
        $readme = Test-Path (Join-Path $RepoRoot 'README.md') -or Test-Path (Join-Path $RepoRoot 'docs\README.md')
        $readme | Should -BeTrue -Because 'Documentation README should exist'
    }
}
