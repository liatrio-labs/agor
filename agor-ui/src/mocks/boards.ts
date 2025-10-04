import { Board } from '../types';
import { mockSessionA, mockSessionB, mockSessionC } from './sessions';

export const mockBoardDefault: Board = {
  board_id: 'board-default',
  name: 'Default Board',
  description: 'Main workspace for all sessions',
  sessions: [mockSessionA.session_id, mockSessionB.session_id, mockSessionC.session_id],
  created_at: '2025-10-01T10:00:00Z',
  last_updated: '2025-10-04T15:30:00Z',
  color: '#1890ff',
  icon: '📋',
};

export const mockBoardExperiments: Board = {
  board_id: 'board-experiments',
  name: 'Experiments',
  description: 'Testing new features and prototypes',
  sessions: [],
  created_at: '2025-10-02T14:20:00Z',
  last_updated: '2025-10-03T09:15:00Z',
  color: '#722ed1',
  icon: '🧪',
};

export const mockBoardBugFixes: Board = {
  board_id: 'board-bugfixes',
  name: 'Bug Fixes',
  description: 'Tracking bug fix sessions',
  sessions: [],
  created_at: '2025-10-03T08:00:00Z',
  last_updated: '2025-10-03T08:00:00Z',
  color: '#f5222d',
  icon: '🐛',
};

export const mockBoards: Board[] = [
  mockBoardDefault,
  mockBoardExperiments,
  mockBoardBugFixes,
];
