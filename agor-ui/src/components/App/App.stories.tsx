import type { Meta, StoryObj } from '@storybook/react';
import { App } from './App';
import { ConfigProvider, theme } from 'antd';
import {
  mockSessionA,
  mockSessionB,
  mockSessionC,
  mockTask001,
  mockTask002,
  mockTask003,
  mockTask004,
  mockTask005,
  mockAgents,
} from '../../mocks';
import { mockBoards } from '../../mocks/boards';

const meta = {
  title: 'App/App',
  component: App,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
        <Story />
      </ConfigProvider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockTasksMap = {
  [mockSessionA.session_id]: [mockTask001, mockTask002, mockTask005],
  [mockSessionB.session_id]: [mockTask003],
  [mockSessionC.session_id]: [mockTask004],
};

export const Default: Story = {
  args: {
    sessions: [mockSessionA, mockSessionB, mockSessionC],
    tasks: mockTasksMap,
    availableAgents: mockAgents,
    boards: mockBoards,
    onCreateSession: (config) => console.log('Create session:', config),
    onSettingsClick: () => console.log('Settings clicked'),
  },
};

export const SingleSession: Story = {
  args: {
    sessions: [mockSessionA],
    tasks: {
      [mockSessionA.session_id]: [mockTask001, mockTask002, mockTask005],
    },
    availableAgents: mockAgents,
    boards: mockBoards,
    onCreateSession: (config) => alert(`Creating session with agent: ${config.agent}`),
    onSettingsClick: () => alert('Settings clicked'),
  },
};

export const EmptyCanvas: Story = {
  args: {
    sessions: [],
    tasks: {},
    availableAgents: mockAgents,
    boards: mockBoards,
    onCreateSession: (config) => console.log('Create session:', config),
    onSettingsClick: () => console.log('Settings clicked'),
  },
};

export const AllAgentsInstalled: Story = {
  args: {
    sessions: [mockSessionA, mockSessionB],
    tasks: mockTasksMap,
    availableAgents: mockAgents.map((agent) => ({ ...agent, installed: true })),
    boards: mockBoards,
    onCreateSession: (config) => console.log('Create session:', config),
    onSettingsClick: () => console.log('Settings clicked'),
  },
};
