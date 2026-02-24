import { ChatContextPanel } from './ChatContextPanel';
import { ChatMessages, type Message } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { type RawMaterial } from '../../lib/store/materials';
import { type CreationAction } from '../../lib/llm/prompts/creation-mode';

type SessionMode = 'dialog' | 'creation';

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
  sessionMode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  onSend: () => void;
  onSaveEcho: () => void;
  onExit: () => void;
  onToolRequest?: (tool: 'translate' | 'hints' | 'dictionary', context: string) => void;
  onCreationAction?: (action: CreationAction, content: string) => void;
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
  sessionMode,
  onModeChange,
  onSend,
  onSaveEcho,
  onExit,
  onToolRequest,
  onCreationAction,
}: ChatPhaseProps) {
  // Get all user messages content for creation mode feedback
  const userContent = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n\n');

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Top Bar: Mode Toggle + Exit Button */}
      <div className="flex items-center justify-between mb-2">
        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => onModeChange('dialog')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              sessionMode === 'dialog'
                ? 'bg-white text-echo-text shadow-sm'
                : 'text-echo-muted hover:text-echo-text'
            }`}
          >
            Dialog
          </button>
          <button
            onClick={() => onModeChange('creation')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              sessionMode === 'creation'
                ? 'bg-white text-echo-text shadow-sm'
                : 'text-echo-muted hover:text-echo-text'
            }`}
          >
            Creation
          </button>
        </div>

        <button
          onClick={onExit}
          className="px-3 py-1.5 rounded-lg text-xs text-echo-hint hover:text-echo-muted hover:bg-gray-100 transition-colors"
        >
          Exit
        </button>
      </div>

      {/* Mode hint */}
      {sessionMode === 'creation' && (
        <div className="mb-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
          <p className="text-purple-700 text-xs">
            Creation Mode: Write freely. Use the buttons below to get feedback or hints when you're ready.
          </p>
        </div>
      )}

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

      {/* Creation Mode Actions - show when there's user content */}
      {sessionMode === 'creation' && userContent && onCreationAction && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => onCreationAction('feedback', userContent)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-50"
          >
            Get Feedback
          </button>
          <button
            onClick={() => onCreationAction('check', userContent)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            Quick Check
          </button>
          <button
            onClick={() => onCreationAction('continue', userContent)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
          >
            Help Continue
          </button>
        </div>
      )}

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
        onToolRequest={onToolRequest}
      />
    </div>
  );
}
