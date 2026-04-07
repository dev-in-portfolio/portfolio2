# Coverage Compass - Developer Documentation

Coverage Compass is a purely client-side heuristic engine for Medicare decision support, focused on user privacy and accessibility.

## Architecture & Tech Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3.
- **Logic Engine**: `engine.js` contains the core scoring algorithms and heuristics for evaluating user profiles against Medicare structures.
- **UI Logic**: `app.js` handles the interactive questionnaire flow, state transitions, and results rendering.
- **Glossary**: `glossary.js` provides dynamic tooltips and definitions for complex Medicare terminology.

## Key Systems
- **Scoring Heuristics**: Evaluates cost predictability, provider dependency, and administrative friction.
- **State-Aware Rules**: Models specific state regulations regarding Medigap underwriting.
- **Visible Result Explanation**: The main result now surfaces a confidence banner plus a compact decision trace.
- **Profile Snapshot Comparison**: `app.js` now stores up to five local profile snapshots and diffs recommendation, confidence, and answer changes against the current state.
- **Recommendation Sensitivity Layer**: The result view now reruns the current profile with individual answers removed to rank which questions are most responsible for the current winner and which ones can flip it.
- **Audit Logging**: The engine still generates a deeper explanation trace and raw audit log for transparency.

## Performance & Accessibility (A11y)
- Strict adherence to contrast ratios and focus states (Phase 4 of CSS).
- Keyboard navigable with clear visual indicators.
- Local-first architecture ensures zero latency between questions.

## DB Integration
- Zero server communication by default to maintain strict privacy. Data is stored in `localStorage` or `sessionStorage`.
- Snapshot comparison records are stored under a separate local key so scenario memory stays local to the browser.
