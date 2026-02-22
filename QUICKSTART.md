# Quick Start Guide

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

## 2. Configure Amazon Q

### Option A: VS Code / IDE Settings

1. Open VS Code settings (Ctrl+,)
2. Search for "Amazon Q MCP"
3. Edit `amazonq.mcp.servers` in settings.json:

```json
{
  "amazonq.mcp.servers": {
    "redmine": {
      "command": "node",
      "args": ["g:/Gitea/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "paste-your-key-here"
      }
    }
  }
}
```

### Option B: Global Config File

Create/edit `~/.aws/amazonq/mcp.json`:

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["g:/Gitea/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "paste-your-key-here"
      }
    }
  }
}
```

## 3. Restart Amazon Q

Restart your IDE or reload the Amazon Q extension.

## 4. Test It

Open Amazon Q chat and try:

```
List all my Redmine projects
```

You should see a list of your projects!

## 5. Common Commands

### Create an Issue
```
Create a Redmine issue in project 1 titled "Fix login bug" 
with high priority and 4 hour estimate
```

### List Issues
```
Show me all open issues in project 1
```

### Update Issue
```
Mark issue #123 as resolved and add note "Fixed in commit abc123"
```

### Get Issue Details
```
Show me details of issue #456
```

### Create Subtasks
```
Create subtasks for issue #100:
- Write unit tests
- Update documentation
- Code review
```

## 6. Advanced: Bulk Operations

### Convert Roadmap to Issues
```
Read PRODUCT_ROADMAP.md and create Redmine issues for all Phase 1 tasks 
in project 1 with appropriate priorities and estimates
```

### Sprint Planning
```
List all high priority issues in project 1 and suggest a 2-week sprint plan
```

### Status Updates
```
Find all issues assigned to me that are "In Progress" and create a status report
```

## Troubleshooting

**"Server not found"**
- Check that the path in `args` is correct
- Make sure you ran `npm run build`

**"401 Unauthorized"**
- Verify your API key is correct
- Check that API access is enabled in Redmine settings

**"404 Not Found"**
- Verify project ID exists
- Check you have permission to access the project

## Next Steps

- Check [README.md](README.md) for full documentation
- See all available tools and parameters
- Learn about advanced workflows
