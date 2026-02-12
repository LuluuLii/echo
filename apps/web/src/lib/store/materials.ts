import { create } from 'zustand';
import {
  initLoro,
  addMaterial as loroAddMaterial,
  updateMaterial as loroUpdateMaterial,
  deleteMaterial as loroDeleteMaterial,
  getAllMaterials,
  getMaterial as loroGetMaterial,
  addArtifact as loroAddArtifact,
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
  type: 'text' | 'image';
  content: string;
  note?: string;
  createdAt: number;
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
  materialIds: string[];     // Related materials
  anchor?: string;           // emotionalAnchor summary
  createdAt: number;
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
  addMaterial: (content: string, type: 'text' | 'image', note?: string) => void;
  updateMaterial: (id: string, content: string, note?: string) => void;
  deleteMaterial: (id: string) => void;
  getMaterial: (id: string) => RawMaterial | undefined;

  // Artifact operations
  saveArtifact: (content: string, materialIds: string[], anchor?: string) => EchoArtifact;

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

  // Card operations (not persisted)
  setCurrentCard: (card: ActivationCard) => void;
  clearCurrentCard: () => void;
}

/**
 * Convert LoroMaterial to RawMaterial
 */
function toRawMaterial(m: LoroMaterial): RawMaterial {
  return {
    id: m.id,
    type: m.type,
    content: m.content,
    note: m.note,
    createdAt: m.createdAt,
  };
}

/**
 * Convert LoroArtifact to EchoArtifact
 */
function toEchoArtifact(a: LoroArtifact): EchoArtifact {
  return {
    id: a.id,
    content: a.content,
    materialIds: a.materialIds,
    anchor: a.anchor,
    createdAt: a.createdAt,
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

  addMaterial: (content, type, note) => {
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    // Add to Loro (will persist to IndexedDB)
    loroAddMaterial({
      id,
      type,
      content,
      note,
      createdAt,
    });

    // Update Zustand state
    const newMaterial: RawMaterial = {
      id,
      type,
      content,
      note,
      createdAt,
    };
    set((state) => ({
      materials: [newMaterial, ...state.materials],
    }));

    // Generate embedding asynchronously (don't block UI)
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

  saveArtifact: (content, materialIds, anchor) => {
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    const artifact: EchoArtifact = {
      id,
      content,
      materialIds,
      anchor,
      createdAt,
    };

    // Save to Loro (will persist to IndexedDB)
    loroAddArtifact({
      id,
      content,
      materialIds,
      anchor,
      createdAt,
    });

    // Update Zustand state
    set((state) => ({
      artifacts: [artifact, ...state.artifacts],
    }));

    return artifact;
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
    set({ currentCard: card });
  },

  clearCurrentCard: () => {
    set({ currentCard: null });
  },
}));
