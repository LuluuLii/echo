import { create } from 'zustand';

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
  materials: RawMaterial[];
  currentCard: ActivationCard | null;

  addMaterial: (content: string, type: 'text' | 'image', note?: string) => void;
  updateMaterial: (id: string, content: string, note?: string) => void;
  deleteMaterial: (id: string) => void;
  getMaterial: (id: string) => RawMaterial | undefined;

  setCurrentCard: (card: ActivationCard) => void;
  clearCurrentCard: () => void;
}

export const useMaterialsStore = create<MaterialsStore>((set, get) => ({
  materials: [],
  currentCard: null,

  addMaterial: (content, type, note) => {
    const newMaterial: RawMaterial = {
      id: crypto.randomUUID(),
      type,
      content,
      note,
      createdAt: Date.now(),
    };
    set((state) => ({
      materials: [newMaterial, ...state.materials],
    }));
  },

  updateMaterial: (id, content, note) => {
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, content, note } : m
      ),
    }));
  },

  deleteMaterial: (id) => {
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    }));
  },

  getMaterial: (id) => {
    return get().materials.find((m) => m.id === id);
  },

  setCurrentCard: (card) => {
    set({ currentCard: card });
  },

  clearCurrentCard: () => {
    set({ currentCard: null });
  },
}));
