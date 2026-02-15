/**
 * K-Means Clustering for Materials
 *
 * Clusters materials based on their embeddings and generates labels.
 */

import { getAllEmbeddings, cosineSimilarity } from './embedding';

// Label cache to avoid regenerating labels for same content
const labelCache = new Map<string, string>();

/**
 * Generate a cache key from material contents
 */
function getLabelCacheKey(contents: string[]): string {
  // Use hash of first few content snippets
  const sample = contents.slice(0, 5).map(c => c.slice(0, 100)).join('|');
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `label_${hash}`;
}

/**
 * Clear the label cache (call when materials change significantly)
 */
export function clearLabelCache(): void {
  labelCache.clear();
}

export interface Cluster {
  id: string;
  label: string;
  materialIds: string[];
  centroid: number[];
  subClusters?: SubCluster[]; // For Level of Detail
}

export interface SubCluster {
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
 * Generate a short English label for a cluster using LLM
 */
async function generateClusterLabelWithLLM(
  contents: string[],
  isSubCluster: boolean = false
): Promise<string> {
  // Check cache first
  const cacheKey = getLabelCacheKey(contents);
  const cached = labelCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Dynamically import to avoid circular dependencies
    const { getLLMService } = await import('./llm/service');
    const service = getLLMService();

    if (!service.isInitialized()) {
      await service.initialize();
    }

    // Check if we have a real LLM provider (not just template)
    const activeProvider = service.getActiveProvider();
    if (!activeProvider || !activeProvider.isReady()) {
      console.log('[Clustering] No LLM provider ready, using fallback');
      return generateFallbackLabel(contents);
    }

    // Take samples - more for main clusters, fewer for sub-clusters
    const sampleCount = isSubCluster ? 3 : 5;
    const sampleLength = isSubCluster ? 150 : 200;
    const sample = contents
      .slice(0, sampleCount)
      .map(c => c.slice(0, sampleLength))
      .join('\n---\n');

    const prompt = `Analyze these text samples and generate a precise, descriptive English topic label.

Requirements:
- 2-4 words maximum
- Be specific, not generic (avoid "General", "Various", "Mixed")
- Capture the core theme or subject matter
- Use nouns or noun phrases

Samples:
${sample}

Topic label:`;

    const result = await service.chat([{ role: 'user', content: prompt }], {
      temperature: 0.2,
      maxTokens: 15,
    });

    // Clean up the result
    let label = result.trim()
      .replace(/^["']|["']$/g, '')  // Remove quotes
      .replace(/^(Topic|Label|Theme):\s*/i, '')  // Remove prefix
      .replace(/\.$/, '')  // Remove trailing period
      .slice(0, 30);

    // Validate - if too generic or empty, use fallback
    const genericLabels = ['general', 'various', 'mixed', 'miscellaneous', 'other', 'content', 'text'];
    if (!label || genericLabels.some(g => label.toLowerCase().includes(g))) {
      const fallback = generateFallbackLabel(contents);
      labelCache.set(cacheKey, fallback);
      return fallback;
    }

    // Cache the result
    labelCache.set(cacheKey, label);
    return label;
  } catch (e) {
    console.warn('LLM label generation failed, using fallback:', e);
    const fallback = generateFallbackLabel(contents);
    labelCache.set(cacheKey, fallback);
    return fallback;
  }
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their',
  'would', 'could', 'should', 'about', 'which', 'there', 'these', 'those',
  'some', 'other', 'into', 'just', 'like', 'make', 'made', 'when', 'what',
  'will', 'more', 'very', 'also', 'than', 'then', 'being', 'because',
  'even', 'before', 'after', 'between', 'such', 'through', 'during',
  'each', 'where', 'while', 'only', 'over', 'still', 'back', 'really',
  'think', 'know', 'want', 'need', 'feel', 'going', 'doing', 'getting',
  'today', 'yesterday', 'tomorrow', 'time', 'thing', 'something', 'anything',
  'maybe', 'actually', 'probably', 'definitely', 'basically', 'literally',
]);

/**
 * Fallback label generation using improved keyword extraction
 */
function generateFallbackLabel(contents: string[]): string {
  const allText = contents.join(' ');

  // Extract meaningful words (nouns and key terms)
  const words = allText
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')  // Keep alphanumeric and Chinese
    .split(/\s+/)
    .filter((w) => {
      const lower = w.toLowerCase();
      return w.length > 3 &&
             !STOP_WORDS.has(lower) &&
             !/^\d+$/.test(w);  // Not pure numbers
    });

  // Word frequency with position bonus (earlier = more important)
  const freq = new Map<string, number>();
  words.forEach((word, idx) => {
    const lower = word.toLowerCase();
    const positionBonus = 1 + (words.length - idx) / words.length;
    freq.set(lower, (freq.get(lower) || 0) + positionBonus);
  });

  // Get top words, prefer capitalized words (likely proper nouns/key terms)
  const topWords = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => {
      // Find original capitalization
      const original = words.find(w => w.toLowerCase() === word);
      if (original && original[0] === original[0].toUpperCase()) {
        return original;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    });

  if (topWords.length === 0) {
    return 'Miscellaneous';
  }

  // Use top 2 words for label
  return topWords.slice(0, 2).join(' & ');
}

/**
 * Generate a label for a cluster based on its materials
 */
async function generateClusterLabel(
  materialIds: string[],
  materialsMap: Map<string, string>,
  useLLM: boolean = true
): Promise<string> {
  const contents = materialIds.map((id) => materialsMap.get(id) || '').filter(c => c.length > 0);

  if (contents.length === 0) {
    return 'Empty';
  }

  if (useLLM) {
    return generateClusterLabelWithLLM(contents);
  }

  return generateFallbackLabel(contents);
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
  const clusterMaterialsMap = new Map<number, string[]>();

  for (const [id, cluster] of assignments) {
    if (!clusterMaterialsMap.has(cluster)) {
      clusterMaterialsMap.set(cluster, []);
    }
    clusterMaterialsMap.get(cluster)!.push(id);
  }

  const clusters: Cluster[] = [];
  const materialClusterMap = new Map<string, string>();

  // Generate labels (potentially using LLM) in parallel
  const clusterEntries = Array.from(clusterMaterialsMap.entries()).filter(
    ([_, ids]) => ids.length > 0
  );

  const labels = await Promise.all(
    clusterEntries.map(([_, materialIds]) =>
      generateClusterLabel(materialIds, materialsMap, true)
    )
  );

  for (let i = 0; i < clusterEntries.length; i++) {
    const [clusterIdx, materialIds] = clusterEntries[i];
    const clusterId = `cluster-${clusterIdx}`;
    const cluster: Cluster = {
      id: clusterId,
      label: labels[i],
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

/**
 * Generate sub-clusters for a single cluster (for Level of Detail)
 */
export async function generateSubClusters(
  cluster: Cluster,
  materialsMap: Map<string, string>,
  embeddings: Map<string, number[]>
): Promise<SubCluster[]> {
  const materialIds = cluster.materialIds;

  // Need at least 4 materials for meaningful sub-clustering
  if (materialIds.length < 4) {
    return [];
  }

  // Determine sub-cluster count
  const subK = Math.min(3, Math.max(2, Math.floor(materialIds.length / 3)));

  // Get embeddings for this cluster's materials
  const clusterEmbeddings = new Map<string, number[]>();
  for (const id of materialIds) {
    const emb = embeddings.get(id);
    if (emb) {
      clusterEmbeddings.set(id, emb);
    }
  }

  if (clusterEmbeddings.size < 4) {
    return [];
  }

  const dimensions = clusterEmbeddings.values().next().value?.length || 384;

  // Initialize centroids
  let centroids = initializeCentroids(clusterEmbeddings, subK);

  // K-Means iterations
  let assignments = new Map<string, number>();
  for (let iter = 0; iter < 10; iter++) {
    const newAssignments = assignToClusters(clusterEmbeddings, centroids);

    let changed = false;
    for (const [id, c] of newAssignments) {
      if (assignments.get(id) !== c) {
        changed = true;
        break;
      }
    }

    assignments = newAssignments;
    if (!changed) break;

    centroids = recomputeCentroids(clusterEmbeddings, assignments, subK, dimensions);
  }

  // Build sub-clusters
  const subClusterMaterials = new Map<number, string[]>();
  for (const [id, subCluster] of assignments) {
    if (!subClusterMaterials.has(subCluster)) {
      subClusterMaterials.set(subCluster, []);
    }
    subClusterMaterials.get(subCluster)!.push(id);
  }

  const subClusters: SubCluster[] = [];
  const subClusterEntries = Array.from(subClusterMaterials.entries()).filter(
    ([_, ids]) => ids.length > 0
  );

  // Generate labels for sub-clusters using LLM
  const subLabels = await Promise.all(
    subClusterEntries.map(async ([_, subMaterialIds]) => {
      const contents = subMaterialIds.map(id => materialsMap.get(id) || '').filter(c => c);
      // Use LLM for sub-clusters too, with isSubCluster flag for shorter samples
      return generateClusterLabelWithLLM(contents, true);
    })
  );

  for (let i = 0; i < subClusterEntries.length; i++) {
    const [subIdx, subMaterialIds] = subClusterEntries[i];
    subClusters.push({
      id: `${cluster.id}-sub-${subIdx}`,
      label: subLabels[i],
      materialIds: subMaterialIds,
      centroid: centroids[subIdx],
    });
  }

  // Sort by size
  subClusters.sort((a, b) => b.materialIds.length - a.materialIds.length);

  return subClusters;
}
