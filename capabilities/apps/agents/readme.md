# Agents Module - Developer Documentation

The Agents module is a vanilla HTML/JS application built to simulate a local agent execution environment in the cloud. It serves as an AgentX demo module.

## Architecture & Tech Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3.
- **Routing**: Client-side routing with static HTML files (`index.html`, `runner.html`, `overview.html`, `policy.html`, `sdk.html`).
- **Styling**: Uses `agents.css` and the shared Nexus top navigation system (`nexus-topnav-v2.css`).
- **State Management**: Client-side state handling to track installed packs, runs, and policies.

## Key Components
- **Store / Packs**: Simulates downloading and managing agent bundles.
- **Runner Simulator**: Simulates the execution of autonomous agents, generating mock "receipts".
- **Receipt Engine**: Generates verifiable logs of agent actions, including simulated redactions and signatures.
- **Demo Targets**: Isolated, static HTML targets for agents to safely interact with.

## Integration & DB
- This application does not connect to a persistent database in the demo phase. All state is maintained in-memory or via browser storage to provide a seamless drag-and-drop hosting experience (e.g., Netlify).

## Development Notes
- The UI mimics a desktop application experience within the browser.
- Ensure that updates to the SDK are reflected in `sdk.html`.
- New agent packs should be registered in the central catalog in `assets/js/agents.js`.
