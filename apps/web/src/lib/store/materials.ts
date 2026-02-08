import { create } from 'zustand';
import {
  initLoro,
  addMaterial as loroAddMaterial,
  updateMaterial as loroUpdateMaterial,
  deleteMaterial as loroDeleteMaterial,
  getAllMaterials,
  getMaterial as loroGetMaterial,
  type LoroMaterial,
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

interface MaterialsStore {
  // State
  materials: RawMaterial[];
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

export const useMaterialsStore = create<MaterialsStore>((set, get) => ({
  materials: [],
  currentCard: null,
  initialized: false,
  loading: false,

  init: async () => {
    if (get().initialized || get().loading) return;

    set({ loading: true });

    try {
      // Initialize Loro and load from IndexedDB
      await initLoro();

      // Load materials from Loro
      const loroMaterials = getAllMaterials();
      const materials = loroMaterials.map(toRawMaterial);

      set({
        materials,
        initialized: true,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to initialize store:', error);
      set({ loading: false });
    }
  },

  reload: () => {
    // Reload materials from Loro (after sync/restore)
    const loroMaterials = getAllMaterials();
    const materials = loroMaterials.map(toRawMaterial);
    set({ materials });
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

  setCurrentCard: (card) => {
    set({ currentCard: card });
  },

  clearCurrentCard: () => {
    set({ currentCard: null });
  },
}));
