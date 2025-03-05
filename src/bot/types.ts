import { Context } from 'telegraf';

export interface BotConfig {
  token: string;
  webAppUrl: string;
}

export interface GameSession {
  chatId: number;
  players: Set<number>;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
  updatedAt: Date;
}

export interface StartCommandResponse {
  success: boolean;
  error?: string;
  gameSession?: GameSession;
}

export interface BotContext extends Context {
  gameSession?: GameSession;
} 