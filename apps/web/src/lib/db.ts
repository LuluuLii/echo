import Dexie, { type EntityTable } from 'dexie';

/**
 * Local metadata storage (not synced)
 */
export interface LocalMeta {
  key: string;
  value: unknown;
}

/**
 * Local embedding cache (not synced)
 * Embeddings are generated locally and can be rebuilt from material content
 */
export interface LocalEmbedding {
  materialId: string;
  vector: number[];
  updatedAt: number;
}

/**
 * Echo IndexedDB Database
 *
 * Stores:
 * - meta: Loro snapshots and sync metadata
 * - embeddings: Local embedding vectors (not synced)
 */
class EchoDatabase extends Dexie {
  meta!: EntityTable<LocalMeta, 'key'>;
  embeddings!: EntityTable<LocalEmbedding, 'materialId'>;

  constructor() {
    super('echo');

    this.version(1).stores({
      meta: 'key',
      embeddings: 'materialId',
    });
  }
}

export const db = new EchoDatabase();

// Meta keys
export const META_KEYS = {
  LORO_SNAPSHOT: 'loro-snapshot',
  ICLOUD_HANDLE: 'icloud-handle',
  LAST_SYNC: 'last-sync',
} as const;

/**
 * Save Loro snapshot to IndexedDB
 */
export async function saveSnapshot(snapshot: Uint8Array): Promise<void> {
  await db.meta.put({
    key: META_KEYS.LORO_SNAPSHOT,
    value: snapshot,
  });
}

/**
 * Load Loro snapshot from IndexedDB
 */
export async function loadSnapshot(): Promise<Uint8Array | null> {
  const record = await db.meta.get(META_KEYS.LORO_SNAPSHOT);
  if (record?.value instanceof Uint8Array) {
    return record.value;
  }
  return null;
}

/**
 * Save embedding for a material
 */
export async function saveEmbedding(
  materialId: string,
  vector: number[]
): Promise<void> {
  await db.embeddings.put({
    materialId,
    vector,
    updatedAt: Date.now(),
  });
}

/**
 * Get embedding for a material
 */
export async function getEmbedding(
  materialId: string
): Promise<number[] | null> {
  const record = await db.embeddings.get(materialId);
  return record?.vector ?? null;
}

/**
 * Get all embeddings
 */
export async function getAllEmbeddings(): Promise<Map<string, number[]>> {
  const records = await db.embeddings.toArray();
  return new Map(records.map((r) => [r.materialId, r.vector]));
}

/**
 * Delete embedding for a material
 */
export async function deleteEmbedding(materialId: string): Promise<void> {
  await db.embeddings.delete(materialId);
}
