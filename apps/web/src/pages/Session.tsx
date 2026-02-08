import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaterialsStore, type RawMaterial, type ActivationCard } from '../lib/store/materials';
import { semanticSearch, isModelLoaded, isModelLoading, setProgressCallback, preloadModel } from '../lib/embedding';
import { generateActivationCard } from '../lib/activation-templates';

interface Message {
  id: string;
  role: 'user' | 'echo';
  content: string;
}

type SessionPhase = 'topic-input' | 'material-selection' | 'activation-preview' | 'chat';

export function Session() {
  const navigate = useNavigate();
  const { currentCard, materials, setCurrentCard } = useMaterialsStore();

  // Determine initial phase based on whether we have context
  const initialPhase: SessionPhase = currentCard ? 'chat' : 'topic-input';

  const [phase, setPhase] = useState<SessionPhase>(initialPhase);
  const [topic, setTopic] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<RawMaterial[]>([]);
  const [generatedCard, setGeneratedCard] = useState<ActivationCard | null>(currentCard);
  const [isGenerating, setIsGenerating] = useState(false);

  // Semantic search state
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const [semanticResults, setSemanticResults] = useState<Array<{ id: string; score: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState('');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'card' | 'materials' | null>('card');
  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get source materials for chat phase
  const sourceMaterials = generatedCard
    ? materials.filter((m) => generatedCard.materialIds.includes(m.id))
    : selectedMaterials;

  const card = generatedCard || {
    emotionalAnchor: '',
    livedExperience: '',
    expressions: [],
    invitation: '',
  };

  const hoveredMaterial = hoveredMaterialId
    ? materials.find((m) => m.id === hoveredMaterialId)
    : null;

  // Setup model progress callback
  useEffect(() => {
    setProgressCallback((progress, status) => {
      setModelProgress(progress);
      setModelStatus(status);
    });
    return () => setProgressCallback(null);
  }, []);

  // Preload embedding model when entering topic-input phase
  useEffect(() => {
    if (phase === 'topic-input' && !isModelLoaded() && !isModelLoading()) {
      preloadModel();
    }
  }, [phase]);

  // Semantic search handler
  const handleSemanticSearch = useCallback(async () => {
    if (!topic.trim() || materials.length === 0) return;

    setIsSearching(true);
    try {
      const results = await semanticSearch(
        topic,
        materials.map((m) => ({ id: m.id, content: m.content })),
        10
      );
      setSemanticResults(results);
    } catch (error) {
      console.error('Semantic search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [topic, materials]);

  // Filter materials by topic (keyword search)
  const keywordFilteredMaterials = topic.trim()
    ? materials.filter((m) => {
        const searchText = topic.toLowerCase();
        return (
          m.content.toLowerCase().includes(searchText) ||
          (m.note && m.note.toLowerCase().includes(searchText))
        );
      })
    : materials;

  // Get filtered materials based on search mode
  const filteredMaterials = searchMode === 'semantic' && semanticResults.length > 0
    ? semanticResults
        .map((r) => materials.find((m) => m.id === r.id))
        .filter((m): m is RawMaterial => m !== undefined)
    : keywordFilteredMaterials;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle topic search and move to material selection
  const handleTopicSearch = async () => {
    if (searchMode === 'semantic' && topic.trim()) {
      // Run semantic search first
      setIsSearching(true);
      try {
        const results = await semanticSearch(
          topic,
          materials.map((m) => ({ id: m.id, content: m.content })),
          10
        );
        setSemanticResults(results);

        // Get materials from results
        const resultMaterials = results
          .map((r) => materials.find((m) => m.id === r.id))
          .filter((m): m is RawMaterial => m !== undefined);

        if (resultMaterials.length > 0) {
          setSelectedMaterials(resultMaterials.slice(0, 5));
          setPhase('material-selection');
        }
      } catch (error) {
        console.error('Semantic search failed:', error);
      } finally {
        setIsSearching(false);
      }
    } else if (filteredMaterials.length > 0) {
      setSelectedMaterials(filteredMaterials.slice(0, 5)); // Pre-select top 5
      setPhase('material-selection');
    }
  };

  // Generate activation card from selected materials
  const handleGenerateCard = async () => {
    if (selectedMaterials.length === 0) return;

    setIsGenerating(true);
    try {
      // Uses AI when available, falls back to offline templates
      const cardData = await generateActivationCard(
        selectedMaterials.map((m) => ({
          id: m.id,
          content: m.content,
          note: m.note,
        }))
      );
      setGeneratedCard(cardData);
      setCurrentCard(cardData);
      setPhase('activation-preview');
    } catch (error) {
      console.error('Failed to generate card:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Start chat from activation preview
  const handleStartChat = () => {
    setPhase('chat');
  };

  // Skip to random exploration (no specific topic)
  const handleExploreRandom = () => {
    if (materials.length >= 2) {
      // Randomly select 2-4 materials
      const shuffled = [...materials].sort(() => Math.random() - 0.5);
      setSelectedMaterials(shuffled.slice(0, Math.min(4, shuffled.length)));
      setTopic('(random exploration)');
      setPhase('material-selection');
    }
  };

  // Chat handlers
  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/session/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'demo-session',
          message: userMessage.content,
          context: {
            card: generatedCard,
            materials: sourceMaterials.map((m) => ({
              content: m.content,
              note: m.note,
            })),
            history: messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: Date.now(),
            })),
          },
        }),
      });

      const data = await response.json();
      const echoResponse: Message = {
        id: crypto.randomUUID(),
        role: 'echo',
        content: data.reply,
      };
      setMessages((prev) => [...prev, echoResponse]);
    } catch (error) {
      console.error('Failed to get response:', error);
      const echoResponse: Message = {
        id: crypto.randomUUID(),
        role: 'echo',
        content: "I'm here to help you express your thoughts. What would you like to say?",
      };
      setMessages((prev) => [...prev, echoResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveEcho = () => {
    setIsComplete(true);
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const starterPrompts = [
    `I think what this means is...`,
    `When I experienced this, I felt...`,
    `If I had to explain this to a friend...`,
  ];

  // Completion screen
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-3xl font-semibold text-echo-accent mb-3">Saved</h1>
        <p className="text-echo-muted italic">
          This will become part of your story.
        </p>
      </div>
    );
  }

  // Phase 1: Topic Input
  if (phase === 'topic-input') {
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
              setSemanticResults([]); // Clear semantic results on input change
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleTopicSearch()}
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
                  handleSemanticSearch();
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
            {searchMode === 'semantic' && !isModelLoaded() && modelStatus && (
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
            onClick={handleTopicSearch}
            disabled={filteredMaterials.length === 0 || isSearching}
            className="w-full mt-4 bg-echo-text text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Find Materials
          </button>
        </div>

        <div className="text-center">
          <p className="text-echo-hint text-sm mb-3">Or explore without a specific topic</p>
          <button
            onClick={handleExploreRandom}
            disabled={materials.length < 2}
            className="text-echo-muted hover:text-echo-text transition-colors text-sm underline"
          >
            Surprise me with random materials
          </button>
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

  // Phase 2: Material Selection
  if (phase === 'material-selection') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-echo-text">
              Select Materials
            </h1>
            <p className="text-echo-hint text-sm mt-1">
              {topic && topic !== '(random exploration)'
                ? `Related to "${topic}"`
                : 'Random exploration'}
              {' · '}{selectedMaterials.length} selected
            </p>
          </div>
          <button
            onClick={() => setPhase('topic-input')}
            className="text-echo-hint hover:text-echo-muted text-sm"
          >
            ← Change topic
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {filteredMaterials.map((material) => {
            const isSelected = selectedMaterials.some((m) => m.id === material.id);
            const semanticScore = semanticResults.find((r) => r.id === material.id)?.score;
            return (
              <div
                key={material.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedMaterials((prev) => prev.filter((m) => m.id !== material.id));
                  } else {
                    setSelectedMaterials((prev) => [...prev, material]);
                  }
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-echo-text text-white'
                    : 'bg-white border border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <p className={`text-sm leading-relaxed line-clamp-3 flex-1 ${
                    isSelected ? 'text-white' : 'text-echo-text'
                  }`}>
                    {material.content}
                  </p>
                  {semanticScore !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-echo-hint'
                    }`}>
                      {Math.round(semanticScore * 100)}%
                    </span>
                  )}
                </div>
                {material.note && (
                  <p className={`text-xs mt-2 italic ${
                    isSelected ? 'text-white/70' : 'text-echo-hint'
                  }`}>
                    Note: {material.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleGenerateCard}
          disabled={selectedMaterials.length === 0 || isGenerating}
          className="w-full bg-echo-text text-white py-4 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          {isGenerating ? 'Generating Activation Card...' : `Generate from ${selectedMaterials.length} Materials`}
        </button>
      </div>
    );
  }

  // Phase 3: Activation Preview
  if (phase === 'activation-preview' && generatedCard) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-echo-text">
            Your Activation Card
          </h1>
          <button
            onClick={() => setPhase('material-selection')}
            className="text-echo-hint hover:text-echo-muted text-sm"
          >
            ← Regenerate
          </button>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 mb-6">
          <p className="text-echo-muted italic text-sm mb-6 leading-relaxed">
            {generatedCard.emotionalAnchor}
          </p>

          <div className="border-l-2 border-echo-text bg-gray-50 p-4 mb-8">
            <p className="text-echo-text italic leading-relaxed">
              {generatedCard.livedExperience}
            </p>
          </div>

          <div className="mb-8">
            <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
              Expressions to carry the feeling:
            </p>
            <div className="space-y-2">
              {generatedCard.expressions.map((expr, index) => (
                <p key={index} className="text-echo-muted text-sm">
                  "{expr}"
                </p>
              ))}
            </div>
          </div>

          <p className="text-echo-text leading-relaxed mb-8">
            {generatedCard.invitation}
          </p>

          <button
            onClick={handleStartChat}
            className="w-full bg-echo-text text-white py-4 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Start Echo
          </button>
        </div>

        <p className="text-echo-hint text-sm text-center italic">
          This card will fade. The only way to keep it is to speak.
        </p>
      </div>
    );
  }

  // Phase 4: Chat
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Context Toggle Bar */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setShowContext(!showContext)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showContext
              ? 'bg-echo-text text-white'
              : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
          }`}
        >
          {showContext ? '▼ Context' : '▶ Show Context'}
        </button>
        {showContext && (
          <>
            <button
              onClick={() => setExpandedSection(expandedSection === 'card' ? null : 'card')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                expandedSection === 'card'
                  ? 'bg-gray-200 text-echo-text'
                  : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
              }`}
            >
              Activation Card
            </button>
            <button
              onClick={() => setExpandedSection(expandedSection === 'materials' ? null : 'materials')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                expandedSection === 'materials'
                  ? 'bg-gray-200 text-echo-text'
                  : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
              }`}
            >
              Raw Materials ({sourceMaterials.length})
            </button>
          </>
        )}
      </div>

      {/* Context Panel */}
      {showContext && (
        <div className="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden">
          {expandedSection === 'card' && card.livedExperience && (
            <div className="p-4">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                Activation Card
              </p>
              <div className="border-l-2 border-echo-text bg-gray-50 p-3 mb-3">
                <p className="text-echo-text text-sm italic leading-relaxed">
                  {card.livedExperience}
                </p>
              </div>
              <div className="mb-3">
                <p className="text-echo-hint text-xs mb-2">Expressions you might use:</p>
                <div className="flex flex-wrap gap-2">
                  {card.expressions.map((expr, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 text-echo-muted text-xs rounded cursor-pointer hover:bg-gray-200"
                      onClick={() => setInputText(expr)}
                    >
                      {expr}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-echo-text text-sm">{card.invitation}</p>
            </div>
          )}

          {expandedSection === 'materials' && (
            <div className="p-4">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                Your Raw Materials
              </p>
              <div className="space-y-2 relative">
                {sourceMaterials.map((material) => (
                  <div
                    key={material.id}
                    onMouseEnter={() => setHoveredMaterialId(material.id)}
                    onMouseLeave={() => setHoveredMaterialId(null)}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-echo-text text-sm line-clamp-2">{material.content}</p>
                    {material.note && (
                      <p className="text-echo-hint text-xs mt-1 italic">Note: {material.note}</p>
                    )}
                  </div>
                ))}
                {hoveredMaterial && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-20">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                      <p className="text-echo-hint text-xs uppercase tracking-wide mb-2">Full Content</p>
                      <p className="text-echo-text text-sm leading-relaxed whitespace-pre-wrap">
                        {hoveredMaterial.content}
                      </p>
                      {hoveredMaterial.note && (
                        <p className="text-echo-muted text-sm italic mt-2 pt-2 border-t border-gray-100">
                          Note: {hoveredMaterial.note}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {sourceMaterials.length === 0 && (
                <p className="text-echo-hint text-sm italic">No materials linked.</p>
              )}
            </div>
          )}

          {expandedSection === null && (
            <div className="p-3 text-center">
              <p className="text-echo-hint text-xs">
                Click "Activation Card" or "Raw Materials" above to view context
              </p>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <h2 className="text-2xl font-semibold text-echo-text mb-2">Speak freely.</h2>
            <p className="text-echo-muted italic mb-6">There is no right version yet.</p>
            <div className="w-full max-w-md">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                Not sure where to start? Try one of these:
              </p>
              <div className="space-y-2">
                {starterPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setInputText(prompt)}
                    className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-100 text-echo-muted hover:border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-echo-text text-white rounded-br-sm'
                      : 'bg-white text-echo-text shadow-sm border border-gray-50 rounded-bl-sm'
                  }`}
                >
                  <p className="leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-50">
                  <p className="text-echo-hint">...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Save button */}
      {messages.length >= 2 && (
        <button
          onClick={handleSaveEcho}
          className="mb-3 bg-echo-accent text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors"
        >
          Save this Echo
        </button>
      )}

      {/* Input */}
      <div className="flex gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Express your thoughts..."
          className="flex-1 resize-none focus:outline-none text-echo-text py-2 px-1 max-h-32"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
          className="px-6 py-2 bg-echo-text text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
