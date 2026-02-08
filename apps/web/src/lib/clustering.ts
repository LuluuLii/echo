/**
 * K-Means Clustering for Materials
 *
 * Clusters materials based on their embeddings and generates labels.
 */

import { getAllEmbeddings, cosineSimilarity } from './embedding';

export interface Cluster {
  id: string;
  label: string;
  materialIds: string[];
  centroid: number[];
}

export interface ClusterResult {
  clusters: Cluster[];
  materialClusterMap: Map<string, string>; // materialId -> clusterId
}

/**
 * Initialize centroids using K-Means++ algorithm
 */
function initializeCentroids(
  embeddings: Map<string, number[]>,
  k: number
): number[][] {
  const ids = Array.from(embeddings.keys());
  const centroids: number[][] = [];

  // Pick first centroid randomly
  const firstId = ids[Math.floor(Math.random() * ids.length)];
  centroids.push([...embeddings.get(firstId)!]);

  // Pick remaining centroids with probability proportional to distance
  while (centroids.length < k) {
    const distances: number[] = [];
    let totalDistance = 0;

    for (const id of ids) {
      const emb = embeddings.get(id)!;
      let minDist = Infinity;

      for (const centroid of centroids) {
        const sim = cosineSimilarity(emb, centroid);
        const dist = 1 - sim; // Convert similarity to distance
        minDist = Math.min(minDist, dist);
      }

      distances.push(minDist);
      totalDistance += minDist;
    }

    // Pick next centroid with probability proportional to distance squared
    let rand = Math.random() * totalDistance;
    for (let i = 0; i < ids.length; i++) {
      rand -= distances[i];
      if (rand <= 0) {
        centroids.push([...embeddings.get(ids[i])!]);
        break;
      }
    }

    // Fallback: just pick randomly
    if (centroids.length < k && rand > 0) {
      const randomId = ids[Math.floor(Math.random() * ids.length)];
      centroids.push([...embeddings.get(randomId)!]);
    }
  }

  return centroids;
}

/**
 * Assign each material to the nearest centroid
 */
function assignToClusters(
  embeddings: Map<string, number[]>,
  centroids: number[][]
): Map<string, number> {
  const assignments = new Map<string, number>();

  for (const [id, emb] of embeddings) {
    let bestCluster = 0;
    let bestSim = -Infinity;

    for (let i = 0; i < centroids.length; i++) {
      const sim = cosineSimilarity(emb, centroids[i]);
      if (sim > bestSim) {
        bestSim = sim;
        bestCluster = i;
      }
    }

    assignments.set(id, bestCluster);
  }

  return assignments;
}

/**
 * Recompute centroids based on assignments
 */
function recomputeCentroids(
  embeddings: Map<string, number[]>,
  assignments: Map<string, number>,
  k: number,
  dimensions: number
): number[][] {
  const sums: number[][] = Array(k)
    .fill(null)
    .map(() => Array(dimensions).fill(0));
  const counts: number[] = Array(k).fill(0);

  for (const [id, cluster] of assignments) {
    const emb = embeddings.get(id)!;
    for (let i = 0; i < dimensions; i++) {
      sums[cluster][i] += emb[i];
    }
    counts[cluster]++;
  }

  return sums.map((sum, i) => {
    if (counts[i] === 0) return sum;
    return sum.map((v) => v / counts[i]);
  });
}

/**
 * Determine optimal number of clusters using elbow method heuristic
 */
function determineK(n: number): number {
  if (n <= 3) return 1;
  if (n <= 6) return 2;
  if (n <= 12) return 3;
  if (n <= 20) return 4;
  if (n <= 35) return 5;
  return Math.min(7, Math.floor(Math.sqrt(n)));
}

/**
 * Extract keywords from materials for cluster labeling
 */
function extractKeywords(contents: string[]): string[] {
  const allText = contents.join(' ').toLowerCase();

  // Simple word frequency analysis
  const words = allText
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // Keep alphanumeric and Chinese
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Get top words
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

/**
 * Generate a label for a cluster based on its materials
 */
function generateClusterLabel(
  materialIds: string[],
  materialsMap: Map<string, string>
): string {
  const contents = materialIds.map((id) => materialsMap.get(id) || '');
  const keywords = extractKeywords(contents);

  if (keywords.length === 0) {
    return `Cluster ${materialIds.length}`;
  }

  // Use first 1-2 keywords as label
  return keywords.slice(0, 2).join(' & ');
}

/**
 * Perform K-Means clustering on materials
 */
export async function clusterMaterials(
  materials: Array<{ id: string; content: string }>,
  options: { maxIterations?: number; forceK?: number } = {}
): Promise<ClusterResult> {
  const { maxIterations = 20, forceK } = options;

  if (materials.length === 0) {
    return { clusters: [], materialClusterMap: new Map() };
  }

  if (materials.length === 1) {
    const cluster: Cluster = {
      id: 'cluster-0',
      label: materials[0].content.slice(0, 30),
      materialIds: [materials[0].id],
      centroid: [],
    };
    return {
      clusters: [cluster],
      materialClusterMap: new Map([[materials[0].id, cluster.id]]),
    };
  }

  // Get all embeddings
  const embeddings = await getAllEmbeddings(materials);
  const dimensions = embeddings.values().next().value?.length || 384;

  // Determine k
  const k = forceK || determineK(materials.length);

  // Initialize centroids
  let centroids = initializeCentroids(embeddings, k);

  // K-Means iterations
  let assignments = new Map<string, number>();
  for (let iter = 0; iter < maxIterations; iter++) {
    const newAssignments = assignToClusters(embeddings, centroids);

    // Check for convergence
    let changed = false;
    for (const [id, cluster] of newAssignments) {
      if (assignments.get(id) !== cluster) {
        changed = true;
        break;
      }
    }

    assignments = newAssignments;
    if (!changed) break;

    // Recompute centroids
    centroids = recomputeCentroids(embeddings, assignments, k, dimensions);
  }

  // Build clusters
  const materialsMap = new Map(materials.map((m) => [m.id, m.content]));
  const clusterMaterials = new Map<number, string[]>();

  for (const [id, cluster] of assignments) {
    if (!clusterMaterials.has(cluster)) {
      clusterMaterials.set(cluster, []);
    }
    clusterMaterials.get(cluster)!.push(id);
  }

  const clusters: Cluster[] = [];
  const materialClusterMap = new Map<string, string>();

  for (const [clusterIdx, materialIds] of clusterMaterials) {
    if (materialIds.length === 0) continue;

    const clusterId = `cluster-${clusterIdx}`;
    const cluster: Cluster = {
      id: clusterId,
      label: generateClusterLabel(materialIds, materialsMap),
      materialIds,
      centroid: centroids[clusterIdx],
    };
    clusters.push(cluster);

    for (const id of materialIds) {
      materialClusterMap.set(id, clusterId);
    }
  }

  // Sort clusters by size (largest first)
  clusters.sort((a, b) => b.materialIds.length - a.materialIds.length);

  return { clusters, materialClusterMap };
}
