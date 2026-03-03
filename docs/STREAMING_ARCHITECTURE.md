# Streaming Architecture

This document explains the realtime voice turn architecture used in Voxora.

## Core pattern

- Client streams mic audio to Deepgram over websocket.
- Client receives interim and final transcript events.
- Final transcript is posted to backend voice route.
- Backend responds as Server-Sent Events stream.
- Client renders text tokens and plays synthesized audio.

## Why this architecture

- Keeps STT low-latency and continuous.
- Supports progressive text feedback.
- Preserves a simple HTTP route for backend orchestration.
- Keeps provider-specific logic centralized server-side.

## Runtime components

- Browser call interface.
- RealTimeVoiceClient utility.
- Deepgram websocket stream.
- Voice SSE API route.
- Groq streaming completion provider.
- ElevenLabs synthesis provider.

## Microphone ingest path

- Browser captures audio via Web Audio API.
- Input samples are Float32.
- Samples are converted to Int16 PCM.
- PCM is sent to Deepgram with `linear16` encoding.

## Turn detection path

- Deepgram interim transcript updates arrive continuously.
- Deepgram `speech_final` marks utterance completion.
- Final utterance triggers backend turn processing.

## Backend turn processing path

- Validates session and ownership.
- Loads agent config.
- Loads call row and prior transcript.
- Appends user utterance.
- Builds retrieval context from knowledge data.
- Streams LLM tokens.
- Synthesizes final text to audio.
- Persists assistant turn to transcript.

## SSE event contract

- `transcript_final`
- `llm_token`
- `audio_chunk`
- `response_complete`
- `error`

## Client event handling

- Partial transcript updates can trigger barge-in behavior.
- Final transcript appends user message.
- Token events append current agent response text.
- Audio chunk is queued for playback.
- Response complete finalizes transcript entry.

## Audio format transitions

- Mic capture: Float32 PCM.
- STT transport: Int16 PCM.
- TTS output from provider: MP3 bytes.
- App transport to UI: base64 data URL.
- Browser playback: native audio/mpeg decode.

## Barge-in behavior

- User speech during playback triggers immediate local stop.
- Audio queue is cleared and current element is paused.
- New user turn proceeds to processing.
- Current backend cancellation is partial in implementation.

## Latency contributors

- Deepgram endpointing threshold.
- LLM first-token latency.
- TTS synthesis duration.
- Network round-trip across providers.
- Browser decode and playback startup.

## Reliability safeguards

- Processing timeout guard in client utility.
- Route-level error event emission.
- Queue clearing on interruption paths.
- Logging at major stream transitions.

## Known limitations

- Route name includes websocket but transport is SSE.
- TTS playback begins after full text synthesis, not token-synced speech.
- Abort path does not fully cancel active fetch stream yet.

## Monitoring recommendations

- Track time to first transcript partial.
- Track time to speech final.
- Track time to first LLM token.
- Track time to first audio playback.
- Track turn completion success rate.

## Hardening recommendations

- Add AbortController for end-to-end stream cancellation.
- Add provider timeout and retry policies.
- Add per-route circuit breaker behavior.
- Add richer metrics for turn-level stages.

## Ownership summary

- Voice client owns capture and client stream handling.
- Voice API route owns orchestration and persistence.
- Providers own STT, language generation, and synthesis tasks.
