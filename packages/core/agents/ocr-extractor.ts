/**
 * OCR Extractor Agent
 *
 * Uses vision models to extract text from images.
 * Supports both screenshots (structured text) and photos (handwritten/scene text).
 */

export const OCR_SYSTEM_PROMPT = `You are a precise text extraction assistant. Your job is to extract text from images accurately.

For screenshots:
- Extract all visible text, preserving structure and hierarchy
- Keep formatting cues like bullet points, numbering
- Preserve paragraph breaks

For photos with text:
- Extract handwritten or printed text as accurately as possible
- If text is partially visible or unclear, indicate with [unclear]
- For non-text elements that provide context, briefly describe them

Output only the extracted text, no commentary.`;

export const OCR_USER_PROMPT = `Please extract all text from this image.

If it's a screenshot, preserve the text structure.
If it's a photo with handwritten notes, do your best to transcribe accurately.

Output only the extracted text.`;

export interface OCRInput {
  /** Base64 encoded image */
  imageBase64: string;
  /** Image MIME type */
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
}

export interface OCRResponse {
  /** Extracted text */
  text: string;
  /** Confidence indicator */
  confidence: 'high' | 'medium' | 'low';
}
