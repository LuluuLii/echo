/**
 * Echo Artifact - User's finalized expression
 *
 * An artifact represents a user's polished expression that emerged from
 * an Echo session. It captures both the content and the context of how
 * that expression was developed.
 */
export interface EchoArtifact {
  id: string;

  // Core content
  content: string;              // User's final expression
  contentEn?: string;           // English translation (if original is not English)

  // Context & relationships
  materialIds: string[];        // Related source materials
  anchor?: string;              // Emotional anchor summary from the session
  sessionId?: string;           // Associated session ID

  // Metadata
  topic?: string;               // Discussion topic
  tags?: string[];              // User-defined or auto-generated tags

  // Timestamps
  createdAt: number;
  updatedAt?: number;
}

/**
 * Input for creating a new artifact
 */
export interface CreateArtifactInput {
  content: string;
  contentEn?: string;
  materialIds: string[];
  anchor?: string;
  sessionId?: string;
  topic?: string;
  tags?: string[];
}

/**
 * Input for updating an artifact
 */
export interface UpdateArtifactInput {
  content?: string;
  contentEn?: string;
  topic?: string;
  tags?: string[];
}
