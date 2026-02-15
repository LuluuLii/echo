import { useState, useMemo } from 'react';
import { useMaterialsStore } from '../lib/store/materials';
import { SessionHistory } from '../components/SessionHistory';
import { TerritoryMap } from '../components/TerritoryMap';
import type { TerritoryCluster } from '../lib/territory';

type ViewMode = 'territory' | 'stats';

export function Insights() {
  const { materials, artifacts, sessionMemories, getMaterial } = useMaterialsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('territory');
  const [selectedCluster, setSelectedCluster] = useState<TerritoryCluster | null>(null);
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);

  // Calculate some basic stats
  const totalMaterials = materials.length;
  const totalArtifacts = artifacts.length;
  const totalSessions = sessionMemories.length;
  const completedSessions = sessionMemories.filter((s) => s.status === 'completed').length;

  // Get materials for selected cluster
  const clusterMaterials = useMemo(() => {
    if (!selectedCluster) return [];
    return selectedCluster.points
      .map((p) => getMaterial(p.id))
      .filter((m): m is NonNullable<typeof m> => m !== undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [selectedCluster, getMaterial]);

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClusterClick = (cluster: TerritoryCluster) => {
    setSelectedCluster(cluster);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-echo-text">Insights</h1>
          <p className="text-echo-muted">Your expression territory at a glance.</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('territory')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'territory'
                ? 'bg-white text-echo-text shadow-sm'
                : 'text-echo-muted hover:text-echo-text'
            }`}
          >
            Territory
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'stats'
                ? 'bg-white text-echo-text shadow-sm'
                : 'text-echo-muted hover:text-echo-text'
            }`}
          >
            Stats
          </button>
        </div>
      </div>

      {viewMode === 'territory' ? (
        <div className="space-y-6">
          {/* Territory Map */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-50 p-4">
            <TerritoryMap
              materials={materials}
              width={800}
              height={500}
              onClusterClick={handleClusterClick}
            />
            <p className="text-echo-hint text-xs mt-3 text-center">
              Scroll to zoom, drag to pan, click a territory to explore
            </p>
          </div>

          {/* Selected Cluster Detail */}
          {selectedCluster && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedCluster.color }}
                  />
                  <h2 className="text-lg font-medium text-echo-text">{selectedCluster.label}</h2>
                  <span className="text-echo-muted text-sm">
                    {selectedCluster.materialCount} materials
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCluster(null)}
                  className="text-echo-muted hover:text-echo-text"
                >
                  Close
                </button>
              </div>

              {/* Materials in cluster */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {clusterMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-echo-text text-sm line-clamp-3">{material.content}</p>
                    <p className="text-echo-hint text-xs mt-2">{formatDate(material.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
              <p className="text-2xl font-semibold text-echo-text">{totalMaterials}</p>
              <p className="text-echo-hint text-xs mt-1">Materials</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
              <p className="text-2xl font-semibold text-echo-text">{totalSessions}</p>
              <p className="text-echo-hint text-xs mt-1">Sessions</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
              <p className="text-2xl font-semibold text-echo-text">{completedSessions}</p>
              <p className="text-echo-hint text-xs mt-1">Completed</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
              <p className="text-2xl font-semibold text-echo-text">{totalArtifacts}</p>
              <p className="text-echo-hint text-xs mt-1">Artifacts</p>
            </div>
          </div>
        </div>
      ) : (
        /* Stats View - Original content */
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
              <p className="text-3xl font-semibold text-echo-text">{totalMaterials}</p>
              <p className="text-echo-hint text-sm mt-1">Materials</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
              <p className="text-3xl font-semibold text-echo-text">{totalSessions}</p>
              <p className="text-echo-hint text-sm mt-1">Sessions</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
              <p className="text-3xl font-semibold text-echo-text">{completedSessions}</p>
              <p className="text-echo-hint text-sm mt-1">Completed</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
              <p className="text-3xl font-semibold text-echo-text">{totalArtifacts}</p>
              <p className="text-echo-hint text-sm mt-1">Artifacts</p>
            </div>
          </div>

          {/* Expression Artifacts */}
          <div>
            <h2 className="text-lg font-medium text-echo-text mb-4">Your Expressions</h2>
            {artifacts.length === 0 ? (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50 text-center">
                <p className="text-echo-muted">
                  No expressions saved yet. Complete a practice session and save your thoughts.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-50 overflow-hidden"
                  >
                    <div
                      onClick={() =>
                        setExpandedArtifact(expandedArtifact === artifact.id ? null : artifact.id)
                      }
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p
                          className={`text-echo-text leading-relaxed ${
                            expandedArtifact === artifact.id ? '' : 'line-clamp-2'
                          }`}
                        >
                          {artifact.content}
                        </p>
                        <span className="text-echo-hint text-xs shrink-0">
                          {expandedArtifact === artifact.id ? '▼' : '▶'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-echo-hint">
                        <span>{formatDate(artifact.createdAt)}</span>
                        {artifact.anchor && (
                          <>
                            <span>·</span>
                            <span className="italic truncate max-w-[200px]">{artifact.anchor}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {expandedArtifact === artifact.id && artifact.materialIds.length > 0 && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-50">
                        <p className="text-echo-hint text-xs mb-2">
                          Based on {artifact.materialIds.length} material(s)
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session History */}
          <div>
            <h2 className="text-lg font-medium text-echo-text mb-4">Session History</h2>
            <SessionHistory limit={5} showViewAll={true} filterStatus="all" />
          </div>
        </div>
      )}
    </div>
  );
}
