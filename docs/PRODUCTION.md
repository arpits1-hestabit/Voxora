# Production Operations

This is the production runbook for operating Voxora safely.

## Objectives

- Keep call path reliable.
- Keep auth and data isolation secure.
- Detect and recover from provider failures quickly.
- Release changes with low operational risk.

## System boundaries

- Next.js app and API routes.
- Supabase database and auth.
- LiveKit room and media infrastructure.
- Deepgram STT provider.
- Groq LLM provider.
- ElevenLabs TTS provider.

## Service health priorities

- Priority 1: auth and login path.
- Priority 1: call start and token generation.
- Priority 1: transcript and turn-response loop.
- Priority 2: analytics generation.
- Priority 2: template marketplace and knowledge ingest.

## Required operational checks

- All environment values are present and correct.
- Supabase migrations are current.
- Auth callback URL is valid for production domain.
- All provider credentials are active.
- Error logs are accessible and retained.
