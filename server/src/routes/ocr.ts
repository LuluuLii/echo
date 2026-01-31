import { Hono } from 'hono';
import { extractTextFromImage } from '../services/ocr';
import type { OCRInput } from '@echo/core';

export const ocrRoutes = new Hono();

interface OCRRequestBody {
  imageBase64: string;
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
}

/**
 * POST /api/ocr
 * Extract text from an image using AI vision
 */
ocrRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json<OCRRequestBody>();

    if (!body.imageBase64) {
      return c.json({ error: 'Image data is required' }, 400);
    }

    // Default to PNG if not specified
    const mimeType = body.mimeType || 'image/png';

    const input: OCRInput = {
      imageBase64: body.imageBase64,
      mimeType,
    };

    const result = await extractTextFromImage(input);

    return c.json(result);
  } catch (error) {
    console.error('OCR failed:', error);
    return c.json(
      { error: 'Failed to extract text from image' },
      500
    );
  }
});
