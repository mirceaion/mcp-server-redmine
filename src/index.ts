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
              tracker_id: { type: 'number', description: 'Tracker (1=Bug, 2=Feature, 3=Support, etc.)' },
              subject: { type: 'string', description: 'New title' },
              description: { type: 'string', description: 'New description' },
              status_id: { type: 'number', description: 'Status (1=New, 2=In Progress, 3=Resolved, 5=Closed)' },
              priority_id: { type: 'number', description: 'Priority' },
              assigned_to_id: { type: 'number', description: 'User ID to assign' },
              done_ratio: { type: 'number', description: 'Percentage complete (0-100)' },
              start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
              notes: { type: 'string', description: 'Comment to add' },
              custom_fields: { type: 'array', description: 'Custom fields array [{id: 1, value: "text"}]' },
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
        },
        {
          name: 'get_issue',
          description: 'Get details of a specific issue',
          inputSchema: {
            type: 'object',
            properties: {
              issue_id: { type: 'number', description: 'Issue ID' },
            },
            required: ['issue_id'],
          },
        },
        {
          name: 'list_projects',
          description: 'List all accessible Redmine projects',
          inputSchema: {
            type: 'object',
            properties: {},
          },
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
        },
        {
          name: 'list_time_entry_activities',
          description: 'List available time entry activities',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_custom_fields',
          description: 'List custom fields available in Redmine',
          inputSchema: {
            type: 'object',
            properties: {},
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
      tracker_id: args.tracker_id || 2,
      subject: args.subject,
      description: args.description,
      priority_id: args.priority_id || 2,
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
    if (args.tracker_id) issue.tracker_id = args.tracker_id;
    if (args.subject) issue.subject = args.subject;
    if (args.description) issue.description = args.description;
    if (args.status_id) issue.status_id = args.status_id;
    if (args.priority_id) issue.priority_id = args.priority_id;
    if (args.assigned_to_id) issue.assigned_to_id = args.assigned_to_id;
    if (args.done_ratio !== undefined) issue.done_ratio = args.done_ratio;
    if (args.start_date) issue.start_date = args.start_date;
    if (args.due_date) issue.due_date = args.due_date;
    if (args.notes) issue.notes = args.notes;
    if (args.custom_fields) issue.custom_fields = args.custom_fields;

    await this.redmine.put(`/issues/${args.issue_id}.json`, { issue });

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
      limit: args.limit || 25,
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
    const response = await this.redmine.get(`/issues/${args.issue_id}.json`);
    const issue = response.data.issue;

    const text = `
Issue #${issue.id}: ${issue.subject}
Status: ${issue.status.name}
Priority: ${issue.priority.name}
Assigned to: ${issue.assigned_to?.name || 'Unassigned'}
Created: ${issue.created_on}
Updated: ${issue.updated_on}

Description:
${issue.description || 'No description'}
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
    const weekdayHours = args.weekday_hours || 1.5;
    const weekendHours = args.weekend_hours || 3;
    const skipSundays = args.skip_sundays || false;
    
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
      limit: args.limit || 100,
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Redmine MCP server running on stdio');
  }
}

const server = new RedmineMCPServer();
server.run().catch(console.error);
