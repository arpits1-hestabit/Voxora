# Knowledge Base

This document explains how knowledge ingestion and retrieval context work in Voxora.

## Goal

- Let each agent answer using grounded source material.
- Keep ownership boundaries strict by user and agent.
- Build retrieval-ready chunks with embeddings.

## Data tables involved

- `knowledge_base` for source-level records.
- `knowledge_chunks` for chunk-level retrieval rows.
- `agents` for ownership validation.

## Ingestion route

- Endpoint: `POST /api/knowledge/ingest`.
- Requires authenticated user.
- Validates target agent ownership.

## Ingestion inputs

- `agentId`
- `name`
- `type`
- `content`
- Optional `url`

## Supported source markers

- `txt`
- `pdf`
- `docx`
- `url`

## Type-specific behavior

### TXT

- Content is used directly as plain text.

### PDF

- Content is expected as base64 payload.
- Server extracts text before chunking.

### DOCX

- Current UI uses placeholder content path.
- Full parser integration remains future work.

### URL

- Current UI stores URL with placeholder extracted text.
- Full web scraping is not implemented in current flow.

## Chunking strategy

- Source content is normalized.
- Content is split into chunk windows.
- Default chunk parameters are `800` with `120` overlap.
- Chunks keep source linkage metadata.

## Embedding strategy

- Each chunk embedding is generated asynchronously.
- Embeddings are stored as JSONB.
- Metadata captures source name, type, and URL.

## Retrieval-time context building

- Voice route loads up to recent knowledge rows.
- Voice route also loads chunk embeddings.
- Query embedding is generated from user turn plus recent context.
- Similarity ranking selects top chunks.
- Result is assembled into bounded context text.

## Retrieval fallback

- If vector ranking yields no candidates, token overlap fallback is used.
- Fallback ranks full source rows by lexical overlap.

## Context output constraints

- Context includes source labels and optional URL.
- Context size is capped to avoid prompt bloat.
- Content excerpts are truncated per block.

## Ownership and security

- User can ingest only for owned agents.
- RLS policies prevent cross-user knowledge access.
- Chunk rows inherit agent ownership boundaries.

## Delete behavior

- Deleting source rows from `knowledge_base` removes parent records.
- Chunk rows tied by foreign key cascade are removed automatically.

## Operational caveats

- Embedding provider outages trigger fallback embedding path.
- Placeholder content can reduce answer quality.
- Large source uploads increase ingestion latency.

## Data quality guidelines

- Prefer clean text extraction before ingestion.
- Keep source names meaningful for citations.
- Avoid duplicate uploads when possible.
- Verify chunk counts after each ingest action.

## Monitoring recommendations

- Track ingest success and failure rates.
- Track average ingest latency by source type.
- Track chunk insert failure events.
- Track retrieval context size distribution.

## Troubleshooting checklist

- Validate agent ownership and auth session.
- Validate required fields are present.
- Validate PDF payload is valid base64.
- Validate embedding provider availability.
- Validate DB insert permissions and RLS.

## Future improvements

- Add DOCX parser for real text extraction.
- Add URL crawler and content sanitation pipeline.
- Add deduplication and source versioning.
- Add background jobs for heavy ingestion workloads.
