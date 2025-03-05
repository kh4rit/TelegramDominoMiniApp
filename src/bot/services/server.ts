import express from 'express';
import cors from 'cors';
import path from 'path';
import { BotService } from './bot';
import { config } from '../config';

export class ServerService {
  private static instance: ServerService;
  private app: express.Application;
  private botService: BotService;

  private constructor(botService: BotService) {
    this.app = express();
    this.botService = botService;
    this.setupMiddleware();
    this.setupRoutes();
  }

  public static getInstance(botService: BotService): ServerService {
    if (!ServerService.instance) {
      ServerService.instance = new ServerService(botService);
    }
    return ServerService.instance;
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Serve static files
    const rootDir = path.resolve(__dirname, '../../../');
    this.app.use(express.static(rootDir));
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Serving static files from:', rootDir);
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Webhook endpoint for Telegram
    this.app.post('/webhook', async (req, res) => {
      try {
        await this.botService.handleWebhook(req.body);
        res.sendStatus(200);
      } catch (error) {
        console.error('Error handling webhook:', error);
        res.sendStatus(500);
      }
    });

    // Debug endpoint for webhook
    this.app.get('/webhook', (req, res) => {
      res.json({ status: 'Webhook endpoint is working. Please use POST for actual updates.' });
    });

    // API Game endpoints
    this.app.post('/api/join', express.json(), (req, res) => {
      try {
        const { userId, chatId } = req.body;
        
        if (!userId || !chatId) {
          return res.status(400).json({ 
            success: false,
            error: 'Missing userId or chatId' 
          });
        }
        
        // Simple mock response for now
        res.json({
          success: true,
          data: {
            players: [userId],
            playerCount: 1,
            isGameFull: false
          }
        });
      } catch (error) {
        res.status(500).json({ 
          success: false,
          error: 'Internal server error' 
        });
      }
    });

    this.app.get('/api/game-state', (req, res) => {
      // Simple mock response for now
      res.json({
        success: true,
        data: {
          players: [],
          playerCount: 0,
          chatId: null,
          maxPlayers: 4
        }
      });
    });

    // Catch-all route for the SPA
    this.app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../../../index.html'));
    });

    // Error handling middleware
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(config.server.port, () => {
          console.log(`Server running on port ${config.server.port}`);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Mini App will be served through ngrok for HTTPS access`);
          }
          
          resolve();
        });

        server.on('error', (error) => {
          console.error('Server failed to start:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error in server setup:', error);
        reject(error);
      }
    });
  }
} 