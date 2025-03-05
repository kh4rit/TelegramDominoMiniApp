import { Telegraf } from 'telegraf';
import { BotConfig, BotContext, GameSession, StartCommandResponse } from '../types';
import { IncomingMessage, ServerResponse } from 'http';

export class BotService {
  private bot: Telegraf<BotContext>;
  private gameSessions: Map<number, GameSession>;
  private webAppUrl: string;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(config: BotConfig) {
    this.bot = new Telegraf<BotContext>(config.token);
    this.gameSessions = new Map();
    this.webAppUrl = config.webAppUrl;
  }

  public async handleWebhook(update: any): Promise<void> {
    return this.bot.handleUpdate(update);
  }

  public updateWebAppUrl(url: string): void {
    this.webAppUrl = url;
    console.log(`Bot web app URL updated to: ${url}`);
  }

  private async testBotToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Bot token test error:', error);
      return false;
    }
  }

  private setupHandlers(): void {
    // Error handler
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      if (ctx) {
        ctx.reply('An error occurred. Please try again.').catch(console.error);
      }
    });

    // Start command handler
    this.bot.command('start', async (ctx) => {
      try {
        const response = await this.handleStartCommand(ctx);
        
        if (!response.success) {
          await ctx.reply(response.error || 'Failed to start the game');
          return;
        }
        
        const gameSession = response.gameSession;
        if (!gameSession) {
          await ctx.reply('Failed to create game session');
          return;
        }

        await ctx.reply(
          'Welcome to Domino! 🎲\n\n' +
          'Click the button below to join the game:',
          {
            reply_markup: {
              inline_keyboard: [[
                {
                  text: '🎮 Join Game',
                  web_app: { url: this.webAppUrl }
                }
              ]]
            }
          }
        );
      } catch (error) {
        console.error('Error in start command:', error);
        await ctx.reply('Failed to start the game. Please try again.');
      }
    });

    // Handle web app data
    this.bot.on('web_app_data', async (ctx) => {
      try {
        if (!ctx.message?.web_app_data?.data) {
          await ctx.reply('Error: No web app data received');
          return;
        }

        const data = ctx.message.web_app_data.data;
        
        if (data !== 'join') {
          await ctx.reply('Error: Invalid action received');
          return;
        }

        await this.handleJoinGame(ctx);
      } catch (error) {
        console.error('Error handling web app data:', error);
        await ctx.reply('Error processing game data. Please try again.');
      }
    });

    // Add game status command
    this.bot.command('status', async (ctx) => {
      const chatId = ctx.chat?.id;
      if (!chatId) {
        await ctx.reply('Error: Could not identify chat');
        return;
      }

      const status = await this.getGameStatus(chatId);
      await ctx.reply(status);
    });
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries = this.maxRetries): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying operation. Attempts remaining: ${retries - 1}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  private async handleStartCommand(ctx: BotContext): Promise<StartCommandResponse> {
    try {
      const chatId = ctx.chat?.id;
      if (!chatId) {
        return { success: false, error: 'No chat ID found' };
      }

      // Create a new game session if one doesn't exist
      if (!this.gameSessions.has(chatId)) {
        this.gameSessions.set(chatId, {
          chatId,
          players: new Map(),
          maxPlayers: 4
        });
      }

      return {
        success: true,
        gameSession: this.gameSessions.get(chatId)
      };
    } catch (error) {
      console.error('Error handling start command:', error);
      return { success: false, error: 'Failed to create game session' };
    }
  }

  private async handleJoinGame(ctx: BotContext): Promise<void> {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    
    if (!chatId || !userId) {
      await ctx.reply('Error: Could not identify user or chat');
      return;
    }

    let gameSession = this.gameSessions.get(chatId);
    
    // If no game session exists, create one
    if (!gameSession) {
      gameSession = {
        chatId,
        players: new Map(),
        maxPlayers: 4
      };
      this.gameSessions.set(chatId, gameSession);
    }

    // Check if game is full
    if (gameSession.players.size >= gameSession.maxPlayers) {
      await ctx.reply('Error: Game is full');
      return;
    }

    // Add player to the game if not already in
    if (!gameSession.players.has(userId)) {
      gameSession.players.set(userId, {
        id: userId,
        name: ctx.from?.first_name || 'Player',
        score: 0
      });

      const playerList = Array.from(gameSession.players.values())
        .map(p => p.name)
        .join(', ');

      await ctx.reply(
        `${ctx.from?.first_name} joined the game!\n\n` +
        `Current players (${gameSession.players.size}/${gameSession.maxPlayers}):\n` +
        playerList
      );
    } else {
      await ctx.reply('You are already in the game!');
    }
  }

  private async getGameStatus(chatId: number): Promise<string> {
    const gameSession = this.gameSessions.get(chatId);
    
    if (!gameSession) {
      return 'No active game in this chat. Start a new game with /start';
    }

    const playerList = Array.from(gameSession.players.values())
      .map(p => p.name)
      .join(', ');

    return `Current game status:\n` +
           `Players (${gameSession.players.size}/${gameSession.maxPlayers}):\n` +
           playerList;
  }

  public async start(): Promise<void> {
    return this.retryOperation(async () => {
      try {
        const token = (this.bot.telegram as any).token;
        const tokenValid = await this.testBotToken(token);
        
        if (!tokenValid) {
          throw new Error('Bot token validation failed');
        }

        this.setupHandlers();
        await this.bot.launch();
        
        process.once('SIGINT', () => this.stop());
        process.once('SIGTERM', () => this.stop());
      } catch (error: any) {
        console.error('Error starting bot:', error);
        throw error;
      }
    });
  }

  public stop(): void {
    this.bot.stop('SIGINT');
  }
} 