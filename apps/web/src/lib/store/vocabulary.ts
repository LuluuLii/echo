import { create } from 'zustand';
import {
  addUserUtterance as loroAddUserUtterance,
  getSessionUtterances as loroGetSessionUtterances,
  getUnextractedUtterances as loroGetUnextractedUtterances,
  markUtteranceExtracted as loroMarkUtteranceExtracted,
  saveVocabularyRecord as loroSaveVocabularyRecord,
  getVocabularyRecord as loroGetVocabularyRecord,
  getAllVocabularyRecords as loroGetAllVocabularyRecords,
  getVocabularyByStatus as loroGetVocabularyByStatus,
  updateVocabularyMarking as loroUpdateVocabularyMarking,
  type LoroUserUtterance,
  type LoroVocabularyRecord,
} from '../loro';

import type {
  VocabularyTermType,
  VocabularyStatus,
  VocabularyUserMark,
  PassiveSource,
  ActiveUsage,
  VocabularyRecord,
  UserUtterance,
  VocabularyStats,
  VocabularyStatsByType,
  VocabularyInsight,
} from '@echo/core/models';

import { calculateVocabularyStatus } from '@echo/core/models';

// ============ Converters ============

function toUserUtterance(loro: LoroUserUtterance): UserUtterance {
  return {
    id: loro.id,
    sessionId: loro.sessionId,
    content: loro.content,
    contentEn: loro.contentEn,
    turnIndex: loro.turnIndex,
    replyTo: loro.replyTo,
    topic: loro.topic,
    materialIds: loro.materialIds ? JSON.parse(loro.materialIds) : undefined,
    vocabularyExtracted: loro.vocabularyExtracted,
    createdAt: loro.createdAt,
  };
}

function toLoroUserUtterance(utterance: UserUtterance): LoroUserUtterance {
  return {
    id: utterance.id,
    sessionId: utterance.sessionId,
    content: utterance.content,
    contentEn: utterance.contentEn,
    turnIndex: utterance.turnIndex,
    replyTo: utterance.replyTo,
    topic: utterance.topic,
    materialIds: utterance.materialIds ? JSON.stringify(utterance.materialIds) : undefined,
    vocabularyExtracted: utterance.vocabularyExtracted,
    createdAt: utterance.createdAt,
  };
}

function toVocabularyRecord(loro: LoroVocabularyRecord): VocabularyRecord {
  return {
    id: loro.id,
    term: loro.term,
    termType: loro.termType as VocabularyTermType,
    normalized: loro.normalized,
    passiveCount: loro.passiveCount,
    passiveSources: JSON.parse(loro.passiveSources || '[]'),
    activeCount: loro.activeCount,
    activeUsages: JSON.parse(loro.activeUsages || '[]'),
    status: loro.status as VocabularyStatus,
    firstSeen: loro.firstSeen,
    firstUsed: loro.firstUsed,
    lastUsed: loro.lastUsed,
    userMarked: loro.userMarked as VocabularyUserMark | undefined,
  };
}

function toLoroVocabularyRecord(record: VocabularyRecord): LoroVocabularyRecord {
  return {
    id: record.id,
    term: record.term,
    termType: record.termType,
    normalized: record.normalized,
    passiveCount: record.passiveCount,
    passiveSources: JSON.stringify(record.passiveSources),
    activeCount: record.activeCount,
    activeUsages: JSON.stringify(record.activeUsages),
    status: record.status,
    firstSeen: record.firstSeen,
    firstUsed: record.firstUsed,
    lastUsed: record.lastUsed,
    userMarked: record.userMarked,
  };
}

// ============ Helpers ============

function normalizeTerm(term: string): string {
  // Basic normalization: lowercase and trim
  return term.toLowerCase().trim();
}

function calculateStats(records: VocabularyRecord[]): VocabularyStats {
  const totalPassive = records.length;
  const totalActive = records.filter(r => r.activeCount > 0).length;
  const totalMastered = records.filter(r => r.status === 'mastered').length;
  const activationRate = totalPassive > 0 ? totalActive / totalPassive : 0;

  return {
    totalPassive,
    totalActive,
    totalMastered,
    activationRate: Math.round(activationRate * 1000) / 1000,
  };
}

function calculateStatsByType(records: VocabularyRecord[]): VocabularyStatsByType {
  const byType: VocabularyStatsByType = {
    word: { passive: 0, active: 0, mastered: 0 },
    phrase: { passive: 0, active: 0, mastered: 0 },
    expression: { passive: 0, active: 0, mastered: 0 },
    sentence_pattern: { passive: 0, active: 0, mastered: 0 },
  };

  for (const record of records) {
    const type = byType[record.termType];
    if (!type) continue;

    type.passive += 1;
    if (record.activeCount > 0) type.active += 1;
    if (record.status === 'mastered') type.mastered += 1;
  }

  return byType;
}

// Default user ID
const DEFAULT_USER_ID = 'default';

// ============ Store ============

interface VocabularyStore {
  // State
  records: VocabularyRecord[];
  stats: VocabularyStats | null;
  initialized: boolean;

  // Initialization
  init: () => void;
  reload: () => void;

  // User utterance operations
  saveUserUtterance: (params: {
    sessionId: string;
    content: string;
    contentEn?: string;
    turnIndex: number;
    replyTo?: string;
    topic?: string;
    materialIds?: string[];
  }) => UserUtterance;
  getSessionUtterances: (sessionId: string) => UserUtterance[];
  getUnextractedUtterances: () => UserUtterance[];
  markUtteranceExtracted: (id: string) => void;

  // Vocabulary record operations
  recordPassiveVocabulary: (params: {
    term: string;
    termType: VocabularyTermType;
    materialId: string;
    context: string;
  }) => VocabularyRecord;
  recordActiveVocabulary: (params: {
    term: string;
    termType: VocabularyTermType;
    utteranceId: string;
    sessionId: string;
    context: string;
  }) => VocabularyRecord;
  getVocabularyRecord: (term: string) => VocabularyRecord | undefined;
  getVocabularyByStatus: (status: VocabularyStatus) => VocabularyRecord[];
  updateUserMarking: (term: string, marking: VocabularyUserMark | null) => void;

  // Stats & Insight
  getStats: () => VocabularyStats;
  generateInsight: () => VocabularyInsight;

  // Recommendations
  getRecommendedToActivate: (limit?: number) => Array<{
    term: string;
    passiveCount: number;
    lastSeen: number;
    exampleContext: string;
  }>;
}

export const useVocabularyStore = create<VocabularyStore>((set, get) => ({
  records: [],
  stats: null,
  initialized: false,

  init: () => {
    if (get().initialized) return;

    // Load all vocabulary records
    const loroRecords = loroGetAllVocabularyRecords();
    const records = loroRecords.map(toVocabularyRecord);
    const stats = calculateStats(records);

    set({ records, stats, initialized: true });
  },

  reload: () => {
    const loroRecords = loroGetAllVocabularyRecords();
    const records = loroRecords.map(toVocabularyRecord);
    const stats = calculateStats(records);

    set({ records, stats });
  },

  saveUserUtterance: (params) => {
    const now = Date.now();
    const utterance: UserUtterance = {
      id: crypto.randomUUID(),
      sessionId: params.sessionId,
      content: params.content,
      contentEn: params.contentEn,
      turnIndex: params.turnIndex,
      replyTo: params.replyTo,
      topic: params.topic,
      materialIds: params.materialIds,
      vocabularyExtracted: false,
      createdAt: now,
    };

    loroAddUserUtterance(toLoroUserUtterance(utterance));
    return utterance;
  },

  getSessionUtterances: (sessionId) => {
    return loroGetSessionUtterances(sessionId).map(toUserUtterance);
  },

  getUnextractedUtterances: () => {
    return loroGetUnextractedUtterances().map(toUserUtterance);
  },

  markUtteranceExtracted: (id) => {
    loroMarkUtteranceExtracted(id);
  },

  recordPassiveVocabulary: (params) => {
    const { records } = get();
    const normalized = normalizeTerm(params.term);
    const now = Date.now();

    // Check if record already exists
    const existingRecord = records.find(r => r.normalized === normalized);

    if (existingRecord) {
      // Add new passive source
      const newSource: PassiveSource = {
        materialId: params.materialId,
        context: params.context,
        seenAt: now,
      };

      const updatedRecord: VocabularyRecord = {
        ...existingRecord,
        passiveCount: existingRecord.passiveCount + 1,
        passiveSources: [...existingRecord.passiveSources, newSource].slice(-10), // Keep last 10
      };

      loroSaveVocabularyRecord(toLoroVocabularyRecord(updatedRecord));

      // Update state
      const updatedRecords = records.map(r =>
        r.normalized === normalized ? updatedRecord : r
      );
      set({ records: updatedRecords, stats: calculateStats(updatedRecords) });

      return updatedRecord;
    } else {
      // Create new record
      const newRecord: VocabularyRecord = {
        id: crypto.randomUUID(),
        term: params.term,
        termType: params.termType,
        normalized,
        passiveCount: 1,
        passiveSources: [{
          materialId: params.materialId,
          context: params.context,
          seenAt: now,
        }],
        activeCount: 0,
        activeUsages: [],
        status: 'passive',
        firstSeen: now,
      };

      loroSaveVocabularyRecord(toLoroVocabularyRecord(newRecord));

      // Update state
      const updatedRecords = [newRecord, ...records];
      set({ records: updatedRecords, stats: calculateStats(updatedRecords) });

      return newRecord;
    }
  },

  recordActiveVocabulary: (params) => {
    const { records } = get();
    const normalized = normalizeTerm(params.term);
    const now = Date.now();

    // Check if record already exists
    const existingRecord = records.find(r => r.normalized === normalized);

    if (existingRecord) {
      // Add new active usage
      const newUsage: ActiveUsage = {
        utteranceId: params.utteranceId,
        sessionId: params.sessionId,
        context: params.context,
        usedAt: now,
      };

      const newActiveCount = existingRecord.activeCount + 1;
      const updatedRecord: VocabularyRecord = {
        ...existingRecord,
        activeCount: newActiveCount,
        activeUsages: [...existingRecord.activeUsages, newUsage].slice(-10), // Keep last 10
        status: calculateVocabularyStatus(newActiveCount, existingRecord.userMarked),
        firstUsed: existingRecord.firstUsed ?? now,
        lastUsed: now,
      };

      loroSaveVocabularyRecord(toLoroVocabularyRecord(updatedRecord));

      // Update state
      const updatedRecords = records.map(r =>
        r.normalized === normalized ? updatedRecord : r
      );
      set({ records: updatedRecords, stats: calculateStats(updatedRecords) });

      return updatedRecord;
    } else {
      // Create new record (active without passive)
      const newRecord: VocabularyRecord = {
        id: crypto.randomUUID(),
        term: params.term,
        termType: params.termType,
        normalized,
        passiveCount: 0,
        passiveSources: [],
        activeCount: 1,
        activeUsages: [{
          utteranceId: params.utteranceId,
          sessionId: params.sessionId,
          context: params.context,
          usedAt: now,
        }],
        status: 'activated',
        firstSeen: now,
        firstUsed: now,
        lastUsed: now,
      };

      loroSaveVocabularyRecord(toLoroVocabularyRecord(newRecord));

      // Update state
      const updatedRecords = [newRecord, ...records];
      set({ records: updatedRecords, stats: calculateStats(updatedRecords) });

      return newRecord;
    }
  },

  getVocabularyRecord: (term) => {
    const normalized = normalizeTerm(term);
    const loroRecord = loroGetVocabularyRecord(normalized);
    return loroRecord ? toVocabularyRecord(loroRecord) : undefined;
  },

  getVocabularyByStatus: (status) => {
    return loroGetVocabularyByStatus(status).map(toVocabularyRecord);
  },

  updateUserMarking: (term, marking) => {
    const { records } = get();
    const normalized = normalizeTerm(term);

    loroUpdateVocabularyMarking(normalized, marking);

    // Reload the record to get updated status
    const loroRecord = loroGetVocabularyRecord(normalized);
    if (loroRecord) {
      const updatedRecord = toVocabularyRecord(loroRecord);
      const updatedRecords = records.map(r =>
        r.normalized === normalized ? updatedRecord : r
      );
      set({ records: updatedRecords, stats: calculateStats(updatedRecords) });
    }
  },

  getStats: () => {
    const { records, stats } = get();
    if (stats) return stats;
    return calculateStats(records);
  },

  generateInsight: () => {
    const { records } = get();

    const stats = calculateStats(records);
    const byType = calculateStatsByType(records);

    // Get recommended to activate (passive with high exposure, not yet used)
    const passiveRecords = records.filter(r => r.status === 'passive' && r.passiveCount >= 2);
    passiveRecords.sort((a, b) => b.passiveCount - a.passiveCount);

    const recommendedToActivate = passiveRecords.slice(0, 10).map(r => ({
      term: r.term,
      passiveCount: r.passiveCount,
      lastSeen: r.passiveSources.length > 0
        ? r.passiveSources[r.passiveSources.length - 1].seenAt
        : r.firstSeen,
      exampleContext: r.passiveSources.length > 0
        ? r.passiveSources[r.passiveSources.length - 1].context
        : '',
    }));

    // Recent progress (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentlyActivated = records.filter(
      r => r.firstUsed && r.firstUsed >= sevenDaysAgo && r.status === 'activated'
    ).map(r => r.term);

    const recentlyMastered = records.filter(
      r => r.status === 'mastered' && r.lastUsed && r.lastUsed >= sevenDaysAgo
    ).map(r => r.term);

    const insight: VocabularyInsight = {
      userId: DEFAULT_USER_ID,
      stats,
      byType,
      recommendedToActivate,
      recentProgress: {
        newlyActivated: recentlyActivated,
        newlyMastered: recentlyMastered,
        periodStart: sevenDaysAgo,
        periodEnd: Date.now(),
      },
      updatedAt: Date.now(),
    };

    return insight;
  },

  getRecommendedToActivate: (limit = 5) => {
    const { records } = get();

    // Get passive records with high exposure
    const passiveRecords = records.filter(r => r.status === 'passive' && r.passiveCount >= 2);
    passiveRecords.sort((a, b) => b.passiveCount - a.passiveCount);

    return passiveRecords.slice(0, limit).map(r => ({
      term: r.term,
      passiveCount: r.passiveCount,
      lastSeen: r.passiveSources.length > 0
        ? r.passiveSources[r.passiveSources.length - 1].seenAt
        : r.firstSeen,
      exampleContext: r.passiveSources.length > 0
        ? r.passiveSources[r.passiveSources.length - 1].context
        : '',
    }));
  },
}));
