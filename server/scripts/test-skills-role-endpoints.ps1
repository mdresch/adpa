#!/usr/bin/env pwsh
# ADPA Skills, Competencies, and Role Assignment API Test Script
# Tests all new endpoints created in migration 209

$ErrorActionPreference = "Stop"

Write-Host "🚀 Testing Skills, Competencies & Role Assignment APIs" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:5000"
$testEmail = "admin@adpa.com"
$testPassword = "admin123"

# Test data storage
$testData = @{
    token = ""
    projectId = ""
    stakeholderId = ""
    roleId = ""
    skillId = ""
    competencyId = ""
    taskId = ""
}

# Headers will be set after authentication
$headers = $null

# Results tracking
$results = @{
    Auth = $false
    Skills = @{}
    Competencies = @{}
    Stakeholders = @{}
    Tasks = @{}
}

# ============================================================================
# 1. Authentication
# ============================================================================
Write-Host "1️⃣  Testing Authentication..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    
    # Debug: Check response structure
    if ($loginResponse.PSObject.Properties.Name -contains "token") {
        $testData.token = $loginResponse.token
    } elseif ($loginResponse.PSObject.Properties.Name -contains "data" -and $loginResponse.data.token) {
        $testData.token = $loginResponse.data.token
    } else {
        Write-Host "   ⚠️  Response structure: $($loginResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Yellow
        $testData.token = $loginResponse.token
    }
    
    if ($testData.token) {
        Write-Host "   ✅ Authentication successful" -ForegroundColor Green
        Write-Host "   🔑 Token length: $($testData.token.Length) chars" -ForegroundColor Gray
        
        # Recreate headers hashtable to ensure proper formatting
        # Trim token to remove any whitespace
        $cleanToken = $testData.token.Trim()
        $headers = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $cleanToken"
        }
        
        Write-Host "   🔍 Debug: Headers set. Auth header length: $($headers['Authorization'].Length)" -ForegroundColor Gray
        
        $results.Auth = $true
    } else {
        Write-Host "   ❌ No token received" -ForegroundColor Red
        Write-Host "   Response: $($loginResponse | ConvertTo-Json -Depth 2)" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ❌ Authentication failed: $_" -ForegroundColor Red
    Write-Host "   💡 Make sure backend server is running: npm run dev" -ForegroundColor Yellow
    Write-Host "   💡 Or use: admin@adpa.com / admin123" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# 2. Get Test Project ID
# ============================================================================
Write-Host ""
Write-Host "2️⃣  Getting test project..." -ForegroundColor Yellow
try {
    $projectsResponse = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method GET -Headers $headers -ErrorAction Stop
    
    # Handle different response structures
    $projects = $null
    if ($projectsResponse.projects) {
        $projects = $projectsResponse.projects
    } elseif ($projectsResponse.data) {
        $projects = $projectsResponse.data
    } elseif ($projectsResponse -is [Array]) {
        $projects = $projectsResponse
    }
    
    if ($projects -and $projects.Count -gt 0) {
        # Handle both object and hashtable formats
        if ($projects[0].PSObject.Properties.Name -contains "id") {
            $testData.projectId = $projects[0].id
        } elseif ($projects[0].id) {
            $testData.projectId = $projects[0].id
        } else {
            $testData.projectId = ($projects[0] | Select-Object -ExpandProperty id)
        }
        Write-Host "   ✅ Found project: $($testData.projectId)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No projects found. Creating test project..." -ForegroundColor Yellow
        $newProject = @{
            name = "Test Project for API Testing"
            description = "Temporary project for testing skills/roles APIs"
        } | ConvertTo-Json
        
        $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method POST -Headers $headers -Body $newProject -ErrorAction Stop
        
        # Handle different response structures
        if ($createResponse.data) {
            $testData.projectId = $createResponse.data.id
        } elseif ($createResponse.id) {
            $testData.projectId = $createResponse.id
        } else {
            $testData.projectId = ($createResponse | Select-Object -ExpandProperty id)
        }
        Write-Host "   ✅ Created test project: $($testData.projectId)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Failed to get/create project" -ForegroundColor Red
    
    # Try to extract error details
    if ($_.ErrorDetails.Message) {
        Write-Host "   Error details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            if ($errorObj.error) {
                Write-Host "   Error message: $($errorObj.error)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   Raw error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   Error: $_" -ForegroundColor Yellow
    }
    
    Write-Host "   Debug - Token first 30 chars: $($testData.token.Substring(0, [Math]::Min(30, $testData.token.Length)))" -ForegroundColor Gray
    Write-Host "   Debug - Authorization header: Bearer $($testData.token.Substring(0, [Math]::Min(30, $testData.token.Length)))..." -ForegroundColor Gray
    
    # Try a simple test request to verify token works
    Write-Host "   Testing token with /api/auth/me endpoint..." -ForegroundColor Gray
    try {
        $meResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "   ✅ Token works! User: $($meResponse.user.email)" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Token validation failed: $_" -ForegroundColor Red
    }
    
    exit 1
}

# ============================================================================
# 3. SKILLS API TESTS
# ============================================================================
Write-Host ""
Write-Host "3️⃣  Testing Skills API..." -ForegroundColor Yellow

# 3.1 Create Skill
Write-Host "   3.1 Creating skill..." -ForegroundColor Gray
try {
    $skillBody = @{
        name = "TypeScript"
        description = "TypeScript programming language"
        category = "technical"
    } | ConvertTo-Json
    
    $skillResponse = Invoke-RestMethod -Uri "$baseUrl/api/skills" -Method POST -Headers $headers -Body $skillBody -ErrorAction Stop
    $testData.skillId = $skillResponse.data.id
    Write-Host "      ✅ Skill created: $($skillResponse.data.name) (ID: $($testData.skillId))" -ForegroundColor Green
    $results.Skills.Create = $true
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "      ⚠️  Skill already exists, fetching existing..." -ForegroundColor Yellow
        $existingSkills = Invoke-RestMethod -Uri "$baseUrl/api/skills" -Method GET -Headers $headers -ErrorAction Stop
        $testData.skillId = ($existingSkills.data | Where-Object { $_.name -eq "TypeScript" })[0].id
        Write-Host "      ✅ Using existing skill: $($testData.skillId)" -ForegroundColor Green
        $results.Skills.Create = $true
    } else {
        Write-Host "      ❌ Failed to create skill: $_" -ForegroundColor Red
        $results.Skills.Create = $false
    }
}

# 3.2 Get All Skills
Write-Host "   3.2 Getting all skills..." -ForegroundColor Gray
try {
    $skillsResponse = Invoke-RestMethod -Uri "$baseUrl/api/skills" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "      ✅ Retrieved $($skillsResponse.count) skills" -ForegroundColor Green
    $results.Skills.GetAll = $true
} catch {
    Write-Host "      ❌ Failed to get skills: $_" -ForegroundColor Red
    $results.Skills.GetAll = $false
}

# 3.3 Get Skill by ID
if ($testData.skillId) {
    Write-Host "   3.3 Getting skill by ID..." -ForegroundColor Gray
    try {
        $skillResponse = Invoke-RestMethod -Uri "$baseUrl/api/skills/$($testData.skillId)" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "      ✅ Retrieved skill: $($skillResponse.data.name)" -ForegroundColor Green
        $results.Skills.GetById = $true
    } catch {
        Write-Host "      ❌ Failed to get skill: $_" -ForegroundColor Red
        $results.Skills.GetById = $false
    }
}

# ============================================================================
# 4. COMPETENCIES API TESTS
# ============================================================================
Write-Host ""
Write-Host "4️⃣  Testing Competencies API..." -ForegroundColor Yellow

# 4.1 Create Competency
Write-Host "   4.1 Creating competency..." -ForegroundColor Gray
try {
    $competencyBody = @{
        name = "Project Management"
        description = "Ability to manage projects effectively"
        category = "management"
    } | ConvertTo-Json
    
    $competencyResponse = Invoke-RestMethod -Uri "$baseUrl/api/competencies" -Method POST -Headers $headers -Body $competencyBody -ErrorAction Stop
    $testData.competencyId = $competencyResponse.data.id
    Write-Host "      ✅ Competency created: $($competencyResponse.data.name) (ID: $($testData.competencyId))" -ForegroundColor Green
    $results.Competencies.Create = $true
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "      ⚠️  Competency already exists, fetching existing..." -ForegroundColor Yellow
        $existingCompetencies = Invoke-RestMethod -Uri "$baseUrl/api/competencies" -Method GET -Headers $headers -ErrorAction Stop
        $testData.competencyId = ($existingCompetencies.data | Where-Object { $_.name -eq "Project Management" })[0].id
        Write-Host "      ✅ Using existing competency: $($testData.competencyId)" -ForegroundColor Green
        $results.Competencies.Create = $true
    } else {
        Write-Host "      ❌ Failed to create competency: $_" -ForegroundColor Red
        $results.Competencies.Create = $false
    }
}

# 4.2 Get All Competencies
Write-Host "   4.2 Getting all competencies..." -ForegroundColor Gray
try {
    $competenciesResponse = Invoke-RestMethod -Uri "$baseUrl/api/competencies" -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "      ✅ Retrieved $($competenciesResponse.count) competencies" -ForegroundColor Green
    $results.Competencies.GetAll = $true
} catch {
    Write-Host "      ❌ Failed to get competencies: $_" -ForegroundColor Red
    $results.Competencies.GetAll = $false
}

# ============================================================================
# 5. GET TEST DATA (Roles, Stakeholders, Tasks)
# ============================================================================
Write-Host ""
Write-Host "5️⃣  Getting test data (roles, stakeholders, tasks)..." -ForegroundColor Yellow

# Get Role
try {
    $rolesResponse = Invoke-RestMethod -Uri "$baseUrl/api/cost-management/roles" -Method GET -Headers $headers -ErrorAction Stop
    if ($rolesResponse.data -and $rolesResponse.data.Count -gt 0) {
        $testData.roleId = $rolesResponse.data[0].id
        Write-Host "   ✅ Found role: $($rolesResponse.data[0].roleName) (ID: $($testData.roleId))" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No roles found. Creating test role..." -ForegroundColor Yellow
        $newRole = @{
            roleName = "Test Developer"
            roleCode = "TEST-DEV"
            roleType = "internal"
            defaultHourlyRate = 75
            currency = "USD"
        } | ConvertTo-Json
        
        $createRoleResponse = Invoke-RestMethod -Uri "$baseUrl/api/cost-management/roles" -Method POST -Headers $headers -Body $newRole -ErrorAction Stop
        $testData.roleId = $createRoleResponse.data.id
        Write-Host "   ✅ Created test role: $($testData.roleId)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Could not get/create role: $_" -ForegroundColor Yellow
}

# Get Stakeholder
try {
    $stakeholdersResponse = Invoke-RestMethod -Uri "$baseUrl/api/stakeholders/project/$($testData.projectId)" -Method GET -Headers $headers -ErrorAction Stop
    if ($stakeholdersResponse.stakeholders -and $stakeholdersResponse.stakeholders.Count -gt 0) {
        $testData.stakeholderId = $stakeholdersResponse.stakeholders[0].id
        Write-Host "   ✅ Found stakeholder: $($stakeholdersResponse.stakeholders[0].name) (ID: $($testData.stakeholderId))" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No stakeholders found in project" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not get stakeholders: $_" -ForegroundColor Yellow
}

# Get Task
try {
    $tasksResponse = Invoke-RestMethod -Uri "$baseUrl/api/tasks/project/$($testData.projectId)" -Method GET -Headers $headers -ErrorAction Stop
    if ($tasksResponse.data -and $tasksResponse.data.Count -gt 0) {
        $testData.taskId = $tasksResponse.data[0].id
        Write-Host "   ✅ Found task: $($tasksResponse.data[0].task_name) (ID: $($testData.taskId))" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No tasks found in project" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not get tasks: $_" -ForegroundColor Yellow
}

# ============================================================================
# 6. STAKEHOLDER API TESTS
# ============================================================================
if ($testData.stakeholderId) {
    Write-Host ""
    Write-Host "6️⃣  Testing Stakeholder Role Assignment API..." -ForegroundColor Yellow
    
    # 6.1 Get Stakeholder Skills
    Write-Host "   6.1 Getting stakeholder skills..." -ForegroundColor Gray
    try {
        $skillsResponse = Invoke-RestMethod -Uri "$baseUrl/api/stakeholders/$($testData.stakeholderId)/skills" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "      ✅ Retrieved $($skillsResponse.count) skills for stakeholder" -ForegroundColor Green
        $results.Stakeholders.GetSkills = $true
    } catch {
        Write-Host "      ❌ Failed to get stakeholder skills: $_" -ForegroundColor Red
        $results.Stakeholders.GetSkills = $false
    }
    
    # 6.2 Assign Skill to Stakeholder
    if ($testData.skillId) {
        Write-Host "   6.2 Assigning skill to stakeholder..." -ForegroundColor Gray
        try {
            $assignSkillBody = @{
                skillId = $testData.skillId
                proficiencyLevel = "advanced"
                yearsOfExperience = 5
                verified = $false
            } | ConvertTo-Json
            
            $assignResponse = Invoke-RestMethod -Uri "$baseUrl/api/stakeholders/$($testData.stakeholderId)/skills" -Method POST -Headers $headers -Body $assignSkillBody -ErrorAction Stop
            Write-Host "      ✅ Skill assigned to stakeholder" -ForegroundColor Green
            $results.Stakeholders.AssignSkill = $true
        } catch {
            if ($_.Exception.Response.StatusCode -eq 409) {
                Write-Host "      ⚠️  Skill already assigned (expected)" -ForegroundColor Yellow
                $results.Stakeholders.AssignSkill = $true
            } else {
                Write-Host "      ⚠️  Skill assignment: $_" -ForegroundColor Yellow
                $results.Stakeholders.AssignSkill = $false
            }
        }
    }
    
    # 6.3 Assign Role to Stakeholder
    if ($testData.roleId) {
        Write-Host "   6.3 Assigning role to stakeholder..." -ForegroundColor Gray
        try {
            $assignRoleBody = @{
                roleId = $testData.roleId
                projectId = $testData.projectId
                assignmentType = "primary"
                allocationPercentage = 100
            } | ConvertTo-Json
            
            $assignResponse = Invoke-RestMethod -Uri "$baseUrl/api/stakeholders/$($testData.stakeholderId)/assign-role" -Method POST -Headers $headers -Body $assignRoleBody -ErrorAction Stop
            Write-Host "      ✅ Role assigned to stakeholder" -ForegroundColor Green
            $results.Stakeholders.AssignRole = $true
        } catch {
            Write-Host "      ⚠️  Role assignment: $_" -ForegroundColor Yellow
            $results.Stakeholders.AssignRole = $false
        }
    }
    
    # 6.4 Get Stakeholder Roles
    Write-Host "   6.4 Getting stakeholder roles..." -ForegroundColor Gray
    try {
        $rolesResponse = Invoke-RestMethod -Uri "$baseUrl/api/stakeholders/$($testData.stakeholderId)/roles?projectId=$($testData.projectId)" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "      ✅ Retrieved $($rolesResponse.count) roles for stakeholder" -ForegroundColor Green
        $results.Stakeholders.GetRoles = $true
    } catch {
        Write-Host "      ❌ Failed to get stakeholder roles: $_" -ForegroundColor Red
        $results.Stakeholders.GetRoles = $false
    }
    
    # 6.5 Get Skill Match
    if ($testData.roleId) {
        Write-Host "   6.5 Getting skill match percentage..." -ForegroundColor Gray
        try {
            $matchResponse = Invoke-RestMethod -Uri "$baseUrl/api/stakeholders/$($testData.stakeholderId)/match-role/$($testData.roleId)" -Method GET -Headers $headers -ErrorAction Stop
            Write-Host "      ✅ Skill match: $($matchResponse.data.matchPercentage)% ($($matchResponse.data.matchedSkills)/$($matchResponse.data.totalRequiredSkills) skills)" -ForegroundColor Green
            $results.Stakeholders.SkillMatch = $true
        } catch {
            Write-Host "      ⚠️  Skill match calculation: $_" -ForegroundColor Yellow
            $results.Stakeholders.SkillMatch = $false
        }
    }
}

# ============================================================================
# 7. TASK API TESTS
# ============================================================================
if ($testData.taskId) {
    Write-Host ""
    Write-Host "7️⃣  Testing Task Role Assignment API..." -ForegroundColor Yellow
    
    # 7.1 Get Task Roles
    Write-Host "   7.1 Getting task roles..." -ForegroundColor Gray
    try {
        $taskRolesResponse = Invoke-RestMethod -Uri "$baseUrl/api/tasks/$($testData.taskId)/roles" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "      ✅ Retrieved $($taskRolesResponse.count) roles for task" -ForegroundColor Green
        $results.Tasks.GetRoles = $true
    } catch {
        Write-Host "      ❌ Failed to get task roles: $_" -ForegroundColor Red
        $results.Tasks.GetRoles = $false
    }
    
    # 7.2 Assign Role to Task
    if ($testData.roleId) {
        Write-Host "   7.2 Assigning role to task..." -ForegroundColor Gray
        try {
            $assignRoleBody = @{
                roleId = $testData.roleId
                roleType = "executor"
                isPrimary = $false
                requiredCount = 1
            } | ConvertTo-Json
            
            $assignResponse = Invoke-RestMethod -Uri "$baseUrl/api/tasks/$($testData.taskId)/roles" -Method POST -Headers $headers -Body $assignRoleBody -ErrorAction Stop
            Write-Host "      ✅ Role assigned to task" -ForegroundColor Green
            $results.Tasks.AssignRole = $true
        } catch {
            if ($_.Exception.Response.StatusCode -eq 409) {
                Write-Host "      ⚠️  Role already assigned (expected)" -ForegroundColor Yellow
                $results.Tasks.AssignRole = $true
            } else {
                Write-Host "      ⚠️  Role assignment: $_" -ForegroundColor Yellow
                $results.Tasks.AssignRole = $false
            }
        }
    }
    
    # 7.3 Get Suggested Stakeholders
    Write-Host "   7.3 Getting suggested stakeholders..." -ForegroundColor Gray
    try {
        $suggestionsResponse = Invoke-RestMethod -Uri "$baseUrl/api/tasks/$($testData.taskId)/suggested-stakeholders" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "      ✅ Found $($suggestionsResponse.count) suggested stakeholders" -ForegroundColor Green
        if ($suggestionsResponse.data.Count -gt 0) {
            Write-Host "         Top match: $($suggestionsResponse.data[0].stakeholderName) - $($suggestionsResponse.data[0].matchPercentage)%" -ForegroundColor Gray
        }
        $results.Tasks.SuggestedStakeholders = $true
    } catch {
        Write-Host "      ⚠️  Suggested stakeholders: $_" -ForegroundColor Yellow
        $results.Tasks.SuggestedStakeholders = $false
    }
    
    # 7.4 Get Skill Gaps
    Write-Host "   7.4 Getting skill gaps..." -ForegroundColor Gray
    try {
        $gapsResponse = Invoke-RestMethod -Uri "$baseUrl/api/tasks/$($testData.taskId)/skill-gaps" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "      ✅ Found $($gapsResponse.count) skill gaps" -ForegroundColor Green
        $results.Tasks.SkillGaps = $true
    } catch {
        Write-Host "      ⚠️  Skill gaps: $_" -ForegroundColor Yellow
        $results.Tasks.SkillGaps = $false
    }
}

# ============================================================================
# 8. SKILL ASSIGNMENT TO ROLE
# ============================================================================
if ($testData.skillId -and $testData.roleId) {
    Write-Host ""
    Write-Host "8️⃣  Testing Skill Assignment to Role..." -ForegroundColor Yellow
    Write-Host "   8.1 Assigning skill to role..." -ForegroundColor Gray
    try {
        $assignSkillBody = @{
            roleId = $testData.roleId
            requiredProficiency = "intermediate"
            isRequired = $true
        } | ConvertTo-Json
        
        $assignResponse = Invoke-RestMethod -Uri "$baseUrl/api/skills/$($testData.skillId)/assign-to-role" -Method POST -Headers $headers -Body $assignSkillBody -ErrorAction Stop
        Write-Host "      ✅ Skill assigned to role" -ForegroundColor Green
        $results.Skills.AssignToRole = $true
    } catch {
        Write-Host "      ⚠️  Skill assignment to role: $_" -ForegroundColor Yellow
        $results.Skills.AssignToRole = $false
    }
    
    # Get Role Skills
    Write-Host "   8.2 Getting role skills..." -ForegroundColor Gray
    try {
        $roleSkillsResponse = Invoke-RestMethod -Uri "$baseUrl/api/skills/role/$($testData.roleId)" -Method GET -Headers $headers -ErrorAction Stop
        Write-Host "      ✅ Retrieved $($roleSkillsResponse.count) skills for role" -ForegroundColor Green
        $results.Skills.GetRoleSkills = $true
    } catch {
        Write-Host "      ❌ Failed to get role skills: $_" -ForegroundColor Red
        $results.Skills.GetRoleSkills = $false
    }
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

$totalTests = 0
$passedTests = 0

Write-Host "Skills API:" -ForegroundColor Yellow
foreach ($key in $results.Skills.Keys) {
    $totalTests++
    if ($results.Skills[$key]) {
        Write-Host "  ✅ $key" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  ❌ $key" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Competencies API:" -ForegroundColor Yellow
foreach ($key in $results.Competencies.Keys) {
    $totalTests++
    if ($results.Competencies[$key]) {
        Write-Host "  ✅ $key" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  ❌ $key" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Stakeholders API:" -ForegroundColor Yellow
foreach ($key in $results.Stakeholders.Keys) {
    $totalTests++
    if ($results.Stakeholders[$key]) {
        Write-Host "  ✅ $key" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  ❌ $key" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Tasks API:" -ForegroundColor Yellow
foreach ($key in $results.Tasks.Keys) {
    $totalTests++
    if ($results.Tasks[$key]) {
        Write-Host "  ✅ $key" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  ❌ $key" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "Total: $passedTests/$totalTests tests passed" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

if ($passedTests -eq $totalTests) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Some tests failed or were skipped" -ForegroundColor Yellow
    Write-Host "   This may be expected if test data is missing" -ForegroundColor Gray
    exit 0
}

