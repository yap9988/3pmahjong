class SocketManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.socket = null;
    }
    
    connect() {
        console.log('SocketManager: Connecting to server...');
        
        try {
            this.socket = io();
            this.setupEventListeners();
            console.log('SocketManager: Socket connected');
        } catch (error) {
            console.error('SocketManager: Connection failed:', error);
            this.gameManager.uiManager.showMessage('lobbyMessage', 'Failed to connect to server', 'error');
        }
    }
    
    setupEventListeners() {
        if (!this.socket) return;
        
        this.socket.on('connect', () => {
            console.log('SocketManager: Connected to server with ID:', this.socket.id);
            this.gameManager.uiManager.showMessage('lobbyMessage', 'Connected to game server!', 'success');
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('SocketManager: Connection error:', error);
            this.gameManager.uiManager.showMessage('lobbyMessage', 'Failed to connect to server. Is the server running?', 'error');
        });
        
        // Room events
        this.socket.on('roomCreated', (data) => {
            this.gameManager.onRoomCreated(data);
        });
        
        this.socket.on('joinedRoom', (data) => {
            this.gameManager.onJoinedRoom(data);
        });
        
        this.socket.on('playerJoined', (data) => {
            this.gameManager.setPlayers(data.players);
            this.gameManager.uiManager.updatePlayerList(data.players);
            
            if (this.gameManager.isHost && data.players.length === 3) {
                this.gameManager.uiManager.showStartGameButton();
            }
        });



        this.socket.on('playerListUpdated', (data) => {
            console.log('SocketManager: Player list updated:', data.players.length, 'players');
    
            // Update game manager with new player list
            this.gameManager.setPlayers(data.players);
    
            // Update UI
            this.gameManager.uiManager.updatePlayerList(data.players);
            this.gameManager.uiManager.setElementText('playerCount', data.playerCount);
    
            // Check if host can start game
            if (this.gameManager.isHost && data.playerCount === 3) {
                this.gameManager.uiManager.showStartGameButton();
                this.gameManager.uiManager.showMessage('roomMessage', 'Room full! Click Start Game.', 'success');
            } else if (this.gameManager.isHost) {
                this.gameManager.uiManager.showMessage('roomMessage', `Waiting for ${3 - data.playerCount} more players...`, 'info');
            }
        });

        
        this.socket.on('playerLeft', (data) => {
            this.gameManager.setPlayers(data.players);
            this.gameManager.uiManager.updatePlayerList(data.players);
            this.gameManager.uiManager.showMessage('roomMessage', `${data.playerName || 'A player'} left the room`, 'warning');
        });
        
        // Game events
        this.socket.on('gameStarted', (data) => {
            console.log('=== DEBUG gameStarted data ===');
            console.log('Data received:', data);
            console.log('Room ID:', data.roomId);
            console.log('My Player ID:', this.gameManager.playerId);
            console.log('My hand in data:', data.hands ? data.hands[this.gameManager.playerId] : 'No hands');
            console.log('Current player:', data.currentPlayer);
            console.log('Players:', data.players);
            console.log('===========================');

            // Check if data has expected structure
            if (!data.hands || !data.hands[this.gameManager.playerId]) {
                console.error('❌ ERROR: No hand data for me in gameStarted event!');
                console.error('Available player IDs in hands:', Object.keys(data.hands || {}));
            }

            this.gameManager.onGameStarted(data);
        });
        
        this.socket.on('tileDrawn', (data) => {
            this.gameManager.onTileDrawn(data);
        });
        
        this.socket.on('playerDrewTile', (data) => {
            this.gameManager.uiManager.updateDummyWallCount(data.dummyWallCount);
            this.gameManager.uiManager.showMessage('gameMessage', 'Another player drew a tile...', 'info');
        });
        
        this.socket.on('tileDiscarded', (data) => {
            this.gameManager.onTileDiscarded(data);
        });
        
        this.socket.on('pungDeclared', (data) => {
            this.gameManager.turnManager.updateTurnState(data.currentPlayer);
            if (data.playerId === this.gameManager.playerId) {
                this.gameManager.uiManager.showMessage('gameMessage', `You punged! +${data.fan || 0} fan`, 'success');
            } else {
                const playerName = this.gameManager.uiManager.getPlayerName(data.playerId);
                this.gameManager.uiManager.showMessage('gameMessage', `${playerName} punged! +${data.fan || 0} fan`, 'info');
            }
        });

        this.socket.on('kongDeclared', (data) => {
            console.log('SocketManager: kongDeclared', data);
            try {
                // Let the GameManager handle UI updates for melds, turn, etc.
                if (this.gameManager && typeof this.gameManager.onKongDeclared === 'function') {
                    this.gameManager.onKongDeclared(data);
                } else {
                    console.warn('No gameManager.onKongDeclared handler registered');
                }
            } catch (e) {
                console.error('Error processing kongDeclared:', e);
            }
        });        


        this.socket.on('handUpdated', (data) => {
            this.gameManager.setCurrentHand(data.hand);
            this.gameManager.uiManager.renderCurrentHand(data.hand);
        });
        
        this.socket.on('error', (data) => {
            this.gameManager.onError(data);
        });



        this.socket.on('bonusTilesUpdated', (data) => {
            console.log('SocketManager: bonusTilesUpdated', data);
            if (!data) return;

            // data: { playerId, bonusTiles }
            // Update UI for that player's bonus tiles
            try {
                this.gameManager.uiManager.updateBonusTilesDisplay(data.playerId, data.bonusTiles || []);
            } catch (err) {
                console.error('Error handling bonusTilesUpdated:', err);
            }
        });

    }
    
    // Emit methods
    createRoom(playerName) {
        this.socket.emit('createRoom', { playerName });
    }
    
    joinRoom(roomId, playerName) {
        this.socket.emit('joinRoom', { roomId, playerName });
    }
    
    startGame(roomId) {
        this.socket.emit('startGame', roomId);
    }
    
    drawTile(roomId) {
        this.socket.emit('drawTile', roomId);
    }
    
    discardTile(roomId, tileId) {
        this.socket.emit('discardTile', { roomId, tileId });
    }
    
    declarePung(roomId, tileId) {
        this.socket.emit('declarePung', { roomId, tileId });
    }

    declareKong(roomId, tileId) {
        if (!this.socket) return;
        this.socket.emit('declareKong', roomId, tileId, (response) => {
            // optional ack handling if server sends callback; your server currently responds via events
            if (response && response.error) {
                this.gameManager.uiManager.showMessage('gameMessage', response.error, 'error');
            } else {
                console.log('declareKong ack:', response);
            }
        });
    }
    
    declareWin(roomId) {
        this.socket.emit('declareWin', roomId);
    }
    
    getRoomState(roomId) {
        this.socket.emit('getRoomState', roomId);
    }
}

export default SocketManager;