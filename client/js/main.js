import GameManager from './game-manager.js';

class MahjongGame {
    constructor() {
        this.gameManager = null;
        this.initialize();
    }
    
    initialize() {
        console.log('🎮 Initializing Malaysia Mahjong Game...');
        
        try {
            this.gameManager = new GameManager();
            console.log('✅ Game initialized successfully');
        } catch (error) {
            console.error('❌ Game initialization failed:', error);
            this.showError('Failed to initialize game: ' + error.message);
        }
    }
    
    showError(message) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="screen">
                    <h1 style="color: #f44336;">❌ Error</h1>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #00adb5; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }
}

// Start the game when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.mahjongGame = new MahjongGame();
});