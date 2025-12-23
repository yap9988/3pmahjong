import TileRenderer from './tile-renderer.js';

class UIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.tileRenderer = new TileRenderer();
        
        // HTML templates
        this.templates = {
            lobby: `
                <div class="screen" id="lobby">
                    <h1><i class="fas fa-dice"></i> Malaysian 3-Player Mahjong</h1>
                    <p class="subtitle">正宗马来西亚三人麻将 - 68 Tiles Only</p>
                    
                    <div class="section">
                        <h2><i class="fas fa-plus-circle"></i> Create New Room</h2>
                        <div class="form-group">
                            <label for="playerName"><i class="fas fa-user"></i> Your Name</label>
                            <input type="text" id="playerName" placeholder="Enter your name">
                        </div>
                        <div class="btn-container">
                            <button id="createRoomBtn" class="btn btn-success">
                                <i class="fas fa-plus"></i> Create Room
                            </button>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2><i class="fas fa-sign-in-alt"></i> Join Existing Room</h2>
                        <div class="form-group">
                            <label for="joinPlayerName"><i class="fas fa-user"></i> Your Name</label>
                            <input type="text" id="joinPlayerName" placeholder="Enter your name">
                        </div>
                        <div class="form-group">
                            <label for="roomCode"><i class="fas fa-key"></i> Room Code</label>
                            <input type="text" id="roomCode" placeholder="Enter room code">
                        </div>
                        <div class="btn-container">
                            <button id="joinRoomBtn" class="btn btn-primary">
                                <i class="fas fa-sign-in-alt"></i> Join Room
                            </button>
                        </div>
                    </div>
                    
                    <div id="lobbyMessage" class="message message-info">
                        Enter your name and click Create Room or Join Room
                    </div>
                </div>
            `,
            
            room: `
                <div class="screen" id="room">
                    <h2><i class="fas fa-door-open"></i> Room: <span id="roomIdDisplay">---</span></h2>
                    <p style="text-align: center; color: #00adb5; margin-bottom: 20px;">
                        <i class="fas fa-users"></i> Players: <span id="playerCount">0</span>/3
                    </p>
                    
                    <div class="section">
                        <h3><i class="fas fa-user-friends"></i> Players in Room</h3>
                        <div id="playersList">
                            <!-- Players will appear here -->
                        </div>
                    </div>
                    
                    <div class="btn-container">
                        <button id="startGameBtn" class="btn btn-success hidden">
                            <i class="fas fa-play"></i> Start Game (3 Players)
                        </button>
                        <button id="leaveRoomBtn" class="btn btn-danger">
                            <i class="fas fa-sign-out-alt"></i> Leave Room
                        </button>
                    </div>
                    
                    <div id="roomMessage" class="message message-info">
                        Waiting for players to join...
                    </div>
                    
                    <div class="message message-info" style="margin-top: 20px;">
                        <p><strong>Share this code:</strong> <span id="shareRoomCode" style="color: #FF9800; font-size: 1.2em;">---</span></p>
                        <p style="font-size: 0.9em; margin-top: 10px;">Need exactly 3 players to start.</p>
                    </div>
                </div>
            `,
            
            game: `
                <div class="screen" id="game">
                    <h2><i class="fas fa-gamepad"></i> Game in Progress</h2>
                    
                    <div class="section">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <p><strong>Room:</strong> <span id="gameRoomId">---</span></p>
                                <p><strong>Your Wind:</strong> <span id="seatWindDisplay">East</span></p>
                            </div>
                            <div>
                                <p><strong>Dummy Wall:</strong> <span id="dummyWallCount">0</span> tiles</p>
                                <p><strong>Current Turn:</strong> <span id="currentTurn">---</span></p>
                            </div>
                        </div>
                        
                        <div class="btn-container">
                            <button id="endGameBtn" class="btn btn-danger">
                                <i class="fas fa-flag"></i> End Game
                            </button>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3><i class="fas fa-users"></i> Players</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 15px;">
                            <div>
                                <h4 id="opponent1Name">Player 1</h4>
                                <p>Tiles: <span id="opponent1Tiles">13</span></p>
                            </div>
                            <div>
                                <h4 id="playerNameDisplay">You</h4>
                                <p>Tiles: <span id="playerTileCount">13</span></p>
                            </div>
                            <div>
                                <h4 id="opponent2Name">Player 2</h4>
                                <p>Tiles: <span id="opponent2Tiles">13</span></p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3><i class="fas fa-trash-alt"></i> Discard Pile</h3>
                        <div id="discardPile" style="min-height: 80px; margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px;">
                            <!-- Discarded tiles appear here -->
                        </div>
                    </div>
                    
                    <div class="section" style="border: 2px solid #00adb5;">
                        <h3><i class="fas fa-hand-paper"></i> Your Hand</h3>
                        <div id="currentHand" style="min-height: 100px; margin: 15px 0; display: flex; flex-wrap: wrap; gap: 5px;">
                            <!-- Your tiles appear here -->
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="btn-container">
                            <button id="drawTileBtn" class="btn btn-primary">
                                <i class="fas fa-hand-paper"></i> Draw Tile
                            </button>
                            <button id="pungBtn" class="btn btn-warning hidden">
                                <i class="fas fa-layer-group"></i> Pung!
                            </button>
                            <button id="winBtn" class="btn btn-success">
                                <i class="fas fa-trophy"></i> Declare Win
                            </button>
                        </div>
                        
                        <div id="gameMessage" class="message message-info" style="margin-top: 20px;">
                            Game ready. Waiting for start...
                        </div>
                    </div>
                </div>
            `
        };
        
        this.initializeUI();
    }
    
    initializeUI() {
        const app = document.getElementById('app');
        if (!app) {
            console.error('UIManager: App element not found');
            return;
        }
        
        // Create all screens (they'll be hidden/shown as needed)
        app.innerHTML = this.templates.lobby + this.templates.room + this.templates.game;
        
        // Initially hide room and game screens
        this.hideElement('room');
        this.hideElement('game');
        
        console.log('UIManager: UI initialized');
    }
    
    // Screen management
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show requested screen
        const screen = document.getElementById(screenName);
        if (screen) {
            screen.classList.remove('hidden');
            console.log('UIManager: Showing screen:', screenName);
            window.scrollTo(0, 0);
        } else {
            console.error('UIManager: Screen not found:', screenName);
        }
    }
    
    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('hidden');
        }
    }
    
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('hidden');
        }
    }
    
    // Input management
    getInputValue(inputId) {
        const input = document.getElementById(inputId);
        return input ? input.value : '';
    }
    
    setInputValue(inputId, value) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = value;
        }
    }
    
    // Message display
    showMessage(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('UIManager: Message element not found:', elementId);
            return;
        }
        
        element.textContent = message;
        element.className = 'message';
        
        switch (type) {
            case 'error':
                element.classList.add('message-error');
                break;
            case 'success':
                element.classList.add('message-success');
                break;
            case 'warning':
                element.classList.add('message-warning');
                break;
            default:
                element.classList.add('message-info');
        }
    }
    
    // Room display
    updateRoomDisplay(data) {
        this.setElementText('roomIdDisplay', data.roomId);
        this.setElementText('shareRoomCode', data.roomId);
        this.setElementText('gameRoomId', data.roomId);
        this.updatePlayerList(data.players);
        this.setElementText('playerCount', data.players.length);
        
        if (this.gameManager.isHost && data.players.length === 3) {
            this.showStartGameButton();
        } else {
            this.hideElement('startGameBtn');
        }
    }
    
    updatePlayerList(players) {
        const playersList = document.getElementById('playersList');
        if (!playersList) return;
    
        playersList.innerHTML = '';
    
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
        
            let playerHtml = `<strong>${player.name}</strong>`;
        
            // ✅ FIX: Check if player is host
            // Method 1: Check isHost flag
            if (player.isHost) {
                playerHtml += ' <span class="host-badge">HOST</span>';
            } 
            // Method 2: Check if player ID matches room host ID
            else if (this.gameManager.roomHostId && player.id === this.gameManager.roomHostId) {
                playerHtml += ' <span class="host-badge">HOST</span>';
            }
        
            if (player.id === this.gameManager.playerId) {
                playerHtml += ' <span style="color: #4CAF50;">(You)</span>';
            }
        
            playerCard.innerHTML = playerHtml;
            playersList.appendChild(playerCard);
        });
    
        // Always update player count
        this.setElementText('playerCount', players.length);
    
        // Show/hide start button based on player count AND if we're host
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            if (this.gameManager.isHost && players.length === 3) {
                startBtn.classList.remove('hidden');
            } else {
                startBtn.classList.add('hidden');
            }
        }
    }
    
    showStartGameButton() {
        this.showElement('startGameBtn');
    }
    
    // Game display
    updateGameDisplay(data) {
        this.setElementText('dummyWallCount', data.dummyWallCount);
        
        const players = data.players || [];
        if (players.length >= 3) {
            // Find our position
            const ourIndex = players.findIndex(p => p.id === this.gameManager.playerId);
            
            if (ourIndex === 0) {
                this.setElementText('playerNameDisplay', `${this.gameManager.playerName} (East)`);
                this.setElementText('opponent1Name', `${players[1].name} (South)`);
                this.setElementText('opponent2Name', `${players[2].name} (West)`);
                this.setElementText('seatWindDisplay', 'East');
            } else if (ourIndex === 1) {
                this.setElementText('playerNameDisplay', `${this.gameManager.playerName} (South)`);
                this.setElementText('opponent1Name', `${players[0].name} (East)`);
                this.setElementText('opponent2Name', `${players[2].name} (West)`);
                this.setElementText('seatWindDisplay', 'South');
            } else {
                this.setElementText('playerNameDisplay', `${this.gameManager.playerName} (West)`);
                this.setElementText('opponent1Name', `${players[0].name} (East)`);
                this.setElementText('opponent2Name', `${players[1].name} (South)`);
                this.setElementText('seatWindDisplay', 'West');
            }
        }
    }
    
    updateDummyWallCount(count) {
        this.setElementText('dummyWallCount', count);
    }
    
    // Tile rendering
    renderCurrentHand(hand) {
        const handContainer = document.getElementById('currentHand');
        if (!handContainer) return;
        
        handContainer.innerHTML = '';
        
        if (!hand || hand.length === 0) {
            handContainer.innerHTML = '<p>No tiles in hand</p>';
            return;
        }
        
        hand.forEach(tile => {
            const tileElement = this.tileRenderer.createTileElement(tile);
            handContainer.appendChild(tileElement);
        });
        
        this.setElementText('playerTileCount', hand.length);
    }
    
    makeTilesDiscardable(hand, discardCallback) {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.onclick = () => {
                const tileId = tile.dataset.id;
                if (tileId) {
                    discardCallback(tileId);
                }
            };
        });
    }
    
    addToDiscardPile(tile) {
        const discardPile = document.getElementById('discardPile');
        if (!discardPile) return;
        
        const tileElement = this.tileRenderer.createTileElement(tile);
        discardPile.appendChild(tileElement);
        
        if (discardPile.children.length > 20) {
            discardPile.removeChild(discardPile.firstChild);
        }
    }
    
    showPungButton(tile, pungCallback) {
        const pungBtn = document.getElementById('pungBtn');
        if (!pungBtn) return;
        
        pungBtn.classList.remove('hidden');
        pungBtn.disabled = false;
        pungBtn.innerHTML = `<i class="fas fa-layer-group"></i> Pung ${tile.display || tile.value}!`;
        pungBtn.onclick = () => {
            pungCallback();
            this.hidePungButton();
        };
        
        this.showMessage('gameMessage', `You can PUNG ${tile.display || tile.value}! Click within 5 seconds.`, 'success');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hidePungButton();
            this.showMessage('gameMessage', 'Pung opportunity passed.', 'info');
        }, 5000);
    }
    
    hidePungButton() {
        const pungBtn = document.getElementById('pungBtn');
        if (pungBtn) {
            pungBtn.classList.add('hidden');
            pungBtn.disabled = true;
            pungBtn.innerHTML = `<i class="fas fa-layer-group"></i> Pung`;
        }
    }
    
    // Helper methods
    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }
    
    getPlayerName(playerId) {
        if (playerId === this.gameManager.playerId) return 'You';
        
        const player = this.gameManager.players.find(p => p.id === playerId);
        return player ? player.name : `Player ${playerId?.substring(0, 4)}`;
    }
}

export default UIManager;