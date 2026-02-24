/**
 * Loro CRDT Storage Module
 *
 * Provides synced data storage using Loro CRDT with IndexedDB persistence.
 */

// Core
export { getDoc, initLoro, persistNow, scheduleSave } from './core';

// Types
export type {
  LoroMaterial,
  LoroArtifact,
  LoroSessionMemory,
  LoroSession,
  LoroUserProfile,
  LoroLearningState,
  LoroTopicProficiency,
  LoroGrowthEvent,
  LoroUserUtterance,
  LoroVocabularyRecord,
} from './types';

// Materials
export {
  addMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterial,
  getAllMaterials,
} from './materials';

// Artifacts
export {
  addArtifact,
  updateArtifact,
  deleteArtifact,
  getArtifact,
  getAllArtifacts,
} from './artifacts';

// Sessions
export {
  addSessionMemory,
  updateSessionMemory,
  getSessionMemory,
  getAllSessionMemories,
  deleteSessionMemory,
  addSession,
  updateSession,
  getSession,
} from './sessions';

// User Profile
export {
  saveUserProfile,
  getUserProfile,
  saveLearningState,
  getLearningState,
} from './user-profile';

// Topic Proficiency
export {
  saveTopicProficiency,
  getTopicProficiency,
} from './proficiency';

// Growth Events
export {
  addGrowthEvent,
  getAllGrowthEvents,
  getGrowthEventsByDateRange,
} from './growth';

// Vocabulary
export {
  addUserUtterance,
  getUserUtterance,
  markUtteranceExtracted,
  getSessionUtterances,
  getAllUserUtterances,
  getUnextractedUtterances,
  saveVocabularyRecord,
  getVocabularyRecord,
  getAllVocabularyRecords,
  getVocabularyByStatus,
  getVocabularyByType,
  updateVocabularyMarking,
} from './vocabulary';
