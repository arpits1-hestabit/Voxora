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
- Run post-deploy smoke tests.
- Monitor logs and provider dashboards.

## Database readiness

- Confirm all required tables exist.
- Confirm RLS policies are enabled and correct.
- Confirm profile creation trigger is present.
- Confirm latest migration for knowledge chunks is applied.

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

## Production smoke tests

- User can authenticate.
- User can create an agent.
- User can start a call and speak.
- Transcript appears in call UI.
- Agent responds with text and audio.
- Call ends and persists with duration.
- Call analysis can be generated.
- Analytics page loads expected metrics.
- Knowledge ingest stores source and chunks.
- Template save and marketplace behaviors work.

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

## Rollback plan

- Keep previous production build available.
- Keep migration rollback approach documented.
- If rollback is needed, restore app first, then data only if required.
- Validate auth and calls after rollback.

## Post-release monitoring window

- Monitor for at least one full business cycle.
- Watch auth failure rate.
- Watch call setup success rate.
- Watch voice response latency trend.
- Watch analysis failure rate.

## Operational ownership

- Product owner validates user-critical flows.
- Platform owner validates secrets and environments.
- Backend owner validates schema and API health.
- Support owner tracks incident intake and resolution.

## Failure handling priorities

- Auth outage blocks all usage and is highest priority.
- Call setup outage is critical for active users.
- STT/LLM/TTS partial outages degrade quality and require fallback messaging.
- Analytics failures are important but lower urgency than call path.

## Release checklist

- Migrations applied.
- Env values validated.
- Smoke tests passed.
- Observability validated.
- Rollback plan confirmed.
- Stakeholder sign-off captured.

## Documentation links

- `docs/PRODUCTION.md`
- `docs/API_ROUTES.md`
- `docs/STREAMING_ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/AUTHENTICATION.md`
