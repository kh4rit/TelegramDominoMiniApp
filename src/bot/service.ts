import { Telegraf } from 'telegraf';
import { BotConfig, BotContext, GameSession, StartCommandResponse } from './types';

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

  private async testBotToken(token: string): Promise<boolean> {
    try {
      console.log('Testing bot token...');
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      
      if (data.ok) {
        console.log('Bot token test successful:', {
          id: data.result.id,
          username: data.result.username,
          is_bot: data.result.is_bot
        });
        return true;
      } else {
        console.error('Bot token test failed:', data);
        return false;
      }
    } catch (error) {
      console.error('Bot token test error:', error);
      return false;
    }
  }

  private setupHandlers(): void {
    console.log('Setting up bot handlers...');

    // Error handler
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      if (ctx) {
        ctx.reply('An error occurred. Please try again.').catch(console.error);
      }
    });

    // Debug middleware to log all updates - moved to top for earliest logging
    this.bot.use(async (ctx, next) => {
      console.log('Received update:', {
        type: ctx.updateType,
        chat: ctx.chat?.id,
        from: ctx.from?.id,
        update: ctx.update,
        message: ctx.message,
        webAppUrl: this.webAppUrl // Log the webAppUrl to verify it's set
      });
      await next();
    });

    // Start command handler
    this.bot.command('start', async (ctx) => {
      console.log('Received /start command from:', {
        chatId: ctx.chat?.id,
        userId: ctx.from?.id,
        username: ctx.from?.username
      });
      
      try {
        const response = await this.handleStartCommand(ctx);
        console.log('Start command response:', response);
        
        if (!response.success) {
          console.error('Start command failed:', response.error);
          await ctx.reply(response.error || 'Failed to start the game');
          return;
        }
        
        const gameSession = response.gameSession;
        if (!gameSession) {
          console.error('No game session created');
          await ctx.reply('Failed to create game session');
          return;
        }

        console.log('Sending welcome message with game button...', {
          webAppUrl: this.webAppUrl,
          chatId: ctx.chat?.id
        });

        const message = await ctx.reply(
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
        console.log('Welcome message sent successfully:', {
          messageId: message.message_id,
          chatId: message.chat.id
        });
      } catch (error) {
        console.error('Error in start command:', error);
        await ctx.reply('Failed to start the game. Please try again.');
      }
    });

    // Handle web app data
    this.bot.on('web_app_data', async (ctx) => {
      console.log('Received web app data');
      const data = ctx.message.web_app_data.data;
      try {
        const webAppData = JSON.parse(data);
        await this.handleWebAppData(ctx, webAppData);
      } catch (error) {
        console.error('Error parsing web app data:', error);
        await ctx.reply('Error processing game data');
      }
    });

    console.log('Bot handlers set up successfully');
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
    return this.retryOperation(async () => {
      try {
        // Test bot token first
        const token = (this.bot.telegram as any).token;
        const tokenValid = await this.testBotToken(token);
        
        if (!tokenValid) {
          throw new Error('Bot token validation failed');
        }

        // Set up handlers after token validation
        this.setupHandlers();

        console.log('Starting bot...');
        await this.bot.launch();
        console.log('Bot started successfully');
      } catch (error: any) {
        console.error('Error starting bot:', error);
        if (error.response?.error_code === 404) {
          console.error('Bot token appears to be invalid or bot was not found');
          console.error('Please check:');
          console.error('1. Token format (should be numbers:letters/numbers)');
          console.error('2. Token is copied correctly from BotFather');
          console.error('3. Bot has not been deleted');
          console.error('4. No extra spaces or characters in the token');
        }
        throw error;
      }
    });
  }

  public stop(): void {
    this.bot.stop('SIGINT');
  }
} 