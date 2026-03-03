# Analytics

This document describes analytics generation and dashboard behavior in Voxora.

## Analytics source of truth

- Call analytics are currently stored in `calls.metadata`.
- Analysis fields include sentiment, topics, summary, key points, and quality score.
- `call_analytics` table exists but is not the active write path.

## Generation trigger points

- Manual call detail action can trigger analysis.
- Analytics dashboard can backfill a limited set of missing analyses.
- End-call flow can trigger analysis when transcript is present.

## Analyze route behavior

- Route loads call by `callId` and user ownership.
- Route requires transcript data.
- Transcript is transformed to plain text conversation format.
- Groq prompt requests strict JSON output.
- Parsed output is written to `calls.metadata`.

## Fields written to metadata

- `sentiment`
- `topics`
- `summary`
- `keyPoints`
- `qualityScore`
- `analyzed_at`

## Dashboard page behavior

- User must be authenticated.
- Calls are fetched by selected time range.
- Joined agent names are used for ranking views.
- Statistics are computed client-side.

## Time range options

- Last 7 days.
- Last 30 days.
- Last 90 days.

## Computed KPI set

- Total calls.
- Completed calls.
- Total duration.
- Average call duration.
- Average quality score.
- Active agents count.
- Sentiment distribution.

## Agent ranking logic

- Group calls by `agent_id`.
- Count calls per agent.
- Sum duration per agent.
- Sort descending by call count.
- Display top five.

## Sentiment logic

- Counts only calls with sentiment metadata.
- Positive, neutral, and negative buckets.
- Visual percentages are based on analyzed call count.

## Call activity chart logic

- Bucket calls by local date representation.
- Count calls per day.
- Sort by chronological order.
- Render horizontal bars by relative daily max.

## Data quality expectations

- Transcript roles should map correctly to user/agent.
- Quality score should be numeric.
- Topics and key points should be arrays.

## Failure handling

- Analysis route logs provider and parse errors.
- Dashboard keeps loading resilient when partial failures occur.
- Missing analytics is represented as N/A in UI.

## Performance notes

- Most calculations run in browser memory.
- Large call windows can increase page compute time.
- Consider server-side aggregation for higher scale.

## Reporting recommendations

- Keep one canonical analytics storage strategy.
- Version analytics schema for long-term consistency.
- Add confidence fields if model drift tracking is required.

