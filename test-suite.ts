#!/usr/bin/env node
import axios, { AxiosInstance } from 'axios';
import https from 'https';

const REDMINE_URL = process.env.REDMINE_URL || '';
const REDMINE_API_KEY = process.env.REDMINE_API_KEY || '';

if (!REDMINE_URL || !REDMINE_API_KEY) {
  console.error('❌ REDMINE_URL and REDMINE_API_KEY required');
  process.exit(1);
}

const redmine: AxiosInstance = axios.create({
  baseURL: REDMINE_URL,
  headers: { 'X-Redmine-API-Key': REDMINE_API_KEY, 'Content-Type': 'application/json' },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

let testProjectId: number;
let testIssueIds: number[] = [];
let testVersionId: number;
let testUserId: number;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error: any) {
    console.error(`❌ ${name}: ${error.message}`);
    throw error;
  }
}

async function cleanup() {
  if (testProjectId) {
    try {
      await redmine.delete(`/projects/${testProjectId}.json`);
      console.log(`🧹 Cleaned up test project #${testProjectId}`);
    } catch (e) {}
  }
}

async function runTests() {
  console.log('🧪 Starting MCP Redmine Test Suite\n');

  await test('Create test project', async () => {
    const res = await redmine.post('/projects.json', {
      project: { name: 'MCP Test Project', identifier: `mcp-test-${Date.now()}` },
    });
    testProjectId = res.data.project.id;
  });

  await test('Get project details', async () => {
    await redmine.get(`/projects/${testProjectId}.json`);
  });

  await test('Update project', async () => {
    await redmine.put(`/projects/${testProjectId}.json`, {
      project: { description: 'Test project for MCP' },
    });
  });

  await test('List projects', async () => {
    const res = await redmine.get('/projects.json');
    if (!res.data.projects.some((p: any) => p.id === testProjectId)) throw new Error('Project not found');
  });

  await test('Create version', async () => {
    const res = await redmine.post(`/projects/${testProjectId}/versions.json`, {
      version: { name: 'v1.0', status: 'open' },
    });
    testVersionId = res.data.version.id;
  });

  await test('List versions', async () => {
    await redmine.get(`/projects/${testProjectId}/versions.json`);
  });

  await test('Update version', async () => {
    await redmine.put(`/versions/${testVersionId}.json`, {
      version: { description: 'Test version' },
    });
  });

  await test('Create issue', async () => {
    const res = await redmine.post('/issues.json', {
      issue: { project_id: testProjectId, subject: 'Test Issue 1', tracker_id: 2, priority_id: 2 },
    });
    testIssueIds.push(res.data.issue.id);
  });

  await test('Create multiple issues', async () => {
    for (let i = 2; i <= 5; i++) {
      const res = await redmine.post('/issues.json', {
        issue: { project_id: testProjectId, subject: `Test Issue ${i}`, tracker_id: 2 },
      });
      testIssueIds.push(res.data.issue.id);
    }
  });

  await test('Get issue details', async () => {
    await redmine.get(`/issues/${testIssueIds[0]}.json`);
  });

  await test('Update issue', async () => {
    await redmine.put(`/issues/${testIssueIds[0]}.json`, {
      issue: { status_id: 2, notes: 'Test update' },
    });
  });

  await test('List issues', async () => {
    const res = await redmine.get('/issues.json', { params: { project_id: testProjectId } });
    if (res.data.issues.length < 5) throw new Error('Not all issues found');
  });

  await test('Bulk update issues', async () => {
    for (const id of testIssueIds.slice(0, 3)) {
      await redmine.put(`/issues/${id}.json`, { issue: { priority_id: 3 } });
    }
  });

  await test('Create issue relation', async () => {
    await redmine.post(`/issues/${testIssueIds[0]}/relations.json`, {
      relation: { issue_to_id: testIssueIds[1], relation_type: 'relates' },
    });
  });

  await test('Get issue relations', async () => {
    await redmine.get(`/issues/${testIssueIds[0]}/relations.json`);
  });

  await test('List users', async () => {
    const res = await redmine.get('/users.json');
    testUserId = res.data.users[0].id;
  });

  await test('List time entry activities', async () => {
    await redmine.get('/enumerations/time_entry_activities.json');
  });

  await test('Log time', async () => {
    await redmine.post('/time_entries.json', {
      time_entry: { issue_id: testIssueIds[0], hours: 2, comments: 'Test work' },
    });
  });

  await test('List custom fields', async () => {
    await redmine.get('/custom_fields.json');
  });

  await test('Create wiki page', async () => {
    const identifier = (await redmine.get(`/projects/${testProjectId}.json`)).data.project.identifier;
    await redmine.put(`/projects/${identifier}/wiki/TestPage.json`, {
      wiki_page: { text: 'Test content' },
    });
  });

  await test('Get wiki page', async () => {
    const identifier = (await redmine.get(`/projects/${testProjectId}.json`)).data.project.identifier;
    await redmine.get(`/projects/${identifier}/wiki/TestPage.json`);
  });

  await test('List project memberships', async () => {
    await redmine.get(`/projects/${testProjectId}/memberships.json`);
  });

  console.log(`\n✅ All tests passed! Created ${testIssueIds.length} issues in project #${testProjectId}`);
}

runTests()
  .then(() => cleanup())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error.message);
    cleanup().finally(() => process.exit(1));
  });
