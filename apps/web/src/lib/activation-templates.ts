/**
 * Activation Card Generation
 *
 * Uses LLMService when available, falls back to templates when not.
 */

import type { ActivationCard } from './store/materials';
import { getLLMService } from './llm';
import {
  buildActivationPrompt,
  parseActivationResponse,
} from './llm/prompts/activation';

interface ActivationTemplate {
  id: string;
  theme: string;
  emotionalAnchor: string;
  invitation: string;
  expressions: string[];
}

/**
 * Template library with diverse emotional themes
 */
export const ACTIVATION_TEMPLATES: ActivationTemplate[] = [
  {
    id: 'reflection',
    theme: 'reflection',
    emotionalAnchor: 'A moment when you paused to notice something you usually overlook...',
    invitation: 'If you were sharing this insight with a friend, how would you describe it?',
    expressions: [
      'What struck me was...',
      'I never realized that...',
      'Looking back, I see...',
    ],
  },
  {
    id: 'growth',
    theme: 'growth',
    emotionalAnchor: 'A moment when you felt yourself changing, even just a little...',
    invitation: 'What would you tell someone who is just starting this journey?',
    expressions: [
      'The turning point was...',
      'I learned that...',
      'What helped me was...',
    ],
  },
  {
    id: 'challenge',
    theme: 'challenge',
    emotionalAnchor: 'A moment when you faced something difficult and found your way through...',
    invitation: 'How would you encourage someone facing a similar challenge?',
    expressions: [
      'What I discovered was...',
      'The hardest part was...',
      'But then I realized...',
    ],
  },
  {
    id: 'connection',
    theme: 'connection',
    emotionalAnchor: 'A moment when you felt truly understood, or understood someone else...',
    invitation: 'If you could share this feeling, what words would you use?',
    expressions: [
      'It felt like...',
      'What mattered most was...',
      'I understood that...',
    ],
  },
  {
    id: 'discovery',
    theme: 'discovery',
    emotionalAnchor: 'A moment when something clicked, and the world looked a bit different...',
    invitation: 'How would you explain this discovery to someone curious about it?',
    expressions: [
      'I finally understood...',
      'It was like seeing...',
      'Now I know that...',
    ],
  },
  {
    id: 'emotion',
    theme: 'emotion',
    emotionalAnchor: 'A moment when you noticed how feelings show up in unexpected ways...',
    invitation: 'If you were describing this feeling to someone, what would you say?',
    expressions: [
      'The feeling was like...',
      'What surprised me was...',
      'I felt...',
    ],
  },
  {
    id: 'everyday',
    theme: 'everyday',
    emotionalAnchor: 'A moment in your daily life that held unexpected meaning...',
    invitation: 'What story would you tell about this ordinary moment?',
    expressions: [
      'In that moment...',
      'What I noticed was...',
      'It reminded me that...',
    ],
  },
  {
    id: 'memory',
    theme: 'memory',
    emotionalAnchor: 'A memory that still carries weight, still feels alive...',
    invitation: 'If you were writing this memory down, how would you begin?',
    expressions: [
      'I remember when...',
      'What stays with me is...',
      'Even now, I can feel...',
    ],
  },
];

/**
 * Extract key phrases from material content
 */
function extractKeyPhrase(content: string, maxLength = 100): string {
  // Clean and normalize
  const cleaned = content.trim().replace(/\s+/g, ' ');

  // If short enough, use as is
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Try to find a good sentence break
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 0 && sentences[0].length <= maxLength) {
    return sentences[0].trim() + '.';
  }

  // Truncate at word boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

/**
 * Select the best template based on material content
 * Uses simple keyword matching to find relevant themes
 */
function selectTemplate(materials: Array<{ content: string; note?: string }>): ActivationTemplate {
  const allText = materials
    .map((m) => `${m.content} ${m.note || ''}`)
    .join(' ')
    .toLowerCase();

  // Theme keywords mapping
  const themeKeywords: Record<string, string[]> = {
    growth: ['learn', 'grow', 'improve', 'better', 'progress', 'develop', 'change'],
    challenge: ['difficult', 'hard', 'struggle', 'overcome', 'fight', 'obstacle', 'problem'],
    connection: ['friend', 'family', 'people', 'together', 'understand', 'share', 'love'],
    discovery: ['realize', 'discover', 'find', 'new', 'understand', 'insight', 'aha'],
    emotion: ['feel', 'emotion', 'happy', 'sad', 'angry', 'fear', 'joy', 'anxiety'],
    memory: ['remember', 'memory', 'past', 'childhood', 'years ago', 'back then'],
    reflection: ['think', 'wonder', 'notice', 'observe', 'reflect', 'contemplate'],
    everyday: ['day', 'morning', 'routine', 'usual', 'normal', 'daily', 'life'],
  };

  // Score each theme
  const scores: Record<string, number> = {};
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    scores[theme] = keywords.filter((kw) => allText.includes(kw)).length;
  }

  // Find best matching theme
  const bestTheme = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  // If good match found, use that template
  if (bestTheme && bestTheme[1] > 0) {
    const template = ACTIVATION_TEMPLATES.find((t) => t.theme === bestTheme[0]);
    if (template) return template;
  }

  // Random fallback
  const randomIndex = Math.floor(Math.random() * ACTIVATION_TEMPLATES.length);
  return ACTIVATION_TEMPLATES[randomIndex];
}

/**
 * Generate an activation card offline using templates and user materials
 */
export function generateOfflineCard(
  materials: Array<{ id: string; content: string; note?: string }>
): ActivationCard {
  if (materials.length === 0) {
    throw new Error('At least one material is required');
  }

  // Select appropriate template
  const template = selectTemplate(materials);

  // Pick a material for the lived experience (prefer one with a note, or the longest)
  const sortedMaterials = [...materials].sort((a, b) => {
    // Prefer materials with notes
    if (a.note && !b.note) return -1;
    if (!a.note && b.note) return 1;
    // Then by content length
    return b.content.length - a.content.length;
  });

  const primaryMaterial = sortedMaterials[0];
  const livedExperience = primaryMaterial.note
    ? `"${extractKeyPhrase(primaryMaterial.content, 80)}" — ${primaryMaterial.note}`
    : `"${extractKeyPhrase(primaryMaterial.content, 120)}"`;

  return {
    id: crypto.randomUUID(),
    emotionalAnchor: template.emotionalAnchor,
    livedExperience,
    expressions: template.expressions,
    invitation: template.invitation,
    materialIds: materials.map((m) => m.id),
    createdAt: Date.now(),
  };
}

/**
 * Generate activation card using LLMService.
 * Auto-translates materials without English translation.
 * Falls back to offline templates when LLM is not available.
 *
 * @param materials - Materials with optional contentEn
 * @param topic - Optional topic for the card
 * @param onTranslate - Callback to save translations to store
 */
export async function generateActivationCard(
  materials: Array<{ id: string; content: string; contentEn?: string; note?: string }>,
  topic?: string,
  onTranslate?: (id: string, contentEn: string) => void
): Promise<ActivationCard> {
  if (materials.length === 0) {
    throw new Error('At least one material is required');
  }

  const llmService = getLLMService();

  // Wait for LLM service to be initialized before proceeding
  await llmService.waitForInit();

  const config = llmService.getConfig();
  const activeProvider = llmService.getActiveProvider();

  // Debug logging
  console.log('[Activation] Config:', {
    activeProviderId: config.activeProvider,
    hasProvider: !!activeProvider,
    providerReady: activeProvider?.isReady(),
    providerId: activeProvider?.id,
  });

  // If no provider is ready or using template provider, use offline generation
  if (!activeProvider || !activeProvider.isReady() || activeProvider.id === 'template') {
    console.log('[Activation] Using offline generation - reason:',
      !activeProvider ? 'no provider' :
      !activeProvider.isReady() ? 'provider not ready' :
      'using template provider'
    );
    return generateOfflineCard(materials);
  }

  try {
    // Auto-translate materials that don't have English translation
    const { translateToEnglish } = await import('./translation');
    const translatedMaterials = await Promise.all(
      materials.map(async (m) => {
        // Skip if already has English translation or content is already English
        if (m.contentEn) {
          return m;
        }

        console.log(`[Activation] Auto-translating material ${m.id.slice(0, 8)}...`);
        const result = await translateToEnglish(m.content);

        if (result.success && result.translation) {
          // Save translation to store via callback
          onTranslate?.(m.id, result.translation);
          return { ...m, contentEn: result.translation };
        }

        return m;
      })
    );

    console.log(`[Activation] Generating with ${activeProvider.name}`);

    // Build prompt and call LLM with translated materials
    const messages = buildActivationPrompt(
      translatedMaterials.map((m) => ({
        ...m,
        id: m.id,
        createdAt: Date.now(),
        type: 'text' as const,
      })),
      topic
    );
    const response = await activeProvider.chat(messages);

    // Parse the response
    const parsed = parseActivationResponse(response);
    if (parsed) {
      return {
        id: crypto.randomUUID(),
        emotionalAnchor: parsed.emotionalAnchor,
        livedExperience: parsed.livedExperience,
        expressions: parsed.expressions,
        invitation: parsed.invitation,
        materialIds: materials.map((m) => m.id),
        createdAt: Date.now(),
      };
    }

    // If parsing failed, fall back to offline
    console.log('[Activation] Failed to parse LLM response, using offline generation');
    return generateOfflineCard(materials);
  } catch (error) {
    console.log('[Activation] LLM error, using offline generation:', error);
    return generateOfflineCard(materials);
  }
}
