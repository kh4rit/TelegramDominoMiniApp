import { Telegraf } from 'telegraf';
import { BotConfig, BotContext, GameSession, StartCommandResponse } from './types';

export class BotService {
  private bot: Telegraf<BotContext>;
  private gameSessions: Map<number, GameSession>;
  private webAppUrl: string;

  constructor(config: BotConfig) {
    this.bot = new Telegraf<BotContext>(config.token);
    this.gameSessions = new Map();
    this.webAppUrl = config.webAppUrl;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Start command handler
    this.bot.command('start', async (ctx) => {
      const response = await this.handleStartCommand(ctx);
      if (!response.success) {
        await ctx.reply(response.error || 'Failed to start the game');
        return;
      }
      
      const gameSession = response.gameSession;
      if (!gameSession) return;

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

  private async handleStartCommand(ctx: BotContext): Promise<StartCommandResponse> {
    if (!ctx.chat) {
      return { success: false, error: 'Chat not found' };
    }

    const chatId = ctx.chat.id;
    const existingSession = this.gameSessions.get(chatId);

    if (existingSession) {
      if (existingSession.status === 'playing') {
        return { 
          success: false, 
          error: 'A game is already in progress in this chat' 
        };
      }
      
      // Reset the session if it's finished
      if (existingSession.status === 'finished') {
        this.gameSessions.delete(chatId);
      }
    }

    // Create new session
    const newSession: GameSession = {
      chatId,
      players: new Set(),
      status: 'waiting',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.gameSessions.set(chatId, newSession);
    ctx.gameSession = newSession;

    return { success: true, gameSession: newSession };
  }

  private async handleWebAppData(ctx: BotContext, data: any): Promise<void> {
    if (!ctx.chat || !ctx.gameSession) {
      await ctx.reply('Error: Game session not found');
      return;
    }

    const { action, userId } = data;

    switch (action) {
      case 'join':
        await this.handlePlayerJoin(ctx, userId);
        break;
      case 'leave':
        await this.handlePlayerLeave(ctx, userId);
        break;
      default:
        await ctx.reply('Unknown action received');
    }
  }

  private async handlePlayerJoin(ctx: BotContext, userId: number): Promise<void> {
    const session = ctx.gameSession!;
    
    if (session.players.has(userId)) {
      await ctx.reply('You are already in the game!');
      return;
    }

    if (session.players.size >= 4) {
      await ctx.reply('Game is full! Maximum 4 players allowed.');
      return;
    }

    session.players.add(userId);
    session.updatedAt = new Date();

    const playerCount = session.players.size;
    await ctx.reply(`Player joined! Current players: ${playerCount}/4`);

    if (playerCount === 4) {
      session.status = 'playing';
      await ctx.reply('Game is full! Starting the game...');
      // Here you would implement the game start logic
    }
  }

  private async handlePlayerLeave(ctx: BotContext, userId: number): Promise<void> {
    const session = ctx.gameSession!;
    
    if (!session.players.has(userId)) {
      await ctx.reply('You are not in the game!');
      return;
    }

    session.players.delete(userId);
    session.updatedAt = new Date();

    const playerCount = session.players.size;
    await ctx.reply(`Player left! Current players: ${playerCount}/4`);

    if (playerCount === 0) {
      session.status = 'finished';
      this.gameSessions.delete(session.chatId);
      await ctx.reply('All players left. Game ended.');
    }
  }

  public async start(): Promise<void> {
    try {
      await this.bot.launch();
      console.log('Bot started successfully');
    } catch (error) {
      console.error('Error starting bot:', error);
      throw error;
    }
  }

  public stop(): void {
    this.bot.stop();
  }
} 