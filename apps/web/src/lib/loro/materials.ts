/**
 * Loro Materials Operations
 */

import { LoroMap } from 'loro-crdt';
import { getMap, commitAndSave } from './core';
import type { LoroMaterial } from './types';

function getMaterialsMap(): LoroMap {
  return getMap('materials');
}

/**
 * Add a new material
 */
export function addMaterial(material: Omit<LoroMaterial, 'updatedAt'>): void {
  const materials = getMaterialsMap();
  const m = materials.setContainer(material.id, new LoroMap());
  m.set('id', material.id);
  m.set('type', material.type);
  m.set('content', material.content);
  if (material.note !== undefined) {
    m.set('note', material.note);
  }
  if (material.fileName !== undefined) {
    m.set('fileName', material.fileName);
  }
  if (material.fileType !== undefined) {
    m.set('fileType', material.fileType);
  }
  if (material.mimeType !== undefined) {
    m.set('mimeType', material.mimeType);
  }
  if (material.fileData !== undefined) {
    m.set('fileData', material.fileData);
  }
  if (material.fileThumbnail !== undefined) {
    m.set('fileThumbnail', material.fileThumbnail);
  }
  m.set('createdAt', material.createdAt);
  m.set('updatedAt', Date.now());
  commitAndSave();
}

/**
 * Update an existing material
 */
export function updateMaterial(
  id: string,
  updates: Partial<Pick<LoroMaterial, 'content' | 'contentEn' | 'note'>>
): void {
  const materials = getMaterialsMap();
  const m = materials.get(id);
  if (!m || !(m instanceof LoroMap)) return;

  if (updates.content !== undefined) {
    m.set('content', updates.content);
  }
  if (updates.contentEn !== undefined) {
    m.set('contentEn', updates.contentEn);
  }
  if (updates.note !== undefined) {
    m.set('note', updates.note);
  }
  m.set('updatedAt', Date.now());
  commitAndSave();
}

/**
 * Delete a material
 */
export function deleteMaterial(id: string): void {
  const materials = getMaterialsMap();
  materials.delete(id);
  commitAndSave();
}

/**
 * Get a single material by ID
 */
export function getMaterial(id: string): LoroMaterial | undefined {
  const materials = getMaterialsMap();
  const m = materials.get(id);
  if (!m || !(m instanceof LoroMap)) return undefined;

  return {
    id: m.get('id') as string,
    type: m.get('type') as 'text' | 'file',
    content: m.get('content') as string,
    contentEn: m.get('contentEn') as string | undefined,
    note: m.get('note') as string | undefined,
    createdAt: m.get('createdAt') as number,
    updatedAt: m.get('updatedAt') as number,
    fileName: m.get('fileName') as string | undefined,
    fileType: m.get('fileType') as 'image' | 'pdf' | 'document' | undefined,
    mimeType: m.get('mimeType') as string | undefined,
    fileData: m.get('fileData') as string | undefined,
    fileThumbnail: m.get('fileThumbnail') as string | undefined,
  };
}

/**
 * Get all materials
 */
export function getAllMaterials(): LoroMaterial[] {
  const materials = getMaterialsMap();
  const result: LoroMaterial[] = [];

  for (const [, value] of materials.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const m = value;
    result.push({
      id: m.get('id') as string,
      type: m.get('type') as 'text' | 'file',
      content: m.get('content') as string,
      contentEn: m.get('contentEn') as string | undefined,
      note: m.get('note') as string | undefined,
      createdAt: m.get('createdAt') as number,
      updatedAt: m.get('updatedAt') as number,
      fileName: m.get('fileName') as string | undefined,
      fileType: m.get('fileType') as 'image' | 'pdf' | 'document' | undefined,
      mimeType: m.get('mimeType') as string | undefined,
      fileData: m.get('fileData') as string | undefined,
      fileThumbnail: m.get('fileThumbnail') as string | undefined,
    });
  }

  return result.sort((a, b) => b.createdAt - a.createdAt);
}
