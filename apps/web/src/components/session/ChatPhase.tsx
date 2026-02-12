import { ChatContextPanel } from './ChatContextPanel';
import { ChatMessages, type Message } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { type RawMaterial } from '../../lib/store/materials';

interface CardData {
  emotionalAnchor: string;
  livedExperience: string;
  expressions: string[];
  invitation: string;
}

interface ChatPhaseProps {
  messages: Message[];
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  card: CardData;
  sourceMaterials: RawMaterial[];
  starterPrompts: string[];
  hasUserMessages: boolean;
  onSend: () => void;
  onSaveEcho: () => void;
  onExit: () => void;
}

export function ChatPhase({
  messages,
  inputText,
  setInputText,
  isLoading,
  card,
  sourceMaterials,
  starterPrompts,
  hasUserMessages,
  onSend,
  onSaveEcho,
  onExit,
}: ChatPhaseProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Top Bar: Exit Button */}
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={onExit}
          className="px-3 py-1.5 rounded-lg text-xs text-echo-hint hover:text-echo-muted hover:bg-gray-100 transition-colors"
        >
          Exit
        </button>
      </div>

      {/* Context Panel */}
      <ChatContextPanel
        card={card}
        sourceMaterials={sourceMaterials}
        onExpressionClick={setInputText}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pb-4">
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          starterPrompts={starterPrompts}
          onStarterClick={setInputText}
        />
      </div>

      {/* Save button - show when user has sent at least one message */}
      {hasUserMessages && (
        <button
          onClick={onSaveEcho}
          className="mb-3 bg-echo-accent text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors"
        >
          Save this Echo
        </button>
      )}

      {/* Input */}
      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        isLoading={isLoading}
        onSend={onSend}
      />
    </div>
  );
}
