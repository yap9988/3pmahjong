class TurnManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.isMyTurn = false;
        this.currentPlayerId = null;
    }
    
    updateTurnState(currentPlayerId) {
        this.currentPlayerId = currentPlayerId;
        this.isMyTurn = (currentPlayerId === this.gameManager.playerId);
        
        // Update UI
        const turnElement = document.getElementById('currentTurn');
        if (turnElement) {
            turnElement.textContent = this.gameManager.uiManager.getPlayerName(currentPlayerId);
        }
        
        // Update draw button
        const drawBtn = document.getElementById('drawTileBtn');
        if (drawBtn) {
            drawBtn.disabled = !this.isMyTurn;
        }
        
        // Show message
        if (this.isMyTurn) {
            this.gameManager.uiManager.showMessage('gameMessage', 'Your turn! Click Draw Tile.', 'success');
        } else {
            const playerName = this.gameManager.uiManager.getPlayerName(currentPlayerId);
            this.gameManager.uiManager.showMessage('gameMessage', `Waiting for ${playerName}...`, 'info');
        }
        
        console.log('TurnManager: Turn updated. My turn?', this.isMyTurn);
    }
}

export default TurnManager;