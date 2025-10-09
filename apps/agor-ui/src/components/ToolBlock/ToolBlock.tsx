/**
 * ToolBlock - Groups sequential tool uses into a collapsible summary
 *
 * When 3+ tool uses appear consecutively (no text messages between them),
 * this component groups them into a collapsed summary showing:
 * - Total tool count with grouped counts by tool type
 * - Visual tags with tool icons and × counts
 * - Smart summaries (files modified, searches, etc.)
 * - Expandable to show full tool details
 *
 * This is the "new visual grammar" that sets Agor apart from terminals.
 * Based on design in context/explorations/conversation-design.md
 */

import type { Message } from '@agor/core/types';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ThoughtChainProps } from '@ant-design/x';
import { ThoughtChain } from '@ant-design/x';
import { Space, Tag, Typography, theme } from 'antd';
import type React from 'react';
import { useMemo } from 'react';
import { ToolIcon } from '../ToolIcon';
import { ToolUseRenderer } from '../ToolUseRenderer';

const { Text } = Typography;

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

interface TextBlock {
  type: 'text';
  text: string;
}

type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

interface ToolBlockProps {
  /**
   * Messages containing tool uses (should be tool-only messages)
   */
  messages: Message[];
}

interface ToolInvocation {
  toolUse: ToolUseBlock;
  toolResult?: ToolResultBlock;
  message: Message;
}

export const ToolBlock: React.FC<ToolBlockProps> = ({ messages }) => {
  const { token } = theme.useToken();

  // Extract all tool invocations from messages
  const toolInvocations = useMemo(() => {
    const invocations: ToolInvocation[] = [];

    for (const message of messages) {
      if (typeof message.content === 'string') continue;
      if (!Array.isArray(message.content)) continue;

      const toolUseMap = new Map<string, ToolUseBlock>();
      const toolResultMap = new Map<string, ToolResultBlock>();

      // First pass: collect tool_use and tool_result blocks
      for (const block of message.content) {
        if (block.type === 'tool_use') {
          const toolUse = block as ToolUseBlock;
          toolUseMap.set(toolUse.id, toolUse);
        } else if (block.type === 'tool_result') {
          const toolResult = block as ToolResultBlock;
          toolResultMap.set(toolResult.tool_use_id, toolResult);
        }
      }

      // Second pass: match tool_use with tool_result
      for (const [id, toolUse] of toolUseMap.entries()) {
        invocations.push({
          toolUse,
          toolResult: toolResultMap.get(id),
          message,
        });
      }
    }

    return invocations;
  }, [messages]);

  // Group tools by name and count
  const toolCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const invocation of toolInvocations) {
      const name = invocation.toolUse.name;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return counts;
  }, [toolInvocations]);

  // Extract unique files affected (for Edit/Read/Write tools)
  const filesAffected = useMemo(() => {
    const files = new Set<string>();
    for (const invocation of toolInvocations) {
      const { name, input } = invocation.toolUse;
      if (['Edit', 'Read', 'Write'].includes(name) && input.file_path) {
        files.add(input.file_path as string);
      }
    }
    return Array.from(files).sort();
  }, [toolInvocations]);

  // Count success/error results
  const resultStats = useMemo(() => {
    let successes = 0;
    let errors = 0;
    for (const invocation of toolInvocations) {
      if (invocation.toolResult) {
        if (invocation.toolResult.is_error) {
          errors++;
        } else {
          successes++;
        }
      }
    }
    return { successes, errors };
  }, [toolInvocations]);

  const totalTools = toolInvocations.length;

  // Build ThoughtChain items from tool invocations
  const thoughtChainItems: ThoughtChainProps['items'] = toolInvocations.map(
    ({ toolUse, toolResult }) => {
      const isError = toolResult?.is_error;

      return {
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: token.sizeUnit / 2 }}>
            <ToolIcon tool={toolUse.name} size={16} />
            <span>{toolUse.name}</span>
          </div>
        ),
        description: toolUse.input.description as string | undefined,
        status: !toolResult ? 'pending' : isError ? 'error' : 'success',
        icon: toolResult ? (
          isError ? (
            <CloseCircleOutlined style={{ color: token.colorError }} />
          ) : (
            <CheckCircleOutlined style={{ color: token.colorSuccess }} />
          )
        ) : undefined,
        content: <ToolUseRenderer toolUse={toolUse} toolResult={toolResult} />,
      };
    }
  );

  // Summary description with tool counts and stats
  const summaryDescription = (
    <Space direction="vertical" size={token.sizeUnit / 2} style={{ marginTop: token.sizeUnit / 2 }}>
      <Space size={token.sizeUnit} wrap>
        {Array.from(toolCounts.entries()).map(([name, count]) => (
          <Tag
            key={name}
            icon={<ToolIcon tool={name} size={12} />}
            style={{ fontSize: 11, margin: 0 }}
          >
            {name} × {count}
          </Tag>
        ))}
      </Space>

      {/* Result stats */}
      {(resultStats.successes > 0 || resultStats.errors > 0) && (
        <Space size={token.sizeUnit}>
          {resultStats.successes > 0 && (
            <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 11, margin: 0 }}>
              {resultStats.successes} success
            </Tag>
          )}
          {resultStats.errors > 0 && (
            <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontSize: 11, margin: 0 }}>
              {resultStats.errors} error
            </Tag>
          )}
        </Space>
      )}

      {/* Files affected summary */}
      {filesAffected.length > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            <FileTextOutlined /> {filesAffected.length}{' '}
            {filesAffected.length === 1 ? 'file' : 'files'} affected
          </Text>
        </div>
      )}
    </Space>
  );

  // Main thought chain item with summary header
  const mainChainItem: ThoughtChainProps['items'][number] = {
    title: (
      <Space>
        <ToolOutlined />
        <Text strong>{totalTools} tools executed</Text>
      </Space>
    ),
    description: summaryDescription,
    status: resultStats.errors > 0 ? 'error' : 'success',
    icon:
      resultStats.errors > 0 ? (
        <CloseCircleOutlined style={{ color: token.colorError }} />
      ) : (
        <CheckCircleOutlined style={{ color: token.colorSuccess }} />
      ),
    content: <ThoughtChain items={thoughtChainItems} style={{ marginTop: token.sizeUnit }} />,
  };

  return <ThoughtChain items={[mainChainItem]} style={{ margin: `${token.sizeUnit * 1.5}px 0` }} />;
};
