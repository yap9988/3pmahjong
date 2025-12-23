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

    // Client action to declare kong — calls socketManager
    declareKong(tileId) {
        if (this.roomId && tileId) {
            console.log('GameManager: Declaring kong for tile', tileId);
            this.socketManager.declareKong(this.roomId, tileId);
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
    
    // inside GameManager class
    onGameStarted(data) {
        console.log('🎮 onGameStarted called with data:', data);

        this.gameActive = true;

        this.setCurrentHand(data.hands[this.playerId] || []);
        this.setPlayers(data.players || []);

        // go to game screen & render UI
        this.uiManager.showScreen('game');
        this.uiManager.updateGameDisplay(data);
        this.uiManager.renderCurrentHand(this.currentHand);

        // --- Make tiles discardable if it's my turn (important for East's first-turn discard) ---
        this.turnManager.updateTurnState(data.currentPlayer);

        if (this.turnManager.isMyTurn) {
            // enable clicking tiles to discard (covers both normal draws and the dealer-first discard)
            this.uiManager.makeTilesDiscardable(this.currentHand, (tileId) => this.discardTile(tileId));
        }

        // --- Render bonus tiles for all players (labelled by player) ---
        // Ensure data.bonusTiles exists and players are available
        if (data.bonusTiles && Array.isArray(data.players)) {
            data.players.forEach(p => {
                const bonusForPlayer = data.bonusTiles[p.id] || [];
                this.uiManager.updateBonusTilesDisplay(p.id, bonusForPlayer);
            });
        }

        // If firstTurn flag from server: disable draw button for dealer
        if (data.firstTurn) {
            if (this.turnManager.isMyTurn) {
                const drawBtn = document.getElementById('drawTileBtn');
                if (drawBtn) drawBtn.disabled = true;
                this.uiManager.showMessage('gameMessage', 'You are East and start with 14 tiles — please discard a tile (do not draw).', 'success');
            } else {
                const dealerName = data.currentPlayerName || 'Dealer';
                this.uiManager.showMessage('gameMessage', `${dealerName} (East) will discard first.`, 'info');
            }
        } else {
            // normal flow
            const message = (this.turnManager.isMyTurn ? 'Your turn! Click Draw Tile.' : 'Waiting for turn...');
            this.uiManager.showMessage('gameMessage', message, 'success');
        }

        // force refresh if needed
        setTimeout(() => {
            const gameEl = document.getElementById('game');
            if (gameEl) gameEl.style.display = 'block';
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
        // Server emitted discard info to all clients
        this.uiManager.addToDiscardPile(data.tile);
        this.turnManager.updateTurnState(data.currentPlayer);

        // If we are the one who discarded, don't show pung/kong for self
        if (data.playerId === this.playerId) return;

        // Check for pung/kong opportunity considering wild cards (fei)
        const canPung = this.checkPungOpportunity(data.tile, data.playerId);
        if (canPung) {
            this.uiManager.showPungButton(data.tile, () => this.declarePung(data.tile.id));
        } else {
            this.uiManager.hidePungButton();
        }

        const canKong = this.checkKongOpportunity(data.tile, data.playerId);
        if (canKong) {
            this.uiManager.showKongButton(data.tile, () => this.declareKong(data.tile.id));
        } else {
            this.uiManager.hideKongButton();
        }
    }
    

    // Updated pung check: consider wild (fei) tiles in our hand
    checkPungOpportunity(discardedTile, fromPlayerId) {
        if (fromPlayerId === this.playerId) return false;
        
        const matchingTiles = this.currentHand.filter(tile => 
            !tile.isWild && tile.type === discardedTile.type && tile.value === discardedTile.value
        );
        const wildTiles = this.currentHand.filter(tile => tile.isWild);

        // total available to form pung = matchingTiles + wild tiles
        const totalAvailable = matchingTiles.length + wildTiles.length;

        return totalAvailable >= 2; // need 2 tiles in hand plus the discarded tile to pung
    }


    // New kong check: need 3 tiles in hand (matching + wilds) to combine with discarded tile
    checkKongOpportunity(discardedTile, fromPlayerId) {
        if (fromPlayerId === this.playerId) return false;

        const matchingTiles = this.currentHand.filter(tile => 
            !tile.isWild && tile.type === discardedTile.type && tile.value === discardedTile.value
        );
        const wildTiles = this.currentHand.filter(tile => tile.isWild);

        const totalAvailable = matchingTiles.length + wildTiles.length;

        return totalAvailable >= 3; // need 3 tiles in hand plus the discarded tile to kong
    }



    
    onError(data) {
        console.error('GameManager: Error received:', data);
        this.uiManager.showMessage('gameMessage', `Error: ${data.message}`, 'error');
    }
}

export default GameManager;