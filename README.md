# MCP Server for Redmine

Model Context Protocol (MCP) server for Redmine project management integration. Allows AI assistants to create, update, and query Redmine issues directly from conversations.

## Features

- ✅ Create issues with full metadata (priority, estimates, parent tasks)
- ✅ Update existing issues (status, description, comments)
- ✅ List and filter issues by project and status
- ✅ Get detailed issue information
- ✅ List all accessible projects

## Installation

```bash
cd mcp-server-redmine
npm install
npm run build
```

## Configuration

Set environment variables for your Redmine instance:

```bash
export REDMINE_URL="https://your-redmine.com"
export REDMINE_API_KEY="your-api-key-here"
```

### Getting Your Redmine API Key

**IMPORTANT**: You need the REST API key, not the Atom feed key!

#### If REST API is Enabled:
1. Log into Redmine
2. Go to "My account" (top right)
3. Look for "API access key" section (right sidebar)
4. Click "Show" to reveal the key
5. Copy the 40-character key

#### If You Only See "Atom Access Key":

The Atom key is for RSS feeds only. You need REST API enabled:

1. **Admin must enable it**:
   - Administration → Settings → API
   - Check "Enable REST web service"
   - Save

2. **Then get your key**:
   - Refresh "My account" page
   - "API access key" section should now appear
   - Click "Show" and copy

3. **Alternative**: Try using Atom key
   - Some Redmine versions accept it
   - Test with `npm test`
   - If 401 error, you need proper API key

## Usage with Amazon Q

Add to your Amazon Q configuration file (`~/.aws/amazonq/mcp.json` or IDE settings):

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["g:/Gitea/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### create_issue
Create a new Redmine issue/task.

**Parameters:**
- `project_id` (required): Project ID number
- `tracker_id`: Tracker type (1=Bug, 2=Feature, 3=Support) - defaults to 2 (Feature)
- `subject` (required): Issue title
- `description`: Issue description (markdown supported)
- `priority_id`: Priority level (1=Low, 2=Normal, 3=High, 4=Urgent, 5=Immediate)
- `estimated_hours`: Time estimate in hours
- `parent_issue_id`: Parent issue ID for creating subtasks

**Example:**
```
Create a Redmine issue in project 1 titled "Implement ServingsService" 
with description "Add quantity scaling logic" and estimate 8 hours
```

### update_issue
Update an existing issue.

**Parameters:**
- `issue_id` (required): Issue ID to update
- `tracker_id`: Change tracker type (1=Bug, 2=Feature, 3=Support)
- `subject`: New title
- `description`: New description
- `status_id`: Status (1=New, 2=In Progress, 3=Resolved, 5=Closed)
- `priority_id`: Priority level
- `notes`: Add a comment

**Example:**
```
Update Redmine issue #123 status to 3 (Resolved) and add note "Implementation complete"
```

### list_issues
List issues from a project.

**Parameters:**
- `project_id` (required): Project ID
- `status_id`: Filter by status ("open", "closed", or specific ID)
- `limit`: Max results (default 25)

**Example:**
```
List all open issues in Redmine project 1
```

### get_issue
Get detailed information about a specific issue.

**Parameters:**
- `issue_id` (required): Issue ID

**Example:**
```
Get details of Redmine issue #123
```

### list_projects
List all accessible Redmine projects.

**Example:**
```
List all my Redmine projects
```

## Example Workflows

### 1. Convert Documentation to Tasks

```
You: "Read PRODUCT_ROADMAP.md and create Redmine issues for all Phase 1 tasks in project 1"

AI: 
- Reads PRODUCT_ROADMAP.md
- Extracts Phase 1 tasks
- Creates issues with:
  - Subject from task name
  - Description from details
  - Priority based on roadmap priority
  - Estimated hours from effort estimates
```

### 2. Update Task Status

```
You: "Mark Redmine issue #45 as resolved since ServingsService is complete"

AI: Updates issue #45 with status_id=3 and adds completion note
```

### 3. Create Subtasks

```
You: "Create subtasks for Redmine issue #50 to implement Categories feature:
- Database migration
- Service layer
- Controller updates
- UI components"

AI: Creates 4 subtasks with parent_issue_id=50
```

### 4. Sprint Planning

```
You: "List all open issues in project 1 and create a sprint plan"

AI: 
- Lists issues
- Analyzes priorities and estimates
- Suggests grouping and ordering
```

## Common Redmine Status IDs

- 1 = New
- 2 = In Progress
- 3 = Resolved
- 4 = Feedback
- 5 = Closed
- 6 = Rejected

(Your Redmine instance may have different IDs - check your Redmine settings)

## Common Redmine Priority IDs

- 1 = Low
- 2 = Normal
- 3 = High
- 4 = Urgent
- 5 = Immediate

## Troubleshooting

### "I only see Atom Access Key, not API Access Key"

See [TROUBLESHOOTING_API_KEY.md](TROUBLESHOOTING_API_KEY.md) for complete solutions.

**Quick fix**: Ask your admin to enable REST API:
- Administration → Settings → API → "Enable REST web service"

### "REDMINE_URL and REDMINE_API_KEY environment variables are required"
Make sure environment variables are set in your MCP configuration.

### "401 Unauthorized"
Check that your API key is correct and has not expired.

### "403 Forbidden"
Your API key doesn't have permission for the requested operation.

### "404 Not Found"
Project or issue ID doesn't exist or you don't have access.

## Development

```bash
# Watch mode for development
npm run watch

# Build for production
npm run build
```

## License

MIT
