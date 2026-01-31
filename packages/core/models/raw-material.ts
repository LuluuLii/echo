/**
 * Raw Material - User's captured content
 *
 * These are things the user once noticed - thoughts, notes, screenshots.
 * Raw materials are not organized or processed, just captured.
 */
export interface RawMaterial {
  /** Unique identifier */
  id: string;

  /** Content type */
  type: 'text' | 'image';

  /** Text content or OCR-extracted text from image */
  content: string;

  /** Local image URI (for image type) */
  imageUri?: string;

  /** User's optional annotation */
  note?: string;

  /** Source of the material */
  source: 'manual' | 'import' | 'chat';

  /** Unix timestamp (milliseconds) */
  createdAt: number;

  /** Cached embedding vector (optional, for similarity search) */
  embedding?: number[];
}

export interface CreateRawMaterialInput {
  type: 'text' | 'image';
  content: string;
  imageUri?: string;
  note?: string;
  source?: 'manual' | 'import' | 'chat';
}
