# LingoLive AI - Developer Documentation

LingoLive AI is a sophisticated web application built for real-time, AI-driven language practice, utilizing modern web APIs for audio processing.

## Architecture & Tech Stack
- HTML/CSS/JavaScript with Tailwind CSS (via CDN).
- Web Audio API for voice capture and playback.
- Integration with external LLM/Audio APIs (e.g., OpenAI) for conversational capabilities.
- Lucide icons for UI elements.

## Key Systems / Components
- `lingolive.js`: The core controller managing state, API interactions, and audio flow.
- Audio Manager: Handles microphone access, audio streaming, and playback of AI responses.
- API Integration Layer: Manages requests to the backend AI services, handling authentication (API keys) and streaming responses.
- Transcript Review Layer: Derives coachable review cards from user messages that contain `feedback`, including correction markup between the original phrase and suggested version.

## Performance & Accessibility / Development Notes
- Audio latency is a critical factor; ensure the audio buffers are managed efficiently.
- The UI includes pulse animations to indicate active listening states, providing essential user feedback.
- Ensure the application handles microphone permission denials gracefully.

## Integration & DB
- Relies heavily on external AI APIs (like OpenAI's real-time API or similar LLMs).
- User API keys are stored locally in the browser (e.g., `localStorage`) and should never be transmitted to unauthorized servers.
- No dedicated internal database; state is entirely session-based or reliant on the external API.
