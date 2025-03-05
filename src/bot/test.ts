import ngrok from 'ngrok';
import { BotService } from './service';
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function startLocalServer() {
  const app = express();
  const port = 3000;

  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, '../../public')));

  // Start the server
  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`Local server running at http://localhost:${port}`);
      resolve();
    });
  });
}

async function startNgrokTunnel() {
  try {
    // Kill any existing ngrok processes
    await ngrok.disconnect();
    
    // Start new tunnel
    const url = await ngrok.connect({
      addr: 3000,
      authtoken: process.env.NGROK_AUTH_TOKEN,
      proto: 'http'
    });
    
    console.log('Ngrok tunnel created:', url);
    return url;
  } catch (error) {
    console.error('Error creating ngrok tunnel:', error);
    // Try without auth token as fallback
    try {
      const url = await ngrok.connect({
        addr: 3000,
        proto: 'http'
      });
      console.log('Ngrok tunnel created (without auth):', url);
      return url;
    } catch (fallbackError) {
      console.error('Error creating ngrok tunnel (fallback):', fallbackError);
      throw fallbackError;
    }
  }
}

async function main() {
  try {
    // Start local server
    await startLocalServer();

    // Start ngrok tunnel
    const webAppUrl = await startNgrokTunnel();

    if (!process.env.BOT_TOKEN) {
      throw new Error('BOT_TOKEN environment variable is not set');
    }

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
      await ngrok.disconnect();
      botService.stop();
      process.exit(0);
    });

    process.once('SIGTERM', async () => {
      console.log('\nShutting down...');
      await ngrok.disconnect();
      botService.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting test environment:', error);
    process.exit(1);
  }
}

main(); 