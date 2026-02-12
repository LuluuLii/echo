import { useRef, useEffect } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'echo';
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  starterPrompts: string[];
  onStarterClick: (prompt: string) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  starterPrompts,
  onStarterClick,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const userMessages = messages.filter((m) => m.role === 'user');
  const hasUserMessage = userMessages.length > 0;

  if (!hasUserMessage) {
    // Show welcome and starter prompts (may have Echo's opening message)
    return (
      <div className="flex flex-col h-full">
        {/* Show any existing messages (Echo's opening) */}
        {messages.length > 0 && (
          <div className="space-y-4 mb-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex justify-start"
              >
                <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-white text-echo-text shadow-sm border border-gray-50 rounded-bl-sm">
                  <p className="leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Welcome and starter prompts */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
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
                  onClick={() => onStarterClick(prompt)}
                  className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-100 text-echo-muted hover:border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has user messages - show full conversation
  return (
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
  );
}
