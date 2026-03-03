import { logger } from "@/lib/logger";
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "who",
  "will",
  "with",
  "you",
  "your",
]);

const SENTENCE_TRANSFORMER_MODEL =
  process.env.SENTENCE_TRANSFORMER_MODEL ||
  "sentence-transformers/all-MiniLM-L6-v2";
const HUGGING_FACE_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${encodeURIComponent(SENTENCE_TRANSFORMER_MODEL)}`;
const HUGGING_FACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function hashToken(token: string, dimensions: number): number {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash) % dimensions;
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );
  if (magnitude === 0) {
    return vector;
  }
  return vector.map((value) => value / magnitude);
}

function meanPool(tokenEmbeddings: number[][]): number[] {
  if (!Array.isArray(tokenEmbeddings) || tokenEmbeddings.length === 0) {
    return [];
  }

  const dimensions = tokenEmbeddings[0]?.length || 0;
  if (dimensions === 0) {
    return [];
  }

  const pooled = new Array<number>(dimensions).fill(0);
  for (const tokenVector of tokenEmbeddings) {
    for (let index = 0; index < dimensions; index += 1) {
      pooled[index] += tokenVector[index] || 0;
    }
  }

  for (let index = 0; index < dimensions; index += 1) {
    pooled[index] /= tokenEmbeddings.length;
  }

  return normalizeVector(pooled);
}

function fallbackHashedEmbedding(text: string, dimensions = 256): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const bucket = hashToken(token, dimensions);
    vector[bucket] += 1;
  }

  return normalizeVector(vector);
}

export async function embedText(text: string): Promise<number[]> {
  const cleaned = text?.trim();
  if (!cleaned) {
    return [];
  }

  try {
    const response = await fetch(HUGGING_FACE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(HUGGING_FACE_API_KEY
          ? { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        inputs: cleaned.slice(0, 4000),
        options: {
          wait_for_model: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Sentence-transformers embedding error", {
        text: errorText,
      });
      return fallbackHashedEmbedding(cleaned);
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      if (typeof data[0] === "number") {
        return normalizeVector(data as number[]);
      }

      if (Array.isArray(data[0])) {
        return meanPool(data as number[][]);
      }
    }

    if (typeof data?.error === "string") {
      logger.error(
        "Sentence-transformers embedding response error:",
        data.error,
      );
      return fallbackHashedEmbedding(cleaned);
    }

    return fallbackHashedEmbedding(cleaned);
  } catch (error) {
    logger.error("Sentence-transformers embedding failure", { error });
    return fallbackHashedEmbedding(cleaned);
  }
}

export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length || vectorA.length === 0) {
    return -1;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    dot += vectorA[index] * vectorB[index];
    magA += vectorA[index] * vectorA[index];
    magB += vectorB[index] * vectorB[index];
  }

  if (magA === 0 || magB === 0) {
    return -1;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function chunkText(
  text: string,
  maxCharsPerChunk = 800,
  overlapChars = 120,
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  if (normalized.length <= maxCharsPerChunk) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + maxCharsPerChunk, normalized.length);
    let splitAt = end;

    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(" ", end);
      if (lastSpace > start + Math.floor(maxCharsPerChunk * 0.6)) {
        splitAt = lastSpace;
      }
    }

    const part = normalized.slice(start, splitAt).trim();
    if (part) {
      chunks.push(part);
    }

    if (splitAt >= normalized.length) {
      break;
    }

    start = Math.max(0, splitAt - overlapChars);
  }

  return chunks;
}
