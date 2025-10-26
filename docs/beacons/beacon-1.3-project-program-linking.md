# Beacon 1.3: Project-Program Linking API

## Owner
Backend Agent #2 (can run parallel with Frontend agents)

## Duration
10-15 minutes with GitHub Copilot

## Dependencies
- Beacon 1.1: Programs table (must exist)
- Beacon 1.2: Program CRUD API (must exist)

## Epic
ADPA v3.0 - Program Management Foundation

## Description
Update project APIs to support program assignment and management. Allow projects to be assigned to programs, validate program exists, and provide APIs to list projects by program.

---

## Requirements

### Update Existing Files

**FILE: server/src/routes/projectRoutes.ts**
- Add endpoint: `GET /api/programs/:programId/projects` (list all projects in a program)
- Update `PUT /api/projects/:id` to accept optional `program_id` in request body
- Validation: If program_id provided, verify program exists before assignment
- Authorization: Only program owner or admin can assign projects to program

**FILE: server/src/services/projectService.ts**
- Add function: `findByProgram(programId: string)` - returns all projects in program
- Update function: `update(projectId, data, userId)` - handle program_id assignment
- Validation: Check program exists before assigning
- Business rule: Projects can exist without program (program_id nullable)

**FILE: server/__tests__/routes/projectRoutes.test.ts**
- Add tests for `GET /api/programs/:programId/projects`
  - Should list projects in program
  - Should return empty array if no projects
  - Should require authentication
- Add tests for project program assignment
  - Should assign project to program
  - Should reject invalid program_id
  - Should allow removing program (set to null)
  - Should prevent assignment if user not authorized

---

## Reference Files

**Study these patterns:**
- `server/src/routes/projectRoutes.ts` - Existing project API
- `server/src/services/projectService.ts` - Existing project service
- `server/src/routes/programRoutes.ts` - Program API (just created in Beacon 1.2)

**Follow conventions:**
- Joi validation for program_id (UUID format)
- Parameterized SQL queries (no string interpolation)
- Error handling: 404 if program not found, 403 if unauthorized
- Logging: Winston logger for all operations

---

## Output Files

**Modified files:**
1. `server/src/routes/projectRoutes.ts` - Add program-project endpoints
2. `server/src/services/projectService.ts` - Add program relationship logic
3. `server/__tests__/routes/projectRoutes.test.ts` - Add relationship tests

---

## Implementation Details

### New Endpoint: GET /api/programs/:programId/projects

```typescript
router.get('/programs/:programId/projects',
  authenticateToken,
  async (req, res) => {
    const projects = await projectService.findByProgram(req.params.programId);
    res.json({ success: true, data: projects });
  }
);
```

### Update Endpoint: PUT /api/projects/:id

Add program_id validation:
```typescript
const schema = Joi.object({
  name: Joi.string().max(255),
  description: Joi.string(),
  program_id: Joi.string().uuid().allow(null), // NEW: Allow program assignment
  // ... other fields
});
```

### Service Layer: projectService.ts

```typescript
async findByProgram(programId: string) {
  const result = await pool.query(
    'SELECT * FROM projects WHERE program_id = $1 ORDER BY created_at DESC',
    [programId]
  );
  return result.rows;
}

async update(id: string, data: any, userId: string) {
  // If program_id is being set, verify program exists
  if (data.program_id) {
    const programCheck = await pool.query(
      'SELECT id FROM programs WHERE id = $1',
      [data.program_id]
    );
    if (programCheck.rows.length === 0) {
      throw new Error('Program not found');
    }
  }
  
  // Existing update logic...
  // Add program_id to UPDATE statement if provided
}
```

---

## Testing

**Test Cases:**
- List projects by program (valid program)
- List projects by program (program with no projects)
- List projects by program (invalid program ID)
- Assign project to program (valid)
- Assign project to program (invalid program_id - should fail)
- Remove project from program (set program_id to null)
- Update project program assignment (authorization check)

**Coverage Target:** 80%+ of new code

---

## Success Criteria

- [x] GET /api/programs/:programId/projects endpoint working
- [x] Projects can be assigned to programs via PUT /api/projects/:id
- [x] Program validation prevents invalid assignments
- [x] Authorization enforced (program owner or admin)
- [x] Projects can be unassigned (program_id = null)
- [x] All tests passing (8-10 new tests)
- [x] No TypeScript errors
- [x] Follows existing project API patterns

---

## Time Estimate

**Traditional Development:**
- Update routes: 2 hours
- Update service: 2 hours
- Write tests: 3 hours
- Debug: 1 hour
- **Total: 8 hours** (1 day)

**With GitHub Copilot:**
- Update routes: 3 minutes (AI-generated)
- Update service: 3 minutes (AI-generated)
- Write tests: 5 minutes (AI-generated)
- Review & fix: 5 minutes
- **Total: 16 minutes** (95% faster!)

---

## Parallel Development

**Can run simultaneously with:**
- Beacon 2.1: Program List UI (different files, no conflict)
- Beacon 3.1: Dependency data model (different table)
- Beacon 6.1: iBabs OAuth (different service)

**Blocks these beacons:**
- Beacon 2.2: Program Detail Page (needs project-program API)

---

**Status:** Ready for AI generation
**Priority:** MEDIUM (enhances program-project relationship)
**Assigned:** Backend Agent #2 (can work parallel with Frontend/iBabs agents)

