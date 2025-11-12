# CCB Routing Implementation Summary

## ✅ Changes Completed

### 1. **Migration Created** (`325_update_approval_workflows_for_ccb.sql`)

Updated approval workflows to route change requests to CCB:

- ✅ **General Change Request** (`general_cr`) → Routes to CCB
- ✅ **Scope Change** (`scope_change`) → Routes to CCB  
- ✅ **Timeline Change** (`timeline_change`) → Routes to CCB
- ✅ **Technical Change** (`technical_change`) → Routes to CCB → CTO (if high impact)

**Unchanged Workflows** (maintain specific approval paths):
- Budget Overrun: Project Sponsor → CFO → CEO
- Positive Drift: Project Sponsor → Innovation Lead → CTO
- Negative Drift: Project Sponsor → Program Manager

### 2. **Documentation Updated**

- ✅ Created `CCB_APPROVAL_ROUTING.md` - Complete CCB guide
- ✅ Updated `APPROVAL_WORKFLOW_GUIDE.md` - Added CCB routing information

---

## 🚀 Next Steps

### Step 1: Run Migration

```bash
# Connect to database and run migration
psql $DATABASE_URL -f server/migrations/325_update_approval_workflows_for_ccb.sql
```

Or use your preferred database tool to execute the migration.

### Step 2: Assign CCB Role to Users

Assign the `ccb` role to users who should be CCB members:

```sql
-- Assign CCB role to specific users
UPDATE users 
SET role = 'ccb' 
WHERE email IN (
    'sponsor@example.com',      -- Project Sponsor
    'pm@example.com',            -- Project Manager
    'tech-lead@example.com',    -- Technical Lead
    'ba@example.com'            -- Business Analyst
);
```

Or via the UI:
1. Navigate to **Users & Roles** (`/users`)
2. Edit each CCB member user
3. Set Role to `ccb`

### Step 3: Verify Workflows

Check that workflows are active:

```sql
SELECT workflow_type, name, approval_stages, is_active 
FROM approval_workflows 
WHERE workflow_type IN ('general_cr', 'scope_change', 'timeline_change', 'technical_change')
ORDER BY workflow_type;
```

Expected result: All 4 workflows should show `is_active = true` and `approval_stages` containing `"role": "ccb"`.

---

## 📋 How It Works

### Approval Assignment

When a change request is created:

1. System finds the workflow for the request type
2. Creates approval steps based on workflow stages
3. For CCB stage: Finds first user with `role = 'ccb'`
4. Assigns that user to the approval step
5. Sends notification to assigned CCB member

### CCB Approval Process

1. **CCB Member Receives Notification** → Email + Dashboard badge
2. **Reviews Request** → Views details at `/approvals/[id]`
3. **Makes Decision** → Approves or rejects with notes
4. **Request Advances** → If approved, moves to next stage (if exists) or completes

---

## ⚠️ Current Limitation

**Single CCB Member Assignment**: The current system assigns **one** CCB member per approval step (the first user found with `ccb` role). 

**Workaround**: 
- Assign multiple users the `ccb` role
- The first user assigned can approve
- Other CCB members can view but not approve (unless they're the assigned user)

**Future Enhancement**: 
- Create multiple approval steps for CCB (one per member)
- Or enhance `canApproveStep` to allow any user with CCB role to approve CCB steps
- Or create a CCB user group system

---

## 🧪 Testing

### Test CCB Routing

1. **Create Test CCB User**:
   ```sql
   INSERT INTO users (email, name, role) 
   VALUES ('ccb-test@example.com', 'CCB Test User', 'ccb');
   ```

2. **Create Test Approval Request**:
   - Navigate to `/approvals`
   - Click "Create Approval Request"
   - Select "General Change Request"
   - Fill in details and submit

3. **Verify Assignment**:
   - Check that approval step is assigned to CCB user
   - CCB user should see the request in their approvals list
   - CCB user can approve/reject the request

---

## 📚 Related Documentation

- `docs/06-features/CCB_APPROVAL_ROUTING.md` - Complete CCB guide
- `docs/06-features/APPROVAL_WORKFLOW_GUIDE.md` - General approval workflow guide
- `server/migrations/325_update_approval_workflows_for_ccb.sql` - Migration file

---

**Status**: ✅ Ready for deployment  
**Migration**: `325_update_approval_workflows_for_ccb.sql`  
**Last Updated**: November 2025

