/**
 * Loro Vocabulary Operations (UserUtterance & VocabularyRecord)
 */

import { LoroMap } from 'loro-crdt';
import { getMap, commitAndSave } from './core';
import type { LoroUserUtterance, LoroVocabularyRecord } from './types';

// ============ User Utterances Operations ============

function getUserUtterancesMap(): LoroMap {
  return getMap('userUtterances');
}

/**
 * Add a new user utterance
 */
export function addUserUtterance(utterance: LoroUserUtterance): void {
  const utterances = getUserUtterancesMap();
  const u = utterances.setContainer(utterance.id, new LoroMap());
  u.set('id', utterance.id);
  u.set('sessionId', utterance.sessionId);
  u.set('content', utterance.content);
  if (utterance.contentEn !== undefined) {
    u.set('contentEn', utterance.contentEn);
  }
  u.set('turnIndex', utterance.turnIndex);
  if (utterance.replyTo !== undefined) {
    u.set('replyTo', utterance.replyTo);
  }
  if (utterance.topic !== undefined) {
    u.set('topic', utterance.topic);
  }
  if (utterance.materialIds !== undefined) {
    u.set('materialIds', utterance.materialIds);
  }
  u.set('vocabularyExtracted', utterance.vocabularyExtracted);
  u.set('createdAt', utterance.createdAt);
  commitAndSave();
}

/**
 * Get a user utterance by ID
 */
export function getUserUtterance(id: string): LoroUserUtterance | undefined {
  const utterances = getUserUtterancesMap();
  const u = utterances.get(id);
  if (!u || !(u instanceof LoroMap)) return undefined;

  return {
    id: u.get('id') as string,
    sessionId: u.get('sessionId') as string,
    content: u.get('content') as string,
    contentEn: u.get('contentEn') as string | undefined,
    turnIndex: u.get('turnIndex') as number,
    replyTo: u.get('replyTo') as string | undefined,
    topic: u.get('topic') as string | undefined,
    materialIds: u.get('materialIds') as string | undefined,
    vocabularyExtracted: u.get('vocabularyExtracted') as boolean,
    createdAt: u.get('createdAt') as number,
  };
}

/**
 * Update vocabulary extraction status
 */
export function markUtteranceExtracted(id: string): void {
  const utterances = getUserUtterancesMap();
  const u = utterances.get(id);
  if (!u || !(u instanceof LoroMap)) return;

  u.set('vocabularyExtracted', true);
  commitAndSave();
}

/**
 * Get all user utterances for a session
 */
export function getSessionUtterances(sessionId: string): LoroUserUtterance[] {
  const utterances = getUserUtterancesMap();
  const result: LoroUserUtterance[] = [];

  for (const [, value] of utterances.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const u = value;
    const uSessionId = u.get('sessionId') as string;
    if (uSessionId !== sessionId) continue;

    result.push({
      id: u.get('id') as string,
      sessionId: uSessionId,
      content: u.get('content') as string,
      contentEn: u.get('contentEn') as string | undefined,
      turnIndex: u.get('turnIndex') as number,
      replyTo: u.get('replyTo') as string | undefined,
      topic: u.get('topic') as string | undefined,
      materialIds: u.get('materialIds') as string | undefined,
      vocabularyExtracted: u.get('vocabularyExtracted') as boolean,
      createdAt: u.get('createdAt') as number,
    });
  }

  return result.sort((a, b) => a.turnIndex - b.turnIndex);
}

/**
 * Get all user utterances
 */
export function getAllUserUtterances(): LoroUserUtterance[] {
  const utterances = getUserUtterancesMap();
  const result: LoroUserUtterance[] = [];

  for (const [, value] of utterances.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const u = value;

    result.push({
      id: u.get('id') as string,
      sessionId: u.get('sessionId') as string,
      content: u.get('content') as string,
      contentEn: u.get('contentEn') as string | undefined,
      turnIndex: u.get('turnIndex') as number,
      replyTo: u.get('replyTo') as string | undefined,
      topic: u.get('topic') as string | undefined,
      materialIds: u.get('materialIds') as string | undefined,
      vocabularyExtracted: u.get('vocabularyExtracted') as boolean,
      createdAt: u.get('createdAt') as number,
    });
  }

  return result.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get all unprocessed utterances (for vocabulary extraction)
 */
export function getUnextractedUtterances(): LoroUserUtterance[] {
  const utterances = getUserUtterancesMap();
  const result: LoroUserUtterance[] = [];

  for (const [, value] of utterances.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const u = value;
    if (u.get('vocabularyExtracted') === true) continue;

    result.push({
      id: u.get('id') as string,
      sessionId: u.get('sessionId') as string,
      content: u.get('content') as string,
      contentEn: u.get('contentEn') as string | undefined,
      turnIndex: u.get('turnIndex') as number,
      replyTo: u.get('replyTo') as string | undefined,
      topic: u.get('topic') as string | undefined,
      materialIds: u.get('materialIds') as string | undefined,
      vocabularyExtracted: false,
      createdAt: u.get('createdAt') as number,
    });
  }

  return result.sort((a, b) => a.createdAt - b.createdAt);
}

// ============ Vocabulary Records Operations ============

function getVocabularyRecordsMap(): LoroMap {
  return getMap('vocabularyRecords');
}

/**
 * Add or update a vocabulary record
 */
export function saveVocabularyRecord(record: LoroVocabularyRecord): void {
  const records = getVocabularyRecordsMap();
  let r = records.get(record.normalized);

  if (!r || !(r instanceof LoroMap)) {
    r = records.setContainer(record.normalized, new LoroMap());
  }

  const map = r as LoroMap;
  map.set('id', record.id);
  map.set('term', record.term);
  map.set('termType', record.termType);
  map.set('normalized', record.normalized);
  map.set('passiveCount', record.passiveCount);
  map.set('activeCount', record.activeCount);
  map.set('passiveSources', record.passiveSources);
  map.set('activeUsages', record.activeUsages);
  map.set('status', record.status);
  map.set('firstSeen', record.firstSeen);
  if (record.firstUsed !== undefined) {
    map.set('firstUsed', record.firstUsed);
  }
  if (record.lastUsed !== undefined) {
    map.set('lastUsed', record.lastUsed);
  }
  if (record.userMarked !== undefined) {
    map.set('userMarked', record.userMarked);
  }

  commitAndSave();
}

/**
 * Get a vocabulary record by normalized term
 */
export function getVocabularyRecord(normalized: string): LoroVocabularyRecord | undefined {
  const records = getVocabularyRecordsMap();
  const r = records.get(normalized);
  if (!r || !(r instanceof LoroMap)) return undefined;

  return {
    id: r.get('id') as string,
    term: r.get('term') as string,
    termType: r.get('termType') as string,
    normalized: r.get('normalized') as string,
    passiveCount: r.get('passiveCount') as number,
    activeCount: r.get('activeCount') as number,
    passiveSources: r.get('passiveSources') as string,
    activeUsages: r.get('activeUsages') as string,
    status: r.get('status') as string,
    firstSeen: r.get('firstSeen') as number,
    firstUsed: r.get('firstUsed') as number | undefined,
    lastUsed: r.get('lastUsed') as number | undefined,
    userMarked: r.get('userMarked') as string | undefined,
  };
}

/**
 * Get all vocabulary records
 */
export function getAllVocabularyRecords(): LoroVocabularyRecord[] {
  const records = getVocabularyRecordsMap();
  const result: LoroVocabularyRecord[] = [];

  for (const [, value] of records.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const r = value;
    result.push({
      id: r.get('id') as string,
      term: r.get('term') as string,
      termType: r.get('termType') as string,
      normalized: r.get('normalized') as string,
      passiveCount: r.get('passiveCount') as number,
      activeCount: r.get('activeCount') as number,
      passiveSources: r.get('passiveSources') as string,
      activeUsages: r.get('activeUsages') as string,
      status: r.get('status') as string,
      firstSeen: r.get('firstSeen') as number,
      firstUsed: r.get('firstUsed') as number | undefined,
      lastUsed: r.get('lastUsed') as number | undefined,
      userMarked: r.get('userMarked') as string | undefined,
    });
  }

  return result.sort((a, b) => b.firstSeen - a.firstSeen);
}

/**
 * Get vocabulary records by status
 */
export function getVocabularyByStatus(status: string): LoroVocabularyRecord[] {
  return getAllVocabularyRecords().filter(r => r.status === status);
}

/**
 * Get vocabulary records by term type
 */
export function getVocabularyByType(termType: string): LoroVocabularyRecord[] {
  return getAllVocabularyRecords().filter(r => r.termType === termType);
}

/**
 * Update user marking on a vocabulary record
 */
export function updateVocabularyMarking(normalized: string, marking: string | null): void {
  const records = getVocabularyRecordsMap();
  const r = records.get(normalized);
  if (!r || !(r instanceof LoroMap)) return;

  if (marking === null) {
    r.delete('userMarked');
  } else {
    r.set('userMarked', marking);
  }

  // Recalculate status based on marking
  const activeCount = r.get('activeCount') as number;
  let newStatus = 'passive';
  if (marking === 'known') {
    newStatus = 'mastered';
  } else if (activeCount >= 3) {
    newStatus = 'mastered';
  } else if (activeCount >= 1) {
    newStatus = 'activated';
  }
  r.set('status', newStatus);

  commitAndSave();
}
