import OpenAI from 'openai';
import { OCR_SYSTEM_PROMPT, OCR_USER_PROMPT, type OCRInput, type OCRResponse } from '@echo/core';

// Lazy-load OpenAI client
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Extract text from image using GPT-4 Vision
 */
export async function extractTextFromImage(input: OCRInput): Promise<OCRResponse> {
  const client = getOpenAI();

  if (!client) {
    console.log('[OCR] No API key, returning mock response');
    return {
      text: '[OCR requires OpenAI API key. Please configure OPENAI_API_KEY in server/.env]',
      confidence: 'low',
    };
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: OCR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: OCR_USER_PROMPT },
          {
            type: 'image_url',
            image_url: {
              url: `data:${input.mimeType};base64,${input.imageBase64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No OCR result from AI');
  }

  // Estimate confidence based on response length and markers
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (content.includes('[unclear]') || content.includes('[illegible]')) {
    confidence = 'medium';
  }
  if (content.length < 10) {
    confidence = 'low';
  }

  return {
    text: content,
    confidence,
  };
}

/**
 * Extract text using DeepSeek OCR (for comparison)
 * TODO: Implement when DeepSeek API is available
 */
export async function extractTextWithDeepSeek(input: OCRInput): Promise<OCRResponse> {
  // Placeholder for DeepSeek OCR implementation
  throw new Error('DeepSeek OCR not yet implemented');
}
