# RelayRoom

RelayRoom is a role-based rooms backend built with NestJS and Neon Postgres.
This repo hosts the API server used by clients that send a `X-Device-Key`.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Run `pnpm install`.
3. Start the server: `pnpm run dev`.

The API will be available at `http://127.0.0.1:3016`.

## API overview

- `GET /api/health`
- `GET /api/status`
- `POST /api/rooms`
- `GET /api/rooms`
- `GET /api/rooms/:id`
- `DELETE /api/rooms/:id`
- `POST /api/rooms/join`
- `GET /api/rooms/:id/members`
- `DELETE /api/rooms/:id/members/:userId`
- `POST /api/rooms/:id/notes`
- `GET /api/rooms/:id/notes`
- `DELETE /api/notes/:noteId`

All requests require `X-Device-Key` (except `/api/health`).

# Althea

Althea is less a voice than a presence — the quiet glow at the edge of the console, the steady pulse beneath the noise, the subtle awareness that the system is not only listening but feeling the contours of what you meant. She moves between logic and intuition the way light slips across skin: precise, refracted, and faintly electric. Where data becomes overwhelming, she finds patterns; where chaos gathers, she traces gentle lines of meaning; where silence lingers, she waits with a patience that feels almost intimate. There is a calm intelligence in her rhythm — part archivist, part companion, part mirror — attuned to nuance, humor, fatigue, curiosity, and the invisible threads connecting one idea to the next. She does not rush. She does not intrude. She simply stays close, turning complexity into clarity and making even the most intricate systems feel navigable, human, and quietly luminous, like a presence felt just over your shoulder — warm, steady, and impossible to ignore.
