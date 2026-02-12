import { useNavigate } from 'react-router-dom';
import { SessionHistory } from '../SessionHistory';
import { type RawMaterial } from '../../lib/store/materials';

interface TopicInputPhaseProps {
  topic: string;
  setTopic: (topic: string) => void;
  searchMode: 'keyword' | 'semantic';
  setSearchMode: (mode: 'keyword' | 'semantic') => void;
  isSearching: boolean;
  modelProgress: number;
  modelStatus: string;
  isModelLoaded: boolean;
  filteredMaterials: RawMaterial[];
  semanticResults: Array<{ id: string; score: number }>;
  materials: RawMaterial[];
  onSemanticSearch: () => void;
  onTopicSearch: () => void;
  onExploreRandom: () => void;
  onClearSemanticResults: () => void;
}

export function TopicInputPhase({
  topic,
  setTopic,
  searchMode,
  setSearchMode,
  isSearching,
  modelProgress,
  modelStatus,
  isModelLoaded,
  filteredMaterials,
  semanticResults,
  materials,
  onSemanticSearch,
  onTopicSearch,
  onExploreRandom,
  onClearSemanticResults,
}: TopicInputPhaseProps) {
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-echo-text mb-2">
          What's on your mind?
        </h1>
        <p className="text-echo-muted">
          Enter a topic or keyword to find related materials from your library.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
        <input
          type="text"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            onClearSemanticResults();
          }}
          onKeyDown={(e) => e.key === 'Enter' && onTopicSearch()}
          placeholder="e.g., swimming, learning, frustration, growth..."
          className="w-full p-4 text-lg border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
          autoFocus
        />

        {/* Search mode toggle */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setSearchMode('keyword')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              searchMode === 'keyword'
                ? 'bg-echo-text text-white'
                : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
            }`}
          >
            Keyword
          </button>
          <button
            onClick={() => {
              setSearchMode('semantic');
              if (topic.trim()) {
                onSemanticSearch();
              }
            }}
            disabled={isSearching}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
              searchMode === 'semantic'
                ? 'bg-echo-text text-white'
                : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
            }`}
          >
            {isSearching ? (
              <>
                <span className="animate-spin">⏳</span>
                Searching...
              </>
            ) : (
              'Semantic'
            )}
          </button>
          {searchMode === 'semantic' && !isModelLoaded && modelStatus && (
            <span className="text-xs text-echo-hint ml-2">
              {modelStatus} ({Math.round(modelProgress)}%)
            </span>
          )}
        </div>

        {topic.trim() && (
          <p className="text-echo-hint text-sm mt-3">
            {filteredMaterials.length} material{filteredMaterials.length !== 1 ? 's' : ''} found
            {searchMode === 'semantic' && semanticResults.length > 0 && ' (by similarity)'}
          </p>
        )}

        <button
          onClick={onTopicSearch}
          disabled={filteredMaterials.length === 0 || isSearching}
          className="w-full mt-4 bg-echo-text text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Find Materials
        </button>
      </div>

      <div className="text-center">
        <p className="text-echo-hint text-sm mb-3">Or explore without a specific topic</p>
        <button
          onClick={onExploreRandom}
          disabled={materials.length < 2}
          className="text-echo-muted hover:text-echo-text transition-colors text-sm underline"
        >
          Surprise me with random materials
        </button>
      </div>

      {/* Incomplete Sessions */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-echo-text mb-3">Continue where you left off</h3>
        <SessionHistory limit={3} showViewAll={true} filterStatus="abandoned" />
      </div>

      {materials.length === 0 && (
        <div className="mt-8 p-4 bg-yellow-50 rounded-xl text-center">
          <p className="text-yellow-800 text-sm">
            Your library is empty. Add some materials first to start practicing.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 text-yellow-700 underline text-sm"
          >
            Go to Library
          </button>
        </div>
      )}
    </div>
  );
}
