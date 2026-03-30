# Contributing to LB Response API

Thank you for your interest in contributing to the Lebanon Crisis Response Platform.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/lbresponse-api.git`
3. Install dependencies: `npm install`
4. Copy environment config: `cp .env.example .env`
5. Create a feature branch: `git checkout -b feat/your-feature`
6. Start the dev server: `npm run dev`

## Development

### Prerequisites

- Node.js 20+
- npm 9+
- Firebase service account credentials (for Firebase-related work)

### Scripts

- `npm run dev` — Start dev server with hot reload
- `npm run lint` — Run ESLint (with security rules)
- `npm run format` — Format code with Prettier
- `npm run type-check` — Run TypeScript type checking
- `npm run knip` — Check for unused code and dependencies
- `npm run build` — Compile TypeScript

### Running with Docker

```bash
docker compose up --build
```

### Code Quality

This project enforces code quality through:

- **ESLint** with type-aware rules, Prettier, and security plugin
- **Pre-commit hooks** (husky + lint-staged) that lint and format staged files
- **Commitlint** enforcing [Conventional Commits](https://www.conventionalcommits.org/)
- **CI** runs lint, format check, type check, and build on every PR

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Examples:

```
feat: add incident reporting endpoint
fix: handle Firebase connection timeout
docs: update API endpoint documentation
chore: upgrade dependencies
```

## Security

- Never commit `.env`, `service-account.json`, or any credentials
- All secrets must be loaded from environment variables
- The `eslint-plugin-security` catches common Node.js security anti-patterns

## Submitting Changes

1. Make sure all checks pass: `npm run lint && npm run format:check && npm run type-check && npm run build`
2. Commit your changes following the conventional commit format
3. Push to your fork and open a Pull Request against `main`
4. Fill in the PR template and describe your changes

## Reporting Issues

- Use the GitHub issue templates
- Include steps to reproduce for bugs
- Include relevant logs or error messages

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
