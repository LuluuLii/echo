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

  return (
    <div className="space-y-2">
      {/* Tools Toolbar */}
      {showTools && (
        <div className="flex gap-2 px-1">
          <button
            onClick={() => handleToolClick('translate')}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <span>Translate</span>
          </button>
          <button
            onClick={() => handleToolClick('hints')}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <span>Hints</span>
          </button>
          <button
            onClick={() => handleToolClick('dictionary')}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <span>Dictionary</span>
          </button>
        </div>
      )}

      {/* Main Input Area */}
      <div className="flex gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        {/* Tools Toggle */}
        <button
          onClick={() => setShowTools(!showTools)}
          className={`p-2 rounded-lg transition-colors ${
            showTools
              ? 'bg-gray-200 text-echo-text'
              : 'text-echo-muted hover:bg-gray-100'
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
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
          className="px-6 py-2 bg-echo-text text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
