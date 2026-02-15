/**
 * Territory Visualization Module
 *
 * Uses UMAP for dimensionality reduction, d3-contour for density visualization,
 * and d3-delaunay for Voronoi territory boundaries.
 */

import { UMAP } from 'umap-js';
import { contourDensity } from 'd3-contour';
import { Delaunay } from 'd3-delaunay';
import { scaleLinear, scaleSequential } from 'd3-scale';
import { interpolateBlues, interpolatePurples } from 'd3-scale-chromatic';
import { extent } from 'd3-array';
import { getAllEmbeddings } from './embedding';
import { clusterMaterials, generateSubClusters, type Cluster, type ClusterResult, type SubCluster } from './clustering';
import type { RawMaterial } from './store/materials';

// Types
export interface TerritoryPoint {
  id: string;
  x: number;
  y: number;
  clusterId: string;
  weight: number; // Height contribution
}

export interface TerritorySubCluster {
  id: string;
  label: string;
  centroid: { x: number; y: number };
  points: TerritoryPoint[];
  parentId: string;
}

export interface TerritoryCluster {
  id: string;
  label: string;
  centroid: { x: number; y: number };
  points: TerritoryPoint[];
  color: string;
  materialCount: number;
  subClusters: TerritorySubCluster[];
}

export interface TerritoryData {
  points: TerritoryPoint[];
  clusters: TerritoryCluster[];
  contours: GeoJSON.MultiPolygon[];
  voronoi: Delaunay.Voronoi<TerritoryCluster> | null;
  bounds: { width: number; height: number };
}

// Constants
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const PADDING = 50;

// Color palette for clusters (soft, organic colors)
const CLUSTER_COLORS = [
  '#8B9DC3', // Soft blue
  '#A8D5BA', // Soft green
  '#F5B7B1', // Soft pink
  '#F9E79F', // Soft yellow
  '#D7BDE2', // Soft purple
  '#AED6F1', // Light blue
  '#F5CBA7', // Soft orange
  '#A9DFBF', // Mint
];

/**
 * Calculate weight for a material based on recency and depth
 */
function calculateWeight(material: RawMaterial): number {
  const base = 1;

  // Recency weight: materials from last 30 days get higher weight
  const daysSinceCreation = (Date.now() - material.createdAt) / (1000 * 60 * 60 * 24);
  const recencyWeight = Math.max(0.5, 1 - daysSinceCreation / 30);

  // Depth weight: longer content gets slightly higher weight (with cap)
  const contentLength = material.content.length;
  const depthWeight = Math.min(1.5, 0.5 + Math.log10(contentLength + 1) / 3);

  return base * recencyWeight * depthWeight;
}

/**
 * Simple seeded random number generator (Mulberry32)
 */
function createSeededRandom(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Project embeddings to 2D using Supervised UMAP
 * Cluster labels are used to keep same-cluster points together
 */
async function projectToUMAP(
  materials: RawMaterial[],
  clusterMap: Map<string, string>, // materialId -> clusterId
  clusterIds: string[], // ordered cluster IDs for label encoding
  width: number,
  height: number
): Promise<Map<string, { x: number; y: number }>> {
  if (materials.length === 0) {
    return new Map();
  }

  // Get embeddings for all materials
  const embeddings = await getAllEmbeddings(
    materials.map((m) => ({ id: m.id, content: m.content }))
  );

  // Convert to array format for UMAP
  const ids = Array.from(embeddings.keys());
  const vectors = ids.map((id) => embeddings.get(id)!);

  if (vectors.length < 2) {
    // Not enough points for UMAP, place single point in center
    const result = new Map<string, { x: number; y: number }>();
    if (ids.length === 1) {
      result.set(ids[0], { x: width / 2, y: height / 2 });
    }
    return result;
  }

  // Create numeric labels for supervised UMAP
  const labels = ids.map((id) => {
    const clusterId = clusterMap.get(id) || clusterIds[0];
    return clusterIds.indexOf(clusterId);
  });

  // Configure UMAP with seeded random for deterministic but fast results
  const nPoints = vectors.length;
  const umap = new UMAP({
    nComponents: 2,
    nNeighbors: Math.min(15, Math.max(2, Math.floor(nPoints / 2))),
    minDist: 0.25,
    spread: 1.0,
    nEpochs: Math.min(200, nPoints * 10), // Limit epochs for performance
    random: createSeededRandom(42), // Seeded random for deterministic layout
  });

  // Supervised fit - pass labels to keep same-cluster points together
  const embedding2D = umap.fit(vectors, labels);

  // Scale to canvas dimensions
  const xExtent = extent(embedding2D, (d) => d[0]) as [number, number];
  const yExtent = extent(embedding2D, (d) => d[1]) as [number, number];

  // Handle edge case where all points are the same
  const xRange = xExtent[1] - xExtent[0] || 1;
  const yRange = yExtent[1] - yExtent[0] || 1;

  const xScale = scaleLinear()
    .domain([xExtent[0] - xRange * 0.1, xExtent[1] + xRange * 0.1])
    .range([PADDING, width - PADDING]);

  const yScale = scaleLinear()
    .domain([yExtent[0] - yRange * 0.1, yExtent[1] + yRange * 0.1])
    .range([PADDING, height - PADDING]);

  // Create result map
  const result = new Map<string, { x: number; y: number }>();
  ids.forEach((id, i) => {
    result.set(id, {
      x: xScale(embedding2D[i][0]),
      y: yScale(embedding2D[i][1]),
    });
  });

  return result;
}

/**
 * Generate contour density data
 */
function generateContours(
  points: TerritoryPoint[],
  width: number,
  height: number
): GeoJSON.MultiPolygon[] {
  if (points.length < 3) {
    return [];
  }

  const density = contourDensity<TerritoryPoint>()
    .x((d) => d.x)
    .y((d) => d.y)
    .weight((d) => d.weight)
    .size([width, height])
    .cellSize(8)
    .bandwidth(30)
    .thresholds(10);

  const contours = density(points);

  return contours.map((c) => ({
    type: 'MultiPolygon' as const,
    coordinates: c.coordinates,
  }));
}

/**
 * Generate Voronoi tessellation for cluster territories
 */
function generateVoronoi(
  clusters: TerritoryCluster[],
  width: number,
  height: number
): Delaunay.Voronoi<TerritoryCluster> | null {
  if (clusters.length < 2) {
    return null;
  }

  const delaunay = Delaunay.from(
    clusters,
    (c) => c.centroid.x,
    (c) => c.centroid.y
  );

  return delaunay.voronoi([0, 0, width, height]);
}

/**
 * Build complete territory data from materials
 */
export async function buildTerritoryData(
  materials: RawMaterial[],
  options: {
    width?: number;
    height?: number;
  } = {}
): Promise<TerritoryData> {
  const width = options.width || DEFAULT_WIDTH;
  const height = options.height || DEFAULT_HEIGHT;

  // Handle empty case
  if (materials.length === 0) {
    return {
      points: [],
      clusters: [],
      contours: [],
      voronoi: null,
      bounds: { width, height },
    };
  }

  // Step 1: Cluster materials in embedding space (semantically accurate)
  const clusterResult = await clusterMaterials(
    materials.map((m) => ({ id: m.id, content: m.content }))
  );

  // Get cluster IDs for supervised UMAP
  const clusterIds = clusterResult.clusters.map((c) => c.id);

  // Step 2: Project to 2D with supervised UMAP (keeps same-cluster points together)
  const positions = await projectToUMAP(
    materials,
    clusterResult.materialClusterMap,
    clusterIds,
    width,
    height
  );

  // Step 3: Build points with weights
  const points: TerritoryPoint[] = materials
    .filter((m) => positions.has(m.id))
    .map((m) => ({
      id: m.id,
      x: positions.get(m.id)!.x,
      y: positions.get(m.id)!.y,
      clusterId: clusterResult.materialClusterMap.get(m.id) || 'unknown',
      weight: calculateWeight(m),
    }));

  // Get embeddings for sub-clustering
  const embeddings = await getAllEmbeddings(
    materials.map((m) => ({ id: m.id, content: m.content }))
  );
  const materialsMap = new Map(materials.map((m) => [m.id, m.content]));

  // Step 4: Build cluster data with centroids and sub-clusters
  const clusters: TerritoryCluster[] = await Promise.all(
    clusterResult.clusters.map(async (cluster, index) => {
      const clusterPoints = points.filter((p) => p.clusterId === cluster.id);

      // Calculate centroid
      const centroid =
        clusterPoints.length > 0
          ? {
              x: clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length,
              y: clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length,
            }
          : { x: width / 2, y: height / 2 };

      // Generate sub-clusters for LOD
      const subClusterData = await generateSubClusters(cluster, materialsMap, embeddings);

      // Map sub-clusters to territory format with 2D positions
      const subClusters: TerritorySubCluster[] = subClusterData.map((sub) => {
        const subPoints = clusterPoints.filter((p) => sub.materialIds.includes(p.id));
        const subCentroid =
          subPoints.length > 0
            ? {
                x: subPoints.reduce((sum, p) => sum + p.x, 0) / subPoints.length,
                y: subPoints.reduce((sum, p) => sum + p.y, 0) / subPoints.length,
              }
            : centroid;

        return {
          id: sub.id,
          label: sub.label,
          centroid: subCentroid,
          points: subPoints,
          parentId: cluster.id,
        };
      });

      return {
        id: cluster.id,
        label: cluster.label,
        centroid,
        points: clusterPoints,
        color: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
        materialCount: cluster.materialIds.length,
        subClusters,
      };
    })
  );

  // Step 5: Generate contours
  const contours = generateContours(points, width, height);

  // Step 6: Generate Voronoi
  const voronoi = generateVoronoi(clusters, width, height);

  return {
    points,
    clusters,
    contours,
    voronoi,
    bounds: { width, height },
  };
}

/**
 * Find which cluster a point belongs to using Voronoi
 */
export function findClusterAtPoint(
  data: TerritoryData,
  x: number,
  y: number
): TerritoryCluster | null {
  if (!data.voronoi || data.clusters.length === 0) {
    return null;
  }

  const index = data.voronoi.delaunay.find(x, y);
  return data.clusters[index] || null;
}

/**
 * Get color scale for contours
 */
export function getContourColorScale(maxValue: number) {
  return scaleSequential(interpolateBlues).domain([0, maxValue]);
}

/**
 * Render contour path to SVG path string
 */
export function contourToPath(coordinates: number[][][]): string {
  return coordinates
    .map((ring) =>
      ring
        .map((polygon) =>
          polygon.map((point, i) => `${i === 0 ? 'M' : 'L'}${point[0]},${point[1]}`).join('')
        )
        .join('') + 'Z'
    )
    .join('');
}

/**
 * Get Voronoi cell path for a cluster
 */
export function getVoronoiCellPath(
  data: TerritoryData,
  clusterIndex: number
): string | null {
  if (!data.voronoi) return null;

  const cell = data.voronoi.cellPolygon(clusterIndex);
  if (!cell) return null;

  return (
    cell.map((point, i) => `${i === 0 ? 'M' : 'L'}${point[0]},${point[1]}`).join('') + 'Z'
  );
}
