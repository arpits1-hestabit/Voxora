# Voxora

Voice agent platform for building, running, and analyzing conversational AI calls.

## Product summary

- Create agents with prompt, voice, model, and temperature settings.
- Run realtime voice calls with STT, LLM responses, and TTS playback.
- Persist transcripts, call metadata, and analysis results.
- Ingest files and URLs into knowledge sources and chunks.
- Reuse configurations through templates and marketplace sharing.

## Tech stack

- Next.js App Router and TypeScript.
- Supabase for PostgreSQL, auth, and RLS.
- Deepgram for speech-to-text.
- Groq for language generation and analysis.
- ElevenLabs for speech synthesis.
- LiveKit for room connectivity and media session support.

## Implemented API routes

- `POST /api/livekit/token`
- `POST /api/voice/websocket`
- `POST /api/call/analyze`
- `POST /api/knowledge/ingest`
- `GET /api/deepgram-token`

## Primary runtime flow

- User starts call and receives LiveKit token.
- Mic audio is converted from Float32 to Int16 PCM.
- Audio streams to Deepgram websocket.
- Final transcript is posted to voice route.
- Voice route builds knowledge context.
- Groq streams response tokens.
- ElevenLabs returns MP3 audio.
- Browser plays base64 `audio/mpeg` data URL.
- Transcript is persisted back to call record.

## Data model overview

- `profiles` for user profile data.
- `agents` for runtime assistant configuration.
- `agent_templates` and `template_knowledge` for reusable setups.
- `knowledge_base` for source-level agent content.
- `knowledge_chunks` for retrieval text and embeddings.
- `calls` for transcript, status, duration, and metadata.
- `call_analytics` table exists for future normalization.

## Environment checklist

- Supabase URL and anon key.
- Supabase service role key.
- LiveKit API key and secret.
- LiveKit public URL.
- Deepgram API key.
- Public Deepgram key for current client path.
- Groq API key.
- ElevenLabs API key.
- Optional HuggingFace key and model override.

## Security model

- Server routes use request-scoped Supabase server client.
- Browser components use Supabase browser client.
- RLS enforces user-scoped data access.
- Route-level ownership checks protect critical writes.
- Secrets stay server-side except explicitly public keys.

## Operational notes

- Voice route naming includes websocket but transport is SSE.
- Barge-in stops local playback immediately.
- Backend cancellation for interrupted turns is partial.
- URL and DOCX ingestion currently include placeholder paths.

## Documentation map

- `docs/API_ROUTES.md`
- `docs/AUTHENTICATION.md`
- `docs/DATABASE.md`
- `docs/SCHEMA_EXPLAINED.md`
- `docs/VOICE_CALLS.md`
- `docs/STREAMING_ARCHITECTURE.md`
- `docs/KNOWLEDGE_BASE.md`
- `docs/SENTENCE_TRANSFORMERS.md`
- `docs/TEMPLATES_LIBRARY.md`
- `docs/ANALYTICS.md`
- `docs/DEPLOYMENT.md`
- `docs/PRODUCTION.md`

## Local readiness checks

- Install dependencies.
- Configure environment values.
- Apply migrations to Supabase.
- Validate auth callback behavior.
- Validate call start and call end flow.
- Validate analysis and analytics rendering.
- Validate knowledge ingest and retrieval context.

## Production readiness checks

- Verify all secrets in deployment platform.
- Verify provider connectivity and quotas.
- Verify migration state matches repository.
- Verify logs and incident response path.
- Verify rollback approach before release.

## Ownership summary

- Product flow ownership is in app pages and API routes.
- Data isolation ownership is in Supabase RLS policies.
- Operational ownership is captured in `docs/PRODUCTION.md`.
- Deployment ownership is captured in `docs/DEPLOYMENT.md`.

## Contribution note

- Keep docs updated whenever routes, schema, or call flow changes.
