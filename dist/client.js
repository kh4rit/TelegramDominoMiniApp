"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DominoGame {
    constructor() {
        this.tg = null;
        this.joinButton = null;
        // Check if Telegram WebApp is available
        if (!window.Telegram?.WebApp) {
            console.error('Telegram WebApp is not available');
            return;
        }
        this.tg = window.Telegram.WebApp;
        this.joinButton = document.querySelector('.join-button');
        this.initialize();
    }
    initialize() {
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
            this.joinButton.addEventListener('click', () => this.joinGame());
        }
        this.tg.MainButton.onClick(() => this.joinGame());
    }
    async joinGame() {
        if (!this.tg)
            return;
        const userId = this.tg.initDataUnsafe?.user?.id;
        const chatId = this.tg.initDataUnsafe?.chat?.id;
        if (!userId || !chatId) {
            this.tg.showAlert('Error: Could not identify user or chat');
            return;
        }
        // Show loading state
        if (this.joinButton) {
            this.joinButton.disabled = true;
            this.joinButton.textContent = 'Joining...';
        }
        try {
            const response = await fetch('/api/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, chatId })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to join game');
            }
            // Show success message with player count
            this.tg.showAlert(`Successfully joined! Players in game: ${data.data.playerCount}`);
            // Update button state
            if (this.joinButton) {
                this.joinButton.textContent = 'Joined ✓';
                this.joinButton.style.backgroundColor = 'var(--tg-theme-secondary-bg-color, #e6e6e6)';
            }
        }
        catch (error) {
            if (!this.tg)
                return;
            // Show error message
            this.tg.showAlert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Reset button state
            if (this.joinButton) {
                this.joinButton.disabled = false;
                this.joinButton.textContent = 'Join Game';
            }
        }
    }
}
// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DominoGame();
});
//# sourceMappingURL=client.js.map