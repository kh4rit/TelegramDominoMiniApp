// Telegram types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

// Game state types
export interface GameState {
  players: Set<number>;
  chatId: number | null;
  maxPlayers: number;
}

// API request types
export interface JoinGameRequest {
  userId: number;
  chatId: number;
}

// API response types
export interface ApiResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export interface GameStateResponse extends ApiResponse {
  data: {
    players: number[];
    playerCount: number;
    chatId: number | null;
    maxPlayers: number;
  };
}

export interface JoinGameResponse extends ApiResponse {
  data: {
    players: number[];
    playerCount: number;
    isGameFull: boolean;
  };
}

// Error types
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
} 