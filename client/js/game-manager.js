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
        
        this.canDiscard = false; // Track if player is allowed to discard
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
            this.canDiscard = false; // Prevent double discard
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
            this.canDiscard = true;
            this.uiManager.makeTilesDiscardable(this.currentHand, (tileId) => this.discardTile(tileId));
            
            // Check for initial 4-card Kong (An Gang)
            this.checkSelfKongOpportunity();
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

        // Update hand and UI
        this.setCurrentHand(data.hand);
        this.uiManager.renderCurrentHand(this.currentHand);

        // Update dummy wall counter
        if (typeof data.dummyWallCount !== 'undefined') {
            this.uiManager.updateDummyWallCount(data.dummyWallCount);
        }

        // If server provided bonusTiles for this player, update bonus tiles UI
        if (data.bonusTiles && Array.isArray(data.bonusTiles)) {
            // Ensure the client's bonus area for THIS player is updated
            this.uiManager.updateBonusTilesDisplay(this.playerId, data.bonusTiles || []);
        }

        // Construct message
        let msg = `You drew: ${data.tile ? data.tile.display : 'a tile'}.`;
        if (data.drawnBonusTiles && data.drawnBonusTiles.length > 0) {
            const bonusNames = data.drawnBonusTiles.map(t => t.display).join(', ');
            msg = `You drew ${bonusNames}, replaced with ${data.tile ? data.tile.display : 'a tile'}.`;
        }
        
        this.uiManager.showMessage('gameMessage', `${msg} Click a tile to discard.`, 'info');

        // Make tiles discardable so the player can end their turn
        this.canDiscard = true;
        this.uiManager.makeTilesDiscardable(this.currentHand, (tileId) => this.discardTile(tileId));
        
        // Check for Self Kong (An Gang) after drawing
        this.checkSelfKongOpportunity();
    }
    
    // When a discard occurs, we already call checkKongOpportunity; if true request options
    onTileDiscarded(data) {
        // existing behavior...
        this.uiManager.addToDiscardPile(data.tile);
        this.turnManager.updateTurnState(data.currentPlayer);

        if (data.playerId === this.playerId) return;

        // Check Pung Opportunity
        if (this.checkPungOpportunity(data.tile, data.playerId)) {
            this.uiManager.showPungButton(data.tile, () => {
                this.declarePung(data.tile.id);
            });
        } else {
            this.uiManager.hidePungButton();
        }

        const canKong = this.checkKongOpportunity(data.tile, data.playerId);
        if (canKong) {
            // Query server for possible combinations so player can choose
            this.socketManager.requestKongOptions(this.roomId, data.tile.id, (result) => {
                if (!result || result.error) {
                    console.warn('No kong options or error', result);
                    // fallback: show simple kong button
                    this.uiManager.showKongButton(data.tile, () => {
                        this.declareKong(data.tile.id);
                    });
                    return;
                }

                const options = result.options || [];
                if (options.length === 0) {
                    this.uiManager.showKongButton(data.tile, () => this.declareKong(data.tile.id));
                    return;
                }

                // Show a selection UI so player picks which tiles to use
                this.uiManager.showKongOptionsModal(data.tile, options, (chosenUsedTileIds) => {
                    // when player selects option, emit declareKong with chosen used tile ids
                    this.declareKongWithUsedTiles(data.tile.id, chosenUsedTileIds);
                });
            });
        } else {
            this.uiManager.hideKongButton();
        }
    }

    // helper that calls socketManager.declareKong with used tile ids
    declareKongWithUsedTiles(tileId, usedTileIds) {
        if (this.roomId && tileId) {
            console.log('GameManager: Declaring kong for tile', tileId, 'with', usedTileIds);
            this.socketManager.declareKong(this.roomId, tileId, usedTileIds);
        }
    }    

    // Handler invoked when server broadcasts 'pungDeclared'
    onPungDeclared(data) {
        console.log('GameManager: onPungDeclared', data);
        this.uiManager.addMeld(data.playerId, data.meld);
        
        // If the meld came from a discard (which Pung always does), remove it from the pile
        if (data.meld && data.meld.fromPlayer !== data.playerId) {
            this.uiManager.removeLastDiscardFromPile();
        }

        this.turnManager.updateTurnState(data.currentPlayer);

        if (data.playerId === this.playerId) {
            // Pung successful: Player must now discard a tile (no draw)
            this.uiManager.showMessage('gameMessage', `You punged! Please discard a tile.`, 'success');

            // Disable draw button (updateTurnState enables it by default if it's my turn)
            const drawBtn = document.getElementById('drawTileBtn');
            if (drawBtn) drawBtn.disabled = true;
            
            // Enable discarding immediately
            this.canDiscard = true;
            this.uiManager.makeTilesDiscardable(this.currentHand, (tileId) => this.discardTile(tileId));
        } else {
            const playerName = this.uiManager.getPlayerName(data.playerId);
            this.uiManager.showMessage('gameMessage', `${playerName} punged!`, 'info');
        }
    }

    // Handler invoked when server broadcasts 'kongDeclared'
    onKongDeclared(data) {
        console.log('GameManager: onKongDeclared', data);
        if (!data) return;

        // Add meld visually
        this.uiManager.addMeld(data.playerId, data.meld);

        // If the meld came from a discard (Ming Kong), remove it from the pile
        if (data.meld && data.meld.fromPlayer !== data.playerId) {
            this.uiManager.removeLastDiscardFromPile();
        }

        // If I'm the one who declared, server will send handUpdated and later kongDraw
        if (data.playerId === this.playerId) {
            this.uiManager.showMessage('gameMessage', 'You declared KONG! Awaiting replacement draw...', 'success');
            this.canDiscard = false; // Cannot discard until replacement draw
        } else {
            const playerName = this.uiManager.getPlayerName(data.playerId);
            this.uiManager.showMessage('gameMessage', `${playerName} declared KONG`, 'info');
        }

        // Update turn state if provided
        if (data.currentPlayer) {
            this.turnManager.updateTurnState(data.currentPlayer);
        }
    }

    // Handler for the special kongDraw event (server sends this after a kong)
    onKongDraw(data) {
        console.log('GameManager: onKongDraw', data);
        if (!data) return;

        // Update hand if present
        if (data.hand) {
            this.setCurrentHand(data.hand);
            this.uiManager.renderCurrentHand(this.currentHand);
        } else if (data.tile) {
            // if only tile provided, add it then render
            this.currentHand.push(data.tile);
            this.uiManager.renderCurrentHand(this.currentHand);
        }

        // Update dummy wall count if present
        if (typeof data.dummyWallCount !== 'undefined') {
            this.uiManager.updateDummyWallCount(data.dummyWallCount);
        }

        // Update bonus tiles if provided
        if (data.bonusTiles && Array.isArray(data.bonusTiles)) {
            this.uiManager.updateBonusTilesDisplay(this.playerId, data.bonusTiles || []);
        }

        // Show the special message for kong draw
        const tileName = data.tile ? data.tile.display : (data.message || 'a tile');
        this.uiManager.showMessage('gameMessage', `You konged — you drew ${tileName}. Please discard one tile.`, 'success');

        // Make tiles discardable so player can discard to finish their turn
        this.canDiscard = true;
        this.uiManager.makeTilesDiscardable(this.currentHand, (tileId) => this.discardTile(tileId));
    }

    // Handler for handUpdated event
    onHandUpdated(data) {
        this.setCurrentHand(data.hand);
        this.uiManager.renderCurrentHand(this.currentHand);

        // If it's my turn and I'm supposed to discard (e.g. after Pung), re-enable listeners
        if (this.turnManager.isMyTurn && this.canDiscard) {
            this.uiManager.makeTilesDiscardable(this.currentHand, (tileId) => this.discardTile(tileId));
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

        return matchingTiles.length >= 3; // need 3 exact matching tiles in hand plus the discarded tile to kong
    }

    // Check for Self Kong (An Gang) - 4 identical tiles in hand
    checkSelfKongOpportunity() {
        if (!this.turnManager.isMyTurn) return;
        
        const counts = {};
        this.currentHand.forEach(t => {
            if (t.isWild) return; // Strict kong usually no wilds
            const key = `${t.type}-${t.value}`;
            if (!counts[key]) counts[key] = [];
            counts[key].push(t);
        });

        for (const group of Object.values(counts)) {
            if (group.length === 4) {
                const tile = group[0];
                this.uiManager.showKongButton(tile, () => {
                    this.declareKong(tile.id);
                });
            }
        }
    }


    
    onError(data) {
        console.error('GameManager: Error received:', data);
        this.uiManager.showMessage('gameMessage', `Error: ${data.message}`, 'error');
    }
}

export default GameManager;