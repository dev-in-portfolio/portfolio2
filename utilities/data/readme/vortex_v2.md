# Vortex - Developer Documentation

Vortex is a stylized data visualization dashboard designed to mimic a high-tech trading or tracking terminal, relying heavily on CSS styling and semantic HTML structure.

## Architecture & Tech Stack
- HTML5, Vanilla JavaScript.
- Extensive Custom CSS with deep use of CSS variables for theming (`--bg`, `--accent-eth`, `--danger`).
- Typography-focused design using `JetBrains Mono`.

## Key Systems / Components
- Dashboard Layout: Uses Flexbox/Grid to create a dense, data-rich interface.
- Data Simulation Engine: JavaScript logic that mocks real-time data ticks or fetches from external APIs, updating the DOM dynamically.
- Theming Engine: Centralized CSS variables allow for instant color shifts based on asset states (good/warn/bad).

## Performance & Accessibility / Development Notes
- Frequent DOM updates (if simulating high-frequency trading data) should be batched or managed via lightweight frameworks/Vanilla JS to avoid layout thrashing.
- Ensure the high contrast ratios meet accessibility standards, even in the dark theme.
- The monospace font is critical to the layout; ensure fallback fonts are also monospaced.

## Integration & DB
- In a production scenario, this application would integrate via WebSockets to a real-time financial data provider.
- Currently operates with mocked data or simple REST API polling for demonstration purposes.
- No persistent backend database is required for the client-side portfolio build.