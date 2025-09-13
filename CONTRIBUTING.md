# Contributing to Personal Service Manager

Thank you for your interest in contributing to Personal Service Manager! This document provides guidelines and instructions for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Code Standards and Guidelines](#code-standards-and-guidelines)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Issue Reporting](#issue-reporting)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

Before contributing to this project, ensure you have the following installed:

- **Node.js** (v18.x or higher)
- **npm** or **yarn** (package managers)
- **Git** (version control)
- **Visual Studio Code** (recommended IDE with extensions)
- **Docker** (optional, for containerized development)

### Development Tools Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/teps3105/personal-service-manager.git
   cd personal-service-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development servers:**
   ```bash
   # Start backend
   npm run dev:backend
   
   # Start frontend (in another terminal)
   npm run dev:frontend
   ```

## Development Environment Setup

### Frontend Development (Vue.js)

The frontend uses Vue 3 with Composition API and Vite as the build tool.

```bash
# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

### Backend Development (Node.js + Express)

The backend uses Node.js with Express.js and connects to Supabase database.

```bash
# Install backend dependencies
cd backend
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

### Database Setup (Supabase)

1. **Create a Supabase project:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project
   - Copy the project URL and service keys

2. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Seed database with test data:**
   ```bash
   npm run db:seed
   ```

## Code Standards and Guidelines

### JavaScript/TypeScript Standards

- Use **TypeScript** for type safety
- Follow **ESLint** configuration (automated)
- Use **Prettier** for code formatting
- Prefer **const** over **let** when possible
- Use **arrow functions** for anonymous functions
- Keep functions small and focused (single responsibility)

### Vue.js Guidelines

- Use **Composition API** (Options API is deprecated)
- Follow the **Style Guide** from Vue documentation
- Use **script setup** syntax for SFCs (Single File Components)
- Properly structure components with proper separation of concerns
- Use **Pinia** for state management

### Backend Guidelines

- Use **Express.js** with middleware for API routes
- Implement proper **error handling** with custom error classes
- Use **async/await** for asynchronous operations
- Validate all input data using **Joi** or similar
- Implement proper **authentication and authorization**
- Use **logging** for debugging and monitoring

### API Design Standards

- Follow **RESTful API** principles
- Use proper **HTTP status codes**
- Implement **API versioning** (e.g., `/api/v1/`)
- Provide **OpenAPI/Swagger** documentation
- Use **CORS** configuration for cross-origin requests
- Implement **rate limiting** and **security headers**

## Git Workflow

### Branch Strategy

We use **GitHub Flow** with the following branch structure:

```
main            # Production-ready code
├── develop     # Integration branch
├── feature/*   # Feature branches
├── bugfix/*    # Bug fix branches
└── hotfix/*    # Critical bug fixes
```

### Branch Naming Conventions

```bash
# Feature branches
feature/add-user-authentication
feature/integrate-supabase
feature/vue-component-library

# Bug fix branches
bugfix/fix-login-validation
bugfix/cors-configuration

# Hotfix branches (for production issues)
hotfix/security-patch
hotfix/api-performance

# Release branches
release/v1.0.0
release/v1.1.0
```

### Commit Message Guidelines

Follow the **Conventional Commits** specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or modifying tests
- **chore**: Maintenance tasks (build, dependencies, etc.)

#### Examples

```bash
feat(auth): add user registration endpoint
fix(api): resolve cors configuration issue
docs(readme): update installation instructions
style(format): apply prettier formatting
refactor(database): optimize query performance
test(auth): add unit tests for login validation
chore(deps): update dependencies to latest versions
```

### Issue Tracking in Commits

Always reference GitHub issues in commit messages:

```bash
git commit -m "feat(auth): add user registration endpoint - Issue #123"
```

## Pull Request Process

### PR Creation Guidelines

1. **Create a feature branch from develop:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Test your changes** thoroughly:
   ```bash
   npm run test
   npm run build
   npm run lint
   ```

4. **Commit your changes** with clear messages:
   ```bash
   git add .
   git commit -m "feat(feature): description - Issue #123"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request:**
   - Go to GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Target: `develop` branch
   - Fill in the PR template

### PR Review Process

1. **Automated checks** must pass:
   - CI/CD pipeline
   - Code quality checks
   - Test coverage
   - Build validation

2. **Code review requirements:**
   - At least **one reviewer** approval
   - All comments must be addressed
   - No merge conflicts

3. **Review criteria:**
   - Code quality and readability
   - Performance implications
   - Security considerations
   - Test coverage
   - Documentation updates

### PR Template

Use the provided pull request template located at `.github/PULL_REQUEST_TEMPLATE.md`.

## Testing Guidelines

### Test Coverage Requirements

- **Minimum coverage**: 80%
- **Critical paths**: 95% coverage
- **Integration tests**: Required for API endpoints
- **E2E tests**: Required for user flows

### Test Structure

```
tests/
├── unit/           # Unit tests
│   ├── components/   # Vue component tests
│   ├── services/    # Service layer tests
│   └── utils/       # Utility function tests
├── integration/    # Integration tests
│   ├── api/         # API endpoint tests
│   └── database/    # Database integration tests
└── e2e/           # End-to-end tests
    ├── auth/        # Authentication flows
    └── workflows/   # User workflow tests
```

### Testing Tools

- **Jest** for unit and integration tests
- **Vue Test Utils** for component testing
- **Cypress** for E2E testing
- **Supertest** for API testing
- **MSW** for mocking API responses

### Writing Tests

#### Unit Tests Example
```javascript
import { render, screen } from '@testing-library/vue'
import LoginForm from '@/components/auth/LoginForm.vue'

describe('LoginForm', () => {
  it('renders login form correctly', () => {
    render(LoginForm)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })
})
```

#### Integration Tests Example
```javascript
import request from 'supertest'
import app from '@/app'

describe('Auth API', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
    
    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('token')
  })
})
```

## Issue Reporting

### Bug Reports

When reporting bugs, use the provided issue template with:

1. **Clear title** describing the bug
2. **Environment information** (OS, Node.js version, browser)
3. **Steps to reproduce** the issue
4. **Expected behavior** vs **actual behavior**
5. **Screenshots** or **error messages** if applicable

### Feature Requests

For feature requests, include:

1. **Clear description** of the requested feature
2. **Use case** and **problem statement**
3. **Proposed solution** or implementation ideas
4. **Acceptance criteria** for the feature

### Issue Templates

Use the provided issue templates:
- `bug_report.yml` for bug reports
- `feature_request.yml` for feature requests

## Release Process

### Versioning

We follow **Semantic Versioning** (SemVer):

- **Major version** (X.0.0): Breaking changes
- **Minor version** (0.X.0): New features, backward compatible
- **Patch version** (0.0.X): Bug fixes, backward compatible

### Release Checklist

1. **Update version** in `package.json`
2. **Update changelog** with release notes
3. **Create release branch** from main
4. **Run full test suite**
5. **Build and deploy** to staging
6. **Test staging deployment**
7. **Merge to main** and tag release
8. **Deploy to production**
9. **Create GitHub release**

### Changelog Format

```markdown
## [1.0.0] - 2024-01-15

### Added
- User authentication system
- Service management API
- Vue.js frontend with responsive design

### Changed
- Updated to Vue 3 Composition API
- Migrated to Supabase database

### Fixed
- CORS configuration issues
- Form validation bugs

### Deprecated
- Old authentication system (v0.x)

### Removed
- Legacy components
- Unused dependencies

### Security
- Added JWT token validation
- Implemented security headers
```

## Getting Help

If you need help with contributing:

1. **Check the documentation** in the `docs/` directory
2. **Search existing issues** on GitHub
3. **Join our discussions** on GitHub
4. **Contact maintainers** through GitHub issues

## Code of Conduct

Please note that this project has a [Code of Conduct](CODE_OF_CONDUCT.md) that all contributors are expected to follow.

---

Thank you for contributing to Personal Service Manager! 🚀