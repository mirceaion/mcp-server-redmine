# Visual Setup Guide

## Step-by-Step Setup with Screenshots

### Step 1: Get Your Redmine API Key

**IMPORTANT**: You need the **REST API key**, NOT the Atom feed key!

### Method 1: Enable REST API First (If Not Visible)

If you don't see "API access key" in your account:

1. **Admin must enable REST API**:
   - Go to Administration → Settings → API tab
   - Check "Enable REST web service"
   - Click Save

2. **Then get your key**:
   - Click your name (top right) → "My account"
   - Look for "API access key" section (right sidebar)
   - Click "Show" to reveal the key
   - Copy the 40-character key

### Method 2: If You Only See "Atom Access Key"

The **Atom access key** is for RSS feeds, NOT for the API!

If you only see "Atom access key":

1. **Check if REST API is enabled**:
   - Ask your Redmine administrator
   - Or check: Administration → Settings → API
   - "Enable REST web service" must be checked

2. **Alternative: Use Atom key (Limited)**:
   - Some Redmine versions allow Atom key for API
   - Try using your Atom key as the API key
   - If it works, great! If not, REST API needs enabling

3. **Generate API Key Manually**:
   - Go to "My account"
   - If there's a "Reset" button under API access key
   - Click it to generate a new API key
   - The key will appear after reset

### What the Keys Look Like

```
API Access Key (REST API):    a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
Atom Access Key (RSS feeds):  x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0
```

Both are 40 characters, but only the **API Access Key** works with this MCP server.

---

### Step 2: Find Your Project ID

```
1. Go to your Redmine project
2. Look at the URL: https://redmine.com/projects/my-project
3. Or go to Settings → Information
4. Note the project ID number
```

Example: Project "RecipeManager" might be ID `1`

---

### Step 3: Configure Amazon Q

#### Option A: VS Code Settings UI

```
1. Open VS Code
2. Press Ctrl+, (Settings)
3. Search: "amazon q mcp"
4. Click "Edit in settings.json"
5. Add configuration (see below)
6. Save file
7. Reload VS Code
```

#### Option B: Direct File Edit

**Windows**: `%USERPROFILE%\.aws\amazonq\mcp.json`
**Mac/Linux**: `~/.aws/amazonq/mcp.json`

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["g:/Gitea/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "paste-your-40-char-key-here"
      }
    }
  }
}
```

**Important**: 
- Use forward slashes `/` even on Windows
- Use absolute path to `build/index.js`
- No trailing slash on REDMINE_URL

---

### Step 4: Test Connection (Optional)

```bash
# Windows Command Prompt
set REDMINE_URL=https://your-redmine.com
set REDMINE_API_KEY=your-key-here
cd g:\Gitea\mcp-server-redmine
npm test

# Windows PowerShell
$env:REDMINE_URL="https://your-redmine.com"
$env:REDMINE_API_KEY="your-key-here"
cd g:\Gitea\mcp-server-redmine
npm test

# Mac/Linux
export REDMINE_URL="https://your-redmine.com"
export REDMINE_API_KEY="your-key-here"
cd /path/to/mcp-server-redmine
npm test
```

Expected output:
```
Testing Redmine connection...

URL: https://your-redmine.com
API Key: a1b2c3d4...

✅ Connection successful!

Found 3 projects:

  - ID 1: RecipeManager (recipemanager)
  - ID 2: Documentation (docs)
  - ID 3: Infrastructure (infra)

✅ MCP server is ready to use!
```

---

### Step 5: Restart Amazon Q

```
1. Close all Amazon Q chat windows
2. Reload VS Code window (Ctrl+Shift+P → "Reload Window")
3. Or restart VS Code completely
```

---

### Step 6: Verify It Works

Open Amazon Q chat and type:

```
List all my Redmine projects
```

Expected response:
```
Available projects:

ID 1: RecipeManager (recipemanager)
ID 2: Documentation (docs)
ID 3: Infrastructure (infra)
```

---

## Common Setup Issues

### ❌ "Command not found: node"

**Problem**: Node.js not installed or not in PATH

**Solution**:
```bash
# Check if Node.js is installed
node --version

# If not installed, download from: https://nodejs.org/
# Make sure to add to PATH during installation
```

---

### ❌ "Cannot find module"

**Problem**: Dependencies not installed

**Solution**:
```bash
cd g:\Gitea\mcp-server-redmine
npm install
npm run build
```

---

### ❌ "401 Unauthorized"

**Problem**: Invalid API key or API access disabled

**Solution**:
1. Verify API key is correct (40 characters)
2. Check Redmine admin settings:
   - Administration → Settings → API
   - Enable "Enable REST web service"
3. Regenerate API key if needed

---

### ❌ "404 Not Found"

**Problem**: Wrong Redmine URL or project doesn't exist

**Solution**:
1. Verify REDMINE_URL is correct
2. Make sure URL doesn't end with `/`
3. Check project ID exists
4. Verify you have access to the project

---

### ❌ "MCP server not responding"

**Problem**: Path to build/index.js is wrong

**Solution**:
1. Verify path in config is absolute
2. Use forward slashes `/` even on Windows
3. Check file exists: `g:\Gitea\mcp-server-redmine\build\index.js`
4. Rebuild if needed: `npm run build`

---

## Quick Reference

### Redmine Status IDs
- `1` = New
- `2` = In Progress
- `3` = Resolved
- `5` = Closed

### Redmine Priority IDs
- `1` = Low
- `2` = Normal (default)
- `3` = High
- `4` = Urgent
- `5` = Immediate

### Example Commands

**Create Issue**:
```
Create a Redmine issue in project 1 titled "Fix login bug" 
with high priority and 4 hour estimate
```

**Update Status**:
```
Update issue #123 status to 3 (Resolved)
```

**List Issues**:
```
Show me all open issues in project 1
```

**Create Subtasks**:
```
Create subtasks for issue #50:
- Database migration
- Service layer
- Tests
```

---

## Need Help?

1. Check [README.md](README.md) for full documentation
2. Check [QUICKSTART.md](QUICKSTART.md) for quick setup
3. Check [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture
4. Run `npm test` to verify connection
5. Check Amazon Q logs for error messages
