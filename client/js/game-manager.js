import SocketManager from './socket-manager.js';
import UIManager from './ui-manager.js';
import EventHandler from './event-handler.js';
import TurnManager from './turn-manager.js';

class GameManager {
    constructor() {
        this.socketManager = new SocketManager(this);
        this.uiManager = new UIManager(this);
        this.eventHandler = new EventHandler(this);
        this.turnManager = new TurnManager(this);
        
        this.playerId = null;
        this.playerName = 'Player';
        this.roomId = null;
        this.isHost = false;
        this.gameActive = false;
        
        this.currentHand = [];
        this.players = [];
        
        this.initialize();
    }
    
    initialize() {
        console.log('GameManager: Initializing...');
        
        // Set up initial UI
        this.uiManager.showScreen('lobby');
        
        // Set random default names
        this.uiManager.setInputValue('playerName', 'Player' + Math.floor(Math.random() * 1000));
        this.uiManager.setInputValue('joinPlayerName', 'Player' + Math.floor(Math.random() * 100));
        
        // Initialize event handlers
        this.eventHandler.initialize();
        
        // Connect to server
        this.socketManager.connect();
        
        console.log('GameManager: Initialization complete');
    }
    
    // Game state management
    setPlayerInfo(playerId, playerName, isHost) {
        this.playerId = playerId;
        this.playerName = playerName;
        this.isHost = isHost;
        console.log('GameManager: Player info set:', { playerId, playerName, isHost });
    }
    
    setRoomInfo(roomId) {
        this.roomId = roomId;
        console.log('GameManager: Room set:', roomId);
    }
    
    setCurrentHand(hand) {
        this.currentHand = hand;
        console.log('GameManager: Current hand updated:', hand.length, 'tiles');
    }
    
    setPlayers(players) {
        this.players = players;
        console.log('GameManager: Players updated:', players.length);
    }
    
    // Game actions
    createRoom() {
        const playerName = this.uiManager.getInputValue('playerName');
        if (!playerName.trim()) {
            this.uiManager.showMessage('lobbyMessage', 'Please enter your name', 'error');
            return;
        }
        
        console.log('GameManager: Creating room for', playerName);
        this.socketManager.createRoom(playerName);
    }
    
    joinRoom() {
        const playerName = this.uiManager.getInputValue('joinPlayerName');
        const roomCode = this.uiManager.getInputValue('roomCode');
        
        if (!playerName.trim()) {
            this.uiManager.showMessage('lobbyMessage', 'Please enter your name', 'error');
            return;
        }
        
        if (!roomCode.trim()) {
            this.uiManager.showMessage('lobbyMessage', 'Please enter room code', 'error');
            return;
        }
        
        console.log('GameManager: Joining room', roomCode, 'as', playerName);
        this.socketManager.joinRoom(roomCode, playerName);
    }
    
    startGame() {
        if (this.isHost && this.roomId) {
            console.log('GameManager: Starting game in room', this.roomId);
            this.socketManager.startGame(this.roomId);
        }
    }
    
    drawTile() {
        if (this.roomId && this.gameActive) {
            console.log('GameManager: Drawing tile');
            this.socketManager.drawTile(this.roomId);
        }
    }
    
    discardTile(tileId) {
        if (this.roomId && tileId) {
            console.log('GameManager: Discarding tile', tileId);
            this.socketManager.discardTile(this.roomId, tileId);
        }
    }
    
    declarePung(tileId) {
        if (this.roomId && tileId) {
            console.log('GameManager: Declaring pung for tile', tileId);
            this.socketManager.declarePung(this.roomId, tileId);
        }
    }
    
    declareWin() {
        if (this.roomId) {
            console.log('GameManager: Declaring win');
            this.socketManager.declareWin(this.roomId);
        }
    }
    
    leaveRoom() {
        console.log('GameManager: Leaving room');
        this.uiManager.showScreen('lobby');
        this.roomId = null;
        this.isHost = false;
        this.uiManager.showMessage('lobbyMessage', 'Left the room', 'info');
    }
    
    // Event handlers (called by other modules)
    onRoomCreated(data) {
        this.setPlayerInfo(data.player.id, data.player.name, data.isHost);
        this.setRoomInfo(data.roomId);
        this.setPlayers(data.players); // ✅ ADD THIS
    
        this.uiManager.updateRoomDisplay(data);
        this.uiManager.showScreen('room');
        this.uiManager.showMessage('roomMessage', `Room created! Share code: ${data.roomId}`, 'success');
    }
    
    onJoinedRoom(data) {
        this.setPlayerInfo(data.player.id, data.player.name, data.isHost);
        this.setRoomInfo(data.roomId);
        this.setPlayers(data.players); // ✅ ADD THIS
    
        this.uiManager.updateRoomDisplay(data);
        this.uiManager.showScreen('room');
        this.uiManager.showMessage('roomMessage', `Joined room ${data.roomId}`, 'success');
    }
    
    onGameStarted(data) {
        console.log('🎮 onGameStarted called with data:', data);
    
        this.gameActive = true;
    
        // Debug hand data
        console.log('My player ID:', this.playerId);
        console.log('Available hands:', Object.keys(data.hands || {}));
        console.log('My hand data:', data.hands ? data.hands[this.playerId] : 'No hands');
    
        this.setCurrentHand(data.hands[this.playerId] || []);
        this.setPlayers(data.players || []);
    
        console.log('Current hand set:', this.currentHand.length, 'tiles');
        console.log('Players set:', this.players.length);
    
        // Try to force UI update
        this.uiManager.showScreen('game');
        console.log('Screen should be switched to game');
    
        this.uiManager.updateGameDisplay(data);
        console.log('Game display updated');
    
        this.uiManager.renderCurrentHand(this.currentHand);
        console.log('Hand rendered');


        // Render bonus tiles for all players so everyone sees the removed flowers/seasons/etc.
        if (data.bonusTiles) {
            data.players.forEach(p => {
                const bonusForPlayer = data.bonusTiles[p.id] || [];
                this.uiManager.updateBonusTilesDisplay(p.id, bonusForPlayer);
            });
            console.log('Bonus tiles updated for all players');
        }

    
        this.turnManager.updateTurnState(data.currentPlayer);


        // If the server indicated it's the firstTurn (East discards), adapt UI:
        if (data.firstTurn) {
            // If I'm the current player (dealer/East) disable draw and instruct to discard
            if (this.turnManager.isMyTurn) {
                const drawBtn = document.getElementById('drawTileBtn');
                if (drawBtn) drawBtn.disabled = true;

                this.uiManager.showMessage('gameMessage', 'You are East and start with 14 tiles — please discard a tile (do not draw).', 'success');
            } else {
                // If not the dealer, show a message that East will discard first
                const dealer = data.currentPlayerName || 'Dealer';
                this.uiManager.showMessage('gameMessage', `${dealer} (East) will discard first.`, 'info');
            }
        } else {
            // Not first turn — normal flow (draw enabled/disabled handled by turnManager)
            const message = (this.turnManager.isMyTurn ? 'Your turn! Click Draw Tile.' : 'Waiting for turn...');
            this.uiManager.showMessage('gameMessage', message, 'success');
        }


        console.log('Turn state updated');

   
        // Force a UI refresh/visual update if needed
        setTimeout(() => {
            try {
                const gameEl = document.getElementById('game');
                if (gameEl) gameEl.style.display = 'block';
            } catch (e) { /* noop */ }
        }, 100);
    }
    

    
    onTileDrawn(data) {
        if (data.error) {
            this.uiManager.showMessage('gameMessage', data.error, 'error');
            return;
        }
        
        this.setCurrentHand(data.hand);
        this.uiManager.renderCurrentHand(this.currentHand);
        this.uiManager.updateDummyWallCount(data.dummyWallCount);
        
        this.uiManager.showMessage('gameMessage', `You drew: ${data.tile.display}. Click a tile to discard.`, 'info');
        this.uiManager.makeTilesDiscardable(this.currentHand, (tileId) => this.discardTile(tileId));
    }
    
    onTileDiscarded(data) {
        this.uiManager.addToDiscardPile(data.tile);
        this.turnManager.updateTurnState(data.currentPlayer);
        
        // Check for pung opportunity
        const canPung = this.checkPungOpportunity(data.tile, data.playerId);
        if (canPung) {
            this.uiManager.showPungButton(data.tile, () => this.declarePung(data.tile.id));
        }
    }
    
    checkPungOpportunity(discardedTile, fromPlayerId) {
        if (fromPlayerId === this.playerId) return false;
        
        const matchingTiles = this.currentHand.filter(tile => 
            tile.type === discardedTile.type && 
            tile.value === discardedTile.value
        );
        
        return matchingTiles.length >= 2;
    }
    
    onError(data) {
        console.error('GameManager: Error received:', data);
        this.uiManager.showMessage('gameMessage', `Error: ${data.message}`, 'error');
    }
}

export default GameManager;