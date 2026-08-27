# MCP Server for Redmine

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0 | 2026-07-18 | Claude | Version table added retroactively; documents existing tool set |
| 1.1 | 2026-07-18 | Claude | `get_issue`: new optional `include_journals` parameter (comment history) |
| 1.2 | 2026-08-08 | Claude | Wiki writes: `file_path` as an alternative to inline `text` on create/update; new `patch_wiki_page` (append/prepend/replace, guarded by `expect_count` and `check_version`); `raw` option on `get_wiki_page` so a read-modify-write cannot bake the title heading and version footer into the page |
| 1.3 | 2026-08-08 | Claude | New `list_wiki_pages` — returns the real page set including pages no index links to, which a link-driven sweep would silently miss |
| 1.4 | 2026-08-27 | Claude | `list_issues` gains `tracker_id` and `offset` filters, reports `total_count`/paging so a capped page can't be mistaken for the full result; `get_issue` and `list_issues` now show each issue's tracker name. New `search_issues` (full-text, via Redmine's `/search.json`), `copy_issue`, `delete_issue` — closes RedmineMCP #39 |

Model Context Protocol (MCP) server for Redmine project management integration. Allows AI assistants to create, update, and query Redmine issues directly from conversations.

## Features

- ✅ Create issues with full metadata (priority, estimates, parent tasks)
- ✅ Update existing issues (status, description, comments)
- ✅ List and filter issues by project, status and tracker; page past the first result set with `offset`
- ✅ Full-text search across issue subjects/descriptions (`search_issues`)
- ✅ Get detailed issue information
- ✅ Copy or delete an issue
- ✅ List all accessible projects
- ✅ Full wiki access — list every page, read, create and update from a file for large content, or apply a targeted `append`/`prepend`/`replace` patch that leaves the rest of the page untouched

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
      "args": ["/absolute/path/to/mcp-server-redmine/build/index.js"],
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
List issues from a project. Each line shows the issue's tracker name alongside its status.

**Parameters:**
- `project_id` (required): Project ID
- `status_id`: Filter by status ("open", "closed", or specific ID)
- `tracker_id`: Filter by tracker (1=Bug, 2=Feature, 3=Support, 4=Epic — check `list_trackers`, IDs vary by instance)
- `limit`: Max results per call (default 25, hard-capped at 100 by Redmine itself regardless of what's requested)
- `offset`: Skip this many issues, to page past the first `limit`

The response reports `total_count` and, when more match than were returned, a `remaining`/next-`offset` note — a project with more open issues than fit in one page previously looked complete when it wasn't (`list_issues` silently capped at 100 with no way to tell there was more).

**Example:**
```
List all open Bug-tracker issues in Redmine project 1
```

### search_issues
Full-text search across issue subjects and descriptions — the tool for "find issues about X". `list_issues` only filters structured fields (status, tracker); it has no text-match filter, so a keyword search through it means walking every issue by hand.

**Parameters:**
- `query` (required): Search text
- `project_id`: Restrict to one project (Redmine **identifier** string, e.g. `"gurmand"` — not the numeric project ID `list_issues` takes)
- `open_issues_only`: Match only open issues (default false)
- `titles_only`: Match only subjects, not descriptions/comments (default false)
- `limit`: Max results (default 25)

**Example:**
```
Search Redmine project gurmand for issues mentioning "focus ring"
```

### copy_issue
Duplicate an issue. Redmine's REST API has no copy endpoint, so this reads the source issue and creates a new one from its fields; any field you pass overrides the source's value. The copy's status defaults to New (not the source's current status) unless `status_id` is given explicitly.

**Parameters:**
- `issue_id` (required): Issue ID to copy from
- `project_id`, `subject`, `tracker_id`, `status_id`, `priority_id`, `assigned_to_id`, `description`: overrides for the copy — each defaults to the source issue's value (status defaults to New instead)

**Example:**
```
Copy Redmine issue #123 into project 2 with subject "Port fix to Reborn"
```

### delete_issue
Permanently delete an issue. **Irreversible** — Redmine does not soft-delete, and there is no undo. Requires delete permission on the issue's project.

**Parameters:**
- `issue_id` (required): Issue ID to delete

### get_issue
Get detailed information about a specific issue, including its tracker.

**Parameters:**
- `issue_id` (required): Issue ID
- `include_journals`: Set to `true` to include the comment/note history (author, timestamp, text). Journal entries that only record field changes (status flips, done-ratio edits) are filtered out. Default `false` to keep the response small.

**Example:**
```
Get details of Redmine issue #123 including its comments
```

### list_projects
List all accessible Redmine projects.

**Example:**
```
List all my Redmine projects
```

### Wiki tools

#### list_wiki_pages
List every page in a project's wiki, with version, last-updated date and parent. `sort` accepts `title` (default), `updated` (most recently changed first — the useful order for spotting stale pages) or `version` (most-edited first).

Use it before any wiki-wide operation. It returns the **real** page set, including pages that no index links to — a sweep driven off the `[[links]]` in an index page silently skips orphans, and an orphan is exactly the page most likely to have gone stale. Titles come back as Redmine identifiers, so they can be passed verbatim as `title` to the other wiki tools.

#### get_wiki_page
Read a wiki page.

`raw: true` returns **only** the page body — no title heading, no version footer. Use it whenever the text will be read back and rewritten: the decorated default is not round-trip safe, because re-submitting it would bake the heading and footer into the page itself.

#### create_wiki_page / update_wiki_page
Write a page. Supply the body **either** inline via `text` **or** from a file via `file_path` — exactly one of the two. Supplying both is refused rather than silently picking one, and supplying neither is refused rather than blanking the page.

`file_path` reads a UTF-8 file from disk and writes its contents verbatim. Prefer it for anything large: nothing has to pass through the model, so a big page can't be truncated or subtly reworded in transit.

> ⚠️ **`update_wiki_page` replaces the entire page body.** It is not a patch. If you only mean to change part of a page, use `patch_wiki_page` — a full overwrite built from a partial body is the most common way to lose wiki content.

#### patch_wiki_page
Change part of a page without resending the whole body. Fetches the current text, applies one edit, writes it back — so untouched content never passes through the caller and cannot be lost.

Modes:

| Mode | Effect |
|---|---|
| `append` | add `text` to the end, separated by exactly one blank line |
| `prepend` | add `text` to the start |
| `replace` | substitute `find` with `text`; an empty `text` deletes the match |

Two guards make a bad edit fail instead of succeeding wrongly:

- **`expect_count`** (replace mode, default 1) — the write is refused unless `find` matches exactly that many times. A `find` matching nothing is a no-op nobody notices; a `find` matching five times when one was meant is an accidental mass edit. Both become errors. Pass `expect_count` explicitly to authorise a genuine multi-match replace.
- **`check_version`** (default true) — the version read during the fetch is sent back, so Redmine refuses the write if the page changed in between. Set it to `false` only to deliberately overwrite someone else's concurrent edit.

`find` is a **literal string, not a regex**, so `$`, `.`, `(` and friends need no escaping.

**Examples:**
```
Append a new row to the tracking table on the Epic_921 wiki page

Replace "Status: paused" with "Status: active" on Closed_Beta_Focus

Update Project_Status from C:\work\project-status.md
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
