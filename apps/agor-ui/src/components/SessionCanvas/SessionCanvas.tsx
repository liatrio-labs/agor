import type { AgorClient } from '@agor/core/api';
import type { BoardID, MCPServer, User, ZoneTrigger } from '@agor/core/types';
import { BorderOutlined, DeleteOutlined, SelectOutlined } from '@ant-design/icons';
import { Modal, Typography } from 'antd';
import Handlebars from 'handlebars';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  ControlButton,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  type NodeDragHandler,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './SessionCanvas.css';
import type { Board, BoardObject, Session, Task, Worktree } from '@agor/core/types';
import { useCursorTracking } from '../../hooks/useCursorTracking';
import { usePresence } from '../../hooks/usePresence';
import SessionCard from '../SessionCard';
import WorktreeCard from '../WorktreeCard';
import { ZoneNode } from './canvas/BoardObjectNodes';
import { CursorNode } from './canvas/CursorNode';
import { useBoardObjects } from './canvas/useBoardObjects';

const { Paragraph } = Typography;

interface SessionCanvasProps {
  board: Board | null;
  client: AgorClient | null;
  sessions: Session[];
  tasks: Record<string, Task[]>;
  users: User[];
  worktrees: import('@agor/core/types').Worktree[];
  boardObjects: import('@agor/core/types').BoardEntityObject[];
  currentUserId?: string;
  mcpServers?: MCPServer[];
  sessionMcpServerIds?: Record<string, string[]>; // Map sessionId -> mcpServerIds[]
  onSessionClick?: (sessionId: string) => void;
  onTaskClick?: (taskId: string) => void;
  onSessionUpdate?: (sessionId: string, updates: Partial<Session>) => void;
  onSessionDelete?: (sessionId: string) => void;
  onUpdateSessionMcpServers?: (sessionId: string, mcpServerIds: string[]) => void;
  onOpenSettings?: (sessionId: string) => void;
  onOpenWorktree?: (worktreeId: string) => void;
  onDeleteWorktree?: (worktreeId: string, deleteFromFilesystem: boolean) => void;
}

interface SessionNodeData {
  session: Session;
  tasks: Task[];
  users: User[];
  currentUserId?: string;
  onTaskClick?: (taskId: string) => void;
  onSessionClick?: () => void;
  onDelete?: (sessionId: string) => void;
  onOpenSettings?: (sessionId: string) => void;
  onUnpin?: (sessionId: string) => void;
  compact?: boolean;
  isPinned?: boolean;
  parentZoneId?: string;
  zoneName?: string;
  zoneColor?: string;
}

// Custom node component that renders SessionCard
const SessionNode = ({ data }: { data: SessionNodeData }) => {
  return (
    <div className="session-node">
      <SessionCard
        session={data.session}
        tasks={data.tasks}
        users={data.users}
        currentUserId={data.currentUserId}
        onTaskClick={data.onTaskClick}
        onSessionClick={data.onSessionClick}
        onDelete={data.onDelete}
        onOpenSettings={data.onOpenSettings}
        onUnpin={data.onUnpin}
        isPinned={data.isPinned}
        zoneName={data.zoneName}
        zoneColor={data.zoneColor}
        defaultExpanded={!data.compact}
      />
    </div>
  );
};

interface WorktreeNodeData {
  worktree: Worktree;
  sessions: Session[];
  tasks: Record<string, Task[]>;
  users: User[];
  currentUserId?: string;
  onTaskClick?: (taskId: string) => void;
  onSessionClick?: (sessionId: string) => void;
  onDelete?: (worktreeId: string) => void;
  onOpenSettings?: (worktreeId: string) => void;
  onUnpin?: (worktreeId: string) => void;
  compact?: boolean;
  isPinned?: boolean;
  parentZoneId?: string;
  zoneName?: string;
  zoneColor?: string;
}

// Custom node component that renders WorktreeCard
const WorktreeNode = ({ data }: { data: WorktreeNodeData }) => {
  return (
    <div className="worktree-node">
      <WorktreeCard
        worktree={data.worktree}
        sessions={data.sessions}
        tasks={data.tasks}
        users={data.users}
        currentUserId={data.currentUserId}
        onTaskClick={data.onTaskClick}
        onSessionClick={data.onSessionClick}
        onDelete={data.onDelete}
        onOpenSettings={data.onOpenSettings}
        onUnpin={data.onUnpin}
        isPinned={data.isPinned}
        zoneName={data.zoneName}
        zoneColor={data.zoneColor}
        defaultExpanded={!data.compact}
      />
    </div>
  );
};

// Define nodeTypes outside component to avoid recreation on every render
const nodeTypes = {
  sessionNode: SessionNode,
  worktreeNode: WorktreeNode,
  zone: ZoneNode,
  cursor: CursorNode,
};

const SessionCanvas = ({
  board,
  client,
  sessions,
  worktrees,
  boardObjects,
  tasks,
  users,
  currentUserId,
  mcpServers = [],
  sessionMcpServerIds = {},
  onSessionClick,
  onTaskClick,
  onSessionUpdate,
  onSessionDelete,
  onUpdateSessionMcpServers,
  onOpenSettings,
  onOpenWorktree,
  onDeleteWorktree,
}: SessionCanvasProps) => {
  // Tool state for canvas annotations
  const [activeTool, setActiveTool] = useState<'select' | 'zone' | 'eraser'>('select');

  // Zone drawing state (drag-to-draw)
  const [drawingZone, setDrawingZone] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);

  // Trigger confirmation modal state
  const [triggerModal, setTriggerModal] = useState<{
    sessionId: string;
    zoneName: string;
    trigger: ZoneTrigger;
    pinData: { x: number; y: number; parentId: string };
  } | null>(null);

  // Debounce timer ref for position updates
  const layoutUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLayoutUpdatesRef = useRef<Record<string, { x: number; y: number }>>({});
  const isDraggingRef = useRef(false);
  // Track positions we've explicitly set (to avoid being overwritten by other clients)
  const localPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  // Track objects we've deleted locally (to prevent them from reappearing during WebSocket updates)
  const deletedObjectsRef = useRef<Set<string>>(new Set());

  // Initialize nodes and edges state BEFORE using them
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Track resize state
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingResizeUpdatesRef = useRef<Record<string, { width: number; height: number }>>({});

  // Board objects hook
  const { getBoardObjectNodes, addZoneNode, deleteObject, batchUpdateObjectPositions } =
    useBoardObjects({
      board,
      client,
      setNodes,
      deletedObjectsRef,
      eraserMode: activeTool === 'eraser',
    });

  // Memoize board layout to prevent unnecessary re-renders
  // Layout changes when actual layout data changes, not just board object reference
  const boardLayout = useMemo(() => board?.layout, [board?.layout]);

  // Extract zone labels - memoized to only change when labels actually change
  const zoneLabels = useMemo(() => {
    if (!board?.objects) return {};
    const labels: Record<string, string> = {};
    Object.entries(board.objects).forEach(([id, obj]) => {
      if (obj.type === 'zone') {
        labels[id] = obj.label;
      }
    });
    return labels;
  }, [board?.objects]);

  // Handler to unpin a session from its zone
  const handleUnpin = useCallback(
    async (sessionId: string) => {
      if (!board || !client) return;

      const currentLayout = board.layout?.[sessionId];
      if (!currentLayout?.parentId) return;

      // Get session position from board.layout
      const sessionLayout = board.layout?.[sessionId];
      // Get parent zone position from board.objects (zones are board objects, not in layout)
      const parentZone = board.objects?.[currentLayout.parentId];

      if (!sessionLayout || !parentZone) {
        console.error('Cannot unpin: missing layout data', {
          sessionLayout: !!sessionLayout,
          parentZone: !!parentZone,
          parentId: currentLayout.parentId,
        });
        return;
      }

      // Calculate absolute position from relative position
      // Session's layout position is relative to parent zone, so add zone's position
      const absoluteX = sessionLayout.x + parentZone.x;
      const absoluteY = sessionLayout.y + parentZone.y;

      // Update layout without parentId
      const newLayout = {
        ...board.layout,
        [sessionId]: {
          x: absoluteX,
          y: absoluteY,
          parentId: undefined,
        },
      };

      await client.service('boards').patch(board.board_id, {
        layout: newLayout,
      });

      console.log(`📍 Manually unpinned session ${sessionId.substring(0, 8)}`);
    },
    [board, client]
  );

  // Convert worktrees to React Flow nodes (worktree-centric approach)
  const initialNodes: Node[] = useMemo(() => {
    // Auto-layout for worktrees without explicit positioning
    const VERTICAL_SPACING = 500;
    const HORIZONTAL_SPACING = 600;

    // Create nodes for worktrees on this board
    return worktrees.map((worktree, index) => {
      // Find board object for this worktree (if positioned on this board)
      const boardObject = boardObjects.find(
        bo => bo.worktree_id === worktree.worktree_id && bo.board_id === board?.board_id
      );

      // Use stored position from boardObject if available, otherwise auto-layout
      const position = boardObject
        ? { x: boardObject.position.x, y: boardObject.position.y }
        : { x: 100, y: 100 + index * VERTICAL_SPACING };

      // Check if worktree is pinned to a zone
      // TODO: Implement zone pinning for worktrees (currently zones are for sessions only)
      const parentZoneId = undefined; // No zone pinning for worktrees yet
      const zoneName = parentZoneId ? zoneLabels[parentZoneId] || 'Unknown Zone' : undefined;
      const zoneColor =
        parentZoneId && board?.objects?.[parentZoneId]
          ? (board.objects[parentZoneId] as { color?: string }).color
          : undefined;

      // Get sessions for this worktree
      const worktreeSessions = sessions.filter(s => s.worktree_id === worktree.worktree_id);

      return {
        id: worktree.worktree_id,
        type: 'worktreeNode',
        position,
        draggable: true,
        parentId: parentZoneId,
        extent: parentZoneId ? ('parent' as const) : undefined,
        data: {
          worktree,
          sessions: worktreeSessions,
          tasks,
          users,
          currentUserId,
          onTaskClick,
          onSessionClick,
          onDelete: onDeleteWorktree,
          onOpenSettings: onOpenWorktree,
          onUnpin: undefined, // TODO: Add worktree unpin handler
          compact: false,
          isPinned: !!parentZoneId,
          parentZoneId,
          zoneName,
          zoneColor,
        },
      };
    });
  }, [
    board,
    boardObjects,
    worktrees,
    sessions,
    tasks,
    users,
    currentUserId,
    onSessionClick,
    onTaskClick,
    onDeleteWorktree,
    onOpenWorktree,
    zoneLabels,
  ]);

  // No edges needed for worktree-centric boards
  // (Session genealogy is visualized within WorktreeCard, not as canvas edges)
  const initialEdges: Edge[] = useMemo(() => [], []);

  // Store ReactFlow instance ref
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Cursor tracking hook
  useCursorTracking({
    client,
    boardId: board?.board_id as BoardID | null,
    reactFlowInstance: reactFlowInstanceRef.current,
    enabled: !!board && !!client,
  });

  // Presence tracking hook (get remote cursors)
  const { remoteCursors } = usePresence({
    client,
    boardId: board?.board_id as BoardID | null,
    users,
    enabled: !!board && !!client,
  });

  // Create cursor nodes from remote cursors (for minimap visibility)
  // Large dimensions ensure good visibility in minimap (visual size controlled by inverse scaling)
  const cursorNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    for (const [userId, { x, y, user }] of remoteCursors.entries()) {
      nodes.push({
        id: `cursor-${userId}`,
        type: 'cursor',
        position: { x, y },
        draggable: false,
        selectable: false,
        focusable: false,
        data: { user },
        width: 150,
        height: 150,
        style: {
          pointerEvents: 'none',
          transition: 'transform 0.1s ease-out',
        },
      });
    }

    return nodes;
  }, [remoteCursors]);

  // Sync SESSION nodes only (don't trigger on zone changes)
  useEffect(() => {
    if (isDraggingRef.current) return;

    setNodes(currentNodes => {
      // Separate existing nodes by type
      const existingZones = currentNodes.filter(n => n.type === 'zone');
      const existingCursors = currentNodes.filter(n => n.type === 'cursor');

      // Update worktree nodes with preserved state
      const updatedWorktrees = initialNodes.map(newNode => {
        const existingNode = currentNodes.find(n => n.id === newNode.id);
        const localPosition = localPositionsRef.current[newNode.id];
        const incomingPosition = newNode.position;
        const positionChanged =
          localPosition &&
          (Math.abs(localPosition.x - incomingPosition.x) > 1 ||
            Math.abs(localPosition.y - incomingPosition.y) > 1);

        if (positionChanged) {
          delete localPositionsRef.current[newNode.id];
          return { ...newNode, selected: existingNode?.selected };
        }

        if (localPosition) {
          return { ...newNode, position: localPosition, selected: existingNode?.selected };
        }

        return { ...newNode, selected: existingNode?.selected };
      });

      // Merge: worktrees + existing zones + existing cursors
      return [...updatedWorktrees, ...existingZones, ...existingCursors];
    });
  }, [initialNodes, setNodes]);

  // Sync ZONE nodes separately
  useEffect(() => {
    if (isDraggingRef.current) return;

    const boardObjectNodes = getBoardObjectNodes();

    setNodes(currentNodes => {
      // Keep existing worktrees and cursors, replace zones
      const worktrees = currentNodes.filter(n => n.type === 'worktreeNode');
      const cursors = currentNodes.filter(n => n.type === 'cursor');

      // Update zones with preserved selection state
      const zones = boardObjectNodes
        .filter(z => !deletedObjectsRef.current.has(z.id))
        .map(newZone => {
          const existingZone = currentNodes.find(n => n.id === newZone.id);
          // Preserve selected state from existing zone
          return { ...newZone, selected: existingZone?.selected };
        });

      return [...worktrees, ...zones, ...cursors];
    });
  }, [getBoardObjectNodes, setNodes]); // REMOVED setNodes from dependencies

  // Sync CURSOR nodes separately
  useEffect(() => {
    if (isDraggingRef.current) return;

    setNodes(currentNodes => {
      // Keep existing worktrees and zones, replace cursors
      const worktrees = currentNodes.filter(n => n.type === 'worktreeNode');
      const zones = currentNodes.filter(n => n.type === 'zone');

      return [...worktrees, ...zones, ...cursorNodes];
    });
  }, [cursorNodes, setNodes]); // REMOVED setNodes from dependencies

  // Sync edges
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]); // REMOVED setEdges from dependencies

  // Intercept onNodesChange to detect resize events
  const onNodesChange = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: React Flow change event types are not exported
    (changes: any) => {
      // Detect resize by checking for dimensions changes
      // biome-ignore lint/suspicious/noExplicitAny: React Flow change event types are not exported
      changes.forEach((change: any) => {
        if (change.type === 'dimensions' && change.dimensions) {
          const node = nodes.find(n => n.id === change.id);
          if (node?.type === 'zone') {
            // Check if dimensions actually changed (to avoid infinite loop from React Flow emitting unchanged dimensions)
            const currentWidth = node.style?.width;
            const currentHeight = node.style?.height;
            const newWidth = change.dimensions.width;
            const newHeight = change.dimensions.height;

            // Skip if dimensions haven't changed (tolerance of 1px for floating point)
            if (
              currentWidth &&
              currentHeight &&
              Math.abs(Number(currentWidth) - newWidth) < 1 &&
              Math.abs(Number(currentHeight) - newHeight) < 1
            ) {
              return;
            }

            // Accumulate resize updates
            pendingResizeUpdatesRef.current[change.id] = {
              width: newWidth,
              height: newHeight,
            };

            // Clear existing timer
            if (resizeTimerRef.current) {
              clearTimeout(resizeTimerRef.current);
            }

            // Debounce: wait 500ms after last resize before persisting
            resizeTimerRef.current = setTimeout(async () => {
              const updates = pendingResizeUpdatesRef.current;
              pendingResizeUpdatesRef.current = {};

              if (!board || !client) return;

              // Persist all resize changes
              for (const [nodeId, dimensions] of Object.entries(updates)) {
                const objectData = board.objects?.[nodeId];
                if (objectData && objectData.type === 'zone') {
                  const updatedObject = {
                    ...objectData,
                    width: dimensions.width,
                    height: dimensions.height,
                  };

                  try {
                    await client.service('boards').patch(board.board_id, {
                      _action: 'upsertObject',
                      objectId: nodeId,
                      objectData: updatedObject,
                      // biome-ignore lint/suspicious/noExplicitAny: Board patch with custom _action field
                    } as any);
                  } catch (error) {
                    console.error('Failed to persist zone resize:', error);
                  }
                }
              }
            }, 500);
          }
        }
      });

      // Call the original handler
      onNodesChangeInternal(changes);
    },
    [nodes, board, client, onNodesChangeInternal]
  );

  // Handle node drag start
  const handleNodeDragStart: NodeDragHandler = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  // Handle node drag - track local position changes
  const handleNodeDrag: NodeDragHandler = useCallback((_event, node) => {
    // Track this position locally so we don't get overwritten by WebSocket updates
    localPositionsRef.current[node.id] = {
      x: node.position.x,
      y: node.position.y,
    };
  }, []);

  // Handle node drag end - persist layout to board (debounced)
  const handleNodeDragStop: NodeDragHandler = useCallback(
    (_event, node) => {
      if (!board || !client || !reactFlowInstanceRef.current) return;

      // Track final position locally
      localPositionsRef.current[node.id] = {
        x: node.position.x,
        y: node.position.y,
      };

      // Accumulate position updates
      pendingLayoutUpdatesRef.current[node.id] = {
        x: node.position.x,
        y: node.position.y,
      };

      // Clear existing timer
      if (layoutUpdateTimerRef.current) {
        clearTimeout(layoutUpdateTimerRef.current);
      }

      // Debounce: wait 500ms after last drag before persisting
      layoutUpdateTimerRef.current = setTimeout(async () => {
        const updates = pendingLayoutUpdatesRef.current;
        pendingLayoutUpdatesRef.current = {};
        isDraggingRef.current = false;

        try {
          // Separate updates for worktrees vs zones (all use board_objects table)
          const worktreeUpdates: Array<{
            worktree_id: string;
            position: { x: number; y: number };
          }> = [];
          const zoneUpdates: Record<string, { x: number; y: number }> = {};

          // Find all current nodes to check types
          const currentNodes = nodes;

          for (const [nodeId, position] of Object.entries(updates)) {
            const draggedNode = currentNodes.find(n => n.id === nodeId);

            if (draggedNode?.type === 'zone') {
              // Zone moved - update position via batchUpdateObjectPositions
              zoneUpdates[nodeId] = position;
            } else if (draggedNode?.type === 'worktreeNode') {
              // Worktree moved - update board_object position
              worktreeUpdates.push({
                worktree_id: nodeId,
                position,
              });
              console.log(
                `📦 Moved worktree ${nodeId.substring(0, 8)} to (${Math.round(position.x)}, ${Math.round(position.y)})`
              );
            }
          }

          // Update worktree positions in board_objects
          if (worktreeUpdates.length > 0) {
            for (const { worktree_id, position } of worktreeUpdates) {
              // Find existing board_object or create new one
              const existingBoardObject = boardObjects.find(
                bo => bo.worktree_id === worktree_id && bo.board_id === board.board_id
              );

              if (existingBoardObject) {
                // Update existing board_object
                await client.service('board-objects').patch(existingBoardObject.object_id, {
                  position,
                });
              } else {
                // Create new board_object
                await client.service('board-objects').create({
                  board_id: board.board_id,
                  worktree_id,
                  position,
                });
              }
            }
            console.log('✓ Worktree positions persisted:', worktreeUpdates.length, 'worktrees');
          }

          // Update zone positions
          if (Object.keys(zoneUpdates).length > 0) {
            await batchUpdateObjectPositions(zoneUpdates);
          }
        } catch (error) {
          console.error('Failed to persist layout:', error);
        }
      }, 500);
    },
    [board, client, batchUpdateObjectPositions, nodes, boardObjects]
  );

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (layoutUpdateTimerRef.current) {
        clearTimeout(layoutUpdateTimerRef.current);
      }
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
    };
  }, []);

  // Canvas pointer handlers for drag-to-draw zones
  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!reactFlowInstanceRef.current) return;

      // Zone tool: start drag-to-draw
      if (activeTool === 'zone') {
        setDrawingZone({
          start: { x: event.pageX, y: event.pageY },
          end: { x: event.pageX, y: event.pageY },
        });
      }
    },
    [activeTool]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (activeTool === 'zone' && drawingZone && event.buttons === 1) {
        setDrawingZone({
          start: drawingZone.start,
          end: { x: event.pageX, y: event.pageY },
        });
      }
    },
    [activeTool, drawingZone]
  );

  const handlePointerUp = useCallback(() => {
    if (activeTool === 'zone' && drawingZone && reactFlowInstanceRef.current) {
      const { start, end } = drawingZone;

      // Calculate position and dimensions in screen space
      const minX = Math.min(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const screenWidth = Math.abs(end.x - start.x);
      const screenHeight = Math.abs(end.y - start.y);

      // Only create zone if dragged (not just clicked)
      if (screenWidth > 50 && screenHeight > 50) {
        const position = reactFlowInstanceRef.current.screenToFlowPosition({
          x: minX,
          y: minY,
        });

        // Convert dimensions to flow space (account for zoom)
        const viewport = reactFlowInstanceRef.current.getViewport();
        const width = screenWidth / viewport.zoom;
        const height = screenHeight / viewport.zoom;

        // Create zone with drawn dimensions
        const objectId = `zone-${Date.now()}`;

        // Optimistic update
        setNodes(nodes => [
          ...nodes,
          {
            id: objectId,
            type: 'zone',
            position,
            draggable: true,
            style: { width, height, zIndex: -1 },
            data: {
              objectId,
              label: 'New Zone',
              width,
              height,
              color: '#d9d9d9',
              onUpdate: (id: string, data: BoardObject) => {
                if (board && client) {
                  client
                    .service('boards')
                    .patch(board.board_id, {
                      _action: 'upsertObject',
                      objectId: id,
                      objectData: data,
                      // biome-ignore lint/suspicious/noExplicitAny: Board patch with custom _action field
                    } as any)
                    .catch(console.error);
                }
              },
            },
          },
        ]);

        // Persist to backend
        if (board && client) {
          client
            .service('boards')
            .patch(board.board_id, {
              _action: 'upsertObject',
              objectId,
              objectData: {
                type: 'zone',
                x: position.x,
                y: position.y,
                width,
                height,
                label: 'New Zone',
                color: '#d9d9d9',
              },
              // biome-ignore lint/suspicious/noExplicitAny: Board patch with custom _action field
            } as any)
            .catch((error: unknown) => {
              console.error('Failed to add zone:', error);
              setNodes(nodes => nodes.filter(n => n.id !== objectId));
            });
        }
      }

      setDrawingZone(null);
      setActiveTool('select');
    }
  }, [activeTool, drawingZone, board, client, setNodes]);

  // Node click handler for eraser mode
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (activeTool === 'eraser') {
        // Only delete board objects (zones), not worktrees or cursors
        if (node.type === 'zone') {
          deleteObject(node.id);
        }
        return;
      }

      // Worktree cards handle their own session clicks internally
      // (no canvas-level click handler needed for worktreeNode)
    },
    [activeTool, deleteObject]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'z') setActiveTool('zone');
      if (e.key === 'e') setActiveTool('eraser');
      if (e.key === 'Escape') setActiveTool('select');
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected nodes
        const selectedNodes = nodes.filter(n => n.selected);
        selectedNodes.forEach(n => {
          if (n.type === 'zone') {
            deleteObject(n.id);
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, deleteObject]);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Drawing preview for zone */}
      {drawingZone && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(drawingZone.start.x, drawingZone.end.x),
            top: Math.min(drawingZone.start.y, drawingZone.end.y),
            width: Math.abs(drawingZone.end.x - drawingZone.start.x),
            height: Math.abs(drawingZone.end.y - drawingZone.start.y),
            border: '2px dashed #1677ff',
            background: 'rgba(22, 119, 255, 0.1)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onInit={instance => {
          reactFlowInstanceRef.current = instance;
        }}
        nodeTypes={nodeTypes}
        snapToGrid={true}
        snapGrid={[20, 20]}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={activeTool === 'select'}
        className={`dark tool-mode-${activeTool}`}
      >
        <Background />
        <Controls position="top-left" showInteractive={false}>
          {/* Custom toolbox buttons */}
          <ControlButton
            onClick={e => {
              e.stopPropagation();
              setActiveTool('select');
            }}
            title="Select (Esc)"
            style={{
              borderLeft: activeTool === 'select' ? '3px solid #1677ff' : 'none',
            }}
          >
            <SelectOutlined style={{ fontSize: '16px' }} />
          </ControlButton>
          <ControlButton
            onClick={e => {
              e.stopPropagation();
              setActiveTool('zone');
            }}
            title="Add Zone (Z)"
            style={{
              borderLeft: activeTool === 'zone' ? '3px solid #1677ff' : 'none',
            }}
          >
            <BorderOutlined style={{ fontSize: '16px' }} />
          </ControlButton>
          <ControlButton
            onClick={e => {
              e.stopPropagation();
              setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser');
            }}
            title="Eraser (E) - Click to toggle"
            style={{
              borderLeft: activeTool === 'eraser' ? '3px solid #ff4d4f' : 'none',
              color: activeTool === 'eraser' ? '#ff4d4f' : 'inherit',
              backgroundColor: activeTool === 'eraser' ? '#fff1f0' : 'transparent',
            }}
          >
            <DeleteOutlined style={{ fontSize: '16px' }} />
          </ControlButton>
        </Controls>
        <MiniMap
          nodeColor={node => {
            // Handle cursor nodes (show as bright color)
            if (node.type === 'cursor') return '#faad14';

            // Handle board objects (zones)
            if (node.type === 'zone') return '#d9d9d9';

            // Handle session nodes
            const session = node.data.session as Session;
            if (!session) return '#d9d9d9';

            switch (session.status) {
              case 'running':
                return '#1890ff';
              case 'completed':
                return '#52c41a';
              case 'failed':
                return '#ff4d4f';
              default:
                return '#d9d9d9';
            }
          }}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Trigger confirmation modal */}
      {triggerModal &&
        (() => {
          // Pre-render the template for display in modal
          const session = sessions.find(s => s.session_id === triggerModal.sessionId);
          let renderedPromptPreview = triggerModal.trigger.text;

          if (session) {
            try {
              // Lookup worktree data for this session
              const worktree = worktrees.find(wt => wt.worktree_id === session.worktree_id);

              const context = {
                session: {
                  description: session.description || '',
                  context: session.custom_context || {},
                },
                board: {
                  name: board?.name || '',
                  description: board?.description || '',
                  context: board?.custom_context || {},
                },
                worktree: worktree
                  ? {
                      name: worktree.name || '',
                      ref: worktree.ref || '',
                      issue_url: worktree.issue_url || '',
                      pull_request_url: worktree.pull_request_url || '',
                      notes: worktree.notes || '',
                      path: worktree.path || '',
                      context: worktree.custom_context || {},
                    }
                  : {
                      name: '',
                      ref: '',
                      issue_url: '',
                      pull_request_url: '',
                      notes: '',
                      path: '',
                      context: {},
                    },
              };
              const template = Handlebars.compile(triggerModal.trigger.text);
              renderedPromptPreview = template(context);
            } catch (error) {
              console.error('Template render error for preview:', error);
              // Fall back to raw text
            }
          }

          return (
            <Modal
              title={`Execute Trigger for "${triggerModal.zoneName}"?`}
              open={true}
              onOk={async () => {
                if (!client) {
                  console.error('❌ Cannot execute trigger: client not available');
                  setTriggerModal(null);
                  return;
                }

                console.log('✅ Execute trigger:', triggerModal.trigger);

                try {
                  const { sessionId, trigger } = triggerModal;

                  // Find the session to get its data for Handlebars context
                  const session = sessions.find(s => s.session_id === sessionId);
                  if (!session) {
                    console.error('❌ Session not found:', sessionId);
                    setTriggerModal(null);
                    return;
                  }

                  // Lookup worktree data for this session
                  const worktree = worktrees.find(wt => wt.worktree_id === session.worktree_id);

                  // Build Handlebars context from session, board, and worktree data
                  const context = {
                    session: {
                      description: session.description || '',
                      // User-defined custom context
                      context: session.custom_context || {},
                    },
                    board: {
                      name: board?.name || '',
                      description: board?.description || '',
                      context: board?.custom_context || {},
                    },
                    worktree: worktree
                      ? {
                          name: worktree.name || '',
                          ref: worktree.ref || '',
                          issue_url: worktree.issue_url || '',
                          pull_request_url: worktree.pull_request_url || '',
                          notes: worktree.notes || '',
                          path: worktree.path || '',
                          context: worktree.custom_context || {},
                        }
                      : {
                          name: '',
                          ref: '',
                          issue_url: '',
                          pull_request_url: '',
                          notes: '',
                          path: '',
                          context: {},
                        },
                  };

                  // Render template with Handlebars
                  let renderedPrompt: string;
                  try {
                    const template = Handlebars.compile(trigger.text);
                    renderedPrompt = template(context);
                    console.log('📝 Rendered template:', renderedPrompt);
                  } catch (templateError) {
                    console.error('❌ Handlebars template error:', templateError);
                    // Fallback to raw text if template fails
                    renderedPrompt = trigger.text;
                  }

                  // All trigger types now use the unified prompt endpoint
                  // This ensures consistent behavior: task creation, agent invocation, streaming, etc.
                  switch (trigger.type) {
                    case 'prompt':
                    case 'task':
                    case 'subtask': {
                      // Prefix subtasks for clarity
                      const prompt =
                        trigger.type === 'subtask' ? `[Subtask] ${renderedPrompt}` : renderedPrompt;

                      await client.service(`sessions/${sessionId}/prompt`).create({
                        prompt,
                      });

                      console.log(
                        `✨ ${trigger.type} triggered for session ${sessionId.substring(0, 8)}: ${prompt.substring(0, 50)}...`
                      );
                      break;
                    }

                    default:
                      console.warn(`⚠️  Unknown trigger type: ${trigger.type}`);
                  }
                } catch (error) {
                  console.error('❌ Failed to execute trigger:', error);
                } finally {
                  setTriggerModal(null);
                }
              }}
              onCancel={() => {
                console.log('⏭️  Trigger skipped by user');
                setTriggerModal(null);
              }}
              okText="Yes, Execute"
              cancelText="No, Skip"
            >
              <Paragraph>
                The session has been pinned to{' '}
                <Typography.Text strong>{triggerModal.zoneName}</Typography.Text>.
              </Paragraph>
              <Paragraph>
                This zone has a{' '}
                <Typography.Text strong>{triggerModal.trigger.type}</Typography.Text> trigger
                configured:
              </Paragraph>
              <Paragraph
                code
                style={{
                  whiteSpace: 'pre-wrap',
                  background: '#1f1f1f',
                  padding: '12px',
                  borderRadius: '4px',
                }}
              >
                {renderedPromptPreview}
              </Paragraph>
              <Paragraph type="secondary">
                Would you like to execute this trigger for the session now?
              </Paragraph>
            </Modal>
          );
        })()}
    </div>
  );
};

export default SessionCanvas;
