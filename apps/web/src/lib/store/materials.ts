import { create } from 'zustand';
import {
  initLoro,
  addMaterial as loroAddMaterial,
  updateMaterial as loroUpdateMaterial,
  deleteMaterial as loroDeleteMaterial,
  getAllMaterials,
  getMaterial as loroGetMaterial,
  addArtifact as loroAddArtifact,
  updateArtifact as loroUpdateArtifact,
  deleteArtifact as loroDeleteArtifact,
  getArtifact as loroGetArtifact,
  getAllArtifacts,
  addSessionMemory as loroAddSessionMemory,
  updateSessionMemory as loroUpdateSessionMemory,
  getSessionMemory as loroGetSessionMemory,
  deleteSessionMemory as loroDeleteSessionMemory,
  getAllSessionMemories,
  type LoroMaterial,
  type LoroArtifact,
  type LoroSessionMemory,
} from '../loro';
import { getEmbedding } from '../embedding';
import { deleteEmbedding } from '../db';

export interface RawMaterial {
  id: string;
  type: 'text' | 'file';
  content: string;              // Text content or file description
  contentEn?: string;           // English translation of content
  note?: string;
  createdAt: number;
  // File-specific fields (only for type: 'file')
  fileName?: string;            // Original file name
  fileType?: 'image' | 'pdf' | 'document';  // File category
  mimeType?: string;            // MIME type
  fileData?: string;            // Base64 encoded file data
  fileThumbnail?: string;       // Base64 thumbnail for preview
}

export interface ActivationCard {
  id: string;
  emotionalAnchor: string;
  livedExperience: string;
  expressions: string[];
  invitation: string;
  materialIds: string[];
  createdAt: number;
}

export interface EchoArtifact {
  id: string;
  content: string;           // User's final expression
  contentEn?: string;        // English translation (if original is not English)
  materialIds: string[];     // Related materials
  anchor?: string;           // emotionalAnchor summary
  sessionId?: string;        // Associated session ID
  topic?: string;            // Discussion topic
  tags?: string[];           // User-defined or auto-generated tags
  createdAt: number;
  updatedAt?: number;
}

export interface SessionMemory {
  id: string;
  sessionId: string;
  topic?: string;            // Discussion topic
  turnCount: number;         // Total conversation turns
  summary: string;           // Brief summary
  status: 'completed' | 'abandoned';
  artifactId?: string;       // If user saved an artifact
  materialIds: string[];
  createdAt: number;
  exitedAt: number;
}

interface MaterialsStore {
  // State
  materials: RawMaterial[];
  artifacts: EchoArtifact[];
  sessionMemories: SessionMemory[];
  currentCard: ActivationCard | null;
  initialized: boolean;
  loading: boolean;

  // Initialization
  init: () => Promise<void>;
  reload: () => void;

  // Material operations
  addMaterial: (content: string, type: 'text' | 'file', note?: string, fileOptions?: {
    fileName?: string;
    fileType?: 'image' | 'pdf' | 'document';
    mimeType?: string;
    fileData?: string;
    fileThumbnail?: string;
  }) => void;
  updateMaterial: (id: string, content: string, note?: string) => void;
  setMaterialTranslation: (id: string, contentEn: string) => void;
  deleteMaterial: (id: string) => void;
  getMaterial: (id: string) => RawMaterial | undefined;

  // Artifact operations
  saveArtifact: (params: {
    content: string;
    contentEn?: string;
    materialIds: string[];
    anchor?: string;
    sessionId?: string;
    topic?: string;
    tags?: string[];
  }) => EchoArtifact;
  updateArtifact: (
    id: string,
    updates: Partial<Pick<EchoArtifact, 'content' | 'contentEn' | 'topic' | 'tags'>>
  ) => void;
  deleteArtifact: (id: string) => void;
  getArtifact: (id: string) => EchoArtifact | undefined;

  // Session Memory operations
  saveSessionMemory: (params: {
    sessionId: string;
    topic?: string;
    turnCount: number;
    summary: string;
    status: 'completed' | 'abandoned';
    artifactId?: string;
    materialIds: string[];
    createdAt: number;
  }) => SessionMemory;
  updateSessionMemory: (
    id: string,
    updates: Partial<Pick<SessionMemory, 'turnCount' | 'summary' | 'status' | 'artifactId' | 'exitedAt'>>
  ) => void;
  getSessionMemory: (id: string) => SessionMemory | undefined;
  deleteSessionMemory: (id: string) => void;

  // Card operations (persisted to localStorage for daily card)
  setCurrentCard: (card: ActivationCard) => void;
  clearCurrentCard: () => void;
  loadDailyCard: () => ActivationCard | null;
}

/**
 * Convert LoroMaterial to RawMaterial
 */
function toRawMaterial(m: LoroMaterial): RawMaterial {
  return {
    id: m.id,
    type: m.type,
    content: m.content,
    contentEn: m.contentEn,
    note: m.note,
    createdAt: m.createdAt,
    // File-specific fields
    fileName: m.fileName,
    fileType: m.fileType,
    mimeType: m.mimeType,
    fileData: m.fileData,
    fileThumbnail: m.fileThumbnail,
  };
}

/**
 * Convert LoroArtifact to EchoArtifact
 */
function toEchoArtifact(a: LoroArtifact): EchoArtifact {
  return {
    id: a.id,
    content: a.content,
    contentEn: a.contentEn,
    materialIds: a.materialIds,
    anchor: a.anchor,
    sessionId: a.sessionId,
    topic: a.topic,
    tags: a.tags,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/**
 * Convert LoroSessionMemory to SessionMemory
 */
function toSessionMemory(m: LoroSessionMemory): SessionMemory {
  return {
    id: m.id,
    sessionId: m.sessionId,
    topic: m.topic,
    turnCount: m.turnCount,
    summary: m.summary,
    status: m.status,
    artifactId: m.artifactId,
    materialIds: m.materialIds,
    createdAt: m.createdAt,
    exitedAt: m.exitedAt,
  };
}

// Daily card persistence
const DAILY_CARD_KEY = 'echo-daily-card';

/**
 * Check if a timestamp is from today (same calendar day)
 */
function isToday(timestamp: number): boolean {
  const cardDate = new Date(timestamp);
  const today = new Date();
  return (
    cardDate.getFullYear() === today.getFullYear() &&
    cardDate.getMonth() === today.getMonth() &&
    cardDate.getDate() === today.getDate()
  );
}

/**
 * Save daily card to localStorage
 */
function saveDailyCard(card: ActivationCard): void {
  try {
    localStorage.setItem(DAILY_CARD_KEY, JSON.stringify(card));
  } catch (e) {
    console.warn('Failed to save daily card:', e);
  }
}

/**
 * Load daily card from localStorage (only if from today)
 */
function loadDailyCardFromStorage(): ActivationCard | null {
  try {
    const stored = localStorage.getItem(DAILY_CARD_KEY);
    if (!stored) return null;

    const card = JSON.parse(stored) as ActivationCard;

    // Only return if the card is from today
    if (isToday(card.createdAt)) {
      return card;
    }

    // Card is stale (from a previous day), clear it
    localStorage.removeItem(DAILY_CARD_KEY);
    return null;
  } catch (e) {
    console.warn('Failed to load daily card:', e);
    return null;
  }
}

export const useMaterialsStore = create<MaterialsStore>((set, get) => ({
  materials: [],
  artifacts: [],
  sessionMemories: [],
  currentCard: null,
  initialized: false,
  loading: false,

  init: async () => {
    if (get().initialized || get().loading) return;

    set({ loading: true });

    try {
      // Initialize Loro and load from IndexedDB
      await initLoro();

      // Load materials, artifacts, and session memories from Loro
      const loroMaterials = getAllMaterials();
      const materials = loroMaterials.map(toRawMaterial);

      const loroArtifacts = getAllArtifacts();
      const artifacts = loroArtifacts.map(toEchoArtifact);

      const loroSessionMemories = getAllSessionMemories();
      const sessionMemories = loroSessionMemories.map(toSessionMemory);

      set({
        materials,
        artifacts,
        sessionMemories,
        initialized: true,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ loading: false });
    }
  },

  reload: () => {
    // Reload all data from Loro (after sync/restore)
    const loroMaterials = getAllMaterials();
    const materials = loroMaterials.map(toRawMaterial);

    const loroArtifacts = getAllArtifacts();
    const artifacts = loroArtifacts.map(toEchoArtifact);

    const loroSessionMemories = getAllSessionMemories();
    const sessionMemories = loroSessionMemories.map(toSessionMemory);

    set({ materials, artifacts, sessionMemories });
  },

  addMaterial: (content, type, note, fileOptions) => {
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    // Add to Loro (will persist to IndexedDB)
    loroAddMaterial({
      id,
      type,
      content,
      note,
      createdAt,
      // File-specific fields
      fileName: fileOptions?.fileName,
      fileType: fileOptions?.fileType,
      mimeType: fileOptions?.mimeType,
      fileData: fileOptions?.fileData,
      fileThumbnail: fileOptions?.fileThumbnail,
    });

    // Update Zustand state
    const newMaterial: RawMaterial = {
      id,
      type,
      content,
      note,
      createdAt,
      // File-specific fields
      fileName: fileOptions?.fileName,
      fileType: fileOptions?.fileType,
      mimeType: fileOptions?.mimeType,
      fileData: fileOptions?.fileData,
      fileThumbnail: fileOptions?.fileThumbnail,
    };
    set((state) => ({
      materials: [newMaterial, ...state.materials],
    }));

    // Generate embedding asynchronously (don't block UI)
    // For files, use the content (description) for embedding
    getEmbedding(id, content).catch((error) => {
      console.warn('Failed to generate embedding for material:', id, error);
    });
  },

  updateMaterial: (id, content, note) => {
    // Update in Loro
    loroUpdateMaterial(id, { content, note });

    // Update Zustand state
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, content, note } : m
      ),
    }));
  },

  setMaterialTranslation: (id, contentEn) => {
    // Update in Loro
    loroUpdateMaterial(id, { contentEn });

    // Update Zustand state
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, contentEn } : m
      ),
    }));
  },

  deleteMaterial: (id) => {
    // Delete from Loro
    loroDeleteMaterial(id);

    // Update Zustand state
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    }));

    // Delete embedding
    deleteEmbedding(id).catch((error) => {
      console.warn('Failed to delete embedding for material:', id, error);
    });
  },

  getMaterial: (id) => {
    // Try Zustand first (faster)
    const local = get().materials.find((m) => m.id === id);
    if (local) return local;

    // Fallback to Loro
    const loro = loroGetMaterial(id);
    return loro ? toRawMaterial(loro) : undefined;
  },

  saveArtifact: (params) => {
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    const artifact: EchoArtifact = {
      id,
      content: params.content,
      contentEn: params.contentEn,
      materialIds: params.materialIds,
      anchor: params.anchor,
      sessionId: params.sessionId,
      topic: params.topic,
      tags: params.tags,
      createdAt,
      updatedAt: createdAt,
    };

    // Save to Loro (will persist to IndexedDB)
    loroAddArtifact({
      id,
      content: params.content,
      contentEn: params.contentEn,
      materialIds: params.materialIds,
      anchor: params.anchor,
      sessionId: params.sessionId,
      topic: params.topic,
      tags: params.tags,
      createdAt,
      updatedAt: createdAt,
    });

    // Update Zustand state
    set((state) => ({
      artifacts: [artifact, ...state.artifacts],
    }));

    // Generate embedding asynchronously (don't block UI)
    getEmbedding(id, params.content).catch((error) => {
      console.warn('Failed to generate embedding for artifact:', id, error);
    });

    return artifact;
  },

  updateArtifact: (id, updates) => {
    // Update in Loro
    loroUpdateArtifact(id, updates);

    // Update Zustand state
    set((state) => ({
      artifacts: state.artifacts.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
      ),
    }));

    // If content changed, regenerate embedding
    if (updates.content !== undefined) {
      getEmbedding(id, updates.content).catch((error) => {
        console.warn('Failed to regenerate embedding for artifact:', id, error);
      });
    }
  },

  deleteArtifact: (id) => {
    // Delete from Loro
    loroDeleteArtifact(id);

    // Update Zustand state
    set((state) => ({
      artifacts: state.artifacts.filter((a) => a.id !== id),
    }));

    // Delete embedding
    deleteEmbedding(id).catch((error) => {
      console.warn('Failed to delete embedding for artifact:', id, error);
    });
  },

  getArtifact: (id) => {
    // Try Zustand first (faster)
    const local = get().artifacts.find((a) => a.id === id);
    if (local) return local;

    // Fallback to Loro
    const loro = loroGetArtifact(id);
    return loro ? toEchoArtifact(loro) : undefined;
  },

  saveSessionMemory: (params) => {
    const id = crypto.randomUUID();
    const exitedAt = Date.now();

    const memory: SessionMemory = {
      id,
      sessionId: params.sessionId,
      topic: params.topic,
      turnCount: params.turnCount,
      summary: params.summary,
      status: params.status,
      artifactId: params.artifactId,
      materialIds: params.materialIds,
      createdAt: params.createdAt,
      exitedAt,
    };

    // Save to Loro (will persist to IndexedDB)
    loroAddSessionMemory({
      id,
      sessionId: params.sessionId,
      topic: params.topic,
      turnCount: params.turnCount,
      summary: params.summary,
      status: params.status,
      artifactId: params.artifactId,
      materialIds: params.materialIds,
      createdAt: params.createdAt,
      exitedAt,
    });

    // Update Zustand state
    set((state) => ({
      sessionMemories: [memory, ...state.sessionMemories],
    }));

    return memory;
  },

  updateSessionMemory: (id, updates) => {
    // Update in Loro
    loroUpdateSessionMemory(id, updates);

    // Update Zustand state
    set((state) => ({
      sessionMemories: state.sessionMemories.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },

  getSessionMemory: (id) => {
    // Try Zustand first (faster)
    const local = get().sessionMemories.find((m) => m.id === id);
    if (local) return local;

    // Fallback to Loro
    const loro = loroGetSessionMemory(id);
    return loro ? toSessionMemory(loro) : undefined;
  },

  deleteSessionMemory: (id) => {
    // Delete from Loro
    loroDeleteSessionMemory(id);

    // Update Zustand state
    set((state) => ({
      sessionMemories: state.sessionMemories.filter((m) => m.id !== id),
    }));
  },

  setCurrentCard: (card) => {
    saveDailyCard(card);
    set({ currentCard: card });
  },

  clearCurrentCard: () => {
    // Note: Don't clear localStorage here - only clear Zustand state
    // The "New card" button should generate a new card which will overwrite storage
    set({ currentCard: null });
  },

  loadDailyCard: () => {
    const card = loadDailyCardFromStorage();
    if (card) {
      set({ currentCard: card });
    }
    return card;
  },
}));
