"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var cors = require("cors");
var path = require("path");
var types_1 = require("./types");
var app = express();
var PORT = process.env.PORT || 3000;
// Initialize game state
var gameState = {
    players: new Set(),
    chatId: null,
    maxPlayers: 4 // Maximum players for a domino game
};
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
// Error handling middleware
var errorHandler = function (err, req, res, next) {
    console.error('Error:', err);
    if (err instanceof types_1.ValidationError) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    if (err instanceof types_1.GameError) {
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
var validateJoinRequest = function (req, res, next) {
    var _a = req.body, userId = _a.userId, chatId = _a.chatId;
    if (!userId || !chatId) {
        throw new types_1.ValidationError('Missing userId or chatId');
    }
    if (typeof userId !== 'number' || typeof chatId !== 'number') {
        throw new types_1.ValidationError('Invalid userId or chatId type');
    }
    next();
};
// API endpoints
app.post('/api/join', validateJoinRequest, function (req, res) {
    var _a = req.body, userId = _a.userId, chatId = _a.chatId;
    // If this is the first player, set the chatId
    if (gameState.players.size === 0) {
        gameState.chatId = chatId;
    }
    // Check if the game is from the same chat
    if (gameState.chatId !== chatId) {
        throw new types_1.GameError('Game is in progress in a different chat');
    }
    // Check if the game is full
    if (gameState.players.size >= gameState.maxPlayers) {
        throw new types_1.GameError('Game is full');
    }
    // Check if player is already in the game
    if (gameState.players.has(userId)) {
        throw new types_1.GameError('Player is already in the game');
    }
    // Add player to the game
    gameState.players.add(userId);
    var response = {
        success: true,
        data: {
            players: Array.from(gameState.players),
            playerCount: gameState.players.size,
            isGameFull: gameState.players.size >= gameState.maxPlayers
        }
    };
    res.json(response);
});
app.get('/api/game-state', function (req, res) {
    var response = {
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
app.listen(PORT, function () {
    console.log("Server is running on http://localhost:".concat(PORT));
});
