const FIREWORKS_ENDPOINT = "https://api.fireworks.ai/inference/v1/embeddings";
const MODEL_ID = "nomic-ai/nomic-embed-text-v1.5";
const MOCK_DIMENSIONS = 768;

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic pseudo-embedding used when no FIREWORKS_API_KEY is configured.
 * Same text always yields the same vector, and semantically similar plain-text
 * overlap (shared tokens) nudges vectors closer together via shared-token bias,
 * so the "Light Version" pipeline is testable end-to-end without live API cost.
 */
function mockEmbedding(text: string): number[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const vector = new Array<number>(MOCK_DIMENSIONS).fill(0);
  const baseRandom = mulberry32(djb2Hash(text));
  for (let i = 0; i < MOCK_DIMENSIONS; i++) {
    vector[i] = baseRandom() * 2 - 1;
  }

  for (const token of tokens) {
    const tokenRandom = mulberry32(djb2Hash(token));
    for (let i = 0; i < MOCK_DIMENSIONS; i++) {
      vector[i] += (tokenRandom() * 2 - 1) * 0.35;
    }
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

async function embedWithFireworks(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const response = await fetch(FIREWORKS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_ID,
      input: texts,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Fireworks embeddings request failed (${response.status}): ${detail}`,
    );
  }

  const payload = (await response.json()) as {
    data: { embedding: number[]; index: number }[];
  };

  return payload.data
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.embedding);
}

export interface EmbedTextsResult {
  vectors: number[][];
  mock: boolean;
  model: string;
}

export async function embedTexts(texts: string[]): Promise<EmbedTextsResult> {
  const apiKey = process.env.FIREWORKS_API_KEY;

  if (apiKey) {
    const vectors = await embedWithFireworks(texts, apiKey);
    return { vectors, mock: false, model: MODEL_ID };
  }

  return {
    vectors: texts.map(mockEmbedding),
    mock: true,
    model: `${MODEL_ID} (mock)`,
  };
}
