"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var DominoGame = /** @class */ (function () {
    function DominoGame() {
        var _a;
        this.tg = null;
        this.joinButton = null;
        // Check if Telegram WebApp is available
        if (!((_a = window.Telegram) === null || _a === void 0 ? void 0 : _a.WebApp)) {
            console.error('Telegram WebApp is not available');
            return;
        }
        this.tg = window.Telegram.WebApp;
        this.joinButton = document.querySelector('.join-button');
        this.initialize();
    }
    DominoGame.prototype.initialize = function () {
        var _this = this;
        if (!this.tg)
            return;
        // Enable closing confirmation
        this.tg.enableClosingConfirmation();
        // Initialize the WebApp
        this.tg.ready();
        // Set the main button as visible
        this.tg.MainButton.setParams({
            text: 'Join Game'
        });
        // Add event listeners
        if (this.joinButton) {
            this.joinButton.addEventListener('click', function () { return _this.joinGame(); });
        }
        this.tg.MainButton.onClick(function () { return _this.joinGame(); });
    };
    DominoGame.prototype.joinGame = function () {
        return __awaiter(this, void 0, void 0, function () {
            var userId, chatId, response, data, error_1;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!this.tg)
                            return [2 /*return*/];
                        userId = (_b = (_a = this.tg.initDataUnsafe) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
                        chatId = (_d = (_c = this.tg.initDataUnsafe) === null || _c === void 0 ? void 0 : _c.chat) === null || _d === void 0 ? void 0 : _d.id;
                        if (!userId || !chatId) {
                            this.tg.showAlert('Error: Could not identify user or chat');
                            return [2 /*return*/];
                        }
                        // Show loading state
                        if (this.joinButton) {
                            this.joinButton.disabled = true;
                            this.joinButton.textContent = 'Joining...';
                        }
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, fetch('/api/join', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ userId: userId, chatId: chatId })
                            })];
                    case 2:
                        response = _e.sent();
                        return [4 /*yield*/, response.json()];
                    case 3:
                        data = _e.sent();
                        if (!response.ok) {
                            throw new Error(data.error || 'Failed to join game');
                        }
                        // Show success message with player count
                        this.tg.showAlert("Successfully joined! Players in game: ".concat(data.data.playerCount));
                        // Update button state
                        if (this.joinButton) {
                            this.joinButton.textContent = 'Joined ✓';
                            this.joinButton.style.backgroundColor = 'var(--tg-theme-secondary-bg-color, #e6e6e6)';
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _e.sent();
                        if (!this.tg)
                            return [2 /*return*/];
                        // Show error message
                        this.tg.showAlert("Error: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error'));
                        // Reset button state
                        if (this.joinButton) {
                            this.joinButton.disabled = false;
                            this.joinButton.textContent = 'Join Game';
                        }
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return DominoGame;
}());
// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    new DominoGame();
});
