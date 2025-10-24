import type { Repo } from '@agor/core/types';
import { Button, Form, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { WorktreeFormFields } from '../WorktreeFormFields';

export interface NewWorktreeConfig {
  repoId: string;
  name: string;
  ref: string;
  createBranch: boolean;
  sourceBranch: string;
  pullLatest: boolean;
  issue_url?: string;
  pull_request_url?: string;
  board_id?: string; // Board to add worktree to after creation
}

export interface NewWorktreeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (config: NewWorktreeConfig) => void;
  repos: Repo[];
  currentBoardId?: string; // Auto-fill board if provided
}

export const NewWorktreeModal: React.FC<NewWorktreeModalProps> = ({
  open,
  onClose,
  onCreate,
  repos,
  currentBoardId,
}) => {
  const [form] = Form.useForm();
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);

  const selectedRepo = repos.find(r => r.repo_id === selectedRepoId);

  // Remember last used repo from localStorage
  useEffect(() => {
    if (!open) return;

    const lastRepoId = localStorage.getItem('agor-last-repo-id');

    // If we have a last used repo and it still exists, use it
    if (lastRepoId && repos.some(r => r.repo_id === lastRepoId)) {
      form.setFieldValue('repoId', lastRepoId);
      setSelectedRepoId(lastRepoId);

      // Auto-populate source branch
      const repo = repos.find(r => r.repo_id === lastRepoId);
      if (repo?.default_branch) {
        form.setFieldValue('sourceBranch', repo.default_branch);
      }
    }
  }, [open, repos, form]);

  const handleRepoChange = (repoId: string) => {
    setSelectedRepoId(repoId);

    // Auto-populate source branch from repo's default branch
    const repo = repos.find(r => r.repo_id === repoId);
    if (repo?.default_branch) {
      form.setFieldValue('sourceBranch', repo.default_branch);
    }
  };

  const handleValuesChange = () => {
    // Use setTimeout to ensure we're checking after the form state has updated
    setTimeout(() => {
      const values = form.getFieldsValue();

      // Check if required fields are filled
      const isValid = !!(values.repoId && values.sourceBranch && values.name);
      setIsFormValid(isValid);
    }, 0);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();

    const config: NewWorktreeConfig = {
      repoId: values.repoId,
      name: values.name,
      ref: values.name, // Use worktree name as ref (branch name)
      createBranch: true,
      sourceBranch: values.sourceBranch || selectedRepo?.default_branch || 'main',
      pullLatest: true,
      issue_url: values.issue_url,
      pull_request_url: values.pull_request_url,
      board_id: currentBoardId, // Include board_id if provided
    };

    // Remember last used repo
    if (values.repoId) {
      localStorage.setItem('agor-last-repo-id', values.repoId);
    }

    onCreate(config);
    onClose();

    // Reset form
    form.resetFields();
    setSelectedRepoId(null);
    setIsFormValid(false);
  };

  const handleCancel = () => {
    onClose();
    form.resetFields();
    setSelectedRepoId(null);
    setIsFormValid(false);
  };

  return (
    <Modal
      title="Create New Worktree"
      open={open}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="create" type="primary" onClick={handleCreate} disabled={!isFormValid}>
          Create Worktree
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        style={{ marginTop: 24 }}
      >
        <WorktreeFormFields
          repos={repos}
          selectedRepoId={selectedRepoId}
          onRepoChange={handleRepoChange}
          defaultBranch={selectedRepo?.default_branch || 'main'}
          showUrlFields={true}
          onFormChange={handleValuesChange}
        />
      </Form>
    </Modal>
  );
};
