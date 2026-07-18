#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { readFileSync } from 'fs';
import { basename } from 'path';

interface RedmineConfig {
  url: string;
  apiKey: string;
  defaultAssigneeId?: number;
  defaultTimeHours?: number;
  defaultTrackerId: number;
  defaultPriorityId: number;
  defaultIssuesLimit: number;
  defaultUsersLimit: number;
  defaultWeekdayHours: number;
  defaultWeekendHours: number;
  defaultSkipSundays: boolean;
}

interface RedmineIssue {
  id?: number;
  project_id: number;
  tracker_id?: number;
  subject: string;
  description?: string;
  priority_id?: number;
  status_id?: number;
  assigned_to_id?: number;
  estimated_hours?: number;
  parent_issue_id?: number;
}

class RedmineMCPServer {
  private server: Server;
  private redmine: AxiosInstance;
  private config: RedmineConfig;

  constructor() {
    this.config = {
      url: process.env.REDMINE_URL || '',
      apiKey: process.env.REDMINE_API_KEY || '',
      defaultAssigneeId: process.env.REDMINE_DEFAULT_ASSIGNEE_ID ? parseInt(process.env.REDMINE_DEFAULT_ASSIGNEE_ID) : undefined,
      defaultTimeHours: process.env.REDMINE_DEFAULT_TIME_HOURS ? parseFloat(process.env.REDMINE_DEFAULT_TIME_HOURS) : undefined,
      defaultTrackerId: process.env.REDMINE_DEFAULT_TRACKER_ID ? parseInt(process.env.REDMINE_DEFAULT_TRACKER_ID) : 2,
      defaultPriorityId: process.env.REDMINE_DEFAULT_PRIORITY_ID ? parseInt(process.env.REDMINE_DEFAULT_PRIORITY_ID) : 2,
      defaultIssuesLimit: process.env.REDMINE_DEFAULT_ISSUES_LIMIT ? parseInt(process.env.REDMINE_DEFAULT_ISSUES_LIMIT) : 25,
      defaultUsersLimit: process.env.REDMINE_DEFAULT_USERS_LIMIT ? parseInt(process.env.REDMINE_DEFAULT_USERS_LIMIT) : 100,
      defaultWeekdayHours: process.env.REDMINE_DEFAULT_WEEKDAY_HOURS ? parseFloat(process.env.REDMINE_DEFAULT_WEEKDAY_HOURS) : 1.5,
      defaultWeekendHours: process.env.REDMINE_DEFAULT_WEEKEND_HOURS ? parseFloat(process.env.REDMINE_DEFAULT_WEEKEND_HOURS) : 3,
      defaultSkipSundays: process.env.REDMINE_DEFAULT_SKIP_SUNDAYS === 'true',
    };

    if (!this.config.url || !this.config.apiKey) {
      throw new Error('REDMINE_URL and REDMINE_API_KEY environment variables are required');
    }

    this.redmine = axios.create({
      baseURL: this.config.url,
      headers: {
        'X-Redmine-API-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    this.server = new Server(
      {
        name: 'mcp-server-redmine',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_issue',
          description: 'Create a new Redmine issue/task',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'number', description: 'Project ID' },
              tracker_id: { type: 'number', description: 'Tracker (1=Bug, 2=Feature, 3=Support, etc.)' },
              subject: { type: 'string', description: 'Issue title' },
              description: { type: 'string', description: 'Issue description' },
              priority_id: { type: 'number', description: 'Priority (1=Low, 2=Normal, 3=High, 4=Urgent, 5=Immediate)' },
              estimated_hours: { type: 'number', description: 'Estimated hours' },
              parent_issue_id: { type: 'number', description: 'Parent issue ID for subtasks' },
              custom_fields: { type: 'array', description: 'Custom fields array [{id: 1, value: "text"}]' },
            },
            required: ['project_id', 'subject'],
          },
        },
        {
          name: 'update_issue',
          description: 'Update an existing Redmine issue',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Issue ID to update' },
              project_id: { type: 'number', description: 'Move issue to this project ID' },
              tracker_id: { type: 'number', description: 'Tracker (1=Bug, 2=Feature, 3=Support, etc.)' },
              subject: { type: 'string', description: 'New title' },
              description: { type: 'string', description: 'New description' },
              status_id: { type: 'number', description: 'Status (1=New, 2=In Progress, 3=Resolved, 5=Closed)' },
              priority_id: { type: 'number', description: 'Priority' },
              assigned_to_id: { type: 'number', description: 'User ID to assign' },
              done_ratio: { type: 'number', description: 'Percentage complete (0-100)' },
              start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
              fixed_version_id: { type: 'number', description: 'Version/milestone ID to assign' },
              notes: { type: 'string', description: 'Comment to add' },
              custom_fields: { type: 'array', description: 'Custom fields array [{id: 1, value: "text"}]' },
              parent_issue_id: { type: 'number', description: 'Parent issue ID for subtasks' },
            },
            required: ['issue_id'],
          },
        },
        {
          name: 'list_issues',
          description: 'List issues from a project',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'number', description: 'Project ID' },
              status_id: { type: 'string', description: 'Status filter (open, closed, or specific ID)' },
              limit: { type: 'number', description: 'Max results (default 25)' },
            },
            required: ['project_id'],
          },
          alwaysAllow: true,
        },
        {
          name: 'get_issue',
          description: 'Get details of a specific issue. Set include_journals to also get the comment/note history.',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Issue ID' },
              include_journals: { type: 'boolean', description: 'Include journal entries (comments/notes) in the output. Default false.' },
            },
            required: ['issue_id'],
          },
          alwaysAllow: true,
        },
        {
          name: 'list_projects',
          description: 'List all accessible Redmine projects',
          inputSchema: {
            type: 'object',
            properties: {},
          },
          alwaysAllow: true,
        },
        {
          name: 'schedule_issues',
          description: 'Auto-schedule issues with start and due dates based on workload',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'number', description: 'Project ID' },
              issue_ids: { type: 'array', items: { type: 'number' }, description: 'Issue IDs to schedule' },
              start_date: { type: 'string', description: 'Start date (YYYY-MM-DD), defaults to next available' },
              weekday_hours: { type: 'number', description: 'Work hours per weekday (default 1.5)' },
              weekend_hours: { type: 'number', description: 'Work hours per weekend day (default 3)' },
              skip_sundays: { type: 'boolean', description: 'Skip Sundays (default false)' },
            },
            required: ['project_id', 'issue_ids'],
          },
        },
        {
          name: 'log_time',
          description: 'Log time spent on an issue',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Issue ID' },
              hours: { type: 'number', description: 'Hours spent (defaults to 1 if not specified)' },
              activity_id: { type: 'number', description: 'Activity ID (optional, will use default if not specified)' },
              activity_name: { type: 'string', description: 'Activity name (e.g., "Development", "Design") - alternative to activity_id' },
              comments: { type: 'string', description: 'Description of work done' },
              spent_on: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' },
            },
            required: ['issue_id'],
          },
        },
        {
          name: 'upload_attachment',
          description: 'Upload a file attachment to an issue',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Issue ID' },
              file_path: { type: 'string', description: 'Absolute path to file' },
              description: { type: 'string', description: 'File description' },
            },
            required: ['issue_id', 'file_path'],
          },
        },
        {
          name: 'create_wiki_page',
          description: 'Create a new wiki page',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'string', description: 'Project identifier (not ID)' },
              title: { type: 'string', description: 'Page title' },
              text: { type: 'string', description: 'Page content (textile/markdown)' },
              comments: { type: 'string', description: 'Version comment' },
            },
            required: ['project_id', 'title', 'text'],
          },
        },
        {
          name: 'update_wiki_page',
          description: 'Update an existing wiki page',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'string', description: 'Project identifier (not ID)' },
              title: { type: 'string', description: 'Page title' },
              text: { type: 'string', description: 'Page content (textile/markdown)' },
              comments: { type: 'string', description: 'Version comment' },
            },
            required: ['project_id', 'title', 'text'],
          },
        },
        {
          name: 'get_wiki_page',
          description: 'Get wiki page content',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'string', description: 'Project identifier (not ID)' },
              title: { type: 'string', description: 'Page title' },
            },
            required: ['project_id', 'title'],
          },
          alwaysAllow: true,
        },
        {
          name: 'list_users',
          description: 'List all users in Redmine',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Filter by name' },
              limit: { type: 'number', description: 'Max results (default 100)' },
            },
          },
          alwaysAllow: true,
        },
        {
          name: 'list_time_entry_activities',
          description: 'List available time entry activities',
          inputSchema: {
            type: 'object',
            properties: {},
          },
          alwaysAllow: true,
        },
        {
          name: 'list_custom_fields',
          description: 'List custom fields available in Redmine',
          inputSchema: {
            type: 'object',
            properties: {},
          },
          alwaysAllow: true,
        },
        {
          name: 'create_issue_relation',
          description: 'Create a relationship between two issues',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Issue ID' },
              issue_to_id: { type: 'number', description: 'Related issue ID' },
              relation_type: { type: 'string', description: 'Relation type: relates, duplicates, blocks, precedes, follows, copied_to, copied_from' },
              delay: { type: 'number', description: 'Delay in days (for precedes/follows)' },
            },
            required: ['issue_id', 'issue_to_id', 'relation_type'],
          },
        },
        {
          name: 'get_issue_relations',
          description: 'Get all relationships for an issue',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Issue ID' },
            },
            required: ['issue_id'],
          },
          alwaysAllow: true,
        },
        {
          name: 'delete_issue_relation',
          description: 'Delete a relationship between issues',
          inputSchema: {
            type: 'object',
            properties: {
              relation_id: { type: 'number', description: 'Relation ID to delete' },
            },
            required: ['relation_id'],
          },
        },
        {
          name: 'list_versions',
          description: 'List versions/milestones for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'number', description: 'Project ID' },
            },
            required: ['project_id'],
          },
          alwaysAllow: true,
        },
        {
          name: 'create_version',
          description: 'Create a new version/milestone',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'number', description: 'Project ID' },
              name: { type: 'string', description: 'Version name' },
              description: { type: 'string', description: 'Version description' },
              status: { type: 'string', description: 'Status: open, locked, closed (default: open)' },
              due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
              sharing: { type: 'string', description: 'Sharing: none, descendants, hierarchy, tree, system (default: none)' },
            },
            required: ['project_id', 'name'],
          },
        },
        {
          name: 'update_version',
          description: 'Update an existing version/milestone',
          inputSchema: {
            type: 'object',
            properties: {
              version_id: { type: 'number', description: 'Version ID' },
              name: { type: 'string', description: 'Version name' },
              description: { type: 'string', description: 'Version description' },
              status: { type: 'string', description: 'Status: open, locked, closed' },
              due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
              sharing: { type: 'string', description: 'Sharing: none, descendants, hierarchy, tree, system' },
            },
            required: ['version_id'],
          },
        },
        {
          name: 'get_version',
          description: 'Get version details with associated issues',
          inputSchema: {
            type: 'object',
            properties: {
              version_id: { type: 'number', description: 'Version ID' },
            },
            required: ['version_id'],
          },
          alwaysAllow: true,
        },
        {
          name: 'create_project',
          description: 'Create a new project',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              identifier: { type: 'string', description: 'Project identifier (lowercase, no spaces)' },
              description: { type: 'string', description: 'Project description' },
              is_public: { type: 'boolean', description: 'Is project public (default: true)' },
              parent_id: { type: 'number', description: 'Parent project ID for subprojects' },
            },
            required: ['name', 'identifier'],
          },
        },
        {
          name: 'update_project',
          description: 'Update project settings',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'number', description: 'Project ID' },
              name: { type: 'string', description: 'Project name' },
              description: { type: 'string', description: 'Project description' },
              is_public: { type: 'boolean', description: 'Is project public' },
            },
            required: ['project_id'],
          },
        },
        {
          name: 'get_project',
          description: 'Get detailed project information',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'number', description: 'Project ID' },
            },
            required: ['project_id'],
          },
          alwaysAllow: true,
        },
        {
          name: 'list_project_memberships',
          description: 'Get project members and their roles',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'number', description: 'Project ID' },
            },
            required: ['project_id'],
          },
          alwaysAllow: true,
        },
        {
          name: 'add_project_member',
          description: 'Add user to project with role',
          inputSchema: {
            type: 'object',
            properties: {
              project_id: { type: 'number', description: 'Project ID' },
              user_id: { type: 'number', description: 'User ID to add' },
              role_ids: { type: 'array', items: { type: 'number' }, description: 'Role IDs to assign' },
            },
            required: ['project_id', 'user_id', 'role_ids'],
          },
        },
        {
          name: 'bulk_update_issues',
          description: 'Update multiple issues in a single operation',
          inputSchema: {
            type: 'object',
            properties: {
              issue_ids: { type: 'array', items: { type: 'number' }, description: 'Issue IDs to update' },
              tracker_id: { type: 'number', description: 'Tracker to set' },
              status_id: { type: 'number', description: 'Status to set' },
              priority_id: { type: 'number', description: 'Priority to set' },
              assigned_to_id: { type: 'number', description: 'User ID to assign' },
              fixed_version_id: { type: 'number', description: 'Version/milestone to set' },
              notes: { type: 'string', description: 'Comment to add to all issues' },
            },
            required: ['issue_ids'],
          },
        },
        {
          name: 'list_issue_statuses',
          description: 'List available issue statuses',
          inputSchema: {
            type: 'object',
            properties: {},
          },
          alwaysAllow: true,
        },
        {
          name: 'list_trackers',
          description: 'List available trackers (Bug, Feature, Support, etc.)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
          alwaysAllow: true,
        },
        {
          name: 'list_issue_priorities',
          description: 'List available issue priorities',
          inputSchema: {
            type: 'object',
            properties: {},
          },
          alwaysAllow: true,
        },
        {
          name: 'get_time_entries',
          description: 'Get time entries with filters',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Filter by issue ID' },
              project_id: { type: 'number', description: 'Filter by project ID' },
              user_id: { type: 'number', description: 'Filter by user ID' },
              from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
              limit: { type: 'number', description: 'Max results (default 25)' },
            },
          },
          alwaysAllow: true,
        },
        {
          name: 'add_watcher',
          description: 'Add user to watch an issue',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Issue ID' },
              user_id: { type: 'number', description: 'User ID to add as watcher' },
            },
            required: ['issue_id', 'user_id'],
          },
        },
        {
          name: 'remove_watcher',
          description: 'Remove watcher from an issue',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Issue ID' },
              user_id: { type: 'number', description: 'User ID to remove as watcher' },
            },
            required: ['issue_id', 'user_id'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'create_issue':
            return await this.createIssue(request.params.arguments);
          case 'update_issue':
            return await this.updateIssue(request.params.arguments);
          case 'list_issues':
            return await this.listIssues(request.params.arguments);
          case 'get_issue':
            return await this.getIssue(request.params.arguments);
          case 'list_projects':
            return await this.listProjects();
          case 'schedule_issues':
            return await this.scheduleIssues(request.params.arguments);
          case 'log_time':
            return await this.logTime(request.params.arguments);
          case 'upload_attachment':
            return await this.uploadAttachment(request.params.arguments);
          case 'create_wiki_page':
            return await this.createWikiPage(request.params.arguments);
          case 'update_wiki_page':
            return await this.updateWikiPage(request.params.arguments);
          case 'get_wiki_page':
            return await this.getWikiPage(request.params.arguments);
          case 'list_users':
            return await this.listUsers(request.params.arguments);
          case 'list_time_entry_activities':
            return await this.listTimeEntryActivities();
          case 'list_custom_fields':
            return await this.listCustomFields();
          case 'create_issue_relation':
            return await this.createIssueRelation(request.params.arguments);
          case 'get_issue_relations':
            return await this.getIssueRelations(request.params.arguments);
          case 'delete_issue_relation':
            return await this.deleteIssueRelation(request.params.arguments);
          case 'list_versions':
            return await this.listVersions(request.params.arguments);
          case 'create_version':
            return await this.createVersion(request.params.arguments);
          case 'update_version':
            return await this.updateVersion(request.params.arguments);
          case 'get_version':
            return await this.getVersion(request.params.arguments);
          case 'create_project':
            return await this.createProject(request.params.arguments);
          case 'update_project':
            return await this.updateProject(request.params.arguments);
          case 'get_project':
            return await this.getProject(request.params.arguments);
          case 'list_project_memberships':
            return await this.listProjectMemberships(request.params.arguments);
          case 'add_project_member':
            return await this.addProjectMember(request.params.arguments);
          case 'bulk_update_issues':
            return await this.bulkUpdateIssues(request.params.arguments);
          case 'list_issue_statuses':
            return await this.listIssueStatuses();
          case 'list_trackers':
            return await this.listTrackers();
          case 'list_issue_priorities':
            return await this.listIssuePriorities();
          case 'get_time_entries':
            return await this.getTimeEntries(request.params.arguments);
          case 'add_watcher':
            return await this.addWatcher(request.params.arguments);
          case 'remove_watcher':
            return await this.removeWatcher(request.params.arguments);
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  private async createIssue(args: any) {
    const issue: any = {
      project_id: args.project_id,
      tracker_id: args.tracker_id || this.config.defaultTrackerId,
      subject: args.subject,
      description: args.description,
      priority_id: args.priority_id || this.config.defaultPriorityId,
      estimated_hours: args.estimated_hours,
      parent_issue_id: args.parent_issue_id,
    };
    
    // Apply default assignee if configured and not explicitly set
    if (!args.assigned_to_id && this.config.defaultAssigneeId) {
      issue.assigned_to_id = this.config.defaultAssigneeId;
    } else if (args.assigned_to_id) {
      issue.assigned_to_id = args.assigned_to_id;
    }
    
    if (args.custom_fields) issue.custom_fields = args.custom_fields;

    const response = await this.redmine.post('/issues.json', { issue });
    const created = response.data.issue;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created issue #${created.id}: ${created.subject}\nURL: ${this.config.url}/issues/${created.id}`,
        },
      ],
    };
  }

  private async updateIssue(args: any) {
    const issue: any = {};
    if (args.project_id) issue.project_id = args.project_id;
    if (args.tracker_id) issue.tracker_id = args.tracker_id;
    if (args.subject) issue.subject = args.subject;
    if (args.description) issue.description = args.description;
    if (args.status_id) issue.status_id = args.status_id;
    if (args.priority_id) issue.priority_id = args.priority_id;
    if (args.assigned_to_id) issue.assigned_to_id = args.assigned_to_id;
    if (args.done_ratio !== undefined) issue.done_ratio = args.done_ratio;
    if (args.start_date) issue.start_date = args.start_date;
    if (args.due_date) issue.due_date = args.due_date;
    if (args.fixed_version_id) issue.fixed_version_id = args.fixed_version_id;
    if (args.notes) issue.notes = args.notes;
    if (args.custom_fields) issue.custom_fields = args.custom_fields;
    if (args.parent_issue_id) issue.parent_issue_id = args.parent_issue_id;

    await this.redmine.put(`/issues/${args.issue_id}.json`, { issue });

    // If a status change was requested, verify Redmine actually applied it.
    // Redmine silently ignores status changes blocked by open subtasks and still returns HTTP 200.
    if (args.status_id !== undefined) {
      const verify = await this.redmine.get(`/issues/${args.issue_id}.json`);
      const actualStatusId = verify.data?.issue?.status?.id;
      if (actualStatusId !== args.status_id) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ Issue #${args.issue_id} was NOT updated to status ${args.status_id} — Redmine rejected the change (actual status: ${actualStatusId}). This usually means the issue has open subtasks that must be closed first.`,
            },
          ],
        };
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Updated issue #${args.issue_id}`,
        },
      ],
    };
  }

  private async listIssues(args: any) {
    const params: any = {
      project_id: args.project_id,
      limit: args.limit || this.config.defaultIssuesLimit,
    };
    if (args.status_id) params.status_id = args.status_id;

    const response = await this.redmine.get('/issues.json', { params });
    const issues = response.data.issues;

    const text = issues
      .map((i: any) => `#${i.id} - ${i.subject} [${i.status.name}]`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${issues.length} issues:\n\n${text}`,
        },
      ],
    };
  }

  private async getIssue(args: any) {
    const include = args.include_journals ? 'children,journals' : 'children';
    const response = await this.redmine.get(`/issues/${args.issue_id}.json`, { params: { include } });
    const issue = response.data.issue;

    let journalsText = '';
    if (args.include_journals) {
      const notes = (issue.journals || []).filter((j: any) => j.notes?.trim());
      journalsText = notes.length
        ? `\n\nComments (${notes.length}):\n${notes
            .map((j: any) => `--- ${j.user?.name || 'Unknown'} @ ${j.created_on}\n${j.notes.trim()}`)
            .join('\n')}`
        : '\n\nComments: none';
    }

    let childrenText = '';
    if (issue.children?.length) {
      const childrenResponse = await this.redmine.get('/issues.json', { params: { parent_id: args.issue_id, limit: 100, status_id: '*' } });
      const children = childrenResponse.data.issues;
      childrenText = `\nSubtasks:\n${children.map((c: any) => `  #${c.id}: ${c.subject} [${c.status.name}] ${c.done_ratio}%`).join('\n')}`;
    }

    const text = `
Issue #${issue.id}: ${issue.subject}
Status: ${issue.status.name}
Priority: ${issue.priority.name}
Done: ${issue.done_ratio}%
Assigned to: ${issue.assigned_to?.name || 'Unassigned'}
${issue.parent ? `Parent: #${issue.parent.id}` : ''}
Created: ${issue.created_on}
Updated: ${issue.updated_on}${childrenText}

Description:
${issue.description || 'No description'}${journalsText}
    `.trim();

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  private async listProjects() {
    const response = await this.redmine.get('/projects.json');
    const projects = response.data.projects;

    const text = projects
      .map((p: any) => `ID ${p.id}: ${p.name} (${p.identifier})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available projects:\n\n${text}`,
        },
      ],
    };
  }

  private async scheduleIssues(args: any) {
    const weekdayHours = args.weekday_hours || this.config.defaultWeekdayHours;
    const weekendHours = args.weekend_hours || this.config.defaultWeekendHours;
    const skipSundays = args.skip_sundays !== undefined ? args.skip_sundays : this.config.defaultSkipSundays;
    
    // Get all issues to schedule with their estimates
    const issueDetails = await Promise.all(
      args.issue_ids.map((id: number) => this.redmine.get(`/issues/${id}.json`))
    );
    
    const issues = issueDetails.map(r => r.data.issue);
    
    // Calculate start date
    let currentDate = args.start_date 
      ? new Date(args.start_date) 
      : this.getNextWorkday(new Date(), skipSundays);
    
    const scheduled: any[] = [];
    
    for (const issue of issues) {
      const estimatedHours = issue.estimated_hours || 4;
      let remainingHours = estimatedHours;
      const startDate = this.formatDate(currentDate);
      
      // Allocate hours across days based on capacity
      while (remainingHours > 0) {
        const dayCapacity = this.getDayCapacity(currentDate, weekdayHours, weekendHours, skipSundays);
        remainingHours -= dayCapacity;
        
        if (remainingHours > 0) {
          currentDate = this.getNextWorkday(currentDate, skipSundays);
        }
      }
      
      const dueDate = this.formatDate(currentDate);
      
      // Update issue with dates
      await this.redmine.put(`/issues/${issue.id}.json`, {
        issue: {
          start_date: startDate,
          due_date: dueDate,
        },
      });
      
      scheduled.push({
        id: issue.id,
        subject: issue.subject,
        start_date: startDate,
        due_date: dueDate,
        estimated_hours: estimatedHours,
      });
      
      // Move to next available date
      currentDate = this.getNextWorkday(currentDate, skipSundays);
    }
    
    const summary = scheduled
      .map(s => `#${s.id}: ${s.subject}\n  ${s.start_date} → ${s.due_date} (${s.estimated_hours}h)`)
      .join('\n\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Scheduled ${scheduled.length} issues:\n\n${summary}\n\nCapacity: ${weekdayHours}h weekdays, ${weekendHours}h weekends`,
        },
      ],
    };
  }
  
  private getNextWorkday(date: Date, skipSundays: boolean): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    
    // Skip Sundays if requested
    if (skipSundays && next.getDay() === 0) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }
  
  private getDayCapacity(date: Date, weekdayHours: number, weekendHours: number, skipSundays: boolean): number {
    const day = date.getDay();
    
    // Sunday
    if (day === 0) {
      return skipSundays ? 0 : weekendHours;
    }
    
    // Saturday
    if (day === 6) {
      return weekendHours;
    }
    
    // Monday-Friday
    return weekdayHours;
  }
  
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private async logTime(args: any) {
    const timeEntry: any = {
      issue_id: args.issue_id,
      hours: args.hours || this.config.defaultTimeHours || 1,
      comments: args.comments || '',
      spent_on: args.spent_on || this.formatDate(new Date()),
    };
    
    // Resolve activity by name if provided
    if (args.activity_name && !args.activity_id) {
      const response = await this.redmine.get('/enumerations/time_entry_activities.json');
      const activities = response.data.time_entry_activities;
      const activity = activities.find((a: any) => 
        a.name.toLowerCase() === args.activity_name.toLowerCase()
      );
      if (activity) {
        timeEntry.activity_id = activity.id;
      }
    } else if (args.activity_id) {
      timeEntry.activity_id = args.activity_id;
    }

    await this.redmine.post('/time_entries.json', { time_entry: timeEntry });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Logged ${timeEntry.hours}h on issue #${args.issue_id}`,
        },
      ],
    };
  }

  private async uploadAttachment(args: any) {
    const fileContent = readFileSync(args.file_path);
    const fileName = basename(args.file_path);
    
    // Upload file
    const uploadResponse = await this.redmine.post('/uploads.json', fileContent, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
    
    const token = uploadResponse.data.upload.token;
    
    // Attach to issue
    await this.redmine.put(`/issues/${args.issue_id}.json`, {
      issue: {
        uploads: [
          {
            token,
            filename: fileName,
            description: args.description || '',
          },
        ],
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Uploaded ${fileName} to issue #${args.issue_id}`,
        },
      ],
    };
  }

  private async createWikiPage(args: any) {
    const wikiPage: any = {
      text: args.text,
    };
    
    if (args.comments) wikiPage.comments = args.comments;

    await this.redmine.put(`/projects/${args.project_id}/wiki/${args.title}.json`, {
      wiki_page: wikiPage,
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created wiki page "${args.title}"\nURL: ${this.config.url}/projects/${args.project_id}/wiki/${args.title}`,
        },
      ],
    };
  }

  private async updateWikiPage(args: any) {
    const wikiPage: any = {
      text: args.text,
    };
    
    if (args.comments) wikiPage.comments = args.comments;

    await this.redmine.put(`/projects/${args.project_id}/wiki/${args.title}.json`, {
      wiki_page: wikiPage,
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Updated wiki page "${args.title}"`,
        },
      ],
    };
  }

  private async getWikiPage(args: any) {
    const response = await this.redmine.get(`/projects/${args.project_id}/wiki/${args.title}.json`);
    const page = response.data.wiki_page;

    return {
      content: [
        {
          type: 'text',
          text: `# ${page.title}\n\n${page.text}\n\n---\nVersion: ${page.version} | Updated: ${page.updated_on}`,
        },
      ],
    };
  }

  private async listUsers(args: any) {
    const params: any = {
      limit: args.limit || this.config.defaultUsersLimit,
    };
    if (args.name) params.name = args.name;

    const response = await this.redmine.get('/users.json', { params });
    const users = response.data.users;

    const text = users
      .map((u: any) => `ID ${u.id}: ${u.firstname} ${u.lastname} (${u.login})${u.mail ? ' - ' + u.mail : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${users.length} users:\n\n${text}`,
        },
      ],
    };
  }

  private async listTimeEntryActivities() {
    const response = await this.redmine.get('/enumerations/time_entry_activities.json');
    const activities = response.data.time_entry_activities;

    const text = activities
      .map((a: any) => `ID ${a.id}: ${a.name}${a.is_default ? ' (default)' : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available activities:\n\n${text}`,
        },
      ],
    };
  }

  private async listCustomFields() {
    const response = await this.redmine.get('/custom_fields.json');
    const fields = response.data.custom_fields;

    const text = fields
      .map((f: any) => `ID ${f.id}: ${f.name} (${f.field_format})${f.is_required ? ' *required' : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available custom fields:\n\n${text}`,
        },
      ],
    };
  }

  private async createIssueRelation(args: any) {
    const relation: any = {
      issue_to_id: args.issue_to_id,
      relation_type: args.relation_type,
    };
    
    if (args.delay) relation.delay = args.delay;

    await this.redmine.post(`/issues/${args.issue_id}/relations.json`, { relation });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created ${args.relation_type} relation between issue #${args.issue_id} and #${args.issue_to_id}`,
        },
      ],
    };
  }

  private async getIssueRelations(args: any) {
    const response = await this.redmine.get(`/issues/${args.issue_id}/relations.json`);
    const relations = response.data.relations;

    if (relations.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No relations found for issue #${args.issue_id}`,
          },
        ],
      };
    }

    const text = relations
      .map((r: any) => `ID ${r.id}: Issue #${r.issue_id} ${r.relation_type} Issue #${r.issue_to_id}${r.delay ? ` (delay: ${r.delay} days)` : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Relations for issue #${args.issue_id}:\n\n${text}`,
        },
      ],
    };
  }

  private async deleteIssueRelation(args: any) {
    await this.redmine.delete(`/relations/${args.relation_id}.json`);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Deleted relation #${args.relation_id}`,
        },
      ],
    };
  }

  private async listVersions(args: any) {
    const response = await this.redmine.get(`/projects/${args.project_id}/versions.json`);
    const versions = response.data.versions;

    if (versions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No versions found for project #${args.project_id}`,
          },
        ],
      };
    }

    const text = versions
      .map((v: any) => `ID ${v.id}: ${v.name} [${v.status}]${v.due_date ? ` - Due: ${v.due_date}` : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Versions for project #${args.project_id}:\n\n${text}`,
        },
      ],
    };
  }

  private async createVersion(args: any) {
    const version: any = {
      name: args.name,
      status: args.status || 'open',
    };
    
    if (args.description) version.description = args.description;
    if (args.due_date) version.due_date = args.due_date;
    if (args.sharing) version.sharing = args.sharing;

    const response = await this.redmine.post(`/projects/${args.project_id}/versions.json`, { version });
    const created = response.data.version;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created version #${created.id}: ${created.name}`,
        },
      ],
    };
  }

  private async updateVersion(args: any) {
    const version: any = {};
    
    if (args.name) version.name = args.name;
    if (args.description) version.description = args.description;
    if (args.status) version.status = args.status;
    if (args.due_date) version.due_date = args.due_date;
    if (args.sharing) version.sharing = args.sharing;

    await this.redmine.put(`/versions/${args.version_id}.json`, { version });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Updated version #${args.version_id}`,
        },
      ],
    };
  }

  private async getVersion(args: any) {
    const response = await this.redmine.get(`/versions/${args.version_id}.json`);
    const version = response.data.version;

    const text = `
Version #${version.id}: ${version.name}
Status: ${version.status}
Project: ${version.project.name}
${version.description ? `Description: ${version.description}` : ''}
${version.due_date ? `Due date: ${version.due_date}` : ''}
Created: ${version.created_on}
Updated: ${version.updated_on}
    `.trim();

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  private async createProject(args: any) {
    const project: any = {
      name: args.name,
      identifier: args.identifier,
      is_public: args.is_public !== undefined ? args.is_public : true,
    };
    
    if (args.description) project.description = args.description;
    if (args.parent_id) project.parent_id = args.parent_id;

    const response = await this.redmine.post('/projects.json', { project });
    const created = response.data.project;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Created project #${created.id}: ${created.name}\nIdentifier: ${created.identifier}\nURL: ${this.config.url}/projects/${created.identifier}`,
        },
      ],
    };
  }

  private async updateProject(args: any) {
    const project: any = {};
    
    if (args.name) project.name = args.name;
    if (args.description) project.description = args.description;
    if (args.is_public !== undefined) project.is_public = args.is_public;

    await this.redmine.put(`/projects/${args.project_id}.json`, { project });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Updated project #${args.project_id}`,
        },
      ],
    };
  }

  private async getProject(args: any) {
    const response = await this.redmine.get(`/projects/${args.project_id}.json`);
    const project = response.data.project;

    const text = `
Project #${project.id}: ${project.name}
Identifier: ${project.identifier}
Status: ${project.status}
Public: ${project.is_public ? 'Yes' : 'No'}
Created: ${project.created_on}
Updated: ${project.updated_on}
${project.parent ? `Parent: ${project.parent.name}` : ''}

Description:
${project.description || 'No description'}
    `.trim();

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  private async listProjectMemberships(args: any) {
    const response = await this.redmine.get(`/projects/${args.project_id}/memberships.json`);
    const memberships = response.data.memberships;

    if (memberships.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No members found for project #${args.project_id}`,
          },
        ],
      };
    }

    const text = memberships
      .map((m: any) => {
        const user = m.user ? `${m.user.name}` : m.group ? `${m.group.name} (group)` : 'Unknown';
        const roles = m.roles.map((r: any) => r.name).join(', ');
        return `ID ${m.id}: ${user} - ${roles}`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Members for project #${args.project_id}:\n\n${text}`,
        },
      ],
    };
  }

  private async addProjectMember(args: any) {
    const membership: any = {
      user_id: args.user_id,
      role_ids: args.role_ids,
    };

    await this.redmine.post(`/projects/${args.project_id}/memberships.json`, { membership });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Added user #${args.user_id} to project #${args.project_id}`,
        },
      ],
    };
  }

  private async bulkUpdateIssues(args: any) {
    const issue: any = {};
    if (args.tracker_id) issue.tracker_id = args.tracker_id;
    if (args.status_id) issue.status_id = args.status_id;
    if (args.priority_id) issue.priority_id = args.priority_id;
    if (args.assigned_to_id) issue.assigned_to_id = args.assigned_to_id;
    if (args.fixed_version_id) issue.fixed_version_id = args.fixed_version_id;
    if (args.notes) issue.notes = args.notes;

    const results: any[] = [];
    const errors: any[] = [];

    for (const issueId of args.issue_ids) {
      try {
        await this.redmine.put(`/issues/${issueId}.json`, { issue });
        results.push(issueId);
      } catch (error: any) {
        errors.push({ id: issueId, error: error.message });
      }
    }

    const summary = [
      `✅ Updated ${results.length} of ${args.issue_ids.length} issues`,
      results.length > 0 ? `\nSuccessful: ${results.join(', ')}` : '',
      errors.length > 0 ? `\nFailed: ${errors.map(e => `#${e.id} (${e.error})`).join(', ')}` : '',
    ].filter(Boolean).join('');

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  }

  private async listIssueStatuses() {
    const response = await this.redmine.get('/issue_statuses.json');
    const statuses = response.data.issue_statuses;

    const text = statuses
      .map((s: any) => `ID ${s.id}: ${s.name}${s.is_closed ? ' (closed)' : ''}${s.is_default ? ' (default)' : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available statuses:\n\n${text}`,
        },
      ],
    };
  }

  private async listTrackers() {
    const response = await this.redmine.get('/trackers.json');
    const trackers = response.data.trackers;

    const text = trackers
      .map((t: any) => `ID ${t.id}: ${t.name}${t.is_default ? ' (default)' : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available trackers:\n\n${text}`,
        },
      ],
    };
  }

  private async listIssuePriorities() {
    const response = await this.redmine.get('/enumerations/issue_priorities.json');
    const priorities = response.data.issue_priorities;

    const text = priorities
      .map((p: any) => `ID ${p.id}: ${p.name}${p.is_default ? ' (default)' : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available priorities:\n\n${text}`,
        },
      ],
    };
  }

  private async getTimeEntries(args: any) {
    const params: any = {
      limit: args.limit || 25,
    };
    if (args.issue_id) params.issue_id = args.issue_id;
    if (args.project_id) params.project_id = args.project_id;
    if (args.user_id) params.user_id = args.user_id;
    if (args.from) params.from = args.from;
    if (args.to) params.to = args.to;

    const response = await this.redmine.get('/time_entries.json', { params });
    const entries = response.data.time_entries;

    if (entries.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No time entries found',
          },
        ],
      };
    }

    const totalHours = entries.reduce((sum: number, e: any) => sum + e.hours, 0);
    const text = entries
      .map((e: any) => `${e.spent_on} - ${e.hours}h - ${e.user.name} - Issue #${e.issue.id}: ${e.comments || '(no comment)'}${e.activity ? ` [${e.activity.name}]` : ''}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${entries.length} time entries (${totalHours}h total):\n\n${text}`,
        },
      ],
    };
  }

  private async addWatcher(args: any) {
    await this.redmine.post(`/issues/${args.issue_id}/watchers.json`, {
      user_id: args.user_id,
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Added user #${args.user_id} as watcher to issue #${args.issue_id}`,
        },
      ],
    };
  }

  private async removeWatcher(args: any) {
    await this.redmine.delete(`/issues/${args.issue_id}/watchers/${args.user_id}.json`);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Removed user #${args.user_id} as watcher from issue #${args.issue_id}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Redmine MCP server running on stdio');
  }
}

const server = new RedmineMCPServer();
server.run().catch(console.error);
