#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import https from 'https';

interface RedmineConfig {
  url: string;
  apiKey: string;
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
              start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
              due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
              notes: { type: 'string', description: 'Comment to add' },
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
              hours_per_day: { type: 'number', description: 'Work hours per day (default 6)' },
              skip_weekends: { type: 'boolean', description: 'Skip Saturdays and Sundays (default true)' },
            },
            required: ['project_id', 'issue_ids'],
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
    const issue: RedmineIssue = {
      project_id: args.project_id,
      tracker_id: args.tracker_id || 2,
      subject: args.subject,
      description: args.description,
      priority_id: args.priority_id || 2,
      estimated_hours: args.estimated_hours,
      parent_issue_id: args.parent_issue_id,
    };

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
    if (args.start_date) issue.start_date = args.start_date;
    if (args.due_date) issue.due_date = args.due_date;
    if (args.notes) issue.notes = args.notes;

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
    const hoursPerDay = args.hours_per_day || 6;
    const skipWeekends = args.skip_weekends !== false;
    
    // Get all issues to schedule with their estimates
    const issueDetails = await Promise.all(
      args.issue_ids.map((id: number) => this.redmine.get(`/issues/${id}.json`))
    );
    
    const issues = issueDetails.map(r => r.data.issue);
    
    // Calculate start date
    let currentDate = args.start_date 
      ? new Date(args.start_date) 
      : this.getNextWorkday(new Date());
    
    const scheduled: any[] = [];
    
    for (const issue of issues) {
      const estimatedHours = issue.estimated_hours || 4; // default 4h if not set
      const daysNeeded = Math.ceil(estimatedHours / hoursPerDay);
      
      const startDate = this.formatDate(currentDate);
      const dueDate = this.formatDate(this.addWorkdays(currentDate, daysNeeded - 1, skipWeekends));
      
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
      
      // Move to next available date (day after due date)
      currentDate = this.addWorkdays(currentDate, daysNeeded, skipWeekends);
    }
    
    const summary = scheduled
      .map(s => `#${s.id}: ${s.subject}\n  ${s.start_date} → ${s.due_date} (${s.estimated_hours}h)`)
      .join('\n\n');
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Scheduled ${scheduled.length} issues:\n\n${summary}`,
        },
      ],
    };
  }
  
  private getNextWorkday(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    
    // Skip weekends
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }
  
  private addWorkdays(date: Date, days: number, skipWeekends: boolean): Date {
    const result = new Date(date);
    let added = 0;
    
    while (added < days) {
      result.setDate(result.getDate() + 1);
      
      if (!skipWeekends || (result.getDay() !== 0 && result.getDay() !== 6)) {
        added++;
      }
    }
    
    return result;
  }
  
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Redmine MCP server running on stdio');
  }
}

const server = new RedmineMCPServer();
server.run().catch(console.error);
