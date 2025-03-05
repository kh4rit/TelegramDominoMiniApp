"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.GameError = void 0;
// Error types
class GameError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GameError';
    }
}
exports.GameError = GameError;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=types.js.map