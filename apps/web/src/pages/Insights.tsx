import { useState, useMemo, useEffect } from 'react';
import { useMaterialsStore } from '../lib/store/materials';
import { useVocabularyStore } from '../lib/store/vocabulary';
import { SessionHistory } from '../components/SessionHistory';
import { TerritoryMap } from '../components/TerritoryMap';
import type { TerritoryCluster } from '../lib/territory';
import type { VocabularyInsight } from '@echo/core/models';

type ViewMode = 'territory' | 'stats';

export function Insights() {
  const { materials, artifacts, sessionMemories, getMaterial } = useMaterialsStore();
  const { init, initialized, generateInsight } = useVocabularyStore();
  const [viewMode, setViewMode] = useState<ViewMode>('territory');
  const [selectedCluster, setSelectedCluster] = useState<TerritoryCluster | null>(null);
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);
  const [vocabInsight, setVocabInsight] = useState<VocabularyInsight | null>(null);

  // Initialize vocabulary store
  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [initialized, init]);

  // Generate vocabulary insight
  useEffect(() => {
    if (initialized) {
      const insight = generateInsight();
      setVocabInsight(insight);
    }
  }, [initialized, generateInsight]);

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

          {/* Vocabulary Progress */}
          <div>
            <h2 className="text-lg font-medium text-echo-text mb-4">Vocabulary Progress</h2>
            {vocabInsight && vocabInsight.stats.totalPassive > 0 ? (
              <div className="space-y-4">
                {/* Vocab Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
                    <p className="text-2xl font-semibold text-echo-text">{vocabInsight.stats.totalPassive}</p>
                    <p className="text-echo-hint text-xs mt-1">Seen</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
                    <p className="text-2xl font-semibold text-amber-600">{vocabInsight.stats.totalActive}</p>
                    <p className="text-echo-hint text-xs mt-1">Used</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
                    <p className="text-2xl font-semibold text-green-600">{vocabInsight.stats.totalMastered}</p>
                    <p className="text-echo-hint text-xs mt-1">Mastered</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 text-center">
                    <p className="text-2xl font-semibold text-echo-text">{Math.round(vocabInsight.stats.activationRate * 100)}%</p>
                    <p className="text-echo-hint text-xs mt-1">Activation</p>
                  </div>
                </div>

                {/* Recommended to Activate */}
                {vocabInsight.recommendedToActivate.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-50 p-4">
                    <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">Words to Try</p>
                    <p className="text-echo-muted text-sm mb-3">
                      You've seen these words but haven't used them yet.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {vocabInsight.recommendedToActivate.slice(0, 10).map((rec) => (
                        <div
                          key={rec.term}
                          className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm cursor-pointer hover:bg-amber-100 transition-colors"
                          title={rec.exampleContext || `Seen ${rec.passiveCount} times`}
                        >
                          {rec.term}
                          <span className="text-amber-500 text-xs ml-1">({rec.passiveCount})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Progress */}
                {(vocabInsight.recentProgress.newlyActivated.length > 0 || vocabInsight.recentProgress.newlyMastered.length > 0) && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-50 p-4">
                    <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">This Week</p>
                    {vocabInsight.recentProgress.newlyActivated.length > 0 && (
                      <div className="mb-3">
                        <p className="text-echo-muted text-xs mb-2">Newly used:</p>
                        <div className="flex flex-wrap gap-2">
                          {vocabInsight.recentProgress.newlyActivated.map((term) => (
                            <span key={term} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {vocabInsight.recentProgress.newlyMastered.length > 0 && (
                      <div>
                        <p className="text-echo-muted text-xs mb-2">Newly mastered:</p>
                        <div className="flex flex-wrap gap-2">
                          {vocabInsight.recentProgress.newlyMastered.map((term) => (
                            <span key={term} className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs">
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50 text-center">
                <p className="text-echo-muted">
                  Vocabulary tracking will appear as you collect materials and express yourself.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
