"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const cors = require("cors");
const path = __importStar(require("path"));
const types_1 = require("./types");
const app = express();
const PORT = process.env.PORT || 3000;
// Initialize game state
const gameState = {
    players: new Set(),
    chatId: null,
    maxPlayers: 4 // Maximum players for a domino game
};
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
// Error handling middleware
const errorHandler = (err, req, res, next) => {
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
const validateJoinRequest = (req, res, next) => {
    const { userId, chatId } = req.body;
    if (!userId || !chatId) {
        throw new types_1.ValidationError('Missing userId or chatId');
    }
    if (typeof userId !== 'number' || typeof chatId !== 'number') {
        throw new types_1.ValidationError('Invalid userId or chatId type');
    }
    next();
};
// API endpoints
app.post('/api/join', validateJoinRequest, (req, res) => {
    const { userId, chatId } = req.body;
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
    const response = {
        success: true,
        data: {
            players: Array.from(gameState.players),
            playerCount: gameState.players.size,
            isGameFull: gameState.players.size >= gameState.maxPlayers
        }
    };
    res.json(response);
});
app.get('/api/game-state', (req, res) => {
    const response = {
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
//# sourceMappingURL=server.js.map