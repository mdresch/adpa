# 🔧 Troubleshooting Upload Issues

## "Upload Failed" Error

If you're seeing "Upload failed" or "7 total uploads failed", follow this guide:

---

## 🔍 **Step 1: Check Browser Console**

1. Press **F12** to open Developer Tools
2. Click on **Console** tab
3. Look for red error messages
4. Take a screenshot or copy the error text

### **Common Errors You Might See:**

#### **Error: "401 Unauthorized" or "Access token required"**
**Cause:** Not logged in or session expired

**Solution:**
```
1. Go to http://localhost:3000/auth/login
2. Log in with your credentials
3. Return to upload page
4. Try again
```

#### **Error: "Failed to fetch" or "net::ERR_CONNECTION_REFUSED"**
**Cause:** Backend server not running

**Solution:**
```bash
# Terminal 1: Start backend
cd server
npm run dev

# Wait for "Server running on port 5000"
# Then try upload again
```

#### **Error: "404 Not Found" on /api/onboarding/upload**
**Cause:** Routes not registered

**Solution:**
```bash
# Restart server
cd server
# Press Ctrl+C to stop
npm run dev
# Check logs for "Assessment routes loaded"
```

#### **Error: "413 Payload Too Large"**
**Cause:** Files exceed size limit

**Solution:**
- Maximum 10MB per file
- Remove large files
- Compress PDFs if possible

#### **Error: "400 Bad Request - Unsupported file type"**
**Cause:** Wrong file format

**Solution:**
- Only PDF, DOCX, TXT, MD files allowed
- Remove .exe, .zip, .jpg, or other formats

---

## 🔍 **Step 2: Check Network Tab**

1. Press **F12**
2. Click on **Network** tab
3. Try uploading again
4. Click on the failed request (shows in red)
5. Click **Response** tab

### **What to Look For:**

```json
// Good response:
{
  "success": true,
  "data": {
    "batch_id": "abc-123...",
    "total_files": 7
  }
}

// Error response:
{
  "success": false,
  "error": {
    "code": "NO_FILES",
    "message": "No files provided"
  }
}
```

---

## 🔍 **Step 3: Verify Server is Running**

```bash
# Check if server is responding
curl http://localhost:5000/health

# Should return:
# {"status":"OK","timestamp":"2025-11-04...","version":"2.0.0"}
```

---

## 🔍 **Step 4: Check Required Fields**

Before clicking "Start Assessment", ensure:

- ✅ **Assessment Name** is filled (e.g., "ABC Corp Assessment")
- ✅ **Client Name** is filled (e.g., "John Smith")
- ✅ **Files** are selected (at least 1)
- ✅ Button says "Start Assessment" (not "Processing...")

---

## 🔍 **Step 5: Check File Requirements**

### **Supported Formats:**
- ✅ PDF (.pdf)
- ✅ Word (.docx)
- ✅ Text (.txt)
- ✅ Markdown (.md)
- ❌ Excel, PowerPoint, Images, ZIP files

### **Size Limits:**
- **Per file:** 10MB maximum
- **Total batch:** 100 files maximum

### **File Names:**
- Avoid special characters
- Use: letters, numbers, hyphens, underscores
- Avoid: emoji, foreign characters, symbols

---

## 🛠️ **Quick Fixes**

### **Fix 1: Restart Everything**
```bash
# Terminal 1: Backend
cd server
# Press Ctrl+C
npm run dev

# Terminal 2: Frontend  
# Press Ctrl+C in terminal running frontend
npm run dev

# Wait for both to start, then try again
```

### **Fix 2: Clear Browser Cache**
```
1. Press Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh page (Ctrl+F5)
5. Try again
```

### **Fix 3: Check Login Status**
```
1. Go to http://localhost:3000/auth/login
2. Enter credentials
3. After login, go to /onboarding/upload
4. Try again
```

### **Fix 4: Use Smaller Files**
```
1. Remove all files (click "Clear All")
2. Add just 1-2 small PDF files first
3. Test with those
4. If works, add more files gradually
```

---

## 📊 **Check Server Logs**

```bash
# View recent logs
cd server
Get-Content logs\combined.log -Tail 100

# Look for error messages around your upload time
```

### **Good Log Entry:**
```
info: Bulk upload initiated {"userId":"...","projectId":"...","fileCount":7}
```

### **Error Log Entry:**
```
error: Upload batch creation failed {"error":"..."}
```

---

## 💡 **Still Not Working?**

### **Collect This Information:**

1. **Browser Console Errors** (screenshot or copy text)
2. **Network Tab** → Failed request → Response body
3. **Server Logs** → Last 50 lines
4. **System Info:**
   - Are you logged in? (check top-right of page)
   - Which browser? (Chrome, Firefox, etc.)
   - File types trying to upload?
   - File sizes?

### **Then:**
- Share this information
- Or create a GitHub issue with details
- Or contact support

---

## 🎯 **Expected Workflow**

### **Successful Upload:**

```
1. Fill in form:
   Assessment Name: "Test Assessment"
   Client Name: "Test Client"
   
2. Add files:
   ✅ test-document.pdf (2MB)
   ✅ another-file.docx (1.5MB)
   
3. Click "Start Assessment"

4. See alert:
   "✅ Upload started successfully!
    2 documents are now being processed..."
   
5. Watch progress:
   ✅ test-document.pdf (Converting...)
   ⏳ another-file.docx (Queued)
   
6. Auto-redirect to results
```

### **If It Fails:**

```
1. See specific error:
   "Upload failed. One or more files exceed the 10MB size limit."
   
2. Know exactly what's wrong

3. Fix the issue

4. Try again
```

---

## 🚨 **Emergency Checklist**

If nothing works, try this:

- [ ] Backend server running? (`npm run dev` in /server)
- [ ] Frontend running? (`npm run dev` in root)
- [ ] Logged in? (check top-right corner)
- [ ] Files valid? (PDF/DOCX, under 10MB)
- [ ] Fields filled? (Assessment Name + Client Name)
- [ ] Browser console clear of errors?
- [ ] Network working? (other pages load?)

---

**Most Common Issue:** Not logged in or session expired  
**Quick Fix:** Go to /auth/login and log in again

**Second Most Common:** Files too large  
**Quick Fix:** Use files under 10MB each

**Third Most Common:** Wrong file type  
**Quick Fix:** Only use PDF or DOCX files

