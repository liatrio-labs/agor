/**
 * Add a session to a board
 */

import { createClient } from '@agor/core/api';
import type { Board, Session } from '@agor/core/types';
import { Args, Command } from '@oclif/core';
import chalk from 'chalk';

export default class BoardAddSession extends Command {
  static override description = 'Add a session to a board';

  static override examples = [
    '<%= config.bin %> <%= command.id %> default 0199b86c',
    '<%= config.bin %> <%= command.id %> 0199b850 0199b86c-10ab-7409-b053-38b62327e695',
  ];

  static override args = {
    boardId: Args.string({
      description: 'Board ID or slug',
      required: true,
    }),
    sessionId: Args.string({
      description: 'Session ID (short or full)',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { args } = await this.parse(BoardAddSession);
    const client = createClient();

    try {
      // Find board by ID or slug
      // biome-ignore lint/suspicious/noExplicitAny: FeathersJS service typing limitation
      const boardsResult = await (client.service('boards') as any).find();
      const boards = (Array.isArray(boardsResult) ? boardsResult : boardsResult.data) as Board[];

      const board = boards.find(
        (b: Board) =>
          b.board_id === args.boardId ||
          b.board_id.startsWith(args.boardId) ||
          b.slug === args.boardId
      );

      if (!board) {
        this.log(chalk.red(`✗ Board not found: ${args.boardId}`));
        await this.cleanup(client);
        process.exit(1);
      }

      // Find session by short or full ID
      // biome-ignore lint/suspicious/noExplicitAny: FeathersJS service typing limitation
      const sessionsResult = await (client.service('sessions') as any).find();
      const sessions = (
        Array.isArray(sessionsResult) ? sessionsResult : sessionsResult.data
      ) as Session[];

      const session = sessions.find(
        (s: Session) => s.session_id === args.sessionId || s.session_id.startsWith(args.sessionId)
      );

      if (!session) {
        this.log(chalk.red(`✗ Session not found: ${args.sessionId}`));
        await this.cleanup(client);
        process.exit(1);
      }

      // Check if already added
      if (board.sessions.includes(session.session_id)) {
        this.log(chalk.yellow(`⚠ Session already in board "${board.name}"`));
        await this.cleanup(client);
        return;
      }

      // Add session to board
      // biome-ignore lint/suspicious/noExplicitAny: FeathersJS service typing limitation
      const updatedBoard = (await (client.service('boards') as any).patch(board.board_id, {
        sessions: [...board.sessions, session.session_id],
      })) as Board;

      this.log(
        chalk.green(
          `✓ Added session ${session.session_id.substring(0, 8)} to board "${board.name}"`
        )
      );
      this.log(chalk.gray(`  Board now has ${updatedBoard.sessions.length} session(s)`));
    } catch (error) {
      this.log(chalk.red('✗ Failed to add session to board'));
      if (error instanceof Error) {
        this.log(chalk.red(error.message));
      }
      await this.cleanup(client);
      process.exit(1);
    }

    await this.cleanup(client);
  }

  private async cleanup(client: import('@agor/core/api').AgorClient): Promise<void> {
    await new Promise<void>(resolve => {
      client.io.once('disconnect', () => resolve());
      client.io.close();
      setTimeout(() => resolve(), 1000);
    });
  }
}
