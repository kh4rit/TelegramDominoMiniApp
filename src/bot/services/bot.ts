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

    // Add a simple echo handler to test if bot is receiving messages
    this.bot.on('text', async (ctx) => {
      if (ctx.message.text !== '/start') {
        await ctx.reply('I received your message: ' + ctx.message.text);
      }
    });

    // Handle web app data
    this.bot.on('web_app_data', async (ctx) => {
      const data = ctx.message.web_app_data.data;
      try {
        const webAppData = JSON.parse(data);
        await this.handleWebAppData(ctx, webAppData);
      } catch (error) {
        console.error('Error parsing web app data:', error);
        await ctx.reply('Error processing game data');
      }
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

  private async handleWebAppData(ctx: BotContext, data: any): Promise<void> {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    
    if (!chatId || !userId) {
      await ctx.reply('Error: Could not identify chat or user');
      return;
    }

    const gameSession = this.gameSessions.get(chatId);
    if (!gameSession) {
      await ctx.reply('Error: No active game session found');
      return;
    }

    // Add player to the game
    if (!gameSession.players.has(userId)) {
      gameSession.players.set(userId, {
        id: userId,
        name: ctx.from?.first_name || 'Player',
        score: 0
      });

      await ctx.reply(`Welcome to the game, ${ctx.from?.first_name}! Players: ${gameSession.players.size}/${gameSession.maxPlayers}`);
    }
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