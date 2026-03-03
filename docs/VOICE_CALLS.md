# Voice Calls

This document explains the user-facing voice call lifecycle in Voxora.

## User journey

- User opens agent call page.
- App validates ownership of selected agent.
- App requests LiveKit token and creates call row.
- User enables continuous mode and microphone.
- User and agent exchange turns.
- User ends call and transcript is finalized.

## Core pages and components

- Agent call page under `agents/[id]/call`.
- Call interface component with transcript and controls.
- Call detail page under `calls/[id]` for post-call review.

## Start call flow

- Generate unique room name.
- Call `POST /api/livekit/token`.
- Receive room token, room URL, and call id.
- Join LiveKit room with provided token.

## Continuous mode behavior

- Microphone remains active for continuous turn capture.
- Deepgram receives PCM frames.
- Interim and final transcripts are emitted.
- Final transcript triggers backend response generation.

## Turn processing behavior

- Final transcript is sent to voice route.
- Route streams LLM tokens and audio event.
- Client updates in-progress response text.
- Client queues and plays returned audio.
- Transcript entries are persisted to call row.

## Transcript representation

- User and agent roles are stored per entry.
- Each entry contains content and timestamp.
- Call detail page renders role-specific bubbles.

## Audio playback behavior

- TTS output is received as base64 MP3 data URL.
- Browser audio element plays `audio/mpeg`.
- Queue handles sequential playback.

## Barge-in behavior

- User speech partial event stops current playback immediately.
- Audio queue and current buffer are cleared.
- New final user transcript starts next turn.

## Mute and controls

- User can toggle microphone mute state.
- Continuous mode can be toggled on or off.
- End call action disconnects room and finalizes DB state.

## End call flow

- Stop streaming and audio playback.
- Disconnect from room.
- Compute duration from start to end time.
- Update call status to completed.
- Persist normalized transcript.
- Attempt post-call analysis when transcript exists.

## Post-call experience

- Call detail page shows status, duration, and messages.
- Analytics section shows sentiment and quality when available.
- Export and analyze actions are available by context.

## Data dependencies

- `calls` table for transcript and status.
- `agents` table for voice and model settings.
- `calls.metadata` for analysis and timing metadata.

## Failure scenarios

- Token route failure prevents room join.
- Provider errors can interrupt response generation.
- Missing keys can block STT, LLM, or TTS steps.
- Network instability can disrupt realtime stream.

## UX fallback expectations

- Transcript still reflects user turn even if TTS fails.
- Error messages are surfaced in transcript/system events.
- Call completion still writes final transcript state.

## Operational monitoring

- Track call setup success rate.
- Track median call duration.
- Track turn completion success rate.
- Track TTS playback failure events.

## Troubleshooting checklist

- Verify LiveKit token route works.
- Verify microphone permission and track publish.
- Verify Deepgram websocket connectivity.
- Verify voice route SSE stream emits expected events.
- Verify ElevenLabs key and response format.

## Improvement opportunities

- Add robust backend cancellation for interrupted turns.
- Add token-level synchronized speech synthesis.
- Add advanced turn-taking and VAD controls.
- Add richer call quality telemetry.

## Ownership summary

- Call page owns interaction and control state.
- Voice client owns stream and event integration.
- API routes own orchestration and persistence.
