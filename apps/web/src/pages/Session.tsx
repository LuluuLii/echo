import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaterialsStore } from '../lib/store/materials';

interface Message {
  id: string;
  role: 'user' | 'echo';
  content: string;
}

export function Session() {
  const navigate = useNavigate();
  const { currentCard, materials } = useMaterialsStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'card' | 'materials' | null>('card');
  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get source materials
  const sourceMaterials = currentCard
    ? materials.filter((m) => currentCard.materialIds.includes(m.id))
    : materials.slice(0, 3);

  // Fallback card for context display
  const card = currentCard || {
    emotionalAnchor:
      'A moment you became aware of how emotions show up in the body.',
    livedExperience:
      'When I get tense in the water, everything reacts immediately...',
    expressions: [
      'Any tension shows up immediately in the body.',
      'Slowing down helps me regain control.',
    ],
    invitation:
      'If you were explaining this to someone — what would you say?',
  };

  const hoveredMaterial = hoveredMaterialId
    ? materials.find((m) => m.id === hoveredMaterialId)
    : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
            card: currentCard,
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
        content:
          "I'm here to help you express your thoughts. What would you like to say?",
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

  // Starter prompts based on the card
  const starterPrompts = [
    `I think what this means is...`,
    `When I experienced this, I felt...`,
    `If I had to explain this to a friend...`,
  ];

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

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Context Toggle Bar - Always visible */}
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
          {/* Activation Card Section */}
          {expandedSection === 'card' && (
            <div className="p-4">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                Activation Card
              </p>

              {/* Lived Experience */}
              <div className="border-l-2 border-echo-text bg-gray-50 p-3 mb-3">
                <p className="text-echo-text text-sm italic leading-relaxed">
                  {card.livedExperience}
                </p>
              </div>

              {/* Quick expressions */}
              <div className="mb-3">
                <p className="text-echo-hint text-xs mb-2">
                  Expressions you might use:
                </p>
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

              {/* Invitation */}
              <p className="text-echo-text text-sm">
                {card.invitation}
              </p>
            </div>
          )}

          {/* Raw Materials Section */}
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
                    <p className="text-echo-text text-sm line-clamp-2">
                      {material.content}
                    </p>
                    {material.note && (
                      <p className="text-echo-hint text-xs mt-1 italic">
                        Note: {material.note}
                      </p>
                    )}
                  </div>
                ))}

                {/* Hover Preview */}
                {hoveredMaterial && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-20">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                      <p className="text-echo-hint text-xs uppercase tracking-wide mb-2">
                        Full Content
                      </p>
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
                <p className="text-echo-hint text-sm italic">
                  No materials linked to this session.
                </p>
              )}
            </div>
          )}

          {/* Collapsed state - show summary */}
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
            <h2 className="text-2xl font-semibold text-echo-text mb-2">
              Speak freely.
            </h2>
            <p className="text-echo-muted italic mb-6">
              There is no right version yet.
            </p>

            {/* Starter prompts */}
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
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
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
