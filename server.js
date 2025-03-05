const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Store game state (in memory for now)
const gameState = {
  players: new Set(),
  chatId: null
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API endpoints
app.post('/api/join', (req, res) => {
  const { userId, chatId } = req.body;
  
  if (!userId || !chatId) {
    return res.status(400).json({ error: 'Missing userId or chatId' });
  }

  // If this is the first player, set the chatId
  if (gameState.players.size === 0) {
    gameState.chatId = chatId;
  }

  // Check if the game is from the same chat
  if (gameState.chatId !== chatId) {
    return res.status(400).json({ error: 'Game is in progress in a different chat' });
  }

  // Add player to the game
  gameState.players.add(userId);

  res.json({
    success: true,
    players: Array.from(gameState.players),
    playerCount: gameState.players.size
  });
});

// Get current game state
app.get('/api/game-state', (req, res) => {
  res.json({
    players: Array.from(gameState.players),
    playerCount: gameState.players.size,
    chatId: gameState.chatId
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 