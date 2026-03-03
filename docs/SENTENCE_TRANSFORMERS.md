# Sentence Transformers and Embeddings

This document describes how tokenization and embedding generation work in Voxora.

## Purpose

- Convert user query and knowledge chunks into comparable vectors.
- Rank knowledge chunks by cosine similarity.
- Build grounded prompt context for the voice route.

## Implementation location

- `src/lib/knowledge/embeddings.ts`

## Model configuration

- Default model: `sentence-transformers/all-MiniLM-L6-v2`.
- Model can be overridden by environment variable.
- Provider path uses Hugging Face inference endpoint.

## Inputs to embedding function

- Plain text string.
- Text is trimmed.
- Long input is capped before provider request.

## Primary embedding path

- Sends text to Hugging Face feature extraction endpoint.
- Accepts either sentence vector or token vectors.
- If token vectors are returned, mean pooling is applied.
- Output is normalized to unit length.

## Fallback embedding path

- Used when provider request fails or response is invalid.
- Uses hashed bag-of-words strategy.
- Fixed default dimensions are used.
- Output is normalized to unit length.

## Tokenization path

- Input is lowercased and punctuation-normalized.
- Split on spaces.
- Short tokens are removed.
- Stop words are removed.

## Stop-word filtering role

- Reduces low-signal lexical overlap noise.
- Helps fallback lexical ranking quality.
- Not used by provider model directly.

## Similarity function

- Uses cosine similarity.
- Returns negative guard values for invalid vectors.
- Requires matching vector dimensions.

## Chunking helper

- Splits content by character windows.
- Uses overlap to preserve continuity.
- Tries to split on spaces when possible.
- Returns ordered chunk array.

## Where embeddings are stored

- Stored in `knowledge_chunks.embedding` JSONB.
- Parsed back during retrieval for similarity ranking.

## Retrieval usage in voice route

- Query text combines current utterance and recent context.
- Query embedding generated from combined text.
- Chunk embeddings are parsed and scored.
- Top-ranked chunks form context blocks.

## Fallback retrieval behavior

- If no vector candidates score above threshold,
- lexical overlap ranking over full sources is used.

## Operational characteristics

- Provider latency directly affects turn preparation time.
- Fallback keeps system functional during provider outage.
- Embedding dimensional consistency matters for ranking quality.

## Accuracy considerations

- Smaller models are faster but can reduce semantic precision.
- Mixed embedding dimensions degrade similarity quality.
- Placeholder source content reduces retrieval usefulness.

## Security considerations

- Keep inference API key server-side when possible.
- Avoid logging raw sensitive source content.
- Protect ingestion route to prevent abuse.

## Monitoring recommendations

- Track embedding provider error rate.
- Track fallback frequency over time.
- Track ingest latency by source type.
- Track retrieval hit quality via user feedback.

## Troubleshooting checklist

- Verify environment model name is valid.
- Verify Hugging Face key and quota.
- Verify chunk rows have non-empty embeddings.
- Verify query and chunk vector lengths match.
- Verify similarity ranking returns expected candidates.

## Improvement opportunities

- Move to dedicated vector database indexing.
- Add embedding cache for repeated sources.
- Add model version tag in chunk metadata.
- Add evaluation dataset for retrieval relevance.

## Ownership summary

- Embeddings utility owns tokenization and vectors.
- Ingest route owns chunk creation and storage.
- Voice route owns query-time ranking and context assembly.
