import { Context } from 'telegraf';

export interface BotConfig {
  token: string;
  webAppUrl: string;
}

export interface BotContext extends Context {
  session?: GameSession;
}

export interface GameSession {
  chatId: number;
  players: Map<number, Player>;
  maxPlayers: number;
}

export interface Player {
  id: number;
  name: string;
  score: number;
}

export interface StartCommandResponse {
  success: boolean;
  error?: string;
  gameSession?: GameSession;
} 