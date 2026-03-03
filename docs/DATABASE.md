# Database

This document summarizes the production data model used by Voxora.

## Platform basics

- PostgreSQL managed by Supabase.
- UUID primary keys.
- UTC timestamps.
- RLS enabled for user-facing tables.

## Identity tables

### `profiles`

- User profile projection of auth users.
- Primary key references `auth.users.id`.
- Created by trigger on auth user insert.

## Agent and template tables

### `agents`

- Core runtime assistant configuration.
- Owned by `user_id`.

### `agent_templates`

- Reusable template definitions.
- Supports private, public, and system templates.

### `template_knowledge`

- Source records linked to templates.
- Copied into agent knowledge on create-from-template.

## Knowledge tables

### `knowledge_base`

- Source-level knowledge store per agent.
- Supports text, PDF, DOCX, and URL markers.

### `knowledge_chunks`

- Chunk-level retrieval rows.
- Stores `chunk_text`, `embedding` JSONB, and metadata JSONB.
- Linked to both source row and agent row.

## Call and analytics tables

### `calls`

- Call session state and transcript store.
- Transcript is JSONB array of turn entries.
- Metadata stores timing and analytics values in current flow.

### `call_analytics`

- Structured analytics table exists.
- Current runtime writes analytics to `calls.metadata`.

## Key relationships

- User owns many agents and calls.
- Agent owns many knowledge sources.
- Knowledge source owns many chunks.
- Template owns many template knowledge rows.

## RLS intent

- Users can read and write only owned rows.
- Knowledge and chunks inherit agent ownership checks.
- Templates follow accessibility policy logic.

## Template visibility rules

- `is_system = true` visible globally.
- `is_public = true` visible in marketplace.
- `owner_id = auth.uid()` visible to owner.

## Indexed access paths

- Owner id indexes for scoped listing.
- Agent id indexes for knowledge and calls.
- Created-at indexes for call recency.
- Chunk indexes for retrieval support.

## Write lifecycles

### Start call

- Insert `calls` row with `in_progress` status.

### End call

- Update status, duration, transcript, and end metadata.

### Analyze call

- Update `calls.metadata` analysis fields.

### Ingest knowledge

- Insert source in `knowledge_base`.
- Insert chunk rows in `knowledge_chunks`.

## Data integrity safeguards

- Foreign keys enforce parent-child links.
- Cascading delete cleans dependent rows.
- Updated-at triggers maintain audit timestamps.

## Current tradeoffs

- Metadata analytics is flexible but less normalized.
- Transcript full-row updates are simple but race-sensitive.
- JSONB embeddings are easy to store but not vector-index optimized.

## Operational recommendations

- Monitor growth of `calls` and `knowledge_chunks`.
- Keep migrations and docs synchronized.
- Revisit analytics normalization strategy over time.
- Add append-only transcript events if concurrency grows.

## Validation checklist

- Verify all expected tables exist.
- Verify expected RLS policies exist.
- Verify triggers for profile creation and updated-at.
- Verify ingestion creates chunk rows correctly.
