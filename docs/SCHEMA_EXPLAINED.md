# Schema Explained

This document explains what each major table represents and how records move across the system.

## Identity tables

### `auth.users`

- Supabase-managed authentication identities.
- Not directly edited by application routes.

### `profiles`

- Application-facing user profile information.
- Auto-created from auth trigger.
- Primary key equals auth user id.

## Agent and template tables

### `agents`

- One row per runnable voice agent.
- Holds behavior and model settings.
- Owned by exactly one user.

### `agent_templates`

- Reusable blueprint rows.
- Can be system, marketplace, or private.
- Used to bootstrap new agents quickly.

### `template_knowledge`

- Source assets attached to templates.
- Copied to agent knowledge when creating from template.

## Knowledge tables

### `knowledge_base`

- Source-level store for an agent.
- Each row is a file, URL source, or pasted content.
- Maintains source metadata and full content.

### `knowledge_chunks`

- Chunk-level store derived from `knowledge_base`.
- Holds retrieval text and embedding vector payload.
- Supports vector similarity ranking and context assembly.

## Call tables

### `calls`

- Session-level call record.
- Stores status transitions and duration.
- Stores transcript JSONB array.
- Stores analytics metadata in current implementation.

### `call_analytics`

- Structured analytics table.
- Not primary write target in current route logic.

## Relationship map

- User owns many agents.
- User owns many calls.
- Agent owns many knowledge sources.
- Knowledge source owns many chunks.
- Template owns many template knowledge rows.

## Lifecycle by user action

### Create agent

- Inserts one row in `agents`.

### Save template

- Inserts one row in `agent_templates`.

### Create from template

- Inserts agent row.
- Copies template knowledge into `knowledge_base`.

### Ingest knowledge

- Inserts source into `knowledge_base`.
- Inserts chunks into `knowledge_chunks`.

### Start call

- LiveKit token route inserts call row as `in_progress`.

### Process turn

- Voice route appends transcript entries and updates call transcript.

### End call

- Call page updates status to `completed` and writes duration.

### Analyze call

- Analyze route writes analytics fields into `calls.metadata`.

## Ownership and authorization model

- Ownership is represented by `user_id` and `owner_id` columns.
- RLS policies validate ownership via `auth.uid()`.
- Routes also enforce ownership checks before writes.

## Metadata conventions

- `calls.metadata` holds call-level runtime and analysis values.
- `knowledge_chunks.metadata` holds source attribution values.
- `knowledge_base.metadata` can hold source-level auxiliary fields.

## Index rationale

- Ownership indexes support scoped lists.
- Created-at indexes support recency sorting.
- Chunk indexes support retrieval operations.

## Data integrity safeguards

- Foreign keys enforce parent-child links.
- Cascading deletes prevent orphan chunk rows.
- Trigger-based updated-at timestamps improve auditability.

## Current design tradeoffs

- Metadata-based analytics is flexible but less normalized.
- Full transcript row updates are simple but can be race-prone.
- JSONB embeddings are convenient but not optimized vector storage.

## Future evolution options

- Move analytics to normalized reporting tables.
- Introduce dedicated vector extension index strategy.
- Add transcript event table for append-only writes.
- Add source deduplication and version control.

## Practical reading order

- Start with `profiles`, `agents`, and `calls`.
- Then read template and knowledge tables.
- Finally read chunk and analytics behavior.
