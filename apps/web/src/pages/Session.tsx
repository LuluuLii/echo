import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMaterialsStore, type RawMaterial, type ActivationCard, type SessionMemory } from '../lib/store/materials';
import { semanticSearch, isModelLoaded, isModelLoading, setProgressCallback, preloadModel } from '../lib/embedding';
import { generateActivationCard } from '../lib/activation-templates';
import { saveStreamSnapshot, clearStreamSnapshot, type StreamSnapshot } from '../lib/stream-memory';
import {
  TopicInputPhase,
  MaterialSelectionPhase,
  ActivationPreviewPhase,
  ChatPhase,
  type Message,
} from '../components/session';

type SessionPhase = 'topic-input' | 'material-selection' | 'activation-preview' | 'chat';

export function Session() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCard, materials, setCurrentCard, clearCurrentCard, saveArtifact, saveSessionMemory, updateSessionMemory } = useMaterialsStore();

  // Check if resuming a session from navigation state
  const resumeSession = (location.state as { resumeSession?: SessionMemory })?.resumeSession;

  // Session tracking refs
  const sessionIdRef = useRef(resumeSession?.sessionId || crypto.randomUUID());
  const sessionCreatedAtRef = useRef(resumeSession?.createdAt || Date.now());
  const sessionMemoryIdRef = useRef<string | null>(resumeSession?.id || null);
  const sessionSavedRef = useRef(false);

  // Determine initial phase
  const initialPhase: SessionPhase = currentCard || resumeSession ? 'chat' : 'topic-input';

  // Phase state
  const [phase, setPhase] = useState<SessionPhase>(initialPhase);
  const [topic, setTopic] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<RawMaterial[]>([]);
  const [generatedCard, setGeneratedCard] = useState<ActivationCard | null>(currentCard);
  const [isGenerating, setIsGenerating] = useState(false);

  // Search state
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const [semanticResults, setSemanticResults] = useState<Array<{ id: string; score: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState('');

  // Chat state
  const getInitialMessages = (): Message[] => {
    if (resumeSession && initialPhase === 'chat') {
      return [{
        id: crypto.randomUUID(),
        role: 'echo',
        content: `Welcome back! Let's continue exploring "${resumeSession.topic || 'your thoughts'}". Where would you like to pick up?`,
      }];
    }
    if (currentCard && initialPhase === 'chat') {
      return [{
        id: crypto.randomUUID(),
        role: 'echo',
        content: currentCard.invitation,
      }];
    }
    return [];
  };

  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [inputText, setInputText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Derived state
  const sourceMaterials = generatedCard
    ? materials.filter((m) => generatedCard.materialIds.includes(m.id))
    : selectedMaterials;

  const card = generatedCard || {
    emotionalAnchor: '',
    livedExperience: '',
    expressions: [],
    invitation: '',
  };

  const starterPrompts = card.expressions.length > 0
    ? card.expressions
    : ['I think what this means is...', 'When I experienced this, I felt...', 'If I had to explain this to a friend...'];

  const hasUserMessages = messages.filter((m) => m.role === 'user').length > 0;

  // Filtered materials for search
  const keywordFilteredMaterials = topic.trim()
    ? materials.filter((m) => {
        const searchText = topic.toLowerCase();
        return m.content.toLowerCase().includes(searchText) || (m.note && m.note.toLowerCase().includes(searchText));
      })
    : materials;

  const filteredMaterials = searchMode === 'semantic' && semanticResults.length > 0
    ? semanticResults.map((r) => materials.find((m) => m.id === r.id)).filter((m): m is RawMaterial => m !== undefined)
    : keywordFilteredMaterials;

  // ============ Effects ============

  // Setup model progress callback
  useEffect(() => {
    setProgressCallback((progress, status) => {
      setModelProgress(progress);
      setModelStatus(status);
    });
    return () => setProgressCallback(null);
  }, []);

  // Preload embedding model
  useEffect(() => {
    if (phase === 'topic-input' && !isModelLoaded() && !isModelLoading()) {
      preloadModel();
    }
  }, [phase]);

  // Initialize from resumed session
  useEffect(() => {
    if (resumeSession) {
      setTopic(resumeSession.topic || '');
      const resumedMaterials = materials.filter((m) => resumeSession.materialIds.includes(m.id));
      setSelectedMaterials(resumedMaterials);
    }
  }, []);

  // Create session memory when entering chat phase
  useEffect(() => {
    if (phase === 'chat' && !sessionMemoryIdRef.current && !sessionSavedRef.current) {
      const memory = saveSessionMemory({
        sessionId: sessionIdRef.current,
        topic: topic || card.emotionalAnchor || undefined,
        turnCount: 0,
        summary: '(in progress)',
        status: 'abandoned',
        materialIds: sourceMaterials.map((m) => m.id),
        createdAt: sessionCreatedAtRef.current,
      });
      sessionMemoryIdRef.current = memory.id;
    }
  }, [phase, topic, card.emotionalAnchor, sourceMaterials, saveSessionMemory]);

  // Auto-save on page leave
  useEffect(() => {
    if (phase !== 'chat') return;

    const saveSessionState = () => {
      if (sessionSavedRef.current || !sessionMemoryIdRef.current) return;
      const userMessages = messages.filter((m) => m.role === 'user');
      const turnCount = userMessages.length;
      const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
      updateSessionMemory(sessionMemoryIdRef.current, {
        turnCount,
        summary: turnCount > 0 ? lastUserMessage.slice(0, 200) : '(no messages)',
        exitedAt: Date.now(),
      });
    };

    const handleBeforeUnload = () => saveSessionState();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveSessionState();
    };
  }, [phase, messages, updateSessionMemory]);

  // Save stream snapshot every 5 turns
  useEffect(() => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const turnCount = userMessages.length;

    if (turnCount > 0 && turnCount % 5 === 0) {
      const lastUserMsg = userMessages[userMessages.length - 1];
      const echoMessages = messages.filter((m) => m.role === 'echo');
      const lastEchoMsg = echoMessages[echoMessages.length - 1];

      const snapshot: StreamSnapshot = {
        sessionId: sessionIdRef.current,
        turnCount,
        lastUserMessage: lastUserMsg?.content || '',
        lastEchoResponse: lastEchoMsg?.content || '',
        topic: topic || undefined,
        materialIds: sourceMaterials.map((m) => m.id),
        cardAnchor: card.emotionalAnchor || undefined,
        timestamp: Date.now(),
      };
      saveStreamSnapshot(snapshot);
    }
  }, [messages, topic, sourceMaterials, card.emotionalAnchor]);

  // ============ Handlers ============

  const handleSemanticSearch = useCallback(async () => {
    if (!topic.trim() || materials.length === 0) return;
    setIsSearching(true);
    try {
      const results = await semanticSearch(topic, materials.map((m) => ({ id: m.id, content: m.content })), 10);
      setSemanticResults(results);
    } catch (error) {
      console.error('Semantic search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [topic, materials]);

  const handleTopicSearch = async () => {
    if (searchMode === 'semantic' && topic.trim()) {
      setIsSearching(true);
      try {
        const results = await semanticSearch(topic, materials.map((m) => ({ id: m.id, content: m.content })), 10);
        setSemanticResults(results);
        const resultMaterials = results.map((r) => materials.find((m) => m.id === r.id)).filter((m): m is RawMaterial => m !== undefined);
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
      setSelectedMaterials(filteredMaterials.slice(0, 5));
      setPhase('material-selection');
    }
  };

  const handleExploreRandom = () => {
    if (materials.length >= 2) {
      const shuffled = [...materials].sort(() => Math.random() - 0.5);
      setSelectedMaterials(shuffled.slice(0, Math.min(4, shuffled.length)));
      setTopic('(random exploration)');
      setPhase('material-selection');
    }
  };

  const handleGenerateCard = async () => {
    if (selectedMaterials.length === 0) return;
    setIsGenerating(true);
    try {
      const cardData = await generateActivationCard(selectedMaterials.map((m) => ({ id: m.id, content: m.content, note: m.note })));
      setGeneratedCard(cardData);
      setCurrentCard(cardData);
      setPhase('activation-preview');
    } catch (error) {
      console.error('Failed to generate card:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartChat = () => {
    setPhase('chat');
    if (generatedCard) {
      setMessages([{ id: crypto.randomUUID(), role: 'echo', content: generatedCard.invitation }]);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: inputText.trim() };
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
            materials: sourceMaterials.map((m) => ({ content: m.content, note: m.note })),
            history: messages.map((m) => ({ id: m.id, role: m.role, content: m.content, timestamp: Date.now() })),
          },
        }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'echo', content: data.reply }]);
    } catch (error) {
      console.error('Failed to get response:', error);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'echo', content: "I'm here to help you express your thoughts. What would you like to say?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEcho = () => {
    sessionSavedRef.current = true;
    const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
    const turnCount = userMessages.length;
    let artifactId: string | undefined;

    if (userMessages.length > 0) {
      const content = userMessages.join('\n\n');
      const materialIds = sourceMaterials.map((m) => m.id);
      const artifact = saveArtifact(content, materialIds, card.emotionalAnchor || undefined);
      artifactId = artifact.id;
    }

    if (sessionMemoryIdRef.current) {
      updateSessionMemory(sessionMemoryIdRef.current, {
        turnCount,
        summary: (userMessages[userMessages.length - 1] || '').slice(0, 200),
        status: 'completed',
        artifactId,
        exitedAt: Date.now(),
      });
    }

    clearStreamSnapshot();
    setIsComplete(true);
    setTimeout(() => navigate('/'), 2000);
  };

  const handleExit = () => {
    sessionSavedRef.current = true;
    const userMessages = messages.filter((m) => m.role === 'user');
    const turnCount = userMessages.length;

    if (sessionMemoryIdRef.current) {
      updateSessionMemory(sessionMemoryIdRef.current, {
        turnCount,
        summary: turnCount > 0 ? (userMessages[userMessages.length - 1]?.content || '').slice(0, 200) : '(no messages)',
        status: 'abandoned',
        exitedAt: Date.now(),
      });
    }

    clearStreamSnapshot();
    clearCurrentCard();

    // Reset for next session
    sessionMemoryIdRef.current = null;
    sessionSavedRef.current = false;
    sessionIdRef.current = crypto.randomUUID();
    sessionCreatedAtRef.current = Date.now();

    setPhase('topic-input');
    setMessages([]);
    setTopic('');
    setSelectedMaterials([]);
    setGeneratedCard(null);
  };

  // ============ Render ============

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-3xl font-semibold text-echo-accent mb-3">Saved</h1>
        <p className="text-echo-muted italic">This will become part of your story.</p>
      </div>
    );
  }

  if (phase === 'topic-input') {
    return (
      <TopicInputPhase
        topic={topic}
        setTopic={setTopic}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        isSearching={isSearching}
        modelProgress={modelProgress}
        modelStatus={modelStatus}
        isModelLoaded={isModelLoaded()}
        filteredMaterials={filteredMaterials}
        semanticResults={semanticResults}
        materials={materials}
        onSemanticSearch={handleSemanticSearch}
        onTopicSearch={handleTopicSearch}
        onExploreRandom={handleExploreRandom}
        onClearSemanticResults={() => setSemanticResults([])}
      />
    );
  }

  if (phase === 'material-selection') {
    return (
      <MaterialSelectionPhase
        topic={topic}
        filteredMaterials={filteredMaterials}
        selectedMaterials={selectedMaterials}
        setSelectedMaterials={setSelectedMaterials}
        semanticResults={semanticResults}
        isGenerating={isGenerating}
        onBack={() => setPhase('topic-input')}
        onGenerateCard={handleGenerateCard}
      />
    );
  }

  if (phase === 'activation-preview' && generatedCard) {
    return (
      <ActivationPreviewPhase
        card={generatedCard}
        onBack={() => setPhase('material-selection')}
        onStartChat={handleStartChat}
      />
    );
  }

  return (
    <ChatPhase
      messages={messages}
      inputText={inputText}
      setInputText={setInputText}
      isLoading={isLoading}
      card={card}
      sourceMaterials={sourceMaterials}
      starterPrompts={starterPrompts}
      hasUserMessages={hasUserMessages}
      onSend={handleSend}
      onSaveEcho={handleSaveEcho}
      onExit={handleExit}
    />
  );
}
