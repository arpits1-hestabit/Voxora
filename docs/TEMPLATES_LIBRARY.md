# Templates Library

This document explains how prebuilt, my templates, and marketplace templates work in Voxora.

## Feature goals

- Speed up agent creation.
- Allow users to save reusable configurations.
- Support optional template sharing across users.

## Data tables

- `agent_templates`
- `template_knowledge`
- `knowledge_base` for copied sources during create-from-template.

## Template categories in UI

- Pre-built templates.
- My Templates.
- Marketplace templates.

## Category query rules

### Pre-built

- Query filter: `is_system = true`.

### My Templates

- Query filter: `owner_id = current user`.

### Marketplace

- Query filter: `is_public = true` and `is_system = false`.

## Visibility enforcement

- UI applies category query filters.
- RLS policies enforce accessibility in database.
- Non-owner cannot access private templates.

## Save as template flow

- Captures current agent configuration from form state.
- Inserts row into `agent_templates`.
- Sets `owner_id` to current user.
- Sets `is_system` false.
- Sets `is_public` based on publish checkbox.

## Publish to marketplace behavior

- Publish checkbox controls public visibility at save time.
- Public user templates appear in marketplace queries.
- Private templates remain only in owner view.

## One-click create from template flow

- Inserts new agent using template fields.
- Loads template knowledge rows.
- Copies template knowledge into new agent `knowledge_base`.
- Redirects user to created agent page.

## Knowledge count display

- UI collects template ids across visible sets.
- Reads matching rows from `template_knowledge`.
- Computes source count per template.
- Shows count chip on each template card.

## Source of template fields

- Name.
- Description.
- System prompt.
- Voice provider.
- Voice id.
- Model.
- Temperature.

## Ownership and authorization

- Template creation requires authenticated user.
- Owner id gates updates and deletes.
- Template knowledge writes require template ownership.
- Marketplace reading follows visibility policy.

## Operational caveats

- Unpublish flow is not exposed in current create page.
- Template edits are not part of current flow.
- Create-from-template copies sources but not chunk rows directly.

## Product behavior notes

- Template save does not create an agent.
- Create-from-template creates agent immediately.
- Knowledge indexing occurs when sources are ingested for that agent.

## Monitoring recommendations

- Track template saves by user.
- Track publish rate.
- Track create-from-template conversion.
- Track marketplace usage and adoption.

## Troubleshooting checklist

- Verify authenticated session is present.
- Verify `owner_id` is set on insert.
- Verify RLS policy for accessible templates.
- Verify template knowledge rows are readable.
- Verify copy insert into `knowledge_base` succeeds.

## Hardening opportunities

- Add explicit unpublish and republish controls.
- Add template edit and version history.
- Add moderation workflow for marketplace templates.
- Add quality signals and template ratings.

## Ownership summary

- New agent page owns template read and write interactions.
- Database policies own visibility boundaries.
- Template knowledge copy flow owns bootstrap content transfer.
