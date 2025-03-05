import { exec } from 'child_process';
import { promisify } from 'util';
import { BotService } from './service';
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// Get the path to the Homebrew-installed ngrok binary
const NGROK_BINARY = '/opt/homebrew/bin/ngrok';

async function startLocalServer(botService: BotService) {
  const app = express();
  const port = 3000;

  // Enable CORS
  app.use(cors());
  
  // Parse JSON bodies
  app.use(express.json());

  // Add a health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Add webhook endpoint for Telegram
  app.post('/webhook', async (req, res) => {
    try {
      console.log('Received webhook request:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
      });
      
      // Check if this is an ngrok warning check
      if (req.headers['ngrok-skip-browser-warning'] !== 'true') {
        console.log('Warning: Request missing ngrok-skip-browser-warning header');
      }

      await botService.handleWebhook(req.body);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.sendStatus(500);
    }
  });

  // Add a GET handler for webhook to help with debugging
  app.get('/webhook', (req, res) => {
    console.log('Received GET request to webhook:', {
      headers: req.headers
    });
    res.json({ status: 'Webhook endpoint is working. Please use POST for actual updates.' });
  });

  // Serve static files from the dist directory
  app.use(express.static(path.join(__dirname, '../../dist')));

  // Add API endpoint for game actions
  app.post('/api/join', (req, res) => {
    console.log('Received join request:', req.body);
    res.json({ success: true, playerCount: 1 });
  });

  // Error handling middleware - should be last
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  });

  // Serve index.html for all remaining routes to support client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });

  // Start the server
  return new Promise<void>((resolve, reject) => {
    try {
      const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
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

async function startNgrokTunnel() {
  try {
    // Kill any existing ngrok processes
    try {
      await execAsync('pkill ngrok');
      console.log('Killed existing ngrok processes');
    } catch (error) {
      // Ignore errors if no ngrok processes were running
    }

    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start ngrok in API mode
    console.log('Starting ngrok tunnel...');
    
    // Start ngrok in a separate process
    const ngrokCmd = `${NGROK_BINARY} http 3000 --authtoken="${process.env.NGROK_AUTH_TOKEN}"`;
    console.log('Starting ngrok...');
    
    const child = exec(ngrokCmd);
    
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        if (data.includes('started tunnel') || data.includes('error')) {
          console.log('ngrok:', data);
        }
      });
    }
    
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        console.error('ngrok error:', data);
      });
    }

    // Wait for ngrok to start and create the tunnel
    console.log('Waiting for ngrok tunnel...');
    let tunnels = null;
    let retries = 0;
    const maxRetries = 20;

    while (!tunnels && retries < maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { stdout: tunnelInfo, stderr: tunnelError } = await execAsync('curl -s -H "ngrok-skip-browser-warning: true" http://127.0.0.1:4040/api/tunnels');
        
        if (tunnelError) {
          console.error('Error fetching tunnel info:', tunnelError);
        }
        
        if (!tunnelInfo) {
          retries++;
          continue;
        }
        
        const tunnelData = JSON.parse(tunnelInfo);
        
        if (tunnelData.tunnels && tunnelData.tunnels.length > 0) {
          tunnels = tunnelData.tunnels;
          break;
        }
      } catch (error) {
        retries++;
      }
    }

    if (!tunnels) {
      throw new Error('Failed to create ngrok tunnel after multiple attempts');
    }
    
    const url = tunnels[0].public_url;
    console.log('\n📡 Webhook URL:', url + '/webhook');
    console.log('Click this URL to bypass the warning page\n');
    
    // Test the webhook URL directly first
    const webhookUrl = `${url}/webhook`;
    
    try {
      // Test the webhook endpoint directly
      const testResponse = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      // Now set up the webhook with Telegram
      const botToken = process.env.BOT_TOKEN;
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ 
          url: webhookUrl,
          drop_pending_updates: true
        })
      });
      
      const result = await response.json();
      if (!result.ok) {
        throw new Error(`Failed to set webhook: ${result.description}`);
      }

      // Get current webhook info
      const infoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const webhookInfo = await infoResponse.json();
      if (!webhookInfo.ok) {
        console.error('Failed to get webhook info:', webhookInfo);
      }
    } catch (error) {
      console.error('Error setting webhook:', error);
      throw error;
    }
    
    return url;
  } catch (error) {
    console.error('Error creating ngrok tunnel:', error);
    throw new Error(`Failed to create ngrok tunnel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function main() {
  try {
    // Check for required environment variables
    if (!process.env.NGROK_AUTH_TOKEN) {
      throw new Error('NGROK_AUTH_TOKEN environment variable is not set');
    }

    if (!process.env.BOT_TOKEN) {
      throw new Error('BOT_TOKEN environment variable is not set');
    }

    // Verify ngrok binary exists
    try {
      await execAsync(`test -f ${NGROK_BINARY}`);
    } catch (error) {
      throw new Error(`Ngrok binary not found at ${NGROK_BINARY}. Please install ngrok using Homebrew: brew install ngrok`);
    }

    // Create bot service first
    const botService = new BotService({
      token: process.env.BOT_TOKEN,
      webAppUrl: 'https://kh4rit.github.io/TelegramDominoMiniApp' // GitHub Pages URL
    });

    // Start local server
    await startLocalServer(botService);

    // Start ngrok tunnel
    const webhookUrl = await startNgrokTunnel();

    // Update bot service with the webhook URL (but keep the GitHub Pages URL for the web app)
    await botService.start();

    console.log('\n🤖 Bot is ready!');
    console.log('1. Open Telegram and find your bot');
    console.log('2. Send /start command');
    console.log('3. Click "Join Game" button\n');

    // Handle graceful shutdown
    process.once('SIGINT', async () => {
      console.log('\nShutting down...');
      try {
        await execAsync('pkill ngrok');
      } catch (error) {
        // Ignore errors if no ngrok processes were running
      }
      botService.stop();
      process.exit(0);
    });

    process.once('SIGTERM', async () => {
      console.log('\nShutting down...');
      try {
        await execAsync('pkill ngrok');
      } catch (error) {
        // Ignore errors if no ngrok processes were running
      }
      botService.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting test environment:', error);
    process.exit(1);
  }
}

main(); 