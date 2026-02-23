# Redmine MCP Server - Quick Start Guide

## Prerequisites

- Node.js installed
- Redmine instance (local or remote)
- Amazon Q extension in VS Code

## 1. Get Your Redmine API Key

**IMPORTANT**: You need the **REST API key**, NOT the Atom feed key!

### If You See "Atom Access Key" Instead

The Atom key is for RSS feeds, not the API. Here's what to do:

#### Option A: Enable REST API (Requires Admin)
1. Ask your Redmine admin to enable REST API:
   - Administration → Settings → API tab
   - Check "Enable REST web service"
   - Save
2. Go to "My account" → Look for "API access key" section
3. Click "Show" to reveal your key
4. Copy the 40-character key

#### Option B: Try Atom Key (May Work)
1. Copy your Atom access key
2. Try using it in the configuration
3. Run `npm test` to see if it works
4. If you get 401 errors, you need the REST API key

#### Option C: Reset to Generate API Key
1. Go to "My account"
2. Find "API access key" section
3. Click "Reset" button
4. A new API key will be generated and displayed
5. Copy it immediately

### Key Differences
```
API Access Key:   For REST API (what we need) ✓
Atom Access Key:  For RSS feeds only ✗
```

## 2. Install and Build

```bash
cd mcp-server-redmine
npm install
npm run build
```

## 3. Configure Amazon Q

### Option A: VS Code Settings (Recommended)

1. Open VS Code settings (Ctrl+, or Cmd+,)
2. Search for "Amazon Q MCP"
3. Edit `amazonq.mcp.servers` in settings.json:

**Windows:**
```json
{
  "amazonq.mcp.servers": {
    "redmine": {
      "command": "node",
      "args": ["g:/Gitea/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "http://192.168.11.65:3000",
        "REDMINE_API_KEY": "paste-your-key-here",
        "REDMINE_DEFAULT_ASSIGNEE_ID": "6"
      }
    }
  }
}
```

**Linux/macOS:**
```json
{
  "amazonq.mcp.servers": {
    "redmine": {
      "command": "node",
      "args": ["/home/user/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "paste-your-key-here"
      }
    }
  }
}
```

### Option B: Global Config File

Create/edit:
- Windows: `%USERPROFILE%\.aws\amazonq\mcp.json`
- Linux/macOS: `~/.aws/amazonq/mcp.json`

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["g:/Gitea/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "http://192.168.11.65:3000",
        "REDMINE_API_KEY": "paste-your-key-here"
      }
    }
  }
}
```

### Optional Environment Variables

Add these to customize defaults:

```json
"env": {
  "REDMINE_URL": "http://192.168.11.65:3000",
  "REDMINE_API_KEY": "your-key",
  "REDMINE_DEFAULT_ASSIGNEE_ID": "6",
  "REDMINE_DEFAULT_TIME_HOURS": "1",
  "REDMINE_DEFAULT_TRACKER_ID": "2",
  "REDMINE_DEFAULT_PRIORITY_ID": "2"
}
```

## 4. Restart Amazon Q

Restart your IDE or reload the Amazon Q extension.

## 5. Test It

Open Amazon Q chat and try:

```
List all my Redmine projects
```

You should see a list of your projects!

## 6. Common Commands

### Project Management
```
List all my Redmine projects

Create a new project called "Mobile App" with identifier "mobile-app"

Show me details of project 8
```

### Issue Management
```
Create a Redmine issue in project 1 titled "Fix login bug" 
with high priority and 4 hour estimate

Show me all open issues in project 1

Mark issue #123 as resolved and add note "Fixed in commit abc123"

Show me details of issue #456

Bulk update issues #10, #11, #12 to high priority
```

### Version/Sprint Management
```
List versions for project 8

Create version "Sprint 3" for project 8 with due date 2024-03-01

Assign issues #45, #46, #47 to version 5

Show me version 5 details
```

### Time Tracking
```
Log 2 hours on issue #45 for Development work

Show me all time entries for project 8 this week

Get time entries for user 6 from 2024-02-01 to 2024-02-29
```

### Watchers and Relations
```
Add user 6 as watcher to issue #45

Create a "blocks" relation from issue #10 to issue #11

Show me all relations for issue #45
```

### Wiki
```
Create a wiki page "Setup Guide" in project redmine-mcp with installation instructions

Get wiki page "Setup Guide" from project redmine-mcp
```

### Metadata Discovery
```
List all available issue statuses

List all trackers

List all users

List time entry activities
```

## 7. Advanced Workflows

### Convert Documentation to Tasks
```
Read PRODUCT_ROADMAP.md and create Redmine issues for all Phase 1 tasks 
in project 1 with appropriate priorities and estimates
```

### Sprint Planning
```
List all high priority issues in project 1 and suggest a 2-week sprint plan

Create version "Sprint 4" and assign all high priority issues to it
```

### Status Reports
```
Find all issues assigned to me that are "In Progress" and create a status report

Show me all time logged on project 8 this month
```

### Bulk Operations
```
Create subtasks for issue #100:
- Write unit tests
- Update documentation  
- Code review

Bulk update all issues in version 5 to status "Closed"
```

## Troubleshooting

**"Server not found" or "Cannot find module"**
- Check that the path in `args` is correct (use forward slashes even on Windows)
- Make sure you ran `npm install` and `npm run build`
- Verify the build/ directory exists with index.js

**"401 Unauthorized"**
- Verify your API key is correct (40 characters)
- Check that REST API access is enabled in Redmine (Administration → Settings → API)
- Try resetting your API key in "My account"

**"404 Not Found"**
- Verify project/issue ID exists
- Check you have permission to access the project
- Ensure the project identifier is correct for wiki operations

**"422 Unprocessable Entity"**
- Check required fields are provided
- Verify IDs are valid (tracker_id, priority_id, status_id)
- Use list tools to discover valid IDs

**SSL/HTTPS Issues**
- For self-signed certificates, the server disables SSL verification
- For local development, use HTTP instead of HTTPS

## Testing

**Quick Connection Test:**
```bash
# Windows PowerShell
$env:REDMINE_URL="http://192.168.11.65:3000"
$env:REDMINE_API_KEY="your-key"
npm test

# Linux/macOS
export REDMINE_URL="https://your-redmine.com"
export REDMINE_API_KEY="your-key"
npm test
```

**Comprehensive Test Suite:**
```bash
npm run build
npm run test:suite
```

## Next Steps

- Check [README.md](README.md) for full documentation
- See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture overview
- Read [TEST_SUITE.md](TEST_SUITE.md) for testing information
- Explore all 30+ available tools and their parameters
- Learn about advanced workflows and automation
