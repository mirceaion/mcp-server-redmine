# Contributing to MCP Server for Redmine

Thank you for your interest in contributing! This project welcomes contributions from the community.

## How to Contribute

### Reporting Issues

- Check existing issues before creating a new one
- Provide clear reproduction steps
- Include your environment details (OS, Node version, Redmine version)
- Share relevant error messages and logs

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test your changes thoroughly
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/mirceaion/mcp-server-redmine.git
cd mcp-server-redmine
npm install
npm run build
```

### Testing

```bash
# Set environment variables
export REDMINE_URL="https://your-redmine.com"
export REDMINE_API_KEY="your-api-key"

# Run tests
npm test
npm run test:suite
```

### Code Style

- Use TypeScript
- Follow existing code patterns
- Add comments for complex logic
- Update documentation for new features

### Areas for Contribution

- Additional Redmine API endpoints
- Better error handling
- Performance improvements
- Documentation improvements
- Test coverage
- Bug fixes

## Questions?

Open an issue for discussion before starting major changes.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
