/**
 * Loro Artifacts Operations
 */

import { LoroMap } from 'loro-crdt';
import { getMap, commitAndSave } from './core';
import type { LoroArtifact } from './types';

function getArtifactsMap(): LoroMap {
  return getMap('artifacts');
}

/**
 * Add a new artifact
 */
export function addArtifact(artifact: LoroArtifact): void {
  const artifacts = getArtifactsMap();
  const a = artifacts.setContainer(artifact.id, new LoroMap());
  a.set('id', artifact.id);
  a.set('content', artifact.content);
  if (artifact.contentEn !== undefined) {
    a.set('contentEn', artifact.contentEn);
  }
  a.set('materialIds', JSON.stringify(artifact.materialIds));
  if (artifact.anchor !== undefined) {
    a.set('anchor', artifact.anchor);
  }
  if (artifact.sessionId !== undefined) {
    a.set('sessionId', artifact.sessionId);
  }
  if (artifact.topic !== undefined) {
    a.set('topic', artifact.topic);
  }
  if (artifact.tags !== undefined) {
    a.set('tags', JSON.stringify(artifact.tags));
  }
  a.set('createdAt', artifact.createdAt);
  a.set('updatedAt', artifact.updatedAt ?? Date.now());
  commitAndSave();
}

/**
 * Update an existing artifact
 */
export function updateArtifact(
  id: string,
  updates: Partial<Pick<LoroArtifact, 'content' | 'contentEn' | 'topic' | 'tags'>>
): void {
  const artifacts = getArtifactsMap();
  const a = artifacts.get(id);
  if (!a || !(a instanceof LoroMap)) return;

  if (updates.content !== undefined) {
    a.set('content', updates.content);
  }
  if (updates.contentEn !== undefined) {
    a.set('contentEn', updates.contentEn);
  }
  if (updates.topic !== undefined) {
    a.set('topic', updates.topic);
  }
  if (updates.tags !== undefined) {
    a.set('tags', JSON.stringify(updates.tags));
  }
  a.set('updatedAt', Date.now());
  commitAndSave();
}

/**
 * Get a single artifact by ID
 */
export function getArtifact(id: string): LoroArtifact | undefined {
  const artifacts = getArtifactsMap();
  const a = artifacts.get(id);
  if (!a || !(a instanceof LoroMap)) return undefined;

  const tagsStr = a.get('tags') as string | undefined;
  return {
    id: a.get('id') as string,
    content: a.get('content') as string,
    contentEn: a.get('contentEn') as string | undefined,
    materialIds: JSON.parse(a.get('materialIds') as string),
    anchor: a.get('anchor') as string | undefined,
    sessionId: a.get('sessionId') as string | undefined,
    topic: a.get('topic') as string | undefined,
    tags: tagsStr ? JSON.parse(tagsStr) : undefined,
    createdAt: a.get('createdAt') as number,
    updatedAt: a.get('updatedAt') as number | undefined,
  };
}

/**
 * Delete an artifact
 */
export function deleteArtifact(id: string): void {
  const artifacts = getArtifactsMap();
  artifacts.delete(id);
  commitAndSave();
}

/**
 * Get all artifacts
 */
export function getAllArtifacts(): LoroArtifact[] {
  const artifacts = getArtifactsMap();
  const result: LoroArtifact[] = [];

  for (const [, value] of artifacts.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const a = value;
    const tagsStr = a.get('tags') as string | undefined;
    result.push({
      id: a.get('id') as string,
      content: a.get('content') as string,
      contentEn: a.get('contentEn') as string | undefined,
      materialIds: JSON.parse(a.get('materialIds') as string),
      anchor: a.get('anchor') as string | undefined,
      sessionId: a.get('sessionId') as string | undefined,
      topic: a.get('topic') as string | undefined,
      tags: tagsStr ? JSON.parse(tagsStr) : undefined,
      createdAt: a.get('createdAt') as number,
      updatedAt: a.get('updatedAt') as number | undefined,
    });
  }

  return result.sort((a, b) => b.createdAt - a.createdAt);
}
