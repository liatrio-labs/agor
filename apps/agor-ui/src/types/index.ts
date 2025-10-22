// src/types/index.ts
// UI-specific types only
// Import core types directly from @agor/core/types in components

export * from './ui';

// Legacy type alias for backwards compatibility with old UI code
import type { ContextFileListItem } from '@agor/core/types';

export type ConceptListItem = ContextFileListItem;
