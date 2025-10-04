import { Session, Task, SessionViewMode } from '../../types';
import { Card, Badge, Tag, Space, Typography, Divider, Button } from 'antd';
import {
  BranchesOutlined,
  ForkOutlined,
  PlusCircleOutlined,
  ExpandOutlined,
  ShrinkOutlined
} from '@ant-design/icons';
import TaskListItem from '../TaskListItem';
import SessionHeader from '../SessionHeader';
import './SessionCard.css';

const { Text, Title } = Typography;

interface SessionCardProps {
  session: Session;
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onSessionClick?: () => void;
  viewMode?: SessionViewMode;
  onViewModeChange?: (mode: SessionViewMode) => void;
  compact?: boolean; // Deprecated: use viewMode='collapsed' instead
}

const SessionCard = ({
  session,
  tasks,
  onTaskClick,
  onSessionClick,
  viewMode = 'expanded',
  onViewModeChange,
  compact = false
}: SessionCardProps) => {
  // Support legacy compact prop
  const actualViewMode = compact ? 'collapsed' : viewMode;

  const getAgentIcon = () => {
    const agentIcons: Record<string, string> = {
      'claude-code': '🤖',
      'cursor': '✏️',
      'codex': '💻',
      'gemini': '💎',
    };
    return agentIcons[session.agent] || '🤖';
  };

  // Collapsed view: use SessionHeader component
  if (actualViewMode === 'collapsed') {
    return (
      <Card
        className="session-card session-card-collapsed"
        onClick={onSessionClick}
        hoverable={!!onSessionClick}
      >
        <SessionHeader
          session={session}
          onClick={onViewModeChange ? () => onViewModeChange('expanded') : undefined}
        />
      </Card>
    );
  }

  // Expanded view: show tasks
  // Prioritize showing running tasks, then most recent
  const runningTasks = tasks.filter(t => t.status === 'running');
  const otherTasks = tasks.filter(t => t.status !== 'running');
  const recentTasks = otherTasks.slice(-10 + runningTasks.length);
  const visibleTasks = [...runningTasks, ...recentTasks].slice(-10);
  const hiddenTaskCount = tasks.length - visibleTasks.length;

  const isForked = !!session.genealogy.forked_from_session_id;
  const isSpawned = !!session.genealogy.parent_session_id;

  return (
    <Card
      className="session-card session-card-expanded"
      onClick={onSessionClick}
      hoverable={!!onSessionClick}
    >
      {/* Header with view controls */}
      <div className="session-header">
        <Space size={8} align="center">
          <span style={{ fontSize: 20 }}>{getAgentIcon()}</span>
          <Text strong>{session.agent}</Text>
          <Badge status={session.status === 'running' ? 'processing' : session.status === 'completed' ? 'success' : session.status === 'failed' ? 'error' : 'default'} text={session.status.toUpperCase()} />
        </Space>

        <Space size={4}>
          {isForked && (
            <Tag icon={<ForkOutlined />} color="cyan">
              FORK
            </Tag>
          )}
          {isSpawned && (
            <Tag icon={<BranchesOutlined />} color="purple">
              SPAWN
            </Tag>
          )}
          {onViewModeChange && (
            <>
              <Button
                type="text"
                size="small"
                icon={<ShrinkOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewModeChange('collapsed');
                }}
                title="Collapse"
              />
              <Button
                type="text"
                size="small"
                icon={<ExpandOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewModeChange('drawer');
                }}
                title="Open in drawer"
              />
            </>
          )}
        </Space>
      </div>

      {/* Description */}
      {session.description && (
        <Title level={5} className="session-description">
          {session.description}
        </Title>
      )}

      {/* Git State */}
      <div className="git-state">
        <Text type="secondary">
          📍 {session.git_state.ref} @ {session.git_state.current_sha.substring(0, 7)}
        </Text>
      </div>

      {/* Concepts */}
      {session.concepts.length > 0 && (
        <div className="concepts">
          <Space size={4} wrap>
            <Text type="secondary">📦</Text>
            {session.concepts.map((concept) => (
              <Tag key={concept} color="geekblue">
                {concept}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* Tasks */}
      <div className="tasks-section">
        <div className="tasks-header">
          <Text strong>Tasks</Text>
          {tasks.length > 10 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              (showing latest 10 of {tasks.length})
            </Text>
          )}
        </div>

        <div className="tasks-list">
          {visibleTasks.map((task) => (
            <TaskListItem
              key={task.task_id}
              task={task}
              onClick={() => onTaskClick?.(task.task_id)}
            />
          ))}

          {hiddenTaskCount > 0 && (
            <div className="more-tasks">
              <Button
                type="text"
                icon={<PlusCircleOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewModeChange?.('drawer');
                }}
              >
                {hiddenTaskCount} more {hiddenTaskCount === 1 ? 'task' : 'tasks'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer metadata */}
      <div className="session-footer">
        <Text type="secondary" style={{ fontSize: 12 }}>
          💬 {session.message_count} messages
        </Text>
      </div>
    </Card>
  );
};

export default SessionCard;
