import { useNavigate } from 'react-router-dom';
import { useMaterialsStore, type SessionMemory } from '../lib/store/materials';

interface SessionHistoryProps {
  limit?: number;
  showViewAll?: boolean;
  showDelete?: boolean;
  filterStatus?: 'completed' | 'abandoned' | 'all';
  onSessionClick?: (session: SessionMemory) => void;
  onSessionDelete?: (session: SessionMemory) => void;
}

export function SessionHistory({
  limit = 5,
  showViewAll = true,
  showDelete = false,
  filterStatus = 'all',
  onSessionClick,
  onSessionDelete,
}: SessionHistoryProps) {
  const navigate = useNavigate();
  const { sessionMemories } = useMaterialsStore();

  // Filter sessions based on status
  const filteredSessions = filterStatus === 'all'
    ? sessionMemories
    : sessionMemories.filter((s) => s.status === filterStatus);

  // Limit the number of sessions shown
  const displaySessions = limit > 0 ? filteredSessions.slice(0, limit) : filteredSessions;

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSessionClick = (session: SessionMemory) => {
    if (onSessionClick) {
      onSessionClick(session);
    } else {
      // Default: navigate to practice with session data
      navigate('/practice', { state: { resumeSession: session } });
    }
  };

  if (filteredSessions.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50 text-center">
        <p className="text-echo-muted">
          {filterStatus === 'abandoned'
            ? 'No incomplete sessions.'
            : filterStatus === 'completed'
            ? 'No completed sessions yet.'
            : 'No practice sessions yet. Start a session from Today or Practice.'}
        </p>
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, session: SessionMemory) => {
    e.stopPropagation();
    if (onSessionDelete) {
      onSessionDelete(session);
    }
  };

  return (
    <div>
      <div className="space-y-2">
        {displaySessions.map((session) => (
          <div
            key={session.id}
            onClick={() => handleSessionClick(session)}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 cursor-pointer hover:border-gray-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      session.status === 'completed' ? 'bg-echo-accent' : 'bg-gray-300'
                    }`}
                  ></span>
                  <span className="text-echo-text font-medium text-sm">
                    {session.topic || 'Untitled Session'}
                  </span>
                </div>
                {session.summary && session.summary !== '(no messages)' && session.summary !== '(in progress)' && (
                  <p className="text-echo-muted text-sm line-clamp-1 ml-4">
                    {session.summary}
                  </p>
                )}
              </div>
              <div className="flex items-start gap-2">
                <div className="text-right shrink-0">
                  <p className="text-echo-hint text-xs">{formatDate(session.createdAt)}</p>
                  <p className="text-echo-hint text-xs">
                    {session.turnCount} turn{session.turnCount !== 1 ? 's' : ''}
                    {session.artifactId && ' · Saved'}
                  </p>
                </div>
                {showDelete && (
                  <button
                    onClick={(e) => handleDelete(e, session)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-echo-hint hover:text-red-500 transition-all"
                    title="Delete session"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showViewAll && filteredSessions.length > limit && (
        <button
          onClick={() => navigate('/sessions')}
          className="mt-3 w-full text-center text-echo-muted hover:text-echo-text text-sm py-2 transition-colors"
        >
          View all ({filteredSessions.length})
        </button>
      )}
    </div>
  );
}
