# Stakeholder Functionality Testing Checklist

## Pre-Testing Setup

### 1. Database Setup
Before testing, ensure the stakeholders table exists. Choose one of these options:

**Option A: Run SQL Script Directly**
```bash
psql -d your_database_name -f create-stakeholders-table.sql
```

**Option B: Use Node.js Setup Script**
```bash
node test-stakeholder-setup.js
```

**Option C: Run Migration (if database is accessible)**
```bash
cd server && npm run migrate
```

### 2. Verify Table Creation
Run this query to confirm the table exists:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'stakeholders';
```

## Testing Steps

### 1. Navigate to Project Page
- Go to: `http://localhost:3000/projects/45083436-7e90-4ecf-aa42-e4a73c4b64b7`
- Click on the "Stakeholders" tab

### 2. Test Add New Stakeholder
- Click "Add Stakeholder" button
- Fill out the form:
  - **Name:** (Optional) "John Doe"
  - **Role:** (Required) "Project Manager"
  - **Department:** "IT"
  - **Email:** (Required) "john.doe@example.com"
  - **Phone:** "+1-555-0123"
  - **Interest Level:** High
  - **Influence Level:** High
  - **Engagement Approach:** Manage Closely
  - **Communication Frequency:** Weekly
  - **Stakeholder Type:** Internal
  - **Stakeholder Category:** Primary
  - **Expectations:** "Successful project delivery on time and within budget"
  - **Potential Impact:** "High impact on project success due to decision-making authority"
- Click "Add Stakeholder"
- Verify success message appears
- Verify stakeholder appears in the list

### 3. Test Stakeholder Display
Verify the stakeholder card shows:
- ✅ Role as primary identifier
- ✅ Name and department (if provided)
- ✅ Contact information (email, phone)
- ✅ Proper badges for type and category
- ✅ PMBOK parameters (interest, influence, engagement approach)
- ✅ Communication frequency
- ✅ Expectations and potential impact

### 4. Test Edit Stakeholder
- Click the "Edit" button on a stakeholder
- Modify some fields
- Click "Update Stakeholder"
- Verify changes are saved and displayed

### 5. Test Form Reset
- Click "Add Stakeholder"
- Fill out some fields
- Click "Cancel" or close the dialog
- Open the dialog again
- Verify all fields are reset to defaults

### 6. Test Validation
- Click "Add Stakeholder"
- Leave Role and Email empty
- Try to submit
- Verify error message appears

### 7. Test Delete Stakeholder
- Click the "Delete" button on a stakeholder
- Confirm deletion in the popup
- Verify stakeholder is removed from the list

### 8. Test "To Be Recruited" Functionality
- Add a stakeholder without a name
- Verify "To Be Recruited" badge appears
- Verify role is used as primary identifier

## Expected Results

### ✅ Success Criteria
- [ ] Stakeholder form opens without errors
- [ ] All form fields are properly populated
- [ ] Required field validation works
- [ ] Stakeholder saves successfully to database
- [ ] Stakeholder appears in the list immediately after saving
- [ ] Edit functionality works correctly
- [ ] Delete functionality works correctly
- [ ] Form resets properly when dialog closes
- [ ] PMBOK parameters display correctly with proper formatting
- [ ] Badges show correct colors and text
- [ ] Loading states work properly

### ❌ Failure Indicators
- Database connection errors
- "Table doesn't exist" errors
- Form submission failures
- Missing stakeholder data after save
- UI rendering issues
- Console errors

## Troubleshooting

### Common Issues

**1. "Table 'stakeholders' doesn't exist"**
- Solution: Run the database setup scripts

**2. "Failed to save stakeholder"**
- Check database connection
- Verify user permissions
- Check server logs for detailed errors

**3. "Authentication required" errors**
- Ensure you're logged into the application
- Check if the user has proper permissions

**4. Form doesn't reset after closing**
- This should be fixed with the new `handleCloseStakeholderDialog` function

**5. Missing PMBOK parameters**
- Verify the database schema includes all required fields
- Check that the migration ran successfully

## API Testing (Optional)

Run the comprehensive API test:
```bash
node test-stakeholder-functionality.js
```

This will test all CRUD operations and help identify any backend issues.

## Performance Testing

### Load Testing
- Add 10+ stakeholders to test list performance
- Verify pagination works if implemented
- Test search functionality if available

### UI Responsiveness
- Test on different screen sizes
- Verify dialog is responsive
- Check mobile compatibility

## Security Testing

### Input Validation
- Test with special characters in text fields
- Test with very long text inputs
- Test with SQL injection attempts (should be prevented by parameterized queries)

### Permission Testing
- Test with different user roles
- Verify only authorized users can add/edit/delete stakeholders

## Final Verification

After all tests pass:
1. Refresh the page and verify stakeholders persist
2. Check database directly to confirm data is saved
3. Test with multiple browser tabs open
4. Verify WebSocket updates work (if implemented)

## Success Confirmation

The stakeholder functionality is working correctly when:
- ✅ All CRUD operations work without errors
- ✅ Data persists across page refreshes
- ✅ UI is responsive and user-friendly
- ✅ PMBOK parameters are properly implemented
- ✅ Form validation works as expected
- ✅ No console errors appear during normal usage