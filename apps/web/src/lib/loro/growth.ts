/**
 * Loro Growth Events Operations
 */

import { LoroMap } from 'loro-crdt';
import { getMap, commitAndSave } from './core';
import type { LoroGrowthEvent } from './types';

function getGrowthEventsMap(): LoroMap {
  return getMap('growthEvents');
}

/**
 * Add a new growth event
 */
export function addGrowthEvent(event: LoroGrowthEvent): void {
  const events = getGrowthEventsMap();
  const e = events.setContainer(event.id, new LoroMap());
  e.set('id', event.id);
  e.set('userId', event.userId);
  e.set('eventType', event.eventType);
  e.set('eventData', event.eventData);
  e.set('eventTags', event.eventTags);
  if (event.sessionId !== undefined) {
    e.set('sessionId', event.sessionId);
  }
  if (event.artifactId !== undefined) {
    e.set('artifactId', event.artifactId);
  }
  if (event.materialIds !== undefined) {
    e.set('materialIds', event.materialIds);
  }
  e.set('createdAt', event.createdAt);
  commitAndSave();
}

/**
 * Get all growth events for a user
 */
export function getAllGrowthEvents(userId: string): LoroGrowthEvent[] {
  const events = getGrowthEventsMap();
  const result: LoroGrowthEvent[] = [];

  for (const [, value] of events.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const e = value;
    const eventUserId = e.get('userId') as string;
    if (eventUserId !== userId) continue;

    result.push({
      id: e.get('id') as string,
      userId: eventUserId,
      eventType: e.get('eventType') as string,
      eventData: e.get('eventData') as string,
      eventTags: e.get('eventTags') as string,
      sessionId: e.get('sessionId') as string | undefined,
      artifactId: e.get('artifactId') as string | undefined,
      materialIds: e.get('materialIds') as string | undefined,
      createdAt: e.get('createdAt') as number,
    });
  }

  return result.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get growth events within a date range
 */
export function getGrowthEventsByDateRange(
  userId: string,
  startDate: number,
  endDate: number
): LoroGrowthEvent[] {
  const allEvents = getAllGrowthEvents(userId);
  return allEvents.filter(e => e.createdAt >= startDate && e.createdAt <= endDate);
}
