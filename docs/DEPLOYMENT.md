# Deployment

This document explains how to deploy Voxora safely to a production environment.

## Deployment target

- Application host: Vercel.
- Database and auth: Supabase.
- Voice and AI providers: LiveKit, Deepgram, Groq, ElevenLabs.

## Preconditions

- Production Supabase project is created.
- All external provider accounts are active.
- Domain and DNS ownership are ready.
- Team has secret management process.

## Environment inventory

- Supabase URL and anon key.
- Supabase service role key.
- LiveKit API key and secret.
- LiveKit public URL.
- Groq API key.
- ElevenLabs API key.
- Deepgram API key.
- Public Deepgram key value used by current client flow.
- Optional embedding model and HuggingFace key.

## Release sequence

- Prepare and review schema migrations.
- Apply migrations to production database.
- Configure all production environment values.
- Deploy application build.
- Monitor logs and provider dashboards.

## Database readiness

- Confirm all required tables exist.
- Confirm RLS policies are enabled and correct.
- Confirm profile creation trigger is present.

## Auth readiness

- Configure auth callback URLs for production domain.
- Verify login, register, callback, and sign-out behavior.
- Confirm server routes can read authenticated session cookies.

## Provider readiness

### LiveKit

- Verify token generation route succeeds.
- Verify room join and audio publish/subscribe works.

### Deepgram

- Verify websocket STT pipeline receives transcripts.
- Verify endpointing behavior at expected latency.

### Groq

- Verify analyze and streaming generation routes work.
- Verify JSON response integrity for analysis route.

### ElevenLabs

- Verify TTS generation returns MP3 output.
- Verify browser playback of base64 data URL audio.

## Security checks

- No server-only key appears in browser bundles.
- RLS prevents cross-user reads and writes.
- Deepgram temporary token route is reviewed for auth controls.
- Log output does not expose secrets.

## Observability checks

- Error logs are visible and searchable.
- Route failures include actionable context.
- Provider errors are distinguishable by source.
- Basic latency signals are captured for critical routes.

