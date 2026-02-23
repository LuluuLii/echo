/**
 * Learning Profile Settings Section
 */

import type { LearningState, ProficiencyLevel } from '../../lib/store/user';

interface LearningProfileSectionProps {
  learningState: LearningState | null;
  targetLanguage: string;
  setTargetLanguage: (value: string) => void;
  nativeLanguage: string;
  setNativeLanguage: (value: string) => void;
  proficiencyLevel: ProficiencyLevel;
  setProficiencyLevel: (value: ProficiencyLevel) => void;
  topics: string;
  setTopics: (value: string) => void;
  goals: string;
  setGoals: (value: string) => void;
  saved: boolean;
  onSave: () => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
];

const PROFICIENCY_LEVELS: ProficiencyLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function LearningProfileSection({
  learningState,
  targetLanguage,
  setTargetLanguage,
  nativeLanguage,
  setNativeLanguage,
  proficiencyLevel,
  setProficiencyLevel,
  topics,
  setTopics,
  goals,
  setGoals,
  saved,
  onSave,
}: LearningProfileSectionProps) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-echo-text">Learning Profile</h2>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-green-600 text-sm">Saved!</span>
          )}
          <button
            onClick={onSave}
            className="px-4 py-2 bg-echo-text text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* Learning Stats Summary */}
      {learningState && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-echo-hint">Streak:</span>{' '}
              <span className="font-medium text-echo-text">{learningState.rhythm.streakDays} days</span>
            </div>
            <div>
              <span className="text-echo-hint">Sessions:</span>{' '}
              <span className="font-medium text-echo-text">{learningState.rhythm.totalSessions}</span>
            </div>
            <div>
              <span className="text-echo-hint">Total time:</span>{' '}
              <span className="font-medium text-echo-text">{learningState.rhythm.totalMinutes} min</span>
            </div>
          </div>
        </div>
      )}

      {/* Core Settings */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-echo-muted mb-2">Target Language</label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-echo-muted mb-2">Native Language</label>
          <select
            value={nativeLanguage}
            onChange={(e) => setNativeLanguage(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-echo-muted mb-2">Proficiency Level (CEFR)</label>
        <div className="flex gap-2">
          {PROFICIENCY_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setProficiencyLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                proficiencyLevel === level
                  ? 'bg-echo-text text-white'
                  : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="mb-4">
        <label className="block text-sm text-echo-muted mb-2">
          Preferred Topics <span className="text-echo-hint">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder="e.g., travel, technology, daily life"
          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
        />
      </div>

      <div>
        <label className="block text-sm text-echo-muted mb-2">
          Learning Goals <span className="text-echo-hint">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="e.g., IELTS preparation, daily conversation"
          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
        />
      </div>
    </section>
  );
}
