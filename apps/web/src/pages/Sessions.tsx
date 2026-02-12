import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaterialsStore, type SessionMemory } from '../lib/store/materials';

export function Sessions() {
  const navigate = useNavigate();
  const { sessionMemories } = useMaterialsStore();
  const [filter, setFilter] = useState<'all' | 'completed' | 'abandoned'>('all');

  // Filter sessions
  const filteredSessions = filter === 'all'
    ? sessionMemories
    : sessionMemories.filter((s) => s.status === filter);

  // Stats
  const totalSessions = sessionMemories.length;
  const completedCount = sessionMemories.filter((s) => s.status === 'completed').length;
  const abandonedCount = sessionMemories.filter((s) => s.status === 'abandoned').length;

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSessionClick = (session: SessionMemory) => {
    navigate('/practice', { state: { resumeSession: session } });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-echo-text">Sessions</h1>
          <p className="text-echo-muted text-sm mt-1">
            {totalSessions} total · {completedCount} completed · {abandonedCount} incomplete
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-echo-hint hover:text-echo-muted text-sm"
        >
          ← Back
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-echo-text text-white'
              : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
          }`}
        >
          All ({totalSessions})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-echo-text text-white'
              : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
          }`}
        >
          Completed ({completedCount})
        </button>
        <button
          onClick={() => setFilter('abandoned')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'abandoned'
              ? 'bg-echo-text text-white'
              : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
          }`}
        >
          Incomplete ({abandonedCount})
        </button>
      </div>

      {/* Sessions list */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50 text-center">
          <p className="text-echo-muted">
            {filter === 'all'
              ? 'No sessions yet. Start a practice session to see your history.'
              : filter === 'completed'
              ? 'No completed sessions yet.'
              : 'No incomplete sessions.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 cursor-pointer hover:border-gray-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        session.status === 'completed' ? 'bg-echo-accent' : 'bg-gray-300'
                      }`}
                    ></span>
                    <span className="text-echo-text font-medium">
                      {session.topic || 'Untitled Session'}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        session.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                  {session.summary && session.summary !== '(no messages)' && (
                    <p className="text-echo-muted text-sm line-clamp-2 ml-4 mt-1">
                      {session.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 ml-4 mt-2 text-xs text-echo-hint">
                    <span>{session.turnCount} turn{session.turnCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{session.materialIds.length} material{session.materialIds.length !== 1 ? 's' : ''}</span>
                    {session.artifactId && (
                      <>
                        <span>·</span>
                        <span className="text-echo-accent">Expression saved</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-echo-hint text-xs">{formatDate(session.createdAt)}</p>
                  {session.exitedAt !== session.createdAt && (
                    <p className="text-echo-hint text-xs mt-1">
                      Ended: {formatDate(session.exitedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
