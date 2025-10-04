import { useState } from 'react';
import { Layout } from 'antd';
import { AppHeader } from '../AppHeader';
import { SessionCanvas } from '../SessionCanvas';
import { NewSessionButton } from '../NewSessionButton';
import { NewSessionModal, NewSessionConfig } from '../NewSessionModal';
import SessionDrawer from '../SessionDrawer';
import { SessionListDrawer } from '../SessionListDrawer';
import { Session, Task, Agent, Board } from '../../types';

const { Content } = Layout;

export interface AppProps {
  sessions: Session[];
  tasks: Record<string, Task[]>;
  availableAgents: Agent[];
  boards: Board[];
  initialBoardId?: string;
  onCreateSession?: (config: NewSessionConfig) => void;
  onSettingsClick?: () => void;
}

export const App: React.FC<AppProps> = ({
  sessions,
  tasks,
  availableAgents,
  boards,
  initialBoardId,
  onCreateSession,
  onSettingsClick,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const [currentBoardId, setCurrentBoardId] = useState(initialBoardId || boards[0]?.board_id || '');

  const handleCreateSession = (config: NewSessionConfig) => {
    console.log('Creating session with config:', config);
    onCreateSession?.(config);
    setModalOpen(false);
  };

  const handleSessionClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  const handleSendPrompt = (prompt: string) => {
    console.log('Sending prompt:', prompt);
  };

  const handleFork = (prompt: string) => {
    console.log('Forking session with prompt:', prompt);
  };

  const handleSubtask = (prompt: string) => {
    console.log('Creating subtask with prompt:', prompt);
  };

  const selectedSession = sessions.find((s) => s.session_id === selectedSessionId) || null;
  const selectedSessionTasks = selectedSessionId ? tasks[selectedSessionId] || [] : [];
  const currentBoard = boards.find((b) => b.board_id === currentBoardId);

  // Filter sessions by current board
  const boardSessions = sessions.filter((session) =>
    currentBoard?.sessions.includes(session.session_id)
  );

  return (
    <Layout style={{ height: '100vh' }}>
      <AppHeader
        onMenuClick={() => setListDrawerOpen(true)}
        onSettingsClick={onSettingsClick}
        currentBoardName={currentBoard?.name}
        currentBoardIcon={currentBoard?.icon}
      />
      <Content style={{ position: 'relative', overflow: 'hidden' }}>
        <SessionCanvas
          sessions={boardSessions}
          tasks={tasks}
          onSessionClick={handleSessionClick}
        />
        <NewSessionButton onClick={() => setModalOpen(true)} />
      </Content>
      <NewSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreateSession}
        availableAgents={availableAgents}
      />
      <SessionDrawer
        session={selectedSession}
        tasks={selectedSessionTasks}
        open={!!selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
        onSendPrompt={handleSendPrompt}
        onFork={handleFork}
        onSubtask={handleSubtask}
      />
      <SessionListDrawer
        open={listDrawerOpen}
        onClose={() => setListDrawerOpen(false)}
        boards={boards}
        currentBoardId={currentBoardId}
        onBoardChange={setCurrentBoardId}
        sessions={sessions}
        onSessionClick={setSelectedSessionId}
      />
    </Layout>
  );
};
