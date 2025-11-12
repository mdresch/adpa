<#
Pester test: basic checks for Bicep templates presence and simple lint-ish checks
Run with: pwsh -Command "Invoke-Pester -Script .\tests-examples\pester\003_validate_bicep_templates.tests.ps1"
#>
Import-Module Pester -ErrorAction SilentlyContinue

$RepoRoot = Resolve-Path -Path "$PSScriptRoot\..\.." | Select-Object -ExpandProperty Path
$bicepDir = Join-Path $RepoRoot 'blueprint-templates\infrastructure-blueprints'

Describe "Bicep templates" {
    It "bicep directory exists" {
        Test-Path $bicepDir | Should -BeTrue -Because "Expected bicep templates dir at $bicepDir"
    }

    It "contains at least one .bicep file" -Skip:(!(Test-Path $bicepDir)) {
        $files = Get-ChildItem -Path $bicepDir -Filter '*.bicep' -File -Recurse -ErrorAction SilentlyContinue
        ($files.Count) | Should -BeGreaterThan 0 -Because 'At least one .bicep file expected'
    }

    It "bicep files contain common keywords (param/resource)" -Skip:(!(Test-Path $bicepDir)) {
        $files = Get-ChildItem -Path $bicepDir -Filter '*.bicep' -File -Recurse -ErrorAction SilentlyContinue
        foreach ($f in $files) {
            $content = Get-Content -Path $f.FullName -Raw
            ($content -match '\bparam\b' -or $content -match '\bresource\b') | Should -BeTrue -Because "Bicep file $($f.Name) should declare param or resource"
        }
    }
}
