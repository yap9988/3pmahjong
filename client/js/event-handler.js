class EventHandler {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }
    
    initialize() {
        console.log('EventHandler: Initializing...');
        
        // Set up event delegation since elements are created dynamically
        document.addEventListener('click', (e) => {
            this.handleClick(e);
        });
        
        document.addEventListener('keypress', (e) => {
            this.handleKeyPress(e);
        });
        
        console.log('EventHandler: Initialized');
    }
    
    handleClick(e) {
        const target = e.target;
        
        // Handle button clicks
        if (target.tagName === 'BUTTON') {
            switch (target.id) {
                case 'createRoomBtn':
                    e.preventDefault();
                    this.gameManager.createRoom();
                    break;
                    
                case 'joinRoomBtn':
                    e.preventDefault();
                    this.gameManager.joinRoom();
                    break;
                    
                case 'startGameBtn':
                    e.preventDefault();
                    this.gameManager.startGame();
                    break;
                    
                case 'leaveRoomBtn':
                    e.preventDefault();
                    this.gameManager.leaveRoom();
                    break;
                    
                case 'drawTileBtn':
                    e.preventDefault();
                    this.gameManager.drawTile();
                    break;
                    
                case 'winBtn':
                    e.preventDefault();
                    this.gameManager.declareWin();
                    break;
                    
                case 'endGameBtn':
                    e.preventDefault();
                    if (confirm('Are you sure you want to end the game?')) {
                        this.gameManager.uiManager.showScreen('room');
                        this.gameManager.gameActive = false;
                    }
                    break;
            }
        }
        
        // Handle tile clicks (for discarding)
        if (target.classList.contains('tile')) {
            const tileId = target.dataset.id;
            if (tileId && this.gameManager.gameActive && this.gameManager.turnManager.isMyTurn) {
                this.gameManager.discardTile(tileId);
            }
        }
    }
    
    handleKeyPress(e) {
        // Enter key shortcuts
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            
            switch (activeElement.id) {
                case 'playerName':
                    this.gameManager.createRoom();
                    break;
                    
                case 'joinPlayerName':
                case 'roomCode':
                    this.gameManager.joinRoom();
                    break;
            }
        }
    }
}

export default EventHandler;