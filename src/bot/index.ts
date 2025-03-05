import { config } from 'dotenv';
import { BotService } from './service';
import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get the path to the Homebrew-installed ngrok binary
const NGROK_BINARY = '/opt/homebrew/bin/ngrok';

// Load environment variables
dotenv.config();
config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN environment variable is not set');
  process.exit(1);
}

if (!WEB_APP_URL) {
  console.error('WEB_APP_URL environment variable is not set');
  process.exit(1);
}

console.log('Starting bot with configuration:', {
  webAppUrl: WEB_APP_URL,
  // Don't log the full token for security
  tokenPresent: !!BOT_TOKEN
});

const botService = new BotService({
  token: BOT_TOKEN,
  webAppUrl: WEB_APP_URL
});

// Handle shutdown gracefully
process.once('SIGINT', () => {
  console.log('Received SIGINT signal');
  botService.stop();
});

process.once('SIGTERM', () => {
  console.log('Received SIGTERM signal');
  botService.stop();
});

// Start the bot
botService.start().catch(error => {
  console.error('Failed to start bot:', error);
  process.exit(1);
}); 