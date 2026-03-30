# LB Response API

[![CI](https://github.com/the-coll-org/lbresponse-api/actions/workflows/ci.yml/badge.svg)](https://github.com/the-coll-org/lbresponse-api/actions/workflows/ci.yml)
[![CodeQL](https://github.com/the-coll-org/lbresponse-api/actions/workflows/codeql.yml/badge.svg)](https://github.com/the-coll-org/lbresponse-api/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Backend API for the **Lebanon Crisis Response Platform**. Built with **Express**, **TypeScript**, and **Firebase Admin SDK**.

---

## What Does This Project Do?

This is the backend API that powers the [lbresponse-web](https://github.com/the-coll-org/lbresponse-web) frontend. It connects to **Firebase Firestore** to read and serve crisis-response data through REST endpoints.

---

## Prerequisites

Before you begin, make sure you have the following installed on your machine:

| Tool    | Version | How to check       | Install guide                       |
| ------- | ------- | ------------------ | ----------------------------------- |
| Node.js | 20+     | `node --version`   | https://nodejs.org                  |
| npm     | 9+      | `npm --version`    | Comes with Node.js                  |
| Git     | any     | `git --version`    | https://git-scm.com                 |
| Docker  | any     | `docker --version` | https://docs.docker.com/get-docker/ |

> **Note:** Docker is **optional**. You can run the project without it. See both options below.

> **Tip:** If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use 20` to switch to Node 20.

---

## Getting Started

### Option A: Run Without Docker (Recommended for Development)

#### 1. Clone the repository

```bash
git clone https://github.com/the-coll-org/lbresponse-api.git
cd lbresponse-api
```

#### 2. Install dependencies

```bash
npm install
```

This also sets up [Husky](https://typicode.github.io/husky/) pre-commit hooks automatically.

#### 3. Set up Firebase credentials

You need a Firebase service account key file. Ask a project maintainer for the `service-account.json` file, then place it in the project root:

```
lbresponse-api/
├── service-account.json   <-- place it here
├── src/
├── package.json
└── ...
```

> **Important:** This file contains secrets. It is gitignored and must **never** be committed.

#### 4. Set up your environment

```bash
cp .env.example .env
```

The `.env` file contains:

| Variable                         | What it does                                 | Default / Example                                               |
| -------------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| `PORT`                           | Port the server runs on                      | `3000`                                                          |
| `NODE_ENV`                       | Environment mode                             | `development`                                                   |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to the Firebase service account JSON    | `./service-account.json`                                        |
| `FIREBASE_PROJECT_ID`            | Firebase project ID (alternative to JSON)    | `lbresponse-db`                                                 |
| `FIREBASE_CLIENT_EMAIL`          | Firebase service account email (alternative) | `firebase-adminsdk-fbsvc@lbresponse-db.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY`           | Firebase private key (alternative)           | _(get from service account JSON)_                               |

> **Which method?** Use `GOOGLE_APPLICATION_CREDENTIALS` for local development (just point to the JSON file). Use the individual env vars for Docker and production deployments.

#### 5. Start the dev server

```bash
npm run dev
```

The server starts at **http://localhost:3000** with hot-reload (restarts when you save files).

#### 6. Verify it works

Open your browser or use curl:

```bash
# Basic health check
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}

# Firebase connection check
curl http://localhost:3000/health/firebase
# Expected: {"status":"ok","firebase":"connected","collections":[...]}

# API status
curl http://localhost:3000/api/status
# Expected: {"name":"lbresponse-api","version":"1.0.0","uptime":...,"environment":"development"}
```

---

### Option B: Run With Docker

#### 1. Clone and set up environment

```bash
git clone https://github.com/the-coll-org/lbresponse-api.git
cd lbresponse-api
cp .env.example .env
```

Edit `.env` and fill in the Firebase env vars (individual variables, not the JSON file path):

```env
PORT=3000
NODE_ENV=production
FIREBASE_PROJECT_ID=lbresponse-db
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@lbresponse-db.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

#### 2. Build and run

```bash
# Using docker compose (recommended)
docker compose up --build

# Or manually
docker build -t lbresponse-api .
docker run -p 3000:3000 --env-file .env lbresponse-api
```

The server starts at **http://localhost:3000**.

---

## All Available Scripts

Run these from the project root:

| Command                 | What it does                                            |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev`           | Start dev server with hot-reload (nodemon + ts-node)    |
| `npm run build`         | Compile TypeScript to JavaScript in `dist/`             |
| `npm start`             | Run the compiled production server from `dist/`         |
| `npm run lint`          | Check code for errors and security issues with ESLint   |
| `npm run format`        | Auto-format all source files with Prettier              |
| `npm run format:check`  | Check if files are formatted (no changes, just reports) |
| `npm run type-check`    | Run TypeScript compiler to catch type errors            |
| `npm run test`          | Run unit and integration tests once                     |
| `npm run test:watch`    | Run tests in watch mode (re-runs on file changes)       |
| `npm run test:coverage` | Run tests and generate a coverage report                |
| `npm run knip`          | Find unused code, exports, and dependencies             |

---

## Project Structure

```
lbresponse-api/
├── src/
│   ├── __tests__/           # All tests
│   │   ├── health.test.ts   #   Unit tests for health endpoints
│   │   ├── api.test.ts      #   Integration tests for API endpoints
│   │   └── e2e.test.ts      #   End-to-end test skeletons
│   ├── config/
│   │   └── firebase.ts      # Firebase Admin SDK initialization
│   ├── controllers/         # Route handler functions (add yours here)
│   ├── middleware/           # Express middleware (auth, logging, etc.)
│   ├── models/              # Data models and types
│   ├── routes/              # Route definitions (add yours here)
│   ├── utils/               # Utility/helper functions
│   ├── app.ts               # Express app setup (routes, middleware)
│   └── index.ts             # Server entry point (starts listening)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml           # CI: lint, format, type-check, test, build
│   │   └── codeql.yml       # Security scanning
│   ├── ISSUE_TEMPLATE/      # Bug report and feature request forms
│   └── pull_request_template.md
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose configuration
├── .dockerignore            # Files excluded from Docker builds
├── eslint.config.mjs        # ESLint configuration (with security rules)
├── vitest.config.ts         # Vitest test runner configuration
├── tsconfig.json            # TypeScript configuration
├── commitlint.config.mjs    # Commit message rules
├── .env.example             # Environment variable template
└── package.json
```

### Where to Put New Code

| You want to...         | Put it in...       | Example                                 |
| ---------------------- | ------------------ | --------------------------------------- |
| Add a new API endpoint | `src/routes/`      | `src/routes/incidents.ts`               |
| Add business logic     | `src/controllers/` | `src/controllers/incidentController.ts` |
| Add a middleware       | `src/middleware/`  | `src/middleware/auth.ts`                |
| Add a data model/type  | `src/models/`      | `src/models/Incident.ts`                |
| Add a helper function  | `src/utils/`       | `src/utils/formatDate.ts`               |
| Add a test             | `src/__tests__/`   | `src/__tests__/incidents.test.ts`       |

---

## API Endpoints

| Method | Path               | Description                                      |
| ------ | ------------------ | ------------------------------------------------ |
| GET    | `/health`          | Basic health check — returns `{"status": "ok"}`  |
| GET    | `/health/firebase` | Checks Firebase connection and lists collections |
| GET    | `/api/status`      | Returns API name, version, uptime, environment   |

---

## Firebase

The API uses [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) to connect to **Firestore**.

**How to use Firestore in your code:**

```typescript
import { db } from '../config/firebase';

// Read a document
const doc = await db.collection('incidents').doc('abc123').get();

// Query documents
const snapshot = await db
  .collection('incidents')
  .where('status', '==', 'active')
  .get();

// Write a document
await db.collection('incidents').add({
  title: 'New incident',
  createdAt: new Date(),
});
```

> **Reference:** See [Firestore documentation](https://firebase.google.com/docs/firestore) for the full API.

---

## Testing

Tests live in `src/__tests__/` and use [Vitest](https://vitest.dev/) with [Supertest](https://github.com/ladjs/supertest) for HTTP assertions.

The Express app is separated into `src/app.ts` (the app object) and `src/index.ts` (the server startup). This lets tests import the app without starting the server.

```bash
# Run all tests once
npm run test

# Run in watch mode (re-runs when files change — great for development)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

**To write a new test:**

```typescript
// src/__tests__/myEndpoint.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /my-endpoint', () => {
  it('should return 200', async () => {
    const res = await request(app).get('/my-endpoint');
    expect(res.status).toBe(200);
  });
});
```

---

## Docker

The Dockerfile uses a **multi-stage build** for small, secure images:

1. **Builder stage** — installs all dependencies and compiles TypeScript
2. **Runner stage** — copies only the compiled JavaScript and production dependencies, runs as a non-root user

Test files (`*.test.ts`, `*.spec.ts`) are excluded from the Docker image via `.dockerignore`.

---

## Code Quality

This project enforces quality at multiple levels:

| When               | What runs                                       | Tool                |
| ------------------ | ----------------------------------------------- | ------------------- |
| You save a file    | Nothing automatic — run `npm run lint` manually | ESLint              |
| You stage a commit | Lint + format on staged files                   | husky + lint-staged |
| You write a commit | Commit message format is validated              | commitlint          |
| You push / open PR | Full CI: lint, format, types, test, build       | GitHub Actions      |
| Weekly + on push   | Security vulnerability scanning                 | CodeQL              |

**ESLint includes:**

- TypeScript type-aware rules (catches floating promises, unsafe `any`, etc.)
- `eslint-plugin-security` (catches unsafe regex, eval, non-literal require, etc.)
- Prettier integration (formatting errors show as lint errors)

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/). Your commit messages must follow this pattern:

```
type: short description
```

**Common types:**

| Type       | When to use                          | Example                                 |
| ---------- | ------------------------------------ | --------------------------------------- |
| `feat`     | New feature                          | `feat: add incident reporting endpoint` |
| `fix`      | Bug fix                              | `fix: handle Firebase timeout`          |
| `docs`     | Documentation only                   | `docs: update API endpoints table`      |
| `style`    | Formatting, no logic change          | `style: fix indentation`                |
| `refactor` | Code change that isn't a fix or feat | `refactor: extract auth middleware`     |
| `test`     | Adding or fixing tests               | `test: add health endpoint tests`       |
| `chore`    | Tooling, deps, config                | `chore: upgrade express to v5`          |

---

## Troubleshooting

### "Cannot find module 'dotenv/config'"

Run `npm install` — you're missing dependencies.

### "Firebase: Error: Could not load the default credentials"

Make sure either:

- `service-account.json` exists in the project root, **or**
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are set in `.env`

### "Port 3000 is already in use"

Something else is using port 3000. Either stop it or change `PORT` in your `.env` file.

### "Docker build fails"

Make sure Docker is running (`docker info`). If it's a memory issue, try `docker system prune` to free space.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

**Quick version:**

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run checks: `npm run lint && npm run test && npm run build`
5. Commit with a conventional message
6. Open a Pull Request

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## License

MIT License. See [LICENSE](LICENSE) for details.
