/**
 * User Store - Manages user profile, learning state, and growth tracking
 */

import { create } from 'zustand';
import {
  saveUserProfile as loroSaveUserProfile,
  getUserProfile as loroGetUserProfile,
  saveLearningState as loroSaveLearningState,
  getLearningState as loroGetLearningState,
  saveTopicProficiency as loroSaveTopicProficiency,
  getTopicProficiency as loroGetTopicProficiency,
  addGrowthEvent as loroAddGrowthEvent,
  getAllGrowthEvents as loroGetAllGrowthEvents,
} from '../../loro';

import type {
  EchoUserProfile,
  LearningSettings,
  UserPreferences,
  UserInsight,
  LearningState,
  LearningFocus,
  LearningGoal,
  TopicProficiency,
  TopicProficiencyEntry,
  GrowthEvent,
  GrowthEventType,
  GrowthEventTags,
} from './types';

import {
  toEchoUserProfile,
  toLoroUserProfile,
  toLearningState,
  toLoroLearningState,
  toTopicProficiency,
  toLoroTopicProficiency,
  toGrowthEvent,
  toLoroGrowthEvent,
} from './converters';

import {
  DEFAULT_USER_ID,
  createDefaultRhythm,
  calculateStreakDays,
  isStreakMilestone,
  determineProficiencyLevel,
  generateOverallAssessment,
} from './helpers';

// Re-export types
export type {
  ProficiencyLevel,
  ExpressionStyle,
  InsightCategory,
  UserInsight,
  LearningSettings,
  UserPreferences,
  EchoUserProfile,
  LearningFocus,
  LearningGoal,
  LearningPlan,
  LearningRhythm,
  LearningState,
  TopicProficiencyLevel,
  TopicStats,
  TopicProficiencyEntry,
  OverallAssessment,
  TopicProficiency,
  GrowthEventType,
  GrowthEventTags,
  GrowthEvent,
} from './types';

// ============ Store Interface ============

interface UserStore {
  // State
  profile: EchoUserProfile | null;
  learningState: LearningState | null;
  topicProficiency: TopicProficiency | null;
  growthEvents: GrowthEvent[];
  initialized: boolean;

  // Initialization
  init: () => void;
  reload: () => void;

  // Profile operations
  hasProfile: () => boolean;
  createProfile: (learning: LearningSettings, preferences?: UserPreferences) => EchoUserProfile;
  updateLearningSettings: (settings: Partial<LearningSettings>) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  addInsight: (insight: Omit<UserInsight, 'id' | 'firstMentioned' | 'lastMentioned' | 'mentionCount'>) => void;

  // Learning state operations
  recordSession: (params: {
    topic?: string;
    durationMinutes: number;
    savedArtifact?: boolean;
  }) => void;
  setCurrentFocus: (focus: LearningFocus | undefined) => void;
  addLearningGoal: (goal: Omit<LearningGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLearningGoal: (goalId: string, updates: Partial<Pick<LearningGoal, 'description' | 'targetDate' | 'progress'>>) => void;
  setWeeklyTarget: (target: { sessionsPerWeek: number; minutesPerSession: number } | undefined) => void;

  // Topic proficiency operations
  getTopicEntry: (topic: string) => TopicProficiencyEntry | undefined;
  refreshOverallAssessment: () => void;

  // Growth event operations
  addGrowthEvent: (params: {
    eventType: GrowthEventType;
    eventData: string;
    eventTags?: GrowthEventTags;
    sessionId?: string;
    artifactId?: string;
    materialIds?: string[];
  }) => GrowthEvent;
  getGrowthEvents: (options?: {
    startDate?: number;
    endDate?: number;
    limit?: number;
  }) => GrowthEvent[];
  getRecentMilestones: (limit?: number) => GrowthEvent[];
}

// ============ Store Implementation ============

export const useUserStore = create<UserStore>((set, get) => ({
  profile: null,
  learningState: null,
  topicProficiency: null,
  growthEvents: [],
  initialized: false,

  init: () => {
    if (get().initialized) return;

    const loroProfile = loroGetUserProfile(DEFAULT_USER_ID);
    const profile = loroProfile ? toEchoUserProfile(loroProfile) : null;

    const loroState = loroGetLearningState(DEFAULT_USER_ID);
    const learningState = loroState ? toLearningState(loroState) : null;

    const loroTopicProf = loroGetTopicProficiency(DEFAULT_USER_ID);
    const topicProficiency = loroTopicProf ? toTopicProficiency(loroTopicProf) : null;

    const loroEvents = loroGetAllGrowthEvents(DEFAULT_USER_ID).slice(0, 100);
    const growthEvents = loroEvents.map(toGrowthEvent);

    set({ profile, learningState, topicProficiency, growthEvents, initialized: true });
  },

  reload: () => {
    const loroProfile = loroGetUserProfile(DEFAULT_USER_ID);
    const profile = loroProfile ? toEchoUserProfile(loroProfile) : null;

    const loroState = loroGetLearningState(DEFAULT_USER_ID);
    const learningState = loroState ? toLearningState(loroState) : null;

    const loroTopicProf = loroGetTopicProficiency(DEFAULT_USER_ID);
    const topicProficiency = loroTopicProf ? toTopicProficiency(loroTopicProf) : null;

    const loroEvents = loroGetAllGrowthEvents(DEFAULT_USER_ID).slice(0, 100);
    const growthEvents = loroEvents.map(toGrowthEvent);

    set({ profile, learningState, topicProficiency, growthEvents });
  },

  hasProfile: () => get().profile !== null,

  createProfile: (learning, preferences = {}) => {
    const now = Date.now();
    const profile: EchoUserProfile = {
      id: crypto.randomUUID(),
      userId: DEFAULT_USER_ID,
      learning,
      preferences,
      insights: [],
      createdAt: now,
      updatedAt: now,
    };

    loroSaveUserProfile(toLoroUserProfile(profile));

    const learningState: LearningState = {
      userId: DEFAULT_USER_ID,
      rhythm: createDefaultRhythm(),
      createdAt: now,
      updatedAt: now,
    };
    loroSaveLearningState(toLoroLearningState(learningState));

    const topicProficiency: TopicProficiency = {
      userId: DEFAULT_USER_ID,
      topics: [],
      createdAt: now,
      updatedAt: now,
    };
    loroSaveTopicProficiency(toLoroTopicProficiency(topicProficiency));

    set({ profile, learningState, topicProficiency });
    return profile;
  },

  updateLearningSettings: (settings) => {
    const { profile } = get();
    if (!profile) return;

    const updated: EchoUserProfile = {
      ...profile,
      learning: { ...profile.learning, ...settings },
      updatedAt: Date.now(),
    };

    loroSaveUserProfile(toLoroUserProfile(updated));
    set({ profile: updated });
  },

  updatePreferences: (preferences) => {
    const { profile } = get();
    if (!profile) return;

    const updated: EchoUserProfile = {
      ...profile,
      preferences: { ...profile.preferences, ...preferences },
      updatedAt: Date.now(),
    };

    loroSaveUserProfile(toLoroUserProfile(updated));
    set({ profile: updated });
  },

  addInsight: (insight) => {
    const { profile } = get();
    if (!profile) return;

    const now = Date.now();
    const existingIndex = profile.insights.findIndex(
      (i) => i.category === insight.category && i.content.toLowerCase() === insight.content.toLowerCase()
    );

    let updatedInsights: UserInsight[];

    if (existingIndex >= 0) {
      updatedInsights = profile.insights.map((i, idx) =>
        idx === existingIndex
          ? {
              ...i,
              confidence: Math.max(i.confidence, insight.confidence),
              lastMentioned: now,
              mentionCount: i.mentionCount + 1,
            }
          : i
      );
    } else {
      const newInsight: UserInsight = {
        id: crypto.randomUUID(),
        ...insight,
        firstMentioned: now,
        lastMentioned: now,
        mentionCount: 1,
      };
      updatedInsights = [...profile.insights, newInsight];
    }

    const updated: EchoUserProfile = {
      ...profile,
      insights: updatedInsights,
      updatedAt: now,
    };

    loroSaveUserProfile(toLoroUserProfile(updated));
    set({ profile: updated });
  },

  recordSession: ({ topic, durationMinutes, savedArtifact = false }) => {
    let { learningState, topicProficiency, growthEvents } = get();
    const now = Date.now();
    const newGrowthEvents: GrowthEvent[] = [];

    if (!learningState) {
      learningState = {
        userId: DEFAULT_USER_ID,
        rhythm: createDefaultRhythm(),
        createdAt: now,
        updatedAt: now,
      };
    }

    const { rhythm } = learningState;
    const weekday = new Date(now).getDay();
    const oldStreakDays = rhythm.streakDays;

    const newStreakDays = calculateStreakDays(rhythm.lastPracticeAt, rhythm.streakDays, now);
    const newTotalSessions = rhythm.totalSessions + 1;
    const newTotalMinutes = rhythm.totalMinutes + durationMinutes;
    const newAverageSessionLength = newTotalMinutes / newTotalSessions;

    const newPracticesByWeekday = [...rhythm.practicesByWeekday];
    newPracticesByWeekday[weekday] += 1;

    const updatedState: LearningState = {
      ...learningState,
      currentFocus: topic
        ? { topic, startedAt: learningState.currentFocus?.startedAt || now }
        : learningState.currentFocus,
      rhythm: {
        lastPracticeAt: now,
        streakDays: newStreakDays,
        totalSessions: newTotalSessions,
        totalMinutes: newTotalMinutes,
        averageSessionLength: Math.round(newAverageSessionLength * 10) / 10,
        practicesByWeekday: newPracticesByWeekday,
      },
      updatedAt: now,
    };

    loroSaveLearningState(toLoroLearningState(updatedState));

    const practiceEvent: GrowthEvent = {
      id: crypto.randomUUID(),
      userId: DEFAULT_USER_ID,
      eventType: 'practice',
      eventData: topic ? `Practiced "${topic}" for ${durationMinutes} minutes` : `Practice session (${durationMinutes} min)`,
      eventTags: { topic, count: durationMinutes },
      createdAt: now,
    };
    loroAddGrowthEvent(toLoroGrowthEvent(practiceEvent));
    newGrowthEvents.push(practiceEvent);

    if (newStreakDays > oldStreakDays && isStreakMilestone(newStreakDays)) {
      const streakEvent: GrowthEvent = {
        id: crypto.randomUUID(),
        userId: DEFAULT_USER_ID,
        eventType: 'streak',
        eventData: `Reached a ${newStreakDays}-day practice streak!`,
        eventTags: { streakDays: newStreakDays },
        createdAt: now,
      };
      loroAddGrowthEvent(toLoroGrowthEvent(streakEvent));
      newGrowthEvents.push(streakEvent);
    }

    let updatedProficiency: TopicProficiency | null = null;
    if (topic) {
      if (!topicProficiency) {
        topicProficiency = {
          userId: DEFAULT_USER_ID,
          topics: [],
          createdAt: now,
          updatedAt: now,
        };
      }

      const existingEntry = topicProficiency.topics.find(t => t.topic.toLowerCase() === topic.toLowerCase());

      if (existingEntry) {
        const oldLevel = existingEntry.proficiencyLevel;

        const updatedEntry: TopicProficiencyEntry = {
          ...existingEntry,
          stats: {
            ...existingEntry.stats,
            sessionsCount: existingEntry.stats.sessionsCount + 1,
            artifactsCount: savedArtifact ? existingEntry.stats.artifactsCount + 1 : existingEntry.stats.artifactsCount,
            lastPracticeAt: now,
          },
          updatedAt: now,
        };
        updatedEntry.proficiencyLevel = determineProficiencyLevel(updatedEntry.stats);
        const newLevel = updatedEntry.proficiencyLevel;

        const updatedTopics = topicProficiency.topics.map(t =>
          t.topic.toLowerCase() === topic.toLowerCase() ? updatedEntry : t
        );

        updatedProficiency = {
          ...topicProficiency,
          topics: updatedTopics,
          overallAssessment: generateOverallAssessment(updatedTopics),
          updatedAt: now,
        };

        if (newLevel !== oldLevel) {
          const levelEvent: GrowthEvent = {
            id: crypto.randomUUID(),
            userId: DEFAULT_USER_ID,
            eventType: 'topic_leveled',
            eventData: `Reached ${newLevel} level in "${topic}"!`,
            eventTags: { topic, proficiencyLevel: newLevel },
            createdAt: now,
          };
          loroAddGrowthEvent(toLoroGrowthEvent(levelEvent));
          newGrowthEvents.push(levelEvent);
        }
      } else {
        const newTopicEntry: TopicProficiencyEntry = {
          topic,
          proficiencyLevel: 'beginner',
          stats: {
            sessionsCount: 1,
            artifactsCount: savedArtifact ? 1 : 0,
            vocabularyActive: 0,
            vocabularyMastered: 0,
            lastPracticeAt: now,
          },
          fluentExpressions: [],
          weakPoints: [],
          createdAt: now,
          updatedAt: now,
        };

        const updatedTopics = [...topicProficiency.topics, newTopicEntry];
        updatedProficiency = {
          ...topicProficiency,
          topics: updatedTopics,
          overallAssessment: generateOverallAssessment(updatedTopics),
          updatedAt: now,
        };

        const startEvent: GrowthEvent = {
          id: crypto.randomUUID(),
          userId: DEFAULT_USER_ID,
          eventType: 'topic_started',
          eventData: `Started practicing "${topic}"`,
          eventTags: { topic },
          createdAt: now,
        };
        loroAddGrowthEvent(toLoroGrowthEvent(startEvent));
        newGrowthEvents.push(startEvent);
      }

      loroSaveTopicProficiency(toLoroTopicProficiency(updatedProficiency));
    }

    const updatedGrowthEvents = [...newGrowthEvents, ...growthEvents].slice(0, 100);
    if (updatedProficiency) {
      set({ learningState: updatedState, topicProficiency: updatedProficiency, growthEvents: updatedGrowthEvents });
    } else {
      set({ learningState: updatedState, growthEvents: updatedGrowthEvents });
    }
  },

  setCurrentFocus: (focus) => {
    const { learningState } = get();
    if (!learningState) return;

    const updated: LearningState = {
      ...learningState,
      currentFocus: focus,
      updatedAt: Date.now(),
    };

    loroSaveLearningState(toLoroLearningState(updated));
    set({ learningState: updated });
  },

  addLearningGoal: (goal) => {
    const { learningState } = get();
    if (!learningState) return;

    const now = Date.now();
    const newGoal: LearningGoal = {
      id: crypto.randomUUID(),
      ...goal,
      createdAt: now,
      updatedAt: now,
    };

    const currentPlan = learningState.learningPlan || { goals: [] };
    const updated: LearningState = {
      ...learningState,
      learningPlan: {
        ...currentPlan,
        goals: [...currentPlan.goals, newGoal],
      },
      updatedAt: now,
    };

    loroSaveLearningState(toLoroLearningState(updated));
    set({ learningState: updated });
  },

  updateLearningGoal: (goalId, updates) => {
    const { learningState } = get();
    if (!learningState?.learningPlan) return;

    const now = Date.now();
    const updated: LearningState = {
      ...learningState,
      learningPlan: {
        ...learningState.learningPlan,
        goals: learningState.learningPlan.goals.map((g) =>
          g.id === goalId ? { ...g, ...updates, updatedAt: now } : g
        ),
      },
      updatedAt: now,
    };

    loroSaveLearningState(toLoroLearningState(updated));
    set({ learningState: updated });
  },

  setWeeklyTarget: (target) => {
    const { learningState } = get();
    if (!learningState) return;

    const now = Date.now();
    const currentPlan = learningState.learningPlan || { goals: [] };
    const updated: LearningState = {
      ...learningState,
      learningPlan: {
        ...currentPlan,
        weeklyTarget: target,
      },
      updatedAt: now,
    };

    loroSaveLearningState(toLoroLearningState(updated));
    set({ learningState: updated });
  },

  getTopicEntry: (topic) => {
    const { topicProficiency } = get();
    if (!topicProficiency) return undefined;

    return topicProficiency.topics.find(
      t => t.topic.toLowerCase() === topic.toLowerCase()
    );
  },

  refreshOverallAssessment: () => {
    const { topicProficiency } = get();
    if (!topicProficiency) return;

    const now = Date.now();
    const updatedProficiency: TopicProficiency = {
      ...topicProficiency,
      overallAssessment: generateOverallAssessment(topicProficiency.topics),
      updatedAt: now,
    };

    loroSaveTopicProficiency(toLoroTopicProficiency(updatedProficiency));
    set({ topicProficiency: updatedProficiency });
  },

  addGrowthEvent: (params) => {
    const now = Date.now();
    const event: GrowthEvent = {
      id: crypto.randomUUID(),
      userId: DEFAULT_USER_ID,
      eventType: params.eventType,
      eventData: params.eventData,
      eventTags: params.eventTags || {},
      sessionId: params.sessionId,
      artifactId: params.artifactId,
      materialIds: params.materialIds,
      createdAt: now,
    };

    loroAddGrowthEvent(toLoroGrowthEvent(event));

    set((state) => ({
      growthEvents: [event, ...state.growthEvents].slice(0, 100),
    }));

    return event;
  },

  getGrowthEvents: (options = {}) => {
    const { growthEvents } = get();
    let events = [...growthEvents];

    if (options.startDate) {
      events = events.filter(e => e.createdAt >= options.startDate!);
    }
    if (options.endDate) {
      events = events.filter(e => e.createdAt <= options.endDate!);
    }
    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  },

  getRecentMilestones: (limit = 5) => {
    const { growthEvents } = get();
    const milestoneTypes: GrowthEventType[] = ['milestone', 'achievement', 'streak', 'topic_leveled'];
    return growthEvents
      .filter(e => milestoneTypes.includes(e.eventType))
      .slice(0, limit);
  },
}));
