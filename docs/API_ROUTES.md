# API Routes

This document describes the implemented API routes and request/response behavior.

## Active endpoints

- `POST /api/livekit/token`
- `POST /api/voice/websocket`
- `POST /api/call/analyze`
- `POST /api/knowledge/ingest`
- `GET /api/deepgram-token`

## Shared conventions

- Authenticated routes use Supabase server client.
- Validation failures return 400.
- Unauthorized requests return 401.
- Ownership and missing-resource failures return 404 where relevant.
- Provider/internal failures return 500.
- Error payloads return an `error` message.

## `POST /api/livekit/token`

Goal:

- Create room token and initialize call row.
  Required body:
- `roomName`
- `agentId`
  Auth rules:
- Requires authenticated user.
- Agent must be owned by caller.
  Behavior:
- Validate LiveKit env values.
- Build JWT with room join/publish/subscribe grants.
- Insert `calls` row with `in_progress` status.
  Response:
- `token`, `url`, `roomName`, `callId`.
  Common failures:
- Missing input, missing env, unauthorized, agent not found.

## `POST /api/voice/websocket`

Goal:

- Process one final transcript turn and stream response events.
  Required body:
- `callId`
- `agentId`
- `transcription`
  Auth rules:
- Requires authenticated user.
- Agent must be owned by caller.
- Call must exist.
  Behavior:
- Append user message into transcript context.
- Build retrieval context from `knowledge_base` and `knowledge_chunks`.
- Stream LLM tokens from Groq.
- Synthesize final text through ElevenLabs.
- Persist assistant response in call transcript.
  SSE events:
- `transcript_final`
- `llm_token`
- `audio_chunk`
- `response_complete`
- `error`
  Common failures:
- Missing input, unauthorized access, provider failures.

## `POST /api/call/analyze`

Goal:

- Generate post-call analytics from transcript.
  Required body:
- `callId`
  Auth rules:
- Requires authenticated user.
- Call must be owned by caller.
  Behavior:
- Transform transcript into plain dialogue text.
- Request structured JSON analysis from Groq.
- Save sentiment, topics, summary, key points, quality score.
- Store result in `calls.metadata`.
  Response:
- `success`
- `analytics`
  Common failures:
- Missing call id, call not found, no transcript, parse/storage failure.

## `POST /api/knowledge/ingest`

Goal:

- Store source content and create chunk embeddings.
  Required body:
- `agentId`
- `name`
- `type`
- `content`
- Optional `url`
  Auth rules:
- Requires authenticated user.
- Agent must be owned by caller.
  Behavior:
- Parse PDF payload when `type=pdf`.
- Insert source into `knowledge_base`.
- Chunk content and generate embeddings.
- Insert rows into `knowledge_chunks`.
  Response:
- `knowledge`
- `chunkCount`
  Common failures:
- Missing input, parse failure, DB insert failure.

## `GET /api/deepgram-token`

Goal:

- Return temporary Deepgram key for client usage.
  Behavior:
- Calls Deepgram key creation API with one-hour TTL.
- Returns temporary token and expiration timestamp.
  Note:
- Current implementation has no explicit auth check.


