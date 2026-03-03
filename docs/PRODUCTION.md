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

## Runtime SLO suggestions

- Login success rate above agreed threshold.
- Call setup success rate above agreed threshold.
- Turn completion success rate above agreed threshold.
- Median time-to-first-response within acceptable limit.

## Daily operator checklist

- Review API error logs.
- Review provider status dashboards.
- Review auth failure trend.
- Review call completion trend.
- Review unresolved incidents and alerts.

## Weekly operator checklist

- Validate backup and restore readiness.
- Review high-latency endpoints.
- Review failed ingestion and analysis jobs.
- Rotate expiring credentials where applicable.
- Validate documentation drift against implementation.

## Incident response workflow

- Identify blast radius and affected user journey.
- Triage by priority tier.
- Apply mitigation or rollback.
- Confirm user flow recovery.
- Publish incident summary and follow-up actions.

## Common incident classes

### Auth incidents

- Symptoms: login failures, callback errors, unauthorized route spikes.
- First checks: auth provider status, callback URL config, cookie handling.

### Call setup incidents

- Symptoms: token route errors, room join failures.
- First checks: LiveKit credentials, route auth, environment values.

### STT incidents

- Symptoms: no transcript partial/final events.
- First checks: Deepgram key, websocket connectivity, mic transport settings.

### LLM incidents

- Symptoms: no token stream or malformed outputs.
- First checks: Groq key, model availability, route logs.

### TTS incidents

- Symptoms: missing or unplayable audio.
- First checks: ElevenLabs key, response status, browser playback logs.

## Rollout strategy

- Deploy to staging first.
- Validate smoke tests.
- Deploy to production during low-risk window.
- Monitor elevated metrics post-release.
- Keep rollback path pre-approved.

## Rollback strategy

- Roll back app deployment first.
- Roll back schema only when required and safe.
- Re-validate core user journey after rollback.
- Communicate status updates to stakeholders.

## Security operations

- Keep service-role and provider keys restricted.
- Rotate keys on schedule and after incidents.
- Audit route exposure and auth requirements regularly.
- Review logs for suspicious access patterns.

## Capacity planning inputs

- Calls per day and peak concurrent calls.
- Average turn count per call.
- Provider latency and quota headroom.
- Growth of `calls` and `knowledge_chunks` tables.

## Change management

- Require migration review for schema changes.
- Require route ownership for API changes.
- Require docs update in same release.
- Track versioned release notes.

## Escalation ownership

- Product owner: user-impact decisions.
- Backend owner: route and schema issues.
- Platform owner: environment and secret issues.
- Support owner: communication and customer triage.

## Production acceptance checklist

- Auth works end-to-end.
- Call path works end-to-end.
- Transcript persistence verified.
- Analytics generation verified.
- Knowledge ingest verified.
- Template workflows verified.
- Monitoring and alerts verified.
