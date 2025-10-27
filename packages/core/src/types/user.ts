import type { UserID } from './id';

/**
 * User role types
 * - owner: Full system access, can manage all users and settings
 * - admin: Can manage most resources, cannot modify owner
 * - member: Standard user access, can create and manage own sessions
 * - viewer: Read-only access
 */
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * User type - Authentication and authorization
 */
export interface User {
  user_id: UserID;
  email: string;
  name?: string;
  emoji?: string; // User emoji for visual identity (like boards)
  role: UserRole;
  avatar?: string;
  preferences?: Record<string, unknown>;
  onboarding_completed: boolean;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Create user input (password required, not stored in User type)
 */
export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  emoji?: string;
  role?: UserRole;
}

/**
 * Update user input
 */
export interface UpdateUserInput {
  email?: string;
  password?: string;
  name?: string;
  emoji?: string;
  role?: UserRole;
  avatar?: string;
  preferences?: Record<string, unknown>;
  onboarding_completed?: boolean;
}
