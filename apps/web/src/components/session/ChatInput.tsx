import { useState } from 'react';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  onSend: () => void;
  onToolRequest?: (tool: 'translate' | 'hints' | 'dictionary', context: string) => void;
}

export function ChatInput({
  inputText,
  setInputText,
  isLoading,
  onSend,
  onToolRequest,
}: ChatInputProps) {
  const [showTools, setShowTools] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't trigger send during IME composition (Chinese/Japanese input)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
    }
  };

  const handleToolClick = (tool: 'translate' | 'hints' | 'dictionary') => {
    if (onToolRequest) {
      onToolRequest(tool, inputText);
    }
    setShowTools(false);
  };

  const hasInput = inputText.trim().length > 0;

  return (
    <div className="space-y-2">
      {/* Tools Toolbar */}
      {showTools && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-echo-hint text-xs mb-2">
            {hasInput ? 'Get help with your text:' : 'Type something first, then use these tools:'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleToolClick('translate')}
              disabled={isLoading || !hasInput}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>🌐</span>
              <span>Translate</span>
            </button>
            <button
              onClick={() => handleToolClick('hints')}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              <span>💡</span>
              <span>Get Hints</span>
            </button>
            <button
              onClick={() => handleToolClick('dictionary')}
              disabled={isLoading || !hasInput}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>📖</span>
              <span>Dictionary</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="flex gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        {/* Tools Toggle */}
        <button
          onClick={() => setShowTools(!showTools)}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
            showTools
              ? 'bg-echo-text text-white'
              : 'text-echo-muted hover:bg-gray-100 hover:text-echo-text'
          }`}
          title="Expression tools"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </button>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Express your thoughts..."
          className="flex-1 resize-none focus:outline-none text-echo-text py-2 px-1 max-h-32"
          rows={1}
        />

        <button
          onClick={onSend}
          disabled={!inputText.trim() || isLoading}
          className="px-5 py-2 bg-echo-text text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
}
