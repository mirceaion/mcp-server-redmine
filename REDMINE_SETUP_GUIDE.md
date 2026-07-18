# Redmine MCP Server - Visual Setup Guide

## Step-by-Step Setup with Screenshots

### Prerequisites

- Node.js 16+ installed
- Redmine instance (local or remote)
- Amazon Q extension in VS Code
- Git (optional, for cloning)

### Step 1: Install MCP Server

```bash
# Clone or download the repository
cd mcp-server-redmine

# Install dependencies
npm install

# Build the server
npm run build
```

This creates the `build/` directory with compiled JavaScript.

---

### Step 2: Get Your Redmine API Key

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

### Step 3: Find Your Project ID and User ID

**Find Project ID:**
```
1. Go to your Redmine project
2. Look at the URL: https://redmine.com/projects/my-project
3. Or go to Settings → Information
4. Note the project ID number
```

Example: Project "RecipeManager" might be ID `1`

**Find Your User ID (Optional):**
```
1. Go to "My account"
2. Look at the URL: https://redmine.com/users/6
3. The number is your user ID
```

You can use this for `REDMINE_DEFAULT_ASSIGNEE_ID`.

---

### Step 4: Configure Amazon Q

#### Option A: VS Code Settings UI (Recommended)

```
1. Open VS Code
2. Press Ctrl+, or Cmd+, (Settings)
3. Search: "amazon q mcp"
4. Click "Edit in settings.json"
5. Add configuration (see below)
6. Save file (Ctrl+S or Cmd+S)
7. Reload VS Code window
```

#### Option B: Direct File Edit

**Windows**: `%USERPROFILE%\.aws\amazonq\mcp.json`
**Mac/Linux**: `~/.aws/amazonq/mcp.json`

**Windows Example:**
```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["C:/path/to/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "paste-your-40-char-key-here"
      }
    }
  }
}
```

**Linux/macOS Example:**
```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["/home/user/mcp-server-redmine/build/index.js"],
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
- For local Redmine, use HTTP (not HTTPS) if no SSL certificate

**Optional Environment Variables:**
```json
"env": {
  "REDMINE_URL": "https://your-redmine.com",
  "REDMINE_API_KEY": "your-key",
  "REDMINE_DEFAULT_TIME_HOURS": "1",
  "REDMINE_DEFAULT_TRACKER_ID": "2",
  "REDMINE_DEFAULT_PRIORITY_ID": "2",
  "REDMINE_DEFAULT_WEEKDAY_HOURS": "1.5",
  "REDMINE_DEFAULT_WEEKEND_HOURS": "3"
}
```

---

### Step 5: Test Connection (Optional)

```bash
# Windows Command Prompt
set REDMINE_URL=https://your-redmine.com
set REDMINE_API_KEY=your-key-here
cd C:\path\to\mcp-server-redmine
npm test

# Windows PowerShell
$env:REDMINE_URL="https://your-redmine.com"
$env:REDMINE_API_KEY="your-key-here"
cd C:\path\to\mcp-server-redmine
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

### Step 6: Restart Amazon Q

```
1. Close all Amazon Q chat windows
2. Reload VS Code window (Ctrl+Shift+P → "Reload Window")
3. Or restart VS Code completely
```

---

### Step 7: Verify It Works

Open Amazon Q chat and try these commands:

**List Projects:**
```
List all my Redmine projects
```

**Create Issue:**
```
Create a test issue in project 1 titled "Test MCP Integration"
```

**List Issues:**
```
Show me all issues in project 1
```

Expected response:
```
Available projects:

ID 1: RecipeManager (recipemanager)
ID 2: Documentation (docs)
ID 3: Infrastructure (infra)
```

---

### Step 8: Run Comprehensive Tests (Optional)

```bash
# Windows PowerShell
$env:REDMINE_URL="https://your-redmine.com"
$env:REDMINE_API_KEY="your-key"
npm run test:suite

# Linux/macOS
export REDMINE_URL="https://your-redmine.com"
export REDMINE_API_KEY="your-key"
npm run test:suite
```

This creates a temporary project, tests all 30+ tools, and cleans up automatically.

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

### ❌ "Cannot find module '@modelcontextprotocol/sdk'"

**Problem**: Dependencies not installed

**Solution**:
```bash
cd /path/to/mcp-server-redmine
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

### ❌ "422 Unprocessable Entity"

**Problem**: Missing required fields or invalid IDs

**Solution**:
1. Check required fields are provided
2. Use metadata tools to discover valid IDs:
   ```
   List all issue statuses
   List all trackers
   List all priorities
   ```
3. Verify activity_id when logging time

---

### ❌ SSL/Certificate Errors

**Problem**: Self-signed certificate or SSL issues

**Solution**:
1. Use HTTP instead of HTTPS for local development
2. The server already disables SSL verification for self-signed certs
3. Example: `"REDMINE_URL": "https://your-redmine.com"`

---

### ❌ "MCP server not responding"

**Problem**: Path to build/index.js is wrong

**Solution**:
1. Verify path in config is absolute
2. Use forward slashes `/` even on Windows
3. Check file exists in your installation directory
4. Rebuild if needed: `npm run build`

---

## Quick Reference

### Common Tools

**Issue Management:**
- `create_issue` - Create new issues
- `update_issue` - Update existing issues
- `list_issues` - List issues with filters
- `get_issue` - Get detailed issue info (optional `include_journals` for comment history)
- `bulk_update_issues` - Update multiple issues

**Project Management:**
- `list_projects` - List all projects
- `create_project` - Create new project
- `get_project` - Get project details
- `list_project_memberships` - List team members

**Version/Sprint Management:**
- `list_versions` - List versions/milestones
- `create_version` - Create new version
- `update_version` - Update version details
- `get_version` - Get version with issues

**Time Tracking:**
- `log_time` - Log time on issues
- `get_time_entries` - Get time entries with filters
- `list_time_entry_activities` - List activity types

**Metadata Discovery:**
- `list_issue_statuses` - List all statuses
- `list_trackers` - List all trackers
- `list_issue_priorities` - List all priorities
- `list_users` - List all users
- `list_custom_fields` - List custom fields

**Relations & Watchers:**
- `create_issue_relation` - Link issues
- `get_issue_relations` - Get issue relations
- `add_watcher` - Add watcher to issue
- `remove_watcher` - Remove watcher

**Wiki:**
- `create_wiki_page` - Create wiki page
- `update_wiki_page` - Update wiki page
- `get_wiki_page` - Get wiki content

**Other:**
- `upload_attachment` - Upload files to issues
- `schedule_issues` - Auto-schedule based on workload

---

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

**Project Operations:**
```
List all my Redmine projects

Create a new project called "Mobile App" with identifier "mobile-app"

Show me project 8 details
```

**Issue Operations:**
```
Create a Redmine issue in project 1 titled "Fix login bug" 
with high priority and 4 hour estimate

Update issue #123 status to 3 (Resolved) and add note "Fixed in commit abc"

Show me all open issues in project 1

Bulk update issues #10, #11, #12 to high priority
```

**Version/Sprint Operations:**
```
List versions for project 8

Create version "Sprint 3" for project 8 with due date 2024-03-01

Assign issue #45 to version 5
```

**Time Tracking:**
```
Log 2 hours on issue #45 for Development work

Show me all time entries for project 8 this week
```

**Watchers:**
```
Add user 6 as watcher to issue #45

Remove watcher user 6 from issue #50
```

**Create Subtasks:**
```
Create subtasks for issue #50:
- Database migration
- Service layer
- Tests
- Documentation
```

**Metadata Discovery:**
```
List all issue statuses

List all trackers

List all users

List time entry activities
```

---

## Need Help?

1. Check [README.md](README.md) for full documentation
2. Check [REDMINE_QUICKSTART.md](REDMINE_QUICKSTART.md) for quick setup
3. Check [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture
4. Check [TEST_SUITE.md](TEST_SUITE.md) for testing
5. Run `npm test` to verify connection
6. Run `npm run test:suite` for comprehensive testing
7. Check Amazon Q logs for error messages
