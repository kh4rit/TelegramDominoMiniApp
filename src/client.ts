// Make this a module by adding an export
export {};

// Define the WebApp interface
interface WebApp {
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat?: {
      id: number;
      type: string;
    };
  };
  ready: () => void;
  enableClosingConfirmation: () => void;
  MainButton: {
    text: string;
    onClick: (callback: () => void) => void;
    setParams: (params: { text: string }) => void;
  };
  showAlert: (message: string) => void;
}

// Declare the Telegram namespace
declare global {
  interface Window {
    Telegram: {
      WebApp: WebApp;
    };
  }
}

class DominoGame {
  private tg: WebApp | null = null;
  private joinButton: HTMLButtonElement | null = null;

  constructor() {
    // Check if Telegram WebApp is available
    if (!window.Telegram?.WebApp) {
      console.error('Telegram WebApp is not available');
      return;
    }

    this.tg = window.Telegram.WebApp;
    this.joinButton = document.querySelector('.join-button');
    this.initialize();
  }

  private initialize(): void {
    if (!this.tg) return;

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

  private async joinGame(): Promise<void> {
    if (!this.tg) return;

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
    } catch (error) {
      if (!this.tg) return;

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