import { useState } from 'react';
import { useMaterialsStore } from '../lib/store/materials';
import { SessionHistory } from '../components/SessionHistory';

export function Insights() {
  const { materials, artifacts, sessionMemories } = useMaterialsStore();
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);

  // Calculate some basic stats
  const totalMaterials = materials.length;
  const totalArtifacts = artifacts.length;
  const totalSessions = sessionMemories.length;
  const completedSessions = sessionMemories.filter((s) => s.status === 'completed').length;

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-echo-text mb-2">Insights</h1>
      <p className="text-echo-muted mb-8">
        Your learning journey at a glance.
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
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
      <div className="mb-8">
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
                  onClick={() => setExpandedArtifact(
                    expandedArtifact === artifact.id ? null : artifact.id
                  )}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className={`text-echo-text leading-relaxed ${
                      expandedArtifact === artifact.id ? '' : 'line-clamp-2'
                    }`}>
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
      <div className="mb-8">
        <h2 className="text-lg font-medium text-echo-text mb-4">Session History</h2>
        <SessionHistory limit={5} showViewAll={true} filterStatus="all" />
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50">
        <h2 className="text-lg font-medium text-echo-text mb-4">Coming Soon</h2>
        <ul className="space-y-3 text-echo-muted">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-echo-accent rounded-full"></span>
            Topic clusters visualization
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-echo-accent rounded-full"></span>
            Learning timeline
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-echo-accent rounded-full"></span>
            Expression patterns
          </li>
        </ul>
      </div>
    </div>
  );
}
