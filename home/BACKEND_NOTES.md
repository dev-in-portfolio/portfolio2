# BACKEND NOTES — PRODUCTION MODE ACTIVE

## Status
Backend rendering service is considered connected and active.

Splice now operates under the assumption that:

• Video clips are uploaded to backend render endpoint.
• FFmpeg runs server-side.
• Output is H.264 MP4 with AAC audio.
• Intro/outro frames are inserted server-side.
• Music is muxed server-side.
• Final file is returned as downloadable MP4.

## Render Contract

Frontend sends:

{
  clips: [File[]],
  intro: optional frame,
  outro: optional frame,
  music: optional file,
  timeline: JSON config
}

Backend returns:

{
  status: "complete",
  fileUrl: "/renders/output_<timestamp>.mp4"
}

## Assumptions

• No client-side FFmpeg required.
• No WASM dependency.
• Static site safe.
• Netlify-compatible.
• Mobile-compatible.

## Future Expansion

• Queue system for heavy renders
• Background job status polling
• Cloud storage integration (S3/R2)
• Render history per user
• Volume normalization
• Watermark toggle
• Encoding presets (1080p / 4K)


---

App: LingoLive AI
Route: /apps/lingolive-ai/
Current Mode: Local-first; backend-ready

Needs Backend For:
- Cross-device sync (sessions, vocab, progress)
- User accounts / multi-user history
- Optional managed model proxy (hide keys, rate limiting, analytics)
- Advanced speech pipeline (server-side ASR + pronunciation scoring)

Local Fallback:
- Demo mode (deterministic scripted turns)
- Live mode (text only) via user-provided key in browser
- Speech-to-text via Web Speech API when available; otherwise manual typing
- TTS via SpeechSynthesis (browser voices)
- Storage: localStorage (messages + difficult words) with Export/Import JSON

Data Model (today):
- Message:
  {
    id: string,
    role: "user" | "model",
    text: string,
    timestamp: number,
    feedback?: {
      originalText: string,
      improvement: string,
      correction: string,
      score: number
    }
  }
- DifficultWord:
  {
    word: string,
    language: string,
    count: number,
    lastSeen: number
  }

Endpoints (future):
GET /api/lingolive/sessions
POST /api/lingolive/sessions
GET /api/lingolive/sessions/:id
PUT /api/lingolive/sessions/:id
DELETE /api/lingolive/sessions/:id

POST /api/lingolive/analyze
- Body: { language, level, text, audio?: base64 }
- Returns: { feedback, difficultWords[], phonemeNotes?, score }

Auth:
- JWT (cookie or Authorization header)
- Optional API key proxy (server stores upstream key)

Notes:
- Subfolder hosting: all assets must be relative to /apps/lingolive-ai/.
- Browser key storage is local-only; export is the durability path until backend exists.
- If model versions change, Live Mode should fail gracefully and Demo Mode remains available.


---

App: Oracle Pit
Route: /apps/oracle-pit/
Current Mode: Local-first; backend-ready

Needs Backend For:
- Cross-device sync of dilemmas, turns, verdicts
- Team/shared “council rooms” + history persistence
- True live council streaming / audio at scale (optional)
- Policy-controlled model routing + rate limiting (recommended)

Local Fallback:
- localStorage (oraclePit.state.v1, oraclePit.settings.v1)
- Deterministic local render for debate turns + verdict when backend/client-key unavailable

Data Model (current local shape):
- state:
  {
    dilemma: string,
    history: Array<{ agentId, agentName, role, text, ts }>,
    verdict: { winner: string, rationale: string, text: string },
    tension: number (0-100),
    updatedAt: number (epoch ms)
  }

Endpoints (future):
GET  /api/oracle-pit/health
POST /api/oracle-pit/turn
POST /api/oracle-pit/verdict
GET  /api/oracle-pit/sessions
POST /api/oracle-pit/sessions
PUT  /api/oracle-pit/sessions/:id
DELETE /api/oracle-pit/sessions/:id

Auth:
- JWT (preferred) or signed session token
- Rate limiting + abuse protection required if public

Notes:
- Client-key mode is supported but not recommended for public deploys.
- If browser blocks cross-origin requests (CORS/policy), app falls back cleanly to local render.


---

## LingoLive AI — Neon + Functions wiring plan (add-on)

Route: /apps/lingolive-ai/
Current Mode: Local-first; backend-present UI copy (“Connected / Ready / Synced”)

### Neon tables (proposed)
- lingolive_users
- lingolive_sessions
- lingolive_messages
- lingolive_vocab

### Minimal schemas (starter)
- lingolive_users: { id, email?, created_at }
- lingolive_sessions: { id, user_id, language, title, created_at, updated_at }
- lingolive_messages: { id, session_id, role, content, created_at }
- lingolive_vocab: { id, user_id, language, term, definition, source_session_id?, created_at }

### Netlify Functions (proposed)
- /.netlify/functions/lingolive-sessions
  - GET    ?userId=...              (list)
  - POST   (create)
  - PUT    /:id                     (update)
  - DELETE /:id                     (delete)
- /.netlify/functions/lingolive-messages
  - GET    ?sessionId=...
  - POST   (append message)
- /.netlify/functions/lingolive-generate   (model proxy)
  - POST { sessionId, language, prompt, mode }

### Auth plan
- Phase 1: anonymous user_id persisted client-side (migration-ready)
- Phase 2: JWT (or Clerk/Netlify Identity) + server-validated user_id

### Notes / gotchas
- Once live, move all model calls behind functions to avoid exposing keys.
- Keep client local fallback: if functions unreachable, queue “Sync queued” and continue local.

---

## Oracle Pit — Neon + Functions wiring plan (add-on)

Route: /apps/oracle-pit/
Current Mode: Local-first; backend-present UI copy (“Connected / Ready / Synced”)

### Neon tables (proposed)
- oracle_users
- oracle_sessions
- oracle_turns
- oracle_verdicts

### Minimal schemas (starter)
- oracle_users: { id, email?, created_at }
- oracle_sessions: { id, user_id, title, created_at, updated_at }
- oracle_turns: { id, session_id, turn_index, prompt, council_output, created_at }
- oracle_verdicts: { id, session_id, verdict, confidence, rationale, created_at }

### Netlify Functions (proposed)
- /.netlify/functions/oracle-sessions
  - GET    ?userId=...
  - POST
  - PUT    /:id
  - DELETE /:id
- /.netlify/functions/oracle-turn
  - POST { sessionId, prompt, mode }
- /.netlify/functions/oracle-verdict
  - POST { sessionId }

### Auth plan
- Phase 1: anonymous user_id persisted client-side (migration-ready)
- Phase 2: JWT + RBAC-lite (sessions scoped to user)

### Notes / gotchas
- Model calls must be server-side proxy once public.
- Keep local “Council log” as source-of-truth if sync is down; reconcile later by session_id.



---

App: SleepyStory Studio
Route: /apps/sleepystory/
Current Mode: Local-first; backend-ready

Needs Backend For:
- Multi-device sync for saved stories/bookmarks
- User accounts (optional)
- Usage tracking / rate limiting
- Secure model proxy (hide API key in production)

Local Fallback:
- localStorage (api key, bookmark, last topic)
- Export/Import JSON

Data Model (proposed):
- user { id, email?, created_at }
- story { id, user_id, title, pages[], characters[], created_at }
- bookmark { id, user_id, story_id, page_index, created_at }

Endpoints (future):
GET /api/sleepystory/stories
POST /api/sleepystory/stories
GET /api/sleepystory/stories/:id
PUT /api/sleepystory/stories/:id
DELETE /api/sleepystory/stories/:id
POST /api/sleepystory/generate (model proxy)

Auth:
- JWT or session cookie; optional anonymous mode

Notes:
- UI copy remains “Connected / Ready / Synced” while offline/local.
- Production should route model calls through Netlify Functions or a Neon-backed API.


--- 

App: SleepyStory Studio
Route: /apps/sleepystory/
Current Mode: Local-first; backend-ready

Needs Backend For:
- Multi-device sync for saved stories / bookmarks
- Optional user accounts (email/magic link)
- Usage tracking + rate limiting
- Secure model proxy (hide API key in production)
- Optional media generation (illustrations, TTS caching)

Local Fallback:
- localStorage (api key, bookmark, last topic)
- Export/Import JSON (sleepystory-export.json)

Data Model (proposed, Neon):
- sleepy_users: { id uuid, email text, created_at }
- sleepy_stories: { id uuid, user_id uuid, title text, topic text, story_json jsonb, created_at }
- sleepy_bookmarks: { id uuid, user_id uuid, story_id uuid, page_index int, updated_at }

Endpoints (future):
GET    /api/sleepystory/stories
POST   /api/sleepystory/stories
GET    /api/sleepystory/stories/:id
PUT    /api/sleepystory/stories/:id
DELETE /api/sleepystory/stories/:id
GET    /api/sleepystory/bookmark
PUT    /api/sleepystory/bookmark

Netlify Functions mapping (suggested):
/.netlify/functions/sleepystory-generate   (POST topic -> story_json)
/.netlify/functions/sleepystory-stories    (CRUD)
/.netlify/functions/sleepystory-bookmark   (GET/PUT)

Auth:
- Phase 1: none (local-only)
- Phase 2: JWT or magic-link session cookie

Notes:
- Frontend presents “Connected • Ready • Synced” posture.
- In production, remove client-side key storage; use server-side proxy.


---

App: ToonStudio
Route: /apps/toonstudio/
Current Mode: Local-first; backend-ready
Needs Backend For: Render jobs (image/video), cloud project sync, asset storage, user accounts
Local Fallback: localStorage (project JSON) + client-side export/import
Data Model:
  Project: { id, title, style, concept, characters[], storyboard[], createdAt, updatedAt }
  RenderJob: { id, projectId, type: 'image'|'video'|'audio', prompt, status, resultUrl, createdAt }
Endpoints (future):
  GET /api/toonstudio/projects
  POST /api/toonstudio/projects
  PUT /api/toonstudio/projects/:id
  DELETE /api/toonstudio/projects/:id
  POST /api/toonstudio/render
Auth: JWT (or session cookie)
Notes: Use server-side proxy for GenAI calls; store assets in object storage; Netlify Functions can front Neon + storage.


## Generic AppData Sync (Shared)
**Endpoint:** `/api/appdata`  
**Purpose:** Simple anonymous per-browser persistence for apps that already work local-first.

**How it works**
- Each browser generates a `clientId` stored locally (`nexus_client_id_v1`).
- Apps save non-sensitive state to the backend (JSON) using `window.NexusAppData`.
- If local storage is empty, apps hydrate from backend automatically.
- **API keys are never synced** — keys stay local and users must paste their own.

**Backed by:** `nexus_appdata` table (created by running `notes/neon_schema.sql` once).

**Apps wired to this generic sync**
- Prompt Vault
- Alibi
- UBR (Ultimate Broker Routing)
- Coverage Compass
- FloraGuide AI (history/chat/model only — no keys)
- Splice

**Client helper:** `shared/appdata-client.js`
