interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  onSend: () => void;
}

export function ChatInput({
  inputText,
  setInputText,
  isLoading,
  onSend,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
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
        onClick={onSend}
        disabled={!inputText.trim() || isLoading}
        className="px-6 py-2 bg-echo-text text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
      >
        Send
      </button>
    </div>
  );
}
