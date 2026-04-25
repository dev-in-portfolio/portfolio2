# Agents Module - Developer Documentation

The Agents module is a vanilla HTML/JS application built to mirror a local agent execution environment in the browser. It serves as a control surface for packs, receipts, and a live portfolio audit path.

## Architecture & Tech Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3.
- **Routing**: Client-side routing with static HTML files (`index.html`, `runner.html`, `overview.html`, `policy.html`, `sdk.html`).
- **Styling**: Uses `agents.css` and the shared Nexus top navigation system (`nexus-topnav-v2.css`).
- **State Management**: Client-side state handling to track installed packs, runs, and policies, plus browser-local live receipts.

## Key Components
- **Store / Packs**: Simulates downloading and managing agent bundles.
- **Runner**: Launches deterministic sample tasks and the live portfolio checker.
- **Receipt Engine**: Generates verifiable logs of agent actions, including live browser audits and receipts saved in storage.
- **Demo Targets**: Isolated, static HTML targets for agents to safely interact with.

## Integration & DB
- This application does not connect to a persistent database. All state is maintained in-memory or via browser storage to provide a seamless drag-and-drop hosting experience (e.g., Netlify).

## Development Notes
- The UI mimics a desktop application experience within the browser.
- Ensure that updates to the SDK are reflected in `sdk.html`.
- New agent packs should be registered in the central catalog in `assets/js/agents.js`.
