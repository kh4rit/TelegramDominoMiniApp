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

async function startLocalServer() {
  const app = express();
  const port = 3000;

  // Enable CORS
  app.use(cors());
  
  // Parse JSON bodies
  app.use(express.json());

  // Serve static files from the dist directory (where the built files are)
  app.use(express.static(path.join(__dirname, '../../dist')));

  // Serve index.html for all routes to support client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start the server
  return new Promise<void>((resolve, reject) => {
    try {
      const server = app.listen(port, () => {
        console.log(`Local server running at http://localhost:${port}`);
        resolve();
      });

      server.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
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
    
    // Start ngrok in the background with more detailed logging
    await execAsync(`${NGROK_BINARY} http 3000 --authtoken="${process.env.NGROK_AUTH_TOKEN}" --log=stdout --log-level=debug &`);
    
    // Wait for ngrok to start and create the tunnel
    console.log('Waiting for ngrok tunnel to be ready...');
    let tunnels = null;
    let retries = 0;
    const maxRetries = 10;

    while (!tunnels && retries < maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { stdout: tunnelInfo } = await execAsync('curl -s http://127.0.0.1:4040/api/tunnels');
        const tunnelData = JSON.parse(tunnelInfo);
        
        if (tunnelData.tunnels && tunnelData.tunnels.length > 0) {
          tunnels = tunnelData.tunnels;
          break;
        }
      } catch (error) {
        console.log(`Waiting for ngrok tunnel (attempt ${retries + 1}/${maxRetries})...`);
      }
      retries++;
    }

    if (!tunnels) {
      throw new Error('Failed to create ngrok tunnel after multiple attempts');
    }
    
    const url = tunnels[0].public_url;
    console.log('Ngrok tunnel created:', url);
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

    // Start local server
    await startLocalServer();

    // Start ngrok tunnel
    const webAppUrl = await startNgrokTunnel();

    // Create and start bot
    const botService = new BotService({
      token: process.env.BOT_TOKEN,
      webAppUrl
    });

    await botService.start();
    console.log('Bot started successfully');
    console.log('\nTo test the bot:');
    console.log('1. Open Telegram and find your bot');
    console.log('2. Send the /start command');
    console.log('3. Click the "Join Game" button');
    console.log('\nPress Ctrl+C to stop the server');

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