/**
 * Build genealogy tree structure from flat sessions list
 *
 * Organizes sessions into a tree based on parent/fork relationships
 * Returns Ant Design Tree DataNode format
 */

import type { Session } from '@agor/core/types';
import type { DataNode } from 'antd/es/tree';

export interface SessionTreeNode extends DataNode {
  key: string;
  session: Session;
  children?: SessionTreeNode[];
}

/**
 * Build genealogy tree from sessions for Ant Design Tree
 *
 * Returns array of root sessions (no parent/fork) with their full subtrees in DataNode format
 */
export function buildSessionTree(sessions: Session[]): SessionTreeNode[] {
  const sessionMap = new Map<string, Session>();
  const childrenMap = new Map<string, Session[]>();
  const roots: Session[] = [];

  // Build maps
  for (const session of sessions) {
    sessionMap.set(session.session_id, session);
  }

  // Organize by parent/fork relationships
  for (const session of sessions) {
    const parentId =
      session.genealogy?.parent_session_id || session.genealogy?.forked_from_session_id;

    if (parentId) {
      // Has a parent - add to children map
      const siblings = childrenMap.get(parentId) || [];
      siblings.push(session);
      childrenMap.set(parentId, siblings);
    } else {
      // No parent - it's a root
      roots.push(session);
    }
  }

  // Build tree recursively
  function buildNode(session: Session): SessionTreeNode {
    const children = childrenMap.get(session.session_id) || [];

    const node: SessionTreeNode = {
      key: session.session_id,
      session,
      // title will be rendered by titleRender prop
    };

    if (children.length > 0) {
      node.children = children.map(buildNode);
    }

    return node;
  }

  // Build trees for each root
  return roots.map(buildNode);
}
