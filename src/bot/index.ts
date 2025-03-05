import { BotService } from './service';

// Load environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://kh4rit.github.io/TelegramDominotMiniApp/';

if (!BOT_TOKEN) {
  console.error('Error: BOT_TOKEN environment variable is not set');
  process.exit(1);
}

const botService = new BotService({
  token: BOT_TOKEN,
  webAppUrl: WEB_APP_URL
});

// Handle graceful shutdown
process.once('SIGINT', () => {
  botService.stop();
  process.exit(0);
});

process.once('SIGTERM', () => {
  botService.stop();
  process.exit(0);
});

// Start the bot
botService.start().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
}); 