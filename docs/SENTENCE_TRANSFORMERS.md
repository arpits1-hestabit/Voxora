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
