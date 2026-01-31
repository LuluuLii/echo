import { Hono } from 'hono';
import { generateActivationCard } from '../services/ai';
import type { GenerateActivationCardInput, ActivationCard } from '@echo/core';

export const activationRoutes = new Hono();

/**
 * POST /api/activation/generate
 * Generate an activation card from user materials
 */
activationRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json<GenerateActivationCardInput>();

    if (!body.materialIds || body.materialIds.length === 0) {
      return c.json({ error: 'At least one material ID is required' }, 400);
    }

    if (!body.materials || body.materials.length === 0) {
      return c.json({ error: 'Materials content is required' }, 400);
    }

    const cardData = await generateActivationCard(body);

    // Construct full activation card with metadata
    const card: ActivationCard = {
      id: crypto.randomUUID(),
      emotionalAnchor: cardData.emotionalAnchor,
      livedExperience: cardData.livedExperience,
      expressions: cardData.expressions,
      invitation: cardData.invitation,
      materialIds: body.materialIds,
      createdAt: Date.now(),
    };

    return c.json(card);
  } catch (error) {
    console.error('Failed to generate activation card:', error);
    return c.json(
      { error: 'Failed to generate activation card' },
      500
    );
  }
});
