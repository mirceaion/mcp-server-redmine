# Publishing to MCP Server Directory

This guide documents how to publish this server to the official MCP Server Directory.

## Prerequisites

- GitHub account
- npm account (optional, for npm publishing)
- Your Redmine instance for testing

## Step-by-Step Guide

### 1. Prepare Repository

Ensure all personal information is updated in:
- `package.json` - author, repository URLs
- `LICENSE` - copyright holder name
- `CONTRIBUTING.md` - repository URLs

### 2. Create GitHub Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .
git commit -m "Initial commit - MCP Server for Redmine v1.1.0"

# Create repository on GitHub (via web interface)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/mcp-server-redmine.git
git branch -M main
git push -u origin main
```

### 3. Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag: `v1.1.0`
4. Title: `MCP Server for Redmine v1.1.0`
5. Description:
   ```markdown
   ## Features
   
   - 30+ tools for comprehensive Redmine integration
   - Issue management (create, update, list, bulk operations)
   - Project management (CRUD operations, memberships)
   - Time tracking with activity support
   - Version/milestone management
   - Wiki page management
   - Issue relations and watchers
   - Metadata discovery tools
   - Auto-scheduling based on workload
   
   ## Installation
   
   ```bash
   npm install -g mcp-server-redmine
   ```
   
   See [README.md](README.md) for full documentation.
   ```
6. Click "Publish release"

### 4. Publish to npm (Optional but Recommended)

```bash
# Login to npm
npm login

# Publish package
npm publish
```

This allows users to install with: `npm install -g mcp-server-redmine`

### 5. Submit to MCP Server Directory

1. Fork the MCP servers repository:
   https://github.com/modelcontextprotocol/servers

2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/servers.git
   cd servers
   ```

3. Create a new branch:
   ```bash
   git checkout -b add-redmine-server
   ```

4. Add your server to `src/servers.json`:
   ```json
   {
     "name": "redmine",
     "displayName": "Redmine",
     "description": "Integrate with Redmine project management - create issues, track time, manage projects through AI conversations",
     "icon": "https://raw.githubusercontent.com/YOUR_USERNAME/mcp-server-redmine/main/icon.png",
     "repository": "https://github.com/YOUR_USERNAME/mcp-server-redmine",
     "license": "MIT",
     "categories": ["productivity", "project-management"],
     "tags": ["redmine", "issues", "tasks", "time-tracking", "agile", "scrum"],
     "installation": {
       "npm": "mcp-server-redmine"
     },
     "configuration": {
       "command": "npx",
       "args": ["-y", "mcp-server-redmine"],
       "env": {
         "REDMINE_URL": "https://your-redmine.com",
         "REDMINE_API_KEY": "your-api-key-here"
       }
     }
   }
   ```

5. Commit and push:
   ```bash
   git add src/servers.json
   git commit -m "Add Redmine MCP server"
   git push origin add-redmine-server
   ```

6. Create Pull Request:
   - Go to https://github.com/modelcontextprotocol/servers
   - Click "Pull requests" → "New pull request"
   - Select your fork and branch
   - Title: "Add Redmine MCP server"
   - Description:
     ```markdown
     ## Server: Redmine
     
     Adds MCP server for Redmine project management integration.
     
     ### Features
     - 30+ tools for comprehensive Redmine integration
     - Issue management, time tracking, project management
     - Version/milestone management, wiki pages
     - Bulk operations and auto-scheduling
     
     ### Links
     - Repository: https://github.com/YOUR_USERNAME/mcp-server-redmine
     - npm: https://www.npmjs.com/package/mcp-server-redmine
     - Documentation: Full README with examples and troubleshooting
     
     ### Testing
     - ✅ Tested with Amazon Q
     - ✅ Comprehensive test suite included
     - ✅ Connection test utility
     - ✅ Works with Redmine 4.x and 5.x
     ```
   - Submit PR

### 6. Optional: Create Icon

Create a simple icon for your server (recommended 512x512 PNG):
- Save as `icon.png` in your repository root
- Update the icon URL in the servers.json submission

### 7. Wait for Review

The MCP team will review your submission. They may ask for:
- Changes to the server entry
- Additional documentation
- Testing verification

## After Acceptance

Once accepted, your server will appear in:
- MCP Server Directory: https://github.com/modelcontextprotocol/servers
- Available for discovery by MCP clients
- Listed in the official documentation

## Promotion

Consider:
- Posting on Reddit (r/redmine, r/projectmanagement)
- Sharing on Twitter/LinkedIn
- Writing a blog post about the integration
- Creating a demo video

## Maintenance

- Respond to issues promptly
- Keep dependencies updated
- Add new Redmine API features as needed
- Update documentation based on user feedback

## Questions?

- MCP Discord: https://discord.gg/modelcontextprotocol
- GitHub Discussions: https://github.com/modelcontextprotocol/servers/discussions
