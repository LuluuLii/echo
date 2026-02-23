/**
 * Loro User Profile and Learning State Operations
 */

import { LoroMap } from 'loro-crdt';
import { getMap, commitAndSave } from './core';
import type { LoroUserProfile, LoroLearningState } from './types';

// ============ User Profile Operations ============

function getUserProfileMap(): LoroMap {
  return getMap('userProfiles');
}

/**
 * Save or update user profile
 */
export function saveUserProfile(profile: LoroUserProfile): void {
  const profiles = getUserProfileMap();
  let p = profiles.get(profile.userId);

  if (!p || !(p instanceof LoroMap)) {
    p = profiles.setContainer(profile.userId, new LoroMap());
  }

  const map = p as LoroMap;
  map.set('id', profile.id);
  map.set('userId', profile.userId);
  map.set('targetLanguage', profile.targetLanguage);
  map.set('nativeLanguage', profile.nativeLanguage);
  map.set('proficiencyLevel', profile.proficiencyLevel);
  map.set('preferences', profile.preferences);
  map.set('insights', profile.insights);
  map.set('createdAt', profile.createdAt);
  map.set('updatedAt', profile.updatedAt);

  commitAndSave();
}

/**
 * Get user profile by userId
 */
export function getUserProfile(userId: string): LoroUserProfile | undefined {
  const profiles = getUserProfileMap();
  const p = profiles.get(userId);
  if (!p || !(p instanceof LoroMap)) return undefined;

  return {
    id: p.get('id') as string,
    userId: p.get('userId') as string,
    targetLanguage: p.get('targetLanguage') as string,
    nativeLanguage: p.get('nativeLanguage') as string,
    proficiencyLevel: p.get('proficiencyLevel') as string,
    preferences: p.get('preferences') as string,
    insights: p.get('insights') as string,
    createdAt: p.get('createdAt') as number,
    updatedAt: p.get('updatedAt') as number,
  };
}

// ============ Learning State Operations ============

function getLearningStateMap(): LoroMap {
  return getMap('learningStates');
}

/**
 * Save or update learning state
 */
export function saveLearningState(state: LoroLearningState): void {
  const states = getLearningStateMap();
  let s = states.get(state.userId);

  if (!s || !(s instanceof LoroMap)) {
    s = states.setContainer(state.userId, new LoroMap());
  }

  const map = s as LoroMap;
  map.set('userId', state.userId);
  if (state.currentFocus !== undefined) {
    map.set('currentFocus', state.currentFocus);
  }
  if (state.learningPlan !== undefined) {
    map.set('learningPlan', state.learningPlan);
  }
  map.set('lastPracticeAt', state.lastPracticeAt);
  map.set('streakDays', state.streakDays);
  map.set('totalSessions', state.totalSessions);
  map.set('totalMinutes', state.totalMinutes);
  map.set('averageSessionLength', state.averageSessionLength);
  map.set('practicesByWeekday', state.practicesByWeekday);
  map.set('createdAt', state.createdAt);
  map.set('updatedAt', state.updatedAt);

  commitAndSave();
}

/**
 * Get learning state by userId
 */
export function getLearningState(userId: string): LoroLearningState | undefined {
  const states = getLearningStateMap();
  const s = states.get(userId);
  if (!s || !(s instanceof LoroMap)) return undefined;

  return {
    userId: s.get('userId') as string,
    currentFocus: s.get('currentFocus') as string | undefined,
    learningPlan: s.get('learningPlan') as string | undefined,
    lastPracticeAt: s.get('lastPracticeAt') as number,
    streakDays: s.get('streakDays') as number,
    totalSessions: s.get('totalSessions') as number,
    totalMinutes: s.get('totalMinutes') as number,
    averageSessionLength: s.get('averageSessionLength') as number,
    practicesByWeekday: s.get('practicesByWeekday') as string,
    createdAt: s.get('createdAt') as number,
    updatedAt: s.get('updatedAt') as number,
  };
}
