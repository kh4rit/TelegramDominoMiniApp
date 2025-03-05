import express = require('express');
import cors = require('cors');
import * as path from 'path';
import {
  GameState,
  JoinGameRequest,
  GameStateResponse,
  JoinGameResponse,
  GameError,
  ValidationError
} from './types';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize game state
const gameState: GameState = {
  players: new Set<number>(),
  chatId: null,
  maxPlayers: 4 // Maximum players for a domino game
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Error handling middleware
const errorHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof GameError) {
    return res.status(409).json({
      success: false,
      error: err.message
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};

// Request validation middleware
const validateJoinRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { userId, chatId } = req.body as Partial<JoinGameRequest>;

  if (!userId || !chatId) {
    throw new ValidationError('Missing userId or chatId');
  }

  if (typeof userId !== 'number' || typeof chatId !== 'number') {
    throw new ValidationError('Invalid userId or chatId type');
  }

  next();
};

// API endpoints
app.post('/api/join', validateJoinRequest, (req: express.Request, res: express.Response) => {
  const { userId, chatId } = req.body as JoinGameRequest;

  // If this is the first player, set the chatId
  if (gameState.players.size === 0) {
    gameState.chatId = chatId;
  }

  // Check if the game is from the same chat
  if (gameState.chatId !== chatId) {
    throw new GameError('Game is in progress in a different chat');
  }

  // Check if the game is full
  if (gameState.players.size >= gameState.maxPlayers) {
    throw new GameError('Game is full');
  }

  // Check if player is already in the game
  if (gameState.players.has(userId)) {
    throw new GameError('Player is already in the game');
  }

  // Add player to the game
  gameState.players.add(userId);

  const response: JoinGameResponse = {
    success: true,
    data: {
      players: Array.from(gameState.players),
      playerCount: gameState.players.size,
      isGameFull: gameState.players.size >= gameState.maxPlayers
    }
  };

  res.json(response);
});

app.get('/api/game-state', (req: express.Request, res: express.Response) => {
  const response: GameStateResponse = {
    success: true,
    data: {
      players: Array.from(gameState.players),
      playerCount: gameState.players.size,
      chatId: gameState.chatId,
      maxPlayers: gameState.maxPlayers
    }
  };

  res.json(response);
});

// Apply error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 