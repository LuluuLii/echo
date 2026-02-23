/**
 * Loro Topic Proficiency Operations
 */

import { LoroMap } from 'loro-crdt';
import { getMap, commitAndSave } from './core';
import type { LoroTopicProficiency } from './types';

function getTopicProficiencyMap(): LoroMap {
  return getMap('topicProficiency');
}

/**
 * Save or update topic proficiency
 */
export function saveTopicProficiency(proficiency: LoroTopicProficiency): void {
  const profs = getTopicProficiencyMap();
  let p = profs.get(proficiency.userId);

  if (!p || !(p instanceof LoroMap)) {
    p = profs.setContainer(proficiency.userId, new LoroMap());
  }

  const map = p as LoroMap;
  map.set('userId', proficiency.userId);
  map.set('topics', proficiency.topics);
  if (proficiency.overallAssessment !== undefined) {
    map.set('overallAssessment', proficiency.overallAssessment);
  }
  map.set('createdAt', proficiency.createdAt);
  map.set('updatedAt', proficiency.updatedAt);

  commitAndSave();
}

/**
 * Get topic proficiency by userId
 */
export function getTopicProficiency(userId: string): LoroTopicProficiency | undefined {
  const profs = getTopicProficiencyMap();
  const p = profs.get(userId);
  if (!p || !(p instanceof LoroMap)) return undefined;

  return {
    userId: p.get('userId') as string,
    topics: p.get('topics') as string,
    overallAssessment: p.get('overallAssessment') as string | undefined,
    createdAt: p.get('createdAt') as number,
    updatedAt: p.get('updatedAt') as number,
  };
}
