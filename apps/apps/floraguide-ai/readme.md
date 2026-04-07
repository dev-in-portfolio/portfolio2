# Flora Forensics (FloraGuide AI) - Developer Documentation

Flora Forensics is a vanilla JavaScript, local-first web application that integrates with LLM APIs (like Google Gemini) to perform botanical image analysis.

## Architecture & Tech Stack
- **Frontend**: HTML5, Tailwind CSS via CDN, Vanilla JavaScript (`floraguide.js`).
- **Styling**: Tailwind CSS for utility classes, custom CSS variables for themes, and JetBrains Mono for data displays.
- **AI Integration**: Direct client-side calls to the LLM API using user-provided API keys.
- **Backend Sync**: Uses `appdata-client.js` for debounced, local-first synchronization of user history and preferences.

## Core Logic (`floraguide.js`)
- **State Management**: A reactive state object tracks the current tab, API key, selected model, chat history, and analysis results.
- **Storage**: Heavy reliance on `localStorage` for persisting API keys (`floraguide_apiKey_v1`), models, and chat history.
- **LLM Prompting**: Constructs multipart prompts combining text and base64 encoded images, then normalizes the model response into a ranked diagnosis list with uncertainty metadata.
- **Backward Compatibility**: Older single-result dossiers are wrapped into the new ranked-candidate model at render time so history and compare continue to work.

## Security Considerations
- **API Keys**: API keys are stored in `localStorage` and NEVER synced to the remote backend (`buildBackendPayload` explicitly excludes them).
- **XSS Prevention**: Implements an `escapeHtml` utility function to sanitize AI responses before rendering them to the DOM.

## Deployment
- Netlify drag-and-drop safe. No build step required.
