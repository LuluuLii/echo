/**
 * Embedding module using Transformers.js
 *
 * Uses dynamic import from ESM CDN to avoid npm installation issues.
 * Model: all-MiniLM-L6-v2 (384 dimensions, ~25MB)
 */

import { db } from './db';

// Lazy-loaded pipeline
let pipeline: unknown = null;
let pipelinePromise: Promise<unknown> | null = null;
let modelLoading = false;
let modelLoaded = false;

// Progress callback for UI updates
type ProgressCallback = (progress: number, status: string) => void;
let progressCallback: ProgressCallback | null = null;

/**
 * Set progress callback for model loading status
 */
export function setProgressCallback(callback: ProgressCallback | null): void {
  progressCallback = callback;
}

/**
 * Initialize the embedding pipeline
 * Downloads model on first use (~25MB)
 */
async function initPipeline(): Promise<unknown> {
  if (pipeline) return pipeline;
  if (pipelinePromise) return pipelinePromise;

  modelLoading = true;
  progressCallback?.(0, 'Loading embedding model...');

  pipelinePromise = (async () => {
    try {
      // Dynamic import from ESM CDN
      // @ts-expect-error - CDN import doesn't have types
      const transformers = await import(
        /* @vite-ignore */
        'https://esm.sh/@huggingface/transformers@3.8.1'
      );

      progressCallback?.(30, 'Initializing model...');

      // Create feature extraction pipeline
      pipeline = await transformers.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          progress_callback: (data: { progress?: number; status?: string }) => {
            if (data.progress !== undefined) {
              progressCallback?.(30 + data.progress * 0.7, data.status || 'Loading...');
            }
          },
        }
      );

      modelLoaded = true;
      modelLoading = false;
      progressCallback?.(100, 'Model ready');

      return pipeline;
    } catch (error) {
      modelLoading = false;
      pipelinePromise = null;
      progressCallback?.(0, 'Failed to load model');
      throw error;
    }
  })();

  return pipelinePromise;
}

/**
 * Check if model is loaded
 */
export function isModelLoaded(): boolean {
  return modelLoaded;
}

/**
 * Check if model is currently loading
 */
export function isModelLoading(): boolean {
  return modelLoading;
}

/**
 * Generate embedding for text
 */
export async function embed(text: string): Promise<number[]> {
  const extractor = await initPipeline();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = await (extractor as any)(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Convert to array
  return Array.from(output.data);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get embedding for a material (from cache or generate)
 */
export async function getEmbedding(materialId: string, content: string): Promise<number[]> {
  // Check cache first
  const cached = await db.embeddings.get(materialId);
  if (cached) {
    return cached.vector;
  }

  // Generate new embedding
  const vector = await embed(content);

  // Cache it
  await db.embeddings.put({
    materialId,
    vector,
    updatedAt: Date.now(),
  });

  return vector;
}

/**
 * Semantic search: find materials similar to query
 */
export async function semanticSearch(
  query: string,
  materials: Array<{ id: string; content: string }>,
  topK = 10
): Promise<Array<{ id: string; score: number }>> {
  // Get query embedding
  const queryEmb = await embed(query);

  // Get or generate embeddings for all materials
  const results: Array<{ id: string; score: number }> = [];

  for (const material of materials) {
    const materialEmb = await getEmbedding(material.id, material.content);
    const score = cosineSimilarity(queryEmb, materialEmb);
    results.push({ id: material.id, score });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, topK);
}

/**
 * Preload model (call early to avoid delay on first search)
 */
export async function preloadModel(): Promise<void> {
  try {
    await initPipeline();
  } catch (error) {
    console.warn('Failed to preload embedding model:', error);
  }
}
