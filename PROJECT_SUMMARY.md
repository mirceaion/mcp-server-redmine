# MCP Server for Redmine - Project Summary

## What We Built

A **Model Context Protocol (MCP) server** that enables AI assistants (like Amazon Q) to interact directly with Redmine project management systems. This allows you to manage tasks, create issues, and plan projects through natural language conversations.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Amazon Q / AI Assistant                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol (stdio)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              mcp-server-redmine (TypeScript)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tools:                                              │   │
│  │  - create_issue    - update_issue                    │   │
│  │  - list_issues     - get_issue                       │   │
│  │  - list_projects                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API (axios)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Redmine REST API                          │
│              (https://your-redmine.com)                      │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Issue Management
- Create issues with full metadata (priority, estimates, descriptions, custom fields)
- Update issues (status, priority, assignments, dates, versions)
- List and filter issues by project, status, assignee
- Get detailed issue information
- Bulk update multiple issues
- Parent/child relationships for subtasks
- Issue relations (blocks, relates, duplicates, precedes, follows)

### 2. Project Management
- List all accessible projects
- Create new projects with identifiers
- Update project settings
- Get detailed project information
- Manage project memberships and roles
- Add users to projects

### 3. Version/Milestone Management
- List versions/milestones for projects
- Create new versions with due dates
- Update version details and status
- Get version details with associated issues
- Track release planning and sprints

### 4. Time Tracking
- Log time entries on issues
- Support for activity types (Development, Design, etc.)
- Get time entries with filters (issue, project, user, date range)
- Track hours spent and generate reports

### 5. Wiki Management
- Create wiki pages with textile/markdown
- Update existing wiki pages
- Get wiki page content
- Version comments for changes

### 6. Metadata Discovery
- List available issue statuses
- List available trackers (Bug, Feature, Support)
- List issue priorities
- List custom fields
- List time entry activities
- List users with filtering

### 7. Watcher Management
- Add watchers to issues for notifications
- Remove watchers from issues
- Manage team awareness

### 8. File Attachments
- Upload files to issues
- Add descriptions to attachments

### 9. Scheduling
- Auto-schedule issues based on workload
- Configure weekday/weekend hours
- Set start and due dates automatically

## Technology Stack

- **TypeScript**: Type-safe implementation
- **MCP SDK**: Official Model Context Protocol SDK
- **Axios**: HTTP client for Redmine API
- **Node.js**: Runtime environment
- **stdio**: Communication protocol with AI

## File Structure

```
mcp-server-redmine/
├── src/
│   ├── index.ts              # Main MCP server implementation
│   ├── test-connection.ts    # Connection test utility
│   └── test-suite.ts         # Comprehensive test battery
├── build/                    # Compiled JavaScript (generated)
│   ├── index.js
│   ├── test-connection.js
│   └── test-suite.js
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Full documentation
├── QUICKSTART.md             # Quick setup guide
├── TEST_SUITE.md             # Test suite documentation
├── PROJECT_SUMMARY.md        # This file
├── mcp-config.example.json   # Example configuration
└── .gitignore                # Git ignore rules
```

## How It Works

### 1. Communication Flow

```
User: "Create a Redmine issue for implementing ServingsService"
  ↓
Amazon Q: Parses intent, calls MCP tool
  ↓
MCP Server: Receives tool call via stdio
  ↓
Redmine API: POST /issues.json with issue data
  ↓
MCP Server: Returns success with issue #123
  ↓
Amazon Q: "✅ Created issue #123: Implement ServingsService"
```

### 2. Authentication

Uses Redmine API key authentication:
```http
X-Redmine-API-Key: your-api-key-here
```

### 3. Data Format

All communication uses JSON:
```json
{
  "issue": {
    "project_id": 1,
    "subject": "Implement ServingsService",
    "description": "Add quantity scaling logic",
    "priority_id": 3,
    "estimated_hours": 8
  }
}
```

## Use Cases

### 1. Documentation → Tasks
Convert design documents directly into Redmine issues:
```
"Read SERVINGS_SERVICE_DESIGN.md and create implementation tasks in project 1"
```

### 2. Sprint Planning
```
"List all high priority issues and create a 2-week sprint plan"
```

### 3. Status Updates
```
"Mark all Phase 0 refactoring tasks as complete"
```

### 4. Bulk Operations
```
"Create subtasks for issue #50:
- Database migration
- Service layer
- Controller updates
- UI components
- Tests"
```

### 5. Progress Tracking
```
"Show me all issues assigned to me that are in progress"
```

## Configuration

### Environment Variables

**Linux/macOS:**
```bash
export REDMINE_URL="https://your-redmine.com"
export REDMINE_API_KEY="your-api-key-here"

# Optional defaults
export REDMINE_DEFAULT_ASSIGNEE_ID=6
export REDMINE_DEFAULT_TIME_HOURS=1
export REDMINE_DEFAULT_TRACKER_ID=2
export REDMINE_DEFAULT_PRIORITY_ID=2
export REDMINE_DEFAULT_ISSUES_LIMIT=25
export REDMINE_DEFAULT_USERS_LIMIT=100
export REDMINE_DEFAULT_WEEKDAY_HOURS=1.5
export REDMINE_DEFAULT_WEEKEND_HOURS=3
export REDMINE_DEFAULT_SKIP_SUNDAYS=false
```

**Windows PowerShell:**
```powershell
$env:REDMINE_URL="http://192.168.11.65:3000"
$env:REDMINE_API_KEY="your-api-key-here"

# Optional defaults
$env:REDMINE_DEFAULT_ASSIGNEE_ID=6
$env:REDMINE_DEFAULT_TIME_HOURS=1
$env:REDMINE_DEFAULT_TRACKER_ID=2
$env:REDMINE_DEFAULT_PRIORITY_ID=2
$env:REDMINE_DEFAULT_ISSUES_LIMIT=25
$env:REDMINE_DEFAULT_USERS_LIMIT=100
$env:REDMINE_DEFAULT_WEEKDAY_HOURS=1.5
$env:REDMINE_DEFAULT_WEEKEND_HOURS=3
$env:REDMINE_DEFAULT_SKIP_SUNDAYS="false"
```

**Windows CMD:**
```cmd
set REDMINE_URL=http://192.168.11.65:3000
set REDMINE_API_KEY=your-api-key-here

REM Optional defaults
set REDMINE_DEFAULT_ASSIGNEE_ID=6
set REDMINE_DEFAULT_TIME_HOURS=1
set REDMINE_DEFAULT_TRACKER_ID=2
set REDMINE_DEFAULT_PRIORITY_ID=2
set REDMINE_DEFAULT_ISSUES_LIMIT=25
set REDMINE_DEFAULT_USERS_LIMIT=100
set REDMINE_DEFAULT_WEEKDAY_HOURS=1.5
set REDMINE_DEFAULT_WEEKEND_HOURS=3
set REDMINE_DEFAULT_SKIP_SUNDAYS=false
```

### Amazon Q Integration

**Windows:**
```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["g:/Gitea/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "http://192.168.11.65:3000",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Linux/macOS:**
```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["/home/user/mcp-server-redmine/build/index.js"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Configuration Location:**
- Windows: `%USERPROFILE%\.aws\amazonq\mcp.json`
- Linux/macOS: `~/.aws/amazonq/mcp.json`

## Benefits

### 1. Natural Language Interface
No need to switch to Redmine UI - manage tasks from conversations.

### 2. Context Awareness
AI can read your documentation and create appropriate tasks.

### 3. Bulk Operations
Create multiple related tasks in one command.

### 4. Consistency
AI ensures consistent formatting and structure.

### 5. Time Savings
Reduce context switching and manual data entry.

## Limitations & Future Enhancements

### Current Limitations
- No advanced search/filtering
- No email notifications configuration
- No role management
- No workflow customization

### Potential Enhancements
- [ ] Advanced issue filtering and search
- [ ] Email notification settings
- [ ] Role and permission management
- [ ] Workflow customization
- [ ] Gantt chart generation
- [ ] Burndown chart data
- [ ] Dashboard widgets

## Security Considerations

### API Key Storage
- Never commit API keys to version control
- Use environment variables
- Consider using secret management tools

### Permissions
- MCP server inherits API key permissions
- Limit API key scope if possible
- Use read-only keys for query-only operations

### Network Security
- Use HTTPS for Redmine connection
- Validate SSL certificates
- Consider VPN for internal Redmine instances

## Testing

### Test Connection

**Linux/macOS:**
```bash
export REDMINE_URL="https://your-redmine.com"
export REDMINE_API_KEY="your-key"
npm test
```

**Windows PowerShell:**
```powershell
$env:REDMINE_URL="http://192.168.11.65:3000"
$env:REDMINE_API_KEY="your-key"
npm test
```

**Windows CMD:**
```cmd
set REDMINE_URL=http://192.168.11.65:3000
set REDMINE_API_KEY=your-key
npm test
```

### Comprehensive Test Suite
```bash
npm run build
npm run test:suite
```

The test suite creates a temporary project, tests all functionality, and cleans up automatically.

## Deployment

### Local Development
```bash
npm install
npm run build
# Configure in Amazon Q settings
```

### Production
```bash
npm install --production
npm run build
# Deploy build/ directory
# Configure environment variables
```

## Troubleshooting

### Common Issues

**"Cannot find module '@modelcontextprotocol/sdk'"**
- Run `npm install`

**"REDMINE_URL and REDMINE_API_KEY environment variables are required"**
- Set environment variables in MCP config

**"401 Unauthorized"**
- Check API key is correct
- Verify API access is enabled in Redmine

**"404 Not Found"**
- Verify project/issue ID exists
- Check permissions

## Related Projects

- **MCP SDK**: https://github.com/modelcontextprotocol/sdk
- **Redmine API**: https://www.redmine.org/projects/redmine/wiki/Rest_api
- **Amazon Q**: https://aws.amazon.com/q/

## License

MIT

## Contributing

This is a minimal implementation. Contributions welcome for:
- Additional Redmine API endpoints
- Better error handling
- Custom field support
- Time tracking
- File attachments
- Tests

## Changelog

### v1.0.0 (2026-02-22)
- Initial release with basic CRUD operations

### v1.1.0 (2026-02-23)
- Added time logging with activity support
- Added custom fields support
- Added file attachments
- Added issue relations (blocks, relates, duplicates, etc.)
- Added version/milestone management
- Added project management tools
- Added bulk update operations
- Added metadata listing (statuses, trackers, priorities)
- Added time tracking reports
- Added watcher management
- Added configurable defaults via environment variables
- Added comprehensive test suite
- Added alwaysAllow flag for read-only operations
