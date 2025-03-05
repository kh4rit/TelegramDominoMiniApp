import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  bot: {
    token: string;
    webAppUrl: string;
  };
  server: {
    port: number;
  };
  ngrok: {
    binary: string;
    authToken: string;
  };
}

function validateConfig(): Config {
  const requiredEnvVars = [
    'BOT_TOKEN',
    'NGROK_AUTH_TOKEN',
    'WEB_APP_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    bot: {
      token: process.env.BOT_TOKEN!,
      webAppUrl: process.env.WEB_APP_URL!
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10)
    },
    ngrok: {
      binary: '/opt/homebrew/bin/ngrok',
      authToken: process.env.NGROK_AUTH_TOKEN!
    }
  };
}

export const config = validateConfig(); 