/**
 * Deduplication Module
 *
 * Detects duplicate or similar content using embedding similarity.
 */

import { embed, cosineSimilarity, getEmbedding } from './embedding';
import type { RawMaterial } from './store/materials';

export interface DuplicateMatch {
  materialId: string;
  content: string;
  similarity: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  isNearDuplicate: boolean;
  matches: DuplicateMatch[];
}

// Similarity thresholds
const EXACT_DUPLICATE_THRESHOLD = 0.98; // Essentially identical
const NEAR_DUPLICATE_THRESHOLD = 0.85; // Very similar

/**
 * Check if content is a duplicate of existing materials
 */
export async function checkDuplicate(
  content: string,
  materials: RawMaterial[]
): Promise<DuplicateCheckResult> {
  if (materials.length === 0) {
    return { isDuplicate: false, isNearDuplicate: false, matches: [] };
  }

  // First do a quick text-based check for exact matches
  const normalizedContent = normalizeText(content);
  for (const m of materials) {
    if (normalizeText(m.content) === normalizedContent) {
      return {
        isDuplicate: true,
        isNearDuplicate: false,
        matches: [{
          materialId: m.id,
          content: m.content,
          similarity: 1.0,
        }],
      };
    }
  }

  // Generate embedding for new content
  const newEmbedding = await embed(content);

  // Compare with existing materials
  const matches: DuplicateMatch[] = [];

  for (const material of materials) {
    const materialEmb = await getEmbedding(material.id, material.content);
    const similarity = cosineSimilarity(newEmbedding, materialEmb);

    if (similarity >= NEAR_DUPLICATE_THRESHOLD) {
      matches.push({
        materialId: material.id,
        content: material.content,
        similarity,
      });
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  const isDuplicate = matches.some((m) => m.similarity >= EXACT_DUPLICATE_THRESHOLD);
  const isNearDuplicate = !isDuplicate && matches.length > 0;

  return { isDuplicate, isNearDuplicate, matches };
}

/**
 * Batch check for duplicates (more efficient for multiple items)
 */
export async function checkDuplicatesBatch(
  contents: string[],
  materials: RawMaterial[]
): Promise<Map<number, DuplicateCheckResult>> {
  const results = new Map<number, DuplicateCheckResult>();

  if (materials.length === 0) {
    contents.forEach((_, i) => {
      results.set(i, { isDuplicate: false, isNearDuplicate: false, matches: [] });
    });
    return results;
  }

  // Pre-load all material embeddings
  const materialEmbeddings = new Map<string, number[]>();
  for (const m of materials) {
    const emb = await getEmbedding(m.id, m.content);
    materialEmbeddings.set(m.id, emb);
  }

  // Check each content
  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    const normalizedContent = normalizeText(content);

    // Quick exact text check
    let exactMatch = false;
    for (const m of materials) {
      if (normalizeText(m.content) === normalizedContent) {
        results.set(i, {
          isDuplicate: true,
          isNearDuplicate: false,
          matches: [{
            materialId: m.id,
            content: m.content,
            similarity: 1.0,
          }],
        });
        exactMatch = true;
        break;
      }
    }

    if (exactMatch) continue;

    // Embedding-based check
    const newEmbedding = await embed(content);
    const matches: DuplicateMatch[] = [];

    for (const material of materials) {
      const materialEmb = materialEmbeddings.get(material.id)!;
      const similarity = cosineSimilarity(newEmbedding, materialEmb);

      if (similarity >= NEAR_DUPLICATE_THRESHOLD) {
        matches.push({
          materialId: material.id,
          content: material.content,
          similarity,
        });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    const isDuplicate = matches.some((m) => m.similarity >= EXACT_DUPLICATE_THRESHOLD);
    const isNearDuplicate = !isDuplicate && matches.length > 0;

    results.set(i, { isDuplicate, isNearDuplicate, matches });
  }

  return results;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Smart segmentation for long text
 * Splits text into meaningful segments based on content structure
 */
export function smartSegment(text: string): string[] {
  // Try different splitting strategies in order of preference

  // 1. Markdown headers (## or #)
  if (text.includes('## ') || text.match(/^# /m)) {
    const headerSegments = text.split(/(?=^#{1,2} )/m);
    const filtered = headerSegments.filter(s => s.trim().length > 20);
    if (filtered.length > 1) {
      return filtered.map(s => s.trim());
    }
  }

  // 2. Horizontal rules (--- or ***)
  if (text.includes('---') || text.includes('***')) {
    const ruleSegments = text.split(/^(?:---|\*\*\*)\s*$/m);
    const filtered = ruleSegments.filter(s => s.trim().length > 20);
    if (filtered.length > 1) {
      return filtered.map(s => s.trim());
    }
  }

  // 3. Double newlines (paragraph breaks)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  if (paragraphs.length > 1 && paragraphs.length <= 20) {
    // Reasonable number of paragraphs, return as-is
    return paragraphs.map(p => p.trim());
  }

  // 4. If too many paragraphs, try to combine into larger chunks
  if (paragraphs.length > 20) {
    const combined: string[] = [];
    let current = '';

    for (const p of paragraphs) {
      if (current.length + p.length < 1000) {
        current = current ? `${current}\n\n${p}` : p;
      } else {
        if (current) combined.push(current.trim());
        current = p;
      }
    }
    if (current) combined.push(current.trim());

    if (combined.length > 1) {
      return combined;
    }
  }

  // 5. Numbered lists (1. 2. 3. or 1) 2) 3))
  const numberedMatch = text.match(/(?:^|\n)\s*\d+[.)]\s/g);
  if (numberedMatch && numberedMatch.length >= 3) {
    const items = text.split(/(?=(?:^|\n)\s*\d+[.)]\s)/);
    const filtered = items.filter(s => s.trim().length > 20);
    if (filtered.length > 1) {
      return filtered.map(s => s.trim());
    }
  }

  // 6. Bullet points (- or * at line start)
  const bulletMatch = text.match(/(?:^|\n)\s*[-*]\s/g);
  if (bulletMatch && bulletMatch.length >= 3) {
    // Group bullets into topics (separated by double newlines)
    const bulletGroups = text.split(/\n\s*\n/).filter(s => s.trim().length > 20);
    if (bulletGroups.length > 1) {
      return bulletGroups.map(s => s.trim());
    }
  }

  // 7. For very long single blocks, split by sentence boundaries (Chinese or English)
  if (text.length > 2000) {
    const sentences = text.split(/(?<=[。！？.!?])\s*/);
    const chunks: string[] = [];
    let current = '';

    for (const s of sentences) {
      if (current.length + s.length < 800) {
        current = current ? `${current} ${s}` : s;
      } else {
        if (current && current.length > 50) chunks.push(current.trim());
        current = s;
      }
    }
    if (current && current.length > 50) chunks.push(current.trim());

    if (chunks.length > 1) {
      return chunks;
    }
  }

  // 8. Fallback: return the whole text as single segment
  return [text.trim()];
}
