export interface Board {
  board_id: string;
  name: string;
  description?: string;
  sessions: string[];  // session IDs in this board
  created_at: string;
  last_updated: string;
  color?: string;  // hex color for visual distinction
  icon?: string;   // optional emoji/icon
}
