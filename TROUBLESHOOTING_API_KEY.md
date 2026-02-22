# Troubleshooting: API Key Issues

## Problem: "I only see Atom Access Key, not API Access Key"

This is the most common setup issue. Here's the complete solution:

---

## Understanding the Keys

Redmine has TWO different keys:

| Key Type | Purpose | Works with MCP? |
|----------|---------|-----------------|
| **API Access Key** | REST API access | ✅ YES |
| **Atom Access Key** | RSS feed subscriptions | ❌ NO (usually) |

---

## Solution 1: Enable REST API (Recommended)

### Step 1: Check if You're an Admin

1. Log into Redmine
2. Look for "Administration" link in top menu
3. If you see it → You're an admin, proceed to Step 2
4. If you don't see it → Ask your admin to do Step 2

### Step 2: Enable REST API

1. Go to **Administration** → **Settings**
2. Click the **API** tab
3. Check the box: **"Enable REST web service"**
4. Click **Save**

### Step 3: Get Your API Key

1. Go to **My account** (click your name, top right)
2. Scroll to right sidebar
3. You should now see **"API access key"** section
4. Click **"Show"** to reveal the key
5. Copy the 40-character key

---

## Solution 2: Try Atom Key (Quick Test)

Some older Redmine versions accept the Atom key for API access.

### Test It:

```bash
# Windows Command Prompt
set REDMINE_URL=https://your-redmine.com
set REDMINE_API_KEY=your-atom-key-here
cd g:\Gitea\mcp-server-redmine
npm test

# PowerShell
$env:REDMINE_URL="https://your-redmine.com"
$env:REDMINE_API_KEY="your-atom-key-here"
cd g:\Gitea\mcp-server-redmine
npm test
```

### Results:

**✅ If it works:**
```
✅ Connection successful!
Found X projects:
...
```
Great! Use your Atom key as the API key.

**❌ If it fails:**
```
❌ Connection failed!
Status: 401
Message: Unauthorized
```
You need the proper REST API key (Solution 1).

---

## Solution 3: Reset API Key

If REST API is enabled but you still don't see the key:

1. Go to **My account**
2. Find **"API access key"** section
3. Click **"Reset"** button
4. A new key will be generated
5. Click **"Show"** to see it
6. Copy immediately (it won't show again without clicking "Show")

---

## Solution 4: Check Redmine Version

Very old Redmine versions (< 2.0) may not support REST API.

### Check Your Version:

1. Look at bottom of any Redmine page
2. Should say "Powered by Redmine X.X.X"
3. If version < 2.0 → Consider upgrading
4. If version ≥ 2.0 → REST API should be available

---

## Solution 5: Contact Your Admin

If none of the above work, ask your Redmine administrator:

### Email Template:

```
Subject: Enable Redmine REST API Access

Hi [Admin Name],

I need to use the Redmine REST API for project management automation.

Could you please:
1. Enable REST API: Administration → Settings → API → "Enable REST web service"
2. Confirm that API access keys are enabled for users

Once enabled, I'll be able to generate my API access key from "My account".

Thanks!
```

---

## Verification Steps

Once you have your API key, verify it works:

### Test 1: Manual API Call

```bash
# Replace with your values
curl -H "X-Redmine-API-Key: YOUR_KEY_HERE" \
     https://your-redmine.com/projects.json
```

**Expected**: JSON list of projects

**If 401**: Key is invalid or REST API not enabled

### Test 2: MCP Server Test

```bash
# Set environment variables
export REDMINE_URL="https://your-redmine.com"
export REDMINE_API_KEY="your-key-here"

# Run test
cd g:\Gitea\mcp-server-redmine
npm test
```

**Expected**: List of projects

---

## Common Error Messages

### "401 Unauthorized"

**Causes**:
- Wrong API key
- REST API not enabled
- Using Atom key instead of API key
- API key expired/reset

**Solutions**:
- Verify key is correct (40 characters)
- Enable REST API (Solution 1)
- Get proper API key (not Atom key)
- Reset and get new key (Solution 3)

### "403 Forbidden"

**Causes**:
- API key valid but lacks permissions
- Project access restricted

**Solutions**:
- Check project permissions
- Ask admin to grant access
- Verify you can access project in web UI

### "404 Not Found"

**Causes**:
- Wrong Redmine URL
- Project doesn't exist
- Project ID incorrect

**Solutions**:
- Verify URL is correct
- Check project exists
- Use correct project ID

---

## Still Not Working?

### Debug Checklist:

- [ ] REST API enabled in Redmine settings
- [ ] Using API access key (not Atom key)
- [ ] Key is 40 characters long
- [ ] No extra spaces in key
- [ ] Redmine URL is correct (no trailing slash)
- [ ] Can access Redmine in browser
- [ ] Have permission to access projects
- [ ] Redmine version ≥ 2.0

### Get Help:

1. Check Redmine logs: `log/production.log`
2. Check Redmine version and settings
3. Test with curl (see Test 1 above)
4. Contact Redmine administrator
5. Check Redmine documentation: https://www.redmine.org/projects/redmine/wiki/Rest_api

---

## Quick Reference

### Where to Find Keys

```
My Account Page (https://your-redmine.com/my/account)

Right Sidebar:
├── API access key          ← Use this one! ✅
│   └── [Show] [Reset]
│
└── Atom access key         ← Not this one! ❌
    └── [Reset]
```

### Key Format

Both keys are 40 hexadecimal characters:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

### Test Command

```bash
npm test
```

Should output:
```
✅ Connection successful!
Found X projects:
  - ID 1: Project Name
```
