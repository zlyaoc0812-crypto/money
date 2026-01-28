# AGENTS.md (Docs)

This repository hosts vanilla HTML/CSS/JS mini-games. This guideline helps agentic contributors write consistent, safe, and testable code.

Cursor & Copilot rules
- If a cursor rule set exists at ".cursor/rules/" or ".cursorrules", follow it.
- If a Copilot rule file exists at ".github/copilot-instructions.md", apply its guidance unless it conflicts with project conventions.
- If no rules exist, default to this document.

Build, Lint, Test
- No formal build pipeline for static assets; treat HTML/CSS/JS as the artifact.
- Use local validation and simple tests during development.

Run lightweight checks
- Windows/macOS/Linux: open index.html to smoke test
- Windows: start index.html
- macOS: open index.html
- Linux: xdg-open index.html

Local serving
- Python: `python -m http.server 8000`
- Node: `npx http-server -p 8000`
- Static preview: load http://localhost:8000/

Validation & Lint
- HTML validation: `html-validator *.html` (if installed)
- Lint: `npm run lint` (if configured) or `npx eslint . --ext .js,.html`.
- Type checks (TS): `npm run build:types` or `tsc --noEmit`.

Tests
- If Jest: `npm test -- -t <pattern>` to run a single test
- If Vitest: `npx vitest run -t <pattern>`
- PyTest: `pytest -k <name>`
- Example: `npm test -- -t 'Game 1 renders correctly'`

Code Style Guidelines
- This section describes conventions for code in this repo.

Imports & Modules
- Use ES modules; prefer named exports.
- Import paths are relative; include extensions (.js) when using ESM.
- Avoid circular dependencies; import at top or lazily if needed.

File Naming & Structure
- Files: kebab-case (e.g., `game-over.html`, `utils.js`).
- Directories: kebab-case.
- IDs: kebab-case; Classes: kebab-case.
- Variables: camelCase; Constants: UPPER_SNAKE_CASE; Functions: camelCase.

Formatting
- 2 spaces for indentation; semicolons; consistent line length.
- Use strict mode where relevant; ES modules are strict by default.
- Prefer const over let; avoid var.

Typing
- In JS, use JSDoc for types; in TS, use explicit types.

Error Handling
- Fail gracefully; guard against null/undefined.
- Central logger; surface user-friendly messages.

Async Patterns
- Use async/await; catch errors.
- Handle rejections with try/catch.

State & Data
- One state object per module; immutable-like updates.
- Persist settings with localStorage; guard quota errors.

DOM & Accessibility
- Keyboard accessible controls; focus outlines.
- ARIA attributes for complex widgets; meaningful roles.

Localization
- Locales in locales/; keys rather than hard-coded strings.

Testing
- Unit tests for pure functions; small, fast tests.
- Integrate with project’s test harness if present.

Debugging
- Lightweight logger; toggle via a DEBUG flag.

Performance
- Memoization; debouncing; requestAnimationFrame for loops.

Security
- Avoid eval; sanitize untrusted data.

CI & Build
- Add tests and lint to CI if needed.

Code Snippets
```js
// ES module import example
import { clamp } from './utils/math.js';
```

```html
<!-- Accessible markup -->
<header aria-label="Site header">...</header>
<main id="game-area" role="main" aria-label="Game content">...</main>
```

Next Steps
- If you want, I can wire up a minimal test harness and a GitHub Actions workflow.
- I can also add a small ESLint/Prettier config and sample npm scripts.
- Tell me which test framework you prefer (Jest, Vitest, PyTest) and I’ll tailor commands.

Naming Conventions (Detailed)
- Files: kebab-case; Extensions: .js, .css, .html.
- Exports: named exports; default only when clearly the public API.
- Event handlers: onXxx naming; DOM attributes: data- attributes with dash-case.
- CSS: custom properties with -- prefix; descriptive class names.

Appendix: Quick Examples
```js
// Import and usage example
import { clamp } from './utils/math.js';
export function limit(n, min, max) {
  return clamp(n, min, max);
}
```

```html
<button aria-label="Play game" id="play">Play</button>
```
