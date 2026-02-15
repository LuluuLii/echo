/**
 * TerritoryMap Component
 *
 * Renders the Expression Territory visualization with:
 * - Soft gradient regions with clear definition
 * - Visible contour lines for topographic feel
 * - Interactive zoom and pan
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  buildTerritoryData,
  findClusterAtPoint,
  type TerritoryData,
  type TerritoryCluster,
  type TerritorySubCluster,
} from '../lib/territory';
import type { RawMaterial } from '../lib/store/materials';

interface TerritoryMapProps {
  materials: RawMaterial[];
  width?: number;
  height?: number;
  onClusterClick?: (cluster: TerritoryCluster) => void;
}

// Soft, distinct color palette
const CLUSTER_COLORS = [
  { bg: '#E8F0FE', accent: '#4285F4', dark: '#1967D2' }, // Blue
  { bg: '#E6F4EA', accent: '#34A853', dark: '#137333' }, // Green
  { bg: '#F3E8FD', accent: '#A142F4', dark: '#7627BB' }, // Purple
  { bg: '#FEF3E8', accent: '#FA903E', dark: '#C5621C' }, // Orange
  { bg: '#FCE8E6', accent: '#EA4335', dark: '#C5221F' }, // Red
  { bg: '#E8F5F3', accent: '#00BFA5', dark: '#00897B' }, // Teal
  { bg: '#FFF8E1', accent: '#F9AB00', dark: '#E37400' }, // Amber
  { bg: '#E8EAF6', accent: '#5C6BC0', dark: '#3949AB' }, // Indigo
];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Render territory regions using radial gradients
 */
function renderTerritoryRegions(
  ctx: CanvasRenderingContext2D,
  clusters: TerritoryCluster[],
  width: number,
  height: number
) {
  // Base background
  ctx.fillStyle = '#FAFBFC';
  ctx.fillRect(0, 0, width, height);

  if (clusters.length === 0) return;

  // Sort clusters by size (render larger ones first, smaller on top)
  const sortedClusters = [...clusters].sort((a, b) => b.materialCount - a.materialCount);

  // Render each cluster as a soft radial gradient
  for (let i = 0; i < sortedClusters.length; i++) {
    const cluster = sortedClusters[i];
    const colorIndex = clusters.indexOf(cluster) % CLUSTER_COLORS.length;
    const colors = CLUSTER_COLORS[colorIndex];

    const cx = cluster.centroid.x;
    const cy = cluster.centroid.y;

    // Radius based on cluster size and spread
    const baseRadius = 60 + cluster.materialCount * 15;
    const maxRadius = baseRadius * 2.5;

    // Create radial gradient
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
    gradient.addColorStop(0, hexToRgba(colors.bg, 0.9));
    gradient.addColorStop(0.3, hexToRgba(colors.bg, 0.7));
    gradient.addColorStop(0.6, hexToRgba(colors.bg, 0.3));
    gradient.addColorStop(1, hexToRgba(colors.bg, 0));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Render contour lines with clear visibility
 */
function renderContours(
  ctx: CanvasRenderingContext2D,
  contours: GeoJSON.MultiPolygon[],
  clusters: TerritoryCluster[],
  scale: number
) {
  if (contours.length === 0) return;

  ctx.save();

  // Render contours from outer to inner
  for (let i = 0; i < contours.length; i++) {
    const contour = contours[i];
    const progress = i / contours.length;

    // Gradually increase opacity and darkness toward center
    const opacity = 0.15 + progress * 0.25;
    const lineWidth = Math.max(0.8, (1.2 - progress * 0.4) / Math.sqrt(scale));

    ctx.strokeStyle = `rgba(100, 116, 139, ${opacity})`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const ring of contour.coordinates) {
      for (const polygon of ring) {
        if (polygon.length < 3) continue;

        ctx.beginPath();
        ctx.moveTo(polygon[0][0], polygon[0][1]);

        // Smooth curve through points
        for (let j = 1; j < polygon.length; j++) {
          ctx.lineTo(polygon[j][0], polygon[j][1]);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/**
 * Render glow halos around cluster centers
 */
function renderClusterGlows(
  ctx: CanvasRenderingContext2D,
  clusters: TerritoryCluster[]
) {
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const colors = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
    const cx = cluster.centroid.x;
    const cy = cluster.centroid.y;
    const radius = 30 + cluster.materialCount * 8;

    // Inner glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, hexToRgba(colors.accent, 0.15));
    gradient.addColorStop(0.5, hexToRgba(colors.accent, 0.05));
    gradient.addColorStop(1, hexToRgba(colors.accent, 0));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render material points
 */
function renderPoints(
  ctx: CanvasRenderingContext2D,
  data: TerritoryData,
  scale: number
) {
  ctx.save();

  for (const point of data.points) {
    const cluster = data.clusters.find(c => c.id === point.clusterId);
    if (!cluster) continue;

    const colorIndex = data.clusters.indexOf(cluster) % CLUSTER_COLORS.length;
    const colors = CLUSTER_COLORS[colorIndex];
    const radius = Math.max(3, (4 + point.weight * 1.5) / Math.sqrt(scale));

    // Outer glow
    const glowGradient = ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, radius * 2.5
    );
    glowGradient.addColorStop(0, hexToRgba(colors.accent, 0.4));
    glowGradient.addColorStop(0.6, hexToRgba(colors.accent, 0.1));
    glowGradient.addColorStop(1, hexToRgba(colors.accent, 0));

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Core circle
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // White border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = Math.max(1, 1.5 / Math.sqrt(scale));
    ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(point.x - radius * 0.25, point.y - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Render cluster labels
 */
function renderLabels(
  ctx: CanvasRenderingContext2D,
  clusters: TerritoryCluster[],
  scale: number,
  hoveredClusterId: string | null
) {
  ctx.save();

  const baseFontSize = 13;
  const fontSize = Math.max(11, baseFontSize / Math.sqrt(scale));

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const colors = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
    const isHovered = cluster.id === hoveredClusterId;

    const label = cluster.label.length > 16
      ? cluster.label.slice(0, 16) + '…'
      : cluster.label;

    const x = cluster.centroid.x;
    const y = cluster.centroid.y;

    // Measure text
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const metrics = ctx.measureText(label);
    const paddingX = 10;
    const paddingY = 5;
    const pillWidth = metrics.width + paddingX * 2;
    const pillHeight = fontSize + paddingY * 2;

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Pill background
    const bgColor = isHovered ? colors.bg : 'rgba(255, 255, 255, 0.95)';
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();

    // Reset shadow for border
    ctx.shadowColor = 'transparent';

    // Border
    ctx.strokeStyle = isHovered ? colors.accent : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = isHovered ? 1.5 : 1;
    ctx.stroke();

    // Label text
    ctx.fillStyle = isHovered ? colors.dark : '#374151';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);

    // Count badge
    const badgeRadius = Math.max(8, 10 / Math.sqrt(scale));
    const badgeX = x + pillWidth / 2 - badgeRadius + 2;
    const badgeY = y - pillHeight / 2 - badgeRadius / 2;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.fillStyle = 'white';
    ctx.font = `700 ${Math.max(9, 10 / Math.sqrt(scale))}px -apple-system, sans-serif`;
    ctx.fillText(String(cluster.materialCount), badgeX, badgeY + 0.5);
  }

  ctx.restore();
}

/**
 * Render sub-cluster labels (shown at higher zoom levels)
 */
function renderSubClusterLabels(
  ctx: CanvasRenderingContext2D,
  clusters: TerritoryCluster[],
  scale: number
) {
  ctx.save();

  const fontSize = Math.max(9, 11 / Math.sqrt(scale));
  ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const colors = CLUSTER_COLORS[i % CLUSTER_COLORS.length];

    for (const sub of cluster.subClusters) {
      const label = sub.label.length > 12
        ? sub.label.slice(0, 12) + '…'
        : sub.label;

      const x = sub.centroid.x;
      const y = sub.centroid.y;

      // Smaller, lighter pill for sub-clusters
      const metrics = ctx.measureText(label);
      const paddingX = 6;
      const paddingY = 3;
      const pillWidth = metrics.width + paddingX * 2;
      const pillHeight = fontSize + paddingY * 2;

      // Semi-transparent background
      ctx.fillStyle = hexToRgba(colors.bg, 0.85);
      ctx.beginPath();
      ctx.roundRect(x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
      ctx.fill();

      // Dotted border
      ctx.strokeStyle = hexToRgba(colors.accent, 0.4);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label text
      ctx.fillStyle = colors.dark;
      ctx.fillText(label, x, y);
    }
  }

  ctx.restore();
}

/**
 * Render material content previews (shown at highest zoom level)
 */
function renderMaterialPreviews(
  ctx: CanvasRenderingContext2D,
  data: TerritoryData,
  materials: Map<string, string>, // id -> content
  scale: number
) {
  ctx.save();

  const fontSize = Math.max(8, 10 / Math.sqrt(scale));
  ctx.font = `400 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

  for (const point of data.points) {
    const content = materials.get(point.id);
    if (!content) continue;

    // Truncate content
    const preview = content.length > 40
      ? content.slice(0, 40) + '…'
      : content;

    const x = point.x;
    const y = point.y + 12 / scale; // Offset below the point

    // Background
    const metrics = ctx.measureText(preview);
    const padding = 4;
    const bgWidth = Math.min(metrics.width + padding * 2, 150);
    const bgHeight = fontSize + padding * 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, 4);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#4B5563';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Clip text to fit
    const displayText = preview.length > 30 ? preview.slice(0, 30) + '…' : preview;
    ctx.fillText(displayText, x, y);
  }

  ctx.restore();
}

export function TerritoryMap({
  materials,
  width = 800,
  height = 600,
  onClusterClick,
}: TerritoryMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [territoryData, setTerritoryData] = useState<TerritoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<TerritoryCluster | null>(null);

  // Transform state for pan and zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Determine what to show based on zoom level (LOD)
  const showContours = transform.scale >= 0.5;
  const showLabels = true; // Always show main labels
  const showPoints = transform.scale >= 1.0;
  const showSubClusters = transform.scale >= 1.5;
  const showPreviews = transform.scale >= 2.5;

  // Create materials map for previews
  const materialsMap = useMemo(() => {
    return new Map(materials.map(m => [m.id, m.content]));
  }, [materials]);

  // Build territory data when materials change
  useEffect(() => {
    let cancelled = false;

    async function build() {
      if (materials.length === 0) {
        setTerritoryData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await buildTerritoryData(materials, { width, height });
        if (!cancelled) {
          setTerritoryData(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to build territory');
          console.error('Territory build error:', e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    build();

    return () => {
      cancelled = true;
    };
  }, [materials, width, height]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !territoryData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Save state and apply transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Render layers (back to front)
    renderTerritoryRegions(ctx, territoryData.clusters, width, height);
    renderClusterGlows(ctx, territoryData.clusters);

    if (showContours) {
      renderContours(ctx, territoryData.contours, territoryData.clusters, transform.scale);
    }

    if (showPoints) {
      renderPoints(ctx, territoryData, transform.scale);
    }

    // LOD: Show sub-cluster labels at higher zoom
    if (showSubClusters) {
      renderSubClusterLabels(ctx, territoryData.clusters, transform.scale);
    }

    // LOD: Show material previews at highest zoom
    if (showPreviews) {
      renderMaterialPreviews(ctx, territoryData, materialsMap, transform.scale);
    }

    // Main cluster labels (always on top)
    if (showLabels) {
      renderLabels(ctx, territoryData.clusters, transform.scale, hoveredCluster?.id || null);
    }

    ctx.restore();
  }, [territoryData, transform, width, height, hoveredCluster, showPoints, showLabels, showContours, showSubClusters, showPreviews, materialsMap]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      setTransform((t) => ({
        ...t,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
      return;
    }

    // Handle hover
    if (territoryData) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      const cluster = findClusterAtPoint(territoryData, x, y);
      setHoveredCluster(cluster);
    }
  }, [isDragging, dragStart, territoryData, transform]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredCluster(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(5, transform.scale * zoomFactor));

    const scaleChange = newScale / transform.scale;
    const newX = mouseX - (mouseX - transform.x) * scaleChange;
    const newY = mouseY - (mouseY - transform.y) * scaleChange;

    setTransform({
      x: newX,
      y: newY,
      scale: newScale,
    });
  }, [transform]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!territoryData || !canvasRef.current || !onClusterClick) return;
    if (isDragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.scale;
    const y = (e.clientY - rect.top - transform.y) / transform.scale;
    const cluster = findClusterAtPoint(territoryData, x, y);

    if (cluster) {
      onClusterClick(cluster);
    }
  }, [territoryData, transform, onClusterClick, isDragging]);

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-slate-50"
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Building your territory...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 rounded-xl"
        style={{ width, height }}
      >
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Empty state
  if (!territoryData || materials.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-slate-50"
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-slate-600 mb-1">No territory yet</p>
          <p className="text-slate-400 text-sm">Add materials to see your expression map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={resetView}
          className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm border border-slate-200/50 transition-all"
        >
          Reset
        </button>
        <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-sm text-slate-500 shadow-sm border border-slate-200/50">
          {Math.round(transform.scale * 100)}%
        </div>
      </div>

      {/* Hovered cluster info */}
      {hoveredCluster && (
        <div className="absolute bottom-3 left-3 z-10 px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50">
          <p className="font-semibold text-slate-800">{hoveredCluster.label}</p>
          <p className="text-sm text-slate-500">{hoveredCluster.materialCount} materials</p>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="rounded-xl cursor-grab active:cursor-grabbing shadow-inner"
        style={{
          width,
          height,
          background: '#FAFBFC'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={handleClick}
      />
    </div>
  );
}
