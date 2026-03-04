/**
 * K-Means Clustering for Materials
 *
 * Clusters materials based on their embeddings and generates labels.
 */

import { getAllEmbeddings, cosineSimilarity } from './embedding';

// Label cache to avoid regenerating labels for same content
const labelCache = new Map<string, string>();

// Cluster result cache key for IndexedDB
// Increment version when label generation algorithm changes
const CLUSTER_CACHE_VERSION = 2;
const CLUSTER_CACHE_KEY = `cluster-result-cache-v${CLUSTER_CACHE_VERSION}`;

/**
 * Generate a cache key from material IDs
 */
function getClusterCacheKey(materials: Array<{ id: string; content: string }>): string {
  // Sort IDs for consistent key regardless of order
  const ids = materials.map(m => m.id).sort().join(',');
  // Include content hash to detect changes
  const contentHash = materials.reduce((acc, m) => acc + m.content.length, 0);
  return `${ids}:${contentHash}`;
}

/**
 * Load cached cluster result from IndexedDB
 */
async function loadClusterCache(): Promise<{ key: string; result: ClusterResult } | null> {
  try {
    const { db } = await import('./db');
    const cached = await db.meta.get(CLUSTER_CACHE_KEY);
    if (cached?.value) {
      console.log('[Clustering] Loaded cache from IndexedDB');
      return JSON.parse(cached.value as string);
    }
  } catch (e) {
    console.warn('[Clustering] Failed to load cache:', e);
  }
  return null;
}

/**
 * Save cluster result to IndexedDB
 */
async function saveClusterCache(key: string, result: ClusterResult): Promise<void> {
  try {
    const { db } = await import('./db');
    // Convert Map to array for JSON serialization
    const serializable = {
      key,
      result: {
        clusters: result.clusters,
        materialClusterMap: Array.from(result.materialClusterMap.entries()),
      },
    };
    await db.meta.put({ key: CLUSTER_CACHE_KEY, value: JSON.stringify(serializable) });
    console.log('[Clustering] Saved cache to IndexedDB');
  } catch (e) {
    console.warn('[Clustering] Failed to save cache:', e);
  }
}

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

/**
 * Clear the cluster result cache (call when materials are added/deleted)
 */
export async function clearClusterCache(): Promise<void> {
  try {
    const { db } = await import('./db');
    await db.meta.delete(CLUSTER_CACHE_KEY);
    console.log('[Clustering] Cache cleared from IndexedDB');
  } catch (e) {
    console.warn('[Clustering] Failed to clear cache:', e);
  }
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

    // Wait for LLM service to fully initialize (like activation does)
    await service.waitForInit();

    // Check if we have a real LLM provider (not just template)
    const activeProvider = service.getActiveProvider();
    console.log('[Clustering/Label] Active provider:', activeProvider?.name || 'none');
    console.log('[Clustering/Label] Provider ready:', activeProvider?.isReady() || false);

    if (!activeProvider || !activeProvider.isReady() || activeProvider.id === 'template') {
      console.log('[Clustering/Label] No LLM provider ready, using fallback keyword extraction');
      return generateFallbackLabel(contents);
    }

    console.log('[Clustering/Label] Using LLM provider:', activeProvider.name);

    // Take samples - more for main clusters, fewer for sub-clusters
    // Use more characters for Chinese text (each char ~1 token)
    const sampleCount = isSubCluster ? 3 : 5;
    const sampleLength = isSubCluster ? 300 : 500;
    const sample = contents
      .slice(0, sampleCount)
      .map(c => c.slice(0, sampleLength))
      .join('\n---\n');

    // Detect if content is primarily Chinese
    const chineseCharCount = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
    const isChineseContent = chineseCharCount > sample.length * 0.3;

    const prompt = isChineseContent
      ? `分析以下文本样本，生成一个精确的主题标签。

要求：
- 2-5个词（中文或英文均可）
- 要具体，不要笼统（避免"杂项"、"各种"、"综合"）
- 抓住核心主题或话题
- 用名词或名词短语

文本样本：
${sample}

主题标签：`
      : `Analyze these text samples and generate a precise, descriptive topic label.

Requirements:
- 2-4 words maximum
- Be specific, not generic (avoid "General", "Various", "Mixed")
- Capture the core theme or subject matter
- Use nouns or noun phrases

Samples:
${sample}

Topic label:`;

    console.log('[Clustering/Label] Sending prompt to LLM (Chinese:', isChineseContent, ')...');
    const result = await service.chat([{ role: 'user', content: prompt }], {
      temperature: 0.3,
      maxTokens: 50,  // Increased for Chinese labels
    });
    console.log('[Clustering/Label] LLM raw result:', result);

    // Clean up the result
    let label = result.trim()
      .replace(/^["'「」『』]/g, '')  // Remove quotes (including Chinese)
      .replace(/["'「」『』]$/g, '')
      .replace(/^(Topic|Label|Theme|主题|标签)[:：]\s*/i, '')  // Remove prefix
      .replace(/[.。]$/, '')  // Remove trailing period
      .slice(0, 40);  // Allow longer Chinese labels

    // Validate - if too generic or empty, use fallback
    const genericLabels = [
      'general', 'various', 'mixed', 'miscellaneous', 'other', 'content', 'text',
      '杂项', '综合', '各种', '其他', '内容', '文本', '混合'
    ];
    if (!label || genericLabels.some(g => label.toLowerCase().includes(g))) {
      console.log('[Clustering/Label] Generic label detected, using fallback');
      const fallback = generateFallbackLabel(contents);
      labelCache.set(cacheKey, fallback);
      return fallback;
    }

    console.log('[Clustering/Label] Final label:', label);

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

// Chinese stop words
const CHINESE_STOP_WORDS = new Set([
  '的', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看',
  '好', '自己', '这', '那', '她', '他', '它', '这个', '那个', '什么', '怎么',
  '可以', '没', '了', '吗', '啊', '呢', '吧', '哦', '嗯', '但是', '因为',
  '所以', '如果', '虽然', '还是', '或者', '而且', '然后', '这样', '那样',
]);

/**
 * Fallback label generation using improved keyword extraction
 */
function generateFallbackLabel(contents: string[]): string {
  const allText = contents.join(' ');

  // Check if primarily Chinese
  const chineseCharCount = (allText.match(/[\u4e00-\u9fff]/g) || []).length;
  const isChineseContent = chineseCharCount > allText.length * 0.3;

  if (isChineseContent) {
    // Chinese text: extract 2-4 character words/phrases
    const chineseWords = allText.match(/[\u4e00-\u9fff]{2,6}/g) || [];
    const freq = new Map<string, number>();

    chineseWords.forEach((word, idx) => {
      if (!CHINESE_STOP_WORDS.has(word)) {
        const positionBonus = 1 + (chineseWords.length - idx) / chineseWords.length;
        freq.set(word, (freq.get(word) || 0) + positionBonus);
      }
    });

    const topWords = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);

    if (topWords.length === 0) {
      return '未分类';
    }

    return topWords.slice(0, 2).join(' · ');
  }

  // English text: extract meaningful words
  const words = allText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => {
      const lower = w.toLowerCase();
      return w.length > 3 &&
             !STOP_WORDS.has(lower) &&
             !/^\d+$/.test(w);
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
  options: { maxIterations?: number; forceK?: number; skipCache?: boolean } = {}
): Promise<ClusterResult> {
  const { maxIterations = 20, forceK, skipCache = false } = options;

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

  // Check cache from IndexedDB
  const cacheKey = getClusterCacheKey(materials);
  if (!skipCache) {
    const cached = await loadClusterCache();
    if (cached && cached.key === cacheKey) {
      console.log('[Clustering] Using cached result from IndexedDB');
      // Reconstruct Map from array
      const materialClusterMap = new Map<string, string>(
        cached.result.materialClusterMap as [string, string][]
      );
      return {
        clusters: cached.result.clusters,
        materialClusterMap,
      };
    }
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

  const result = { clusters, materialClusterMap };

  // Save to IndexedDB for persistence
  await saveClusterCache(cacheKey, result);

  return result;
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
