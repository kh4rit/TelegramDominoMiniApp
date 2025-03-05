import { config } from './config';
import { BotService } from './services/bot';
import { NgrokService } from './services/ngrok';
import { ServerService } from './services/server';

async function main() {
  try {
    // Create bot service with initial config
    const botService = new BotService({
      token: config.bot.token,
      webAppUrl: config.bot.webAppUrl
    });

    // Create and start server
    const serverService = ServerService.getInstance(botService);
    await serverService.start();

    // Start ngrok tunnel
    const ngrokService = NgrokService.getInstance();
    const ngrokUrl = await ngrokService.startTunnel();
    
    // In development mode, update the web app URL to use ngrok
    if (process.env.NODE_ENV === 'development') {
      // Update the bot service with the ngrok URL
      botService.updateWebAppUrl(ngrokUrl);
      console.log(`\n🌐 Web App URL updated to: ${ngrokUrl}`);
    }

    // Start the bot
    await botService.start();

    console.log('\n🤖 Bot is ready!');
    console.log('1. Open Telegram and find your bot');
    console.log('2. Send /start command');
    console.log('3. Click "Join Game" button\n');

    // Handle graceful shutdown
    process.once('SIGINT', async () => {
      console.log('\nShutting down...');
      await ngrokService.stop();
      botService.stop();
      process.exit(0);
    });

    process.once('SIGTERM', async () => {
      console.log('\nShutting down...');
      await ngrokService.stop();
      botService.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting bot:', error);
    process.exit(1);
  }
}

main(); 