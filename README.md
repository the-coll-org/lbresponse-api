# LB Response API

[![CI](https://github.com/the-coll-org/lbresponse-api/actions/workflows/ci.yml/badge.svg)](https://github.com/the-coll-org/lbresponse-api/actions/workflows/ci.yml)
[![CodeQL](https://github.com/the-coll-org/lbresponse-api/actions/workflows/codeql.yml/badge.svg)](https://github.com/the-coll-org/lbresponse-api/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Backend API for the Lebanon Crisis Response Platform. Built with Express, TypeScript, and Firebase Admin SDK.

## Features

- Express 5 + TypeScript
- Firebase Admin SDK (Firestore + Auth)
- Docker support with multi-stage build
- Type-aware ESLint + Prettier + security plugin with pre-commit hooks
- Conventional Commits enforced via commitlint
- Dead code detection via knip
- GitHub Actions CI + CodeQL security scanning

## Prerequisites

- Node.js 20+
- npm 9+
- Firebase service account credentials

## Getting Started

### Without Docker

```bash
# Clone the repository
git clone https://github.com/the-coll-org/lbresponse-api.git
cd lbresponse-api

# Install dependencies
npm install

# Copy env file and add your Firebase credentials
cp .env.example .env

# Start dev server (with hot reload)
npm run dev
```

The server runs at `http://localhost:3000` by default.

### With Docker

```bash
# Copy env file and add your Firebase credentials
cp .env.example .env

# Build and run
docker compose up --build

# Or build the image directly
docker build -t lbresponse-api .
docker run -p 3000:3000 --env-file .env lbresponse-api
```

## Scripts

| Script                 | Description                        |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Start dev server with nodemon      |
| `npm run build`        | Compile TypeScript to `dist/`      |
| `npm start`            | Run compiled production server     |
| `npm run lint`         | Run ESLint (with security rules)   |
| `npm run format`       | Format code with Prettier          |
| `npm run format:check` | Check formatting without writing   |
| `npm run type-check`   | Run TypeScript type checking       |
| `npm run knip`         | Check for unused code/dependencies |

## Project Structure

```
src/
  config/         # App configuration (Firebase, etc.)
  controllers/    # Route handlers
  middleware/     # Express middleware
  models/         # Data models
  routes/         # Route definitions
  utils/          # Utility functions
  index.ts        # Application entry point
```

## Firebase Configuration

The API connects to Firebase project `lbresponse-db`.

Two connection methods are supported:

**Option 1 - Service account JSON file (recommended for local dev):**

```env
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

**Option 2 - Individual environment variables (recommended for production/Docker):**

```env
FIREBASE_PROJECT_ID=lbresponse-db
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@lbresponse-db.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=<your-private-key>
```

> **Note:** Never commit `service-account.json` or `.env` files. Both are in `.gitignore`.

## API Endpoints

| Method | Path               | Description                 |
| ------ | ------------------ | --------------------------- |
| GET    | `/health`          | Basic health check          |
| GET    | `/health/firebase` | Firebase connectivity check |
| GET    | `/api/status`      | API status and uptime       |

## Docker

The Dockerfile uses a multi-stage build:

1. **Builder stage** - installs all deps, compiles TypeScript
2. **Runner stage** - copies only compiled JS + production deps, runs as non-root user

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
