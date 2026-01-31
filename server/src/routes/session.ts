import { Hono } from 'hono';
import { generateEchoResponse } from '../services/ai';
import type { EchoCompanionContext, ActivationCard, SessionMessage } from '@echo/core';

export const sessionRoutes = new Hono();

interface SendMessageBody {
  sessionId: string;
  message: string;
  context: {
    card?: ActivationCard;
    materials?: Array<{ content: string; note?: string }>;
    history: SessionMessage[];
  };
}

/**
 * POST /api/session/message
 * Send a message in an Echo session and get AI response
 */
sessionRoutes.post('/message', async (c) => {
  try {
    const body = await c.req.json<SendMessageBody>();

    if (!body.message || body.message.trim() === '') {
      return c.json({ error: 'Message is required' }, 400);
    }

    const context: EchoCompanionContext = {
      card: body.context.card,
      materials: body.context.materials,
      history: body.context.history || [],
    };

    const reply = await generateEchoResponse(body.message, context);

    return c.json({
      reply,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Failed to generate session response:', error);
    return c.json(
      { error: 'Failed to generate response' },
      500
    );
  }
});
