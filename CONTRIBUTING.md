# Contributing to Platform Engineering Copilot

We love your input! We want to make contributing to Platform Engineering Copilot as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/platform-eng-copilot.git
   cd platform-eng-copilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Code Style

We use ESLint and Prettier to maintain code quality. Before submitting your PR:

1. Format your code:
   ```bash
   npm run format
   ```

2. Run the linter:
   ```bash
   npm run lint
   ```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Each commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types include:
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code
- refactor: A code change that neither fixes a bug nor adds a feature
- test: Adding missing tests or correcting existing tests
- chore: Changes to the build process or auxiliary tools

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable.
2. Update the documentation with any new environment variables, exposed ports, etc.
3. The PR may be merged once you have the sign-off of at least one other developer.

## Any Questions?

Don't hesitate to file an issue in the GitHub issue tracker if you have any questions or problems. 