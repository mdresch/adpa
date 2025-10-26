# 🔧 URGENT FIX: Grant Menno Access to Projects

**User:** menno.drescher@gmail.com  
**Issue:** 403 Forbidden on all projects (not in team_members)  
**Fix Time:** 2 minutes

---

## ✅ **Quick Fix (Copy & Paste)**

### **Step 1: Connect to Database**

```powershell
# In PowerShell (admin terminal):
cd D:\source\repos\adpa

# Load environment
Get-Content .env.local | ForEach-Object {
    if($_ -match 'POSTGRES_URL=(.*)') {
        $env:DATABASE_URL = $matches[1]
    }
}

# Connect
psql $env:DATABASE_URL
```

### **Step 2: Find Menno's User ID**

```sql
SELECT id, email, name, role 
FROM users 
WHERE email = 'menno.drescher@gmail.com';
```

**Copy the `id` value!** (It's a UUID like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### **Step 3: Make Menno Owner of ALL Projects**

```sql
-- Replace 'YOUR-USER-ID-HERE' with the ID from Step 2
UPDATE projects 
SET owner_id = 'YOUR-USER-ID-HERE';

-- Verify:
SELECT id, name, owner_id 
FROM projects 
ORDER BY created_at DESC 
LIMIT 10;
```

### **Step 4: Refresh Browser**

```
Press Ctrl + F5 (hard refresh)
Navigate to: http://localhost:3000/projects
Click on any project
Documents should now appear! ✅
```

---

## 🎯 **Alternative: Add to Specific Projects Only**

If you only want access to specific projects:

```sql
-- Get your user ID first (from Step 2)
-- Then add yourself to specific projects:

-- Project 1:
UPDATE projects 
SET owner_id = 'YOUR-USER-ID'
WHERE id = '382029f5-18e8-49fe-b200-bc079c99c19c';

-- Project 2:
UPDATE projects 
SET owner_id = 'YOUR-USER-ID'
WHERE id = '45083436-7e90-4ecf-aa42-e4a73c4b64b7';

-- Project 3:
UPDATE projects 
SET owner_id = 'YOUR-USER-ID'
WHERE id = '1c13cb74-8ca4-4ddf-9681-ec0fbe94a234';
```

---

## 🚀 **Even Faster: One-Line Fix**

If you want to be owner of ALL projects in the system:

```sql
-- Get user ID and set as owner in one go:
WITH menno_user AS (
  SELECT id FROM users WHERE email = 'menno.drescher@gmail.com'
)
UPDATE projects 
SET owner_id = (SELECT id FROM menno_user);

-- Verify:
SELECT COUNT(*) as projects_you_own FROM projects 
WHERE owner_id = (SELECT id FROM users WHERE email = 'menno.drescher@gmail.com');
```

---

## ✅ **Expected Result**

After running the SQL:
1. ✅ You'll be the owner of all projects
2. ✅ 403 errors will disappear
3. ✅ Documents will load
4. ✅ Full access to create/edit/delete

---

## 📝 **Commands to Run Right Now**

```powershell
# 1. Navigate to project
cd D:\source\repos\adpa

# 2. Run the SQL fix
psql $env:POSTGRES_URL

# In psql prompt:
SELECT id FROM users WHERE email = 'menno.drescher@gmail.com';
# Copy the ID

# Then run (replace 'YOUR-ID'):
UPDATE projects SET owner_id = 'YOUR-ID';

# Exit psql:
\q

# 3. Refresh browser (Ctrl+F5)
# 4. Navigate to projects - should work now!
```

---

**This is a 2-minute fix! Let me know if you need help with any step!** 🔧

