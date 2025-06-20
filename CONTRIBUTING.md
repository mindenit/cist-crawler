# Contributing to CIST Crawler

First off, thanks for taking the time to contribute! ♥

The following is a set of guidelines for contributing to CIST Crawler. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents

[Code of Conduct](#code-of-conduct)

[How Can I Contribute?](#how-can-i-contribute)

- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Your First Code Contribution](#your-first-code-contribution)
- [Pull Requests](#pull-requests)

[Styleguides](#styleguides)

- [Git Commit Messages](#git-commit-messages)
- [JavaScript/TypeScript Styleguide](#javascripttypescript-styleguide)

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for CIST Crawler. Following these guidelines helps maintainers understand your report, reproduce the behavior, and find related reports.

Before creating bug reports, please check if the same issue already exists in the [list of issues](https://github.com/mindenit/cist-crawler/issues). If you don't find the issue there, create a new one including a description of the problem.

#### How Do I Submit A (Good) Bug Report?

Bugs are tracked as [GitHub issues](https://github.com/mindenit/cist-crawler/issues). When you create an issue, please provide the following information:

- **Use a clear and descriptive title** for the issue
- **Describe the exact steps to reproduce the problem** with as much detail as possible
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected to see instead
- **Include screenshots or animated GIFs** if possible
- **Include your environment information** (browser, OS, etc.)

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for CIST Crawler, including completely new features and minor improvements to existing functionality.

#### How Do I Submit A (Good) Enhancement Suggestion?

Enhancement suggestions are also tracked as [GitHub issues](https://github.com/mindenit/cist-crawler/issues). When creating an enhancement suggestion, please provide the following information:

- **Use a clear and descriptive title** for the issue
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **Include examples of how the feature would work, if applicable**

### Your First Code Contribution

Unsure where to begin contributing to CIST Crawler? You can start by looking through `beginner-friendly` and `help-wanted` issues:

- [Beginner-friendly issues](https://github.com/mindenit/cist-crawler/labels/beginner-friendly) - issues which should only require a few lines of code and a basic understanding of the project
- [Help wanted issues](https://github.com/mindenit/cist-crawler/labels/help-wanted) - issues that might require a bit more involvement

### Pull Requests

Follow these steps to have your contribution considered by the maintainers:

1. Create a feature branch from `main`
2. Follow the [styleguides](#styleguides)
3. Make your changes
4. Submit a pull request to the `main` branch
5. After you submit your pull request, verify that all status checks are passing

While the prerequisites above must be satisfied prior to having your pull request reviewed, the reviewer(s) may ask you to complete additional work or changes before your pull request can be ultimately accepted.

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Use Conventional Commits format: `<type>: <description>`

#### Allowed types:

- `docs` - documentation
- `feat` - new feature
- `fix` - bug fix
- `refactor` - reorganization without breaking changes and new features
- `community` - editing community files such as `README.md`
- `deps` - updating dependencies
- `chore` - updating build process, CI, or any other minor changes.

#### Style for description:

- Only use English language
- Don't capitalize first letter
- Use imperative, present tense
- Don't use period (`.`) at the end

### JavaScript/TypeScript Styleguide

All JavaScript/TypeScript code is linted with ESLint and formatted with Prettier. Follow the existing code style:

- Use ES6 features
- Prefer const over let when possible
- Prefer named exports over default exports

---

Thank you for contributing to CIST Crawler!
