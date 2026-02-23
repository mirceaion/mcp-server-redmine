# Test Suite

Comprehensive test battery for MCP Redmine Server functionality.

## Running Tests

```bash
npm run build
npm run test:suite
```

## What It Tests

### Project Management
- ✅ Create project
- ✅ Get project details
- ✅ Update project
- ✅ List projects
- ✅ List project memberships

### Version Management
- ✅ Create version
- ✅ List versions
- ✅ Update version

### Issue Management
- ✅ Create issue
- ✅ Create multiple issues
- ✅ Get issue details
- ✅ Update issue
- ✅ List issues
- ✅ Bulk update issues

### Issue Relations
- ✅ Create issue relation
- ✅ Get issue relations

### Time Tracking
- ✅ Log time
- ✅ List time entry activities

### Wiki
- ✅ Create wiki page
- ✅ Get wiki page

### Metadata
- ✅ List users
- ✅ List custom fields

## Test Flow

1. Creates a test project with unique identifier
2. Runs all functionality tests
3. Cleans up test project on completion
4. Reports success/failure for each test

## Environment Variables

Same as main application:
- `REDMINE_URL` - Your Redmine instance URL
- `REDMINE_API_KEY` - Your Redmine API key

## Notes

- Test project is automatically deleted after tests complete
- Tests run sequentially to avoid race conditions
- Each test is independent and reports individual status
