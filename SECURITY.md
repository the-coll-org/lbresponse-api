# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public issue.** Instead, email security concerns to the project maintainers.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |

## Security Measures

- All dependencies are monitored via GitHub Dependabot
- CodeQL analysis runs on every push and weekly
- ESLint with `eslint-plugin-security` for Node.js security patterns
- Pre-commit hooks enforce code quality
- Firebase credentials are never committed (gitignored)
- Docker runs as non-root user
