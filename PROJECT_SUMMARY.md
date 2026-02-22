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

### 1. Create Issues
- Full metadata support (priority, estimates, descriptions)
- Parent/child relationships for subtasks
- Markdown descriptions
- Automatic URL generation

### 2. Update Issues
- Change status (New → In Progress → Resolved → Closed)
- Update priority and assignments
- Add comments/notes
- Modify descriptions

### 3. Query Issues
- List by project and status
- Filter open/closed issues
- Get detailed issue information
- Search capabilities

### 4. Project Management
- List all accessible projects
- Get project IDs for operations
- Multi-project support

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
│   └── test-connection.ts    # Connection test utility
├── build/                    # Compiled JavaScript (generated)
│   ├── index.js
│   └── test-connection.js
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Full documentation
├── QUICKSTART.md             # Quick setup guide
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
```bash
REDMINE_URL=https://your-redmine.com
REDMINE_API_KEY=your-api-key-here
```

### Amazon Q Integration
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
- No file attachment support
- No custom field support
- No time entry logging
- No wiki page access
- No user management

### Potential Enhancements
- [ ] Time entry logging
- [ ] Custom field support
- [ ] File attachments
- [ ] Wiki integration
- [ ] User/group management
- [ ] Version/milestone management
- [ ] Gantt chart generation
- [ ] Burndown chart data
- [ ] Issue relationships (blocks, relates to)
- [ ] Watchers management

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
```bash
export REDMINE_URL="https://your-redmine.com"
export REDMINE_API_KEY="your-key"
npm test
```

### Manual Testing
```bash
# Build
npm run build

# Run server (for debugging)
node build/index.js
```

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
- Initial release
- Basic CRUD operations for issues
- Project listing
- Status and priority management
- Parent/child task relationships
