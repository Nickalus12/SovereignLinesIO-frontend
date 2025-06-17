# Contributing to Sovereign Lines Frontend

Thank you for your interest in contributing to Sovereign Lines! This document provides guidelines for contributing to the frontend repository.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/SovereignLinesIO.git`
3. Add upstream remote: `git remote add upstream https://github.com/Nickalus12/SovereignLinesIO.git`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Process

### 1. Before You Start

- Check existing issues and pull requests
- Discuss major changes in an issue first
- Ensure your idea aligns with the project's goals

### 2. Making Changes

- Follow the existing code style
- Write meaningful commit messages
- Keep commits focused and atomic
- Add tests for new functionality
- Update documentation as needed

### 3. Code Style Guidelines

```javascript
// Use descriptive variable names
const playerTerritoryCount = territories.length; // Good
const n = territories.length; // Bad

// Document complex logic
// Calculate the optimal path considering terrain penalties
const path = calculatePath(start, end, terrainMap);

// Use early returns to reduce nesting
if (!player.isActive) {
    return;
}

// Continue with active player logic...
```

### 4. Testing

- Run all tests: `npm test`
- Add tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage

### 5. Submitting a Pull Request

1. Update your branch with latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

3. Create a pull request with:
   - Clear title and description
   - Reference to related issues
   - Screenshots for UI changes
   - List of testing performed

## What We're Looking For

### High Priority
- Performance improvements
- Bug fixes
- Accessibility enhancements
- Mobile responsiveness
- Documentation improvements

### Good First Issues
- UI polish and animations
- Tooltip improvements
- Settings menu enhancements
- Language translations
- Unit tests

### Features Needing Discussion
- Major gameplay changes
- New game modes
- Large architectural changes

## Review Process

1. Automated tests must pass
2. Code review by maintainers
3. Testing in staging environment
4. Merge to develop branch
5. Periodic releases to main branch

## Development Tips

### Running Locally
```bash
npm start           # Start dev server
npm test           # Run tests
npm run lint       # Check code style
npm run build      # Production build
```

### Debugging
- Use Chrome DevTools for debugging
- Enable source maps in webpack config
- Use `console.log` sparingly (remove before PR)
- Performance profiling for render optimizations

### Common Pitfalls
- Forgetting to test on different screen sizes
- Not considering touch controls
- Memory leaks from event listeners
- Inefficient render loops

## Questions?

- Join our [Discord](https://discord.gg/sovereign-lines)
- Check the [Wiki](https://wiki.sovereignlines.io)
- Ask in the GitHub issue

Thank you for contributing to Sovereign Lines!