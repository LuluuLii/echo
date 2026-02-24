/**
 * Data Export Utilities
 *
 * Export user data (vocabulary, utterances, etc.) to JSON files.
 */

import { getAllUserUtterances, getAllVocabularyRecords } from './loro';
import { useVocabularyStore } from './store/vocabulary';
import type {
  LoroUserUtterance,
  LoroVocabularyRecord,
} from './loro/types';

// ============ Export Types ============

export interface VocabularyExport {
  exportedAt: number;
  version: string;
  stats: {
    totalUtterances: number;
    totalVocabularyRecords: number;
    totalPassive: number;
    totalActive: number;
    totalMastered: number;
  };
  utterances: LoroUserUtterance[];
  vocabularyRecords: LoroVocabularyRecord[];
}

export interface FullDataExport {
  exportedAt: number;
  version: string;
  vocabulary: VocabularyExport;
  // Future: add materials, artifacts, profile, etc.
}

// ============ Export Functions ============

/**
 * Export vocabulary data (utterances + vocabulary records)
 */
export function exportVocabularyData(): VocabularyExport {
  const utterances = getAllUserUtterances();
  const vocabularyRecords = getAllVocabularyRecords();

  // Calculate stats
  const passiveCount = vocabularyRecords.filter(r => r.status === 'passive').length;
  const activeCount = vocabularyRecords.filter(r => r.status === 'activated').length;
  const masteredCount = vocabularyRecords.filter(r => r.status === 'mastered').length;

  return {
    exportedAt: Date.now(),
    version: '1.0.0',
    stats: {
      totalUtterances: utterances.length,
      totalVocabularyRecords: vocabularyRecords.length,
      totalPassive: passiveCount,
      totalActive: activeCount,
      totalMastered: masteredCount,
    },
    utterances,
    vocabularyRecords,
  };
}

/**
 * Download data as JSON file
 */
export function downloadAsJson(data: object, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export and download vocabulary data
 */
export function downloadVocabularyExport(): void {
  const data = exportVocabularyData();
  const date = new Date().toISOString().split('T')[0];
  const filename = `echo-vocabulary-export-${date}.json`;

  downloadAsJson(data, filename);
  console.log(`[DataExport] Downloaded ${filename}`, data.stats);
}

// ============ Import Functions ============

/**
 * Validate vocabulary export data structure
 */
export function validateVocabularyExport(data: unknown): data is VocabularyExport {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.exportedAt === 'number' &&
    typeof obj.version === 'string' &&
    Array.isArray(obj.utterances) &&
    Array.isArray(obj.vocabularyRecords)
  );
}

// Helper type for parsed sources/usages
interface ParsedPassiveSource {
  materialId: string;
  context: string;
  seenAt: number;
}

interface ParsedActiveUsage {
  utteranceId: string;
  sessionId: string;
  context: string;
  usedAt: number;
}

/**
 * Parse JSON string fields from Loro records
 */
function parsePassiveSources(sources: string): ParsedPassiveSource[] {
  try {
    return JSON.parse(sources || '[]');
  } catch {
    return [];
  }
}

function parseActiveUsages(usages: string): ParsedActiveUsage[] {
  try {
    return JSON.parse(usages || '[]');
  } catch {
    return [];
  }
}

/**
 * Import vocabulary data from JSON
 * Note: This merges with existing data, doesn't replace
 */
export async function importVocabularyData(
  data: VocabularyExport
): Promise<{ imported: number; skipped: number }> {
  const vocabularyStore = useVocabularyStore.getState();
  const existingRecords = getAllVocabularyRecords();
  const existingNormalized = new Set(existingRecords.map(r => r.normalized));

  let imported = 0;
  let skipped = 0;

  // Import vocabulary records (skip duplicates based on normalized form)
  for (const record of data.vocabularyRecords) {
    if (existingNormalized.has(record.normalized)) {
      skipped++;
      continue;
    }

    // Parse JSON string fields
    const passiveSources = parsePassiveSources(record.passiveSources);
    const activeUsages = parseActiveUsages(record.activeUsages);

    // Record as passive or active based on status
    if (record.status === 'passive' && passiveSources.length > 0) {
      const source = passiveSources[0];
      vocabularyStore.recordPassiveVocabulary({
        term: record.term,
        termType: record.termType as 'word' | 'phrase' | 'expression' | 'sentence_pattern',
        materialId: source.materialId,
        context: source.context,
      });
      imported++;
    } else if (activeUsages.length > 0) {
      const usage = activeUsages[0];
      vocabularyStore.recordActiveVocabulary({
        term: record.term,
        termType: record.termType as 'word' | 'phrase' | 'expression' | 'sentence_pattern',
        utteranceId: usage.utteranceId,
        sessionId: usage.sessionId,
        context: usage.context,
      });
      imported++;
    }
  }

  console.log(`[DataExport] Imported ${imported} records, skipped ${skipped} duplicates`);
  return { imported, skipped };
}

/**
 * Read and parse JSON file
 */
export function readJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        resolve(json);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
