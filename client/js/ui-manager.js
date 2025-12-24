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
                    <div id="game-table" style="position: relative; width: 100%; height: 90vh; background: #2e7d32; overflow: hidden; border-radius: 8px;">
                        
                        <!-- Info Overlay -->
                        <div style="position: absolute; top: 10px; left: 10px; color: white; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px; z-index: 10;">
                            <div>Room: <span id="gameRoomId">---</span></div>
                            <div>Wall: <span id="dummyWallCount">0</span> | Turn: <span id="currentTurn">---</span></div>
                            <button id="endGameBtn" class="btn btn-sm btn-danger" style="margin-top:5px;">Exit</button>
                        </div>

                        <!-- Center: Discards -->
                        <div id="center-area" style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); width: 400px; height: 300px; display: flex; justify-content: center; align-items: center;">
                            <div id="discardPile" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 2px; max-width: 360px;"></div>
                        </div>

                        <!-- Left Player (Previous/Upper) -->
                        <div id="player-left" style="position: absolute; left: 20px; top: 40%; transform: translateY(-50%); display: flex; flex-direction: row; align-items: center;">
                            <!-- Hand (Vertical/Hidden) -->
                            <div id="hand-left" class="side-hand" style="display: flex; flex-direction: column; gap: -10px;"></div>
                            <!-- Melds/Bonus (Rotated 90deg) -->
                            <div id="melds-bonus-left" style="display: flex; flex-direction: column; gap: 5px; margin-left: 20px; transform: rotate(90deg);"></div>
                            <div id="name-left" style="position: absolute; top: -40px; left: 0; color: white; font-weight: bold; width: 150px;"></div>
                        </div>

                        <!-- Right Player (Next/Lower) -->
                        <div id="player-right" style="position: absolute; right: 20px; top: 40%; transform: translateY(-50%); display: flex; flex-direction: row-reverse; align-items: center;">
                            <!-- Hand (Vertical/Hidden) -->
                            <div id="hand-right" class="side-hand" style="display: flex; flex-direction: column; gap: -10px;"></div>
                            <!-- Melds/Bonus (Rotated -90deg) -->
                            <div id="melds-bonus-right" style="display: flex; flex-direction: column; gap: 5px; margin-right: 20px; transform: rotate(-90deg);"></div>
                            <div id="name-right" style="position: absolute; top: -40px; right: 0; color: white; font-weight: bold; width: 150px; text-align: right;"></div>
                        </div>

                        <!-- Me (Bottom) -->
                        <div id="player-me" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); width: 90%; display: flex; flex-direction: column; align-items: center;">
                            <!-- Melds/Bonus -->
                            <div id="melds-bonus-me" style="display: flex; gap: 10px; margin-bottom: 15px;"></div>
                            
                            <!-- Hand -->
                            <div id="currentHand" style="display: flex; justify-content: center; align-items: flex-end; height: 80px;">
                                <!-- Tiles injected here -->
                            </div>
                            
                            <div style="color: white; margin-top: 5px; font-weight: bold;">
                                <span id="playerNameDisplay">You</span> (<span id="seatWindDisplay">-</span>)
                            </div>
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
                            <button id="chiBtn" class="btn btn-info hidden">
                                <i class="fas fa-stream"></i> Chi!
                            </button>
                            <button id="kongBtn" class="btn btn-secondary hidden">
                                <i class="fas fa-layer-group"></i> Kong!
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

        // Update bonus tiles display FOR ALL PLAYERS
        // Create / update a container that lists each player's bonus tiles with a label.
        if (data.bonusTiles && players && players.length > 0) {
            // Ensure parent container exists
            let parent = document.getElementById('bonusTilesDisplay');
            if (!parent) {
                const gameScreen = document.getElementById('game');
                if (gameScreen) {
                    parent = document.createElement('div');
                    parent.id = 'bonusTilesDisplay';
                    parent.style.margin = '10px 0';
                    parent.style.padding = '10px';
                    parent.style.background = 'rgba(255, 255, 255, 0.03)';
                    parent.style.borderRadius = '8px';
                    parent.innerHTML = '<h4>Bonus Tiles (by player)</h4>';
                    gameScreen.insertBefore(parent, gameScreen.querySelector('.section:last-child'));
                }
            }

            // Clear existing per-player displays but keep title
            if (parent) {
                const title = parent.querySelector('h4') || document.createElement('h4');
                title.textContent = 'Bonus Tiles (by player)';
                parent.innerHTML = '';
                parent.appendChild(title);

                // For each player, render their bonus tiles
                players.forEach(p => {
                    const bonusForPlayer = (data.bonusTiles && data.bonusTiles[p.id]) ? data.bonusTiles[p.id] : [];
                    const playerDiv = document.createElement('div');
                    playerDiv.id = `bonus-${p.id}`;
                    playerDiv.style.marginTop = '8px';
                    playerDiv.style.padding = '6px';
                    playerDiv.style.borderTop = '1px solid rgba(255,255,255,0.04)';
                    playerDiv.style.display = 'flex';
                    playerDiv.style.alignItems = 'center';
                    playerDiv.style.gap = '12px';

                    const nameSpan = document.createElement('div');
                    nameSpan.style.minWidth = '160px';
                    nameSpan.style.fontWeight = '600';
                    nameSpan.style.color = '#fff';
                    // use full name, and show (You) if it's the local player
                    const displayName = (p.id === this.gameManager.playerId) ? `${p.name} (You)` : p.name;
                    nameSpan.textContent = `${displayName} — ${p.seatWind || ''}`;

                    // render bonus tiles
                    const bonusDisplay = this.tileRenderer.createBonusTileDisplay(bonusForPlayer);
                    bonusDisplay.style.display = 'flex';
                    bonusDisplay.style.flexWrap = 'wrap';
                    bonusDisplay.style.gap = '6px';

                    playerDiv.appendChild(nameSpan);
                    playerDiv.appendChild(bonusDisplay);

                    parent.appendChild(playerDiv);
                });
            }
        }

        // Update dummy wall count
        this.updateDummyWallCount(data.dummyWallCount);
    }

    // Update game display (show players + bonus tiles for all players)
    updateGameDisplay(data) {
        this.setElementText('dummyWallCount', data.dummyWallCount);
        
        const players = this.gameManager.players || [];
        if (players.length < 3) return;

        const myId = this.gameManager.playerId;
        const myIndex = players.findIndex(p => p.id === myId);
        if (myIndex === -1) return;

        // Calculate relative positions
        // Right = Next Player (Counter-Clockwise)
        const rightIndex = (myIndex + 1) % 3;
        // Left = Previous Player
        const leftIndex = (myIndex - 1 + 3) % 3;

        const me = players[myIndex];
        const rightPlayer = players[rightIndex];
        const leftPlayer = players[leftIndex];

        // Update Me
        this.setElementText('playerNameDisplay', me.name);
        this.setElementText('seatWindDisplay', me.seatWind);
        this.renderPlayerMeldsAndBonus(me.id, 'me');

        // Update Left
        this.setElementText('name-left', `${leftPlayer.name} (${leftPlayer.seatWind})`);
        this.renderSideHand('hand-left', leftPlayer.handCount || 13, 'left');
        this.renderPlayerMeldsAndBonus(leftPlayer.id, 'left');

        // Update Right
        this.setElementText('name-right', `${rightPlayer.name} (${rightPlayer.seatWind})`);
        this.renderSideHand('hand-right', rightPlayer.handCount || 13, 'right');
        this.renderPlayerMeldsAndBonus(rightPlayer.id, 'right');

        // Update dummy wall count
        this.updateDummyWallCount(data.dummyWallCount);
    }

    // Render side player's hand (backs of tiles)
    renderSideHand(elementId, count, side) {
        const container = document.getElementById(elementId);
        if (!container) return;
        container.innerHTML = '';
        
        // Create stack of tile backs
        const handDiv = this.tileRenderer.createSideHandCount(count, side);
        container.appendChild(handDiv);
    }

    // Render combined Melds and Bonus Tiles for a player
    renderPlayerMeldsAndBonus(playerId, position = null) {
        // If position not passed, determine it
        if (!position) {
            const players = this.gameManager.players;
            const myIndex = players.findIndex(p => p.id === this.gameManager.playerId);
            const pIndex = players.findIndex(p => p.id === playerId);
            if (pIndex === myIndex) position = 'me';
            else if (pIndex === (myIndex + 1) % 3) position = 'right';
            else position = 'left';
        }

        const containerId = `melds-bonus-${position}`;
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        const player = this.gameManager.players.find(p => p.id === playerId);
        const bonusTiles = this.gameManager.bonusTiles[playerId] || [];
        const melds = player ? (player.melds || []) : [];

        // Render Bonus Tiles first
        if (bonusTiles.length > 0) {
            const bonusDiv = this.tileRenderer.createBonusTileDisplay(bonusTiles);
            // Remove default margins for tight fit
            bonusDiv.style.margin = '0';
            container.appendChild(bonusDiv);
        }

        // Render Melds
        melds.forEach(meld => {
            const meldDiv = document.createElement('div');
            meldDiv.className = 'meld-group';
            meldDiv.style.display = 'flex';
            meldDiv.style.gap = '0'; // stick together
            meldDiv.style.marginLeft = '10px'; // separate melds slightly

            meld.tiles.forEach(tile => {
                const el = this.tileRenderer.createTileElement(tile);
                el.style.margin = '0';
                meldDiv.appendChild(el);
            });
            container.appendChild(meldDiv);
        });
    }

    // Add to UIManager class:
    showWildCardDeclaration(wildCard, onDeclareCallback) {
        console.log('UIManager: Showing wild card declaration for', wildCard.id);
        
        // Remove any existing declaration interface
        const existing = document.querySelector('.wild-card-declaration');
        if (existing) existing.remove();
        
        // Create new declaration interface
        const declarationUI = this.tileRenderer.createWildCardDeclarationInterface(
            wildCard,
            (tileType, tileValue) => {
                console.log('Wild card declared as:', tileType, tileValue);
                onDeclareCallback(wildCard.id, tileType, tileValue);
                declarationUI.remove();
            }
        );
        
        document.body.appendChild(declarationUI);
    }

    // Update a single player's bonus tiles
    updateBonusTilesDisplay(playerId, bonusTiles) {
        // Delegated to renderPlayerMeldsAndBonus via GameManager state update
        this.renderPlayerMeldsAndBonus(playerId);
    }

    // Add meld to UI; render meld tiles using the same compact tile renderer used for bonus tiles
    addMeld(playerId, meld) {
        // Delegated to renderPlayerMeldsAndBonus via GameManager state update
        this.renderPlayerMeldsAndBonus(playerId);
    }
    updateDummyWallCount(count) {
        this.setElementText('dummyWallCount', count);
    }
    
    // Tile rendering
    // Update the renderCurrentHand method to handle wild card clicks
    renderCurrentHand(hand) {
        const handContainer = document.getElementById('currentHand');
        if (!handContainer) return;
        
        handContainer.innerHTML = '';
        
        if (!hand || hand.length === 0) {
            handContainer.innerHTML = '<p>No tiles in hand</p>';
            return;
        }

        // Separate the last drawn tile if it exists
        let tilesToRender = [...hand];
        let drawnTile = null;

        if (this.gameManager.lastDrawnTileId) {
            const idx = tilesToRender.findIndex(t => t.id === this.gameManager.lastDrawnTileId);
            if (idx !== -1) {
                drawnTile = tilesToRender.splice(idx, 1)[0];
            }
        }

        // Render sorted hand
        tilesToRender.forEach(tile => {
            const tileElement = this.tileRenderer.createTileElement(tile, true);
            if (tile.isWild) tileElement.onclick = () => this.handleWildCardClick(tile);
            handContainer.appendChild(tileElement);
        });

        // Render drawn tile with gap
        if (drawnTile) {
            const spacer = document.createElement('div');
            spacer.style.width = '15px'; // Gap
            handContainer.appendChild(spacer);

            const tileElement = this.tileRenderer.createTileElement(drawnTile, true);
            if (drawnTile.isWild) tileElement.onclick = () => this.handleWildCardClick(drawnTile);
            handContainer.appendChild(tileElement);
        }
        
        // document.getElementById('playerTileCount').textContent = hand.length; // Removed as layout changed
    }
    

    handleWildCardClick(wildCard) {
        if (!this.gameManager) return;
        
        console.log('Wild card clicked:', wildCard.id);
        
        // Show declaration interface
        this.showWildCardDeclaration(wildCard, (wildCardId, tileType, tileValue) => {
            console.log('Declaring wild card as:', tileType, tileValue);
            
            // Send declaration to server
            this.gameManager.declareWildCard(wildCardId, tileType, tileValue);
        });
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
        tileElement.style.margin = '1px'; // Tighter discard pile
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
        
        this.showMessage('gameMessage', `You can PUNG ${tile.display || tile.value}!`, 'success');
    }

    showChiButton(tile, options, chiCallback) {
        const chiBtn = document.getElementById('chiBtn');
        if (!chiBtn) return;

        chiBtn.classList.remove('hidden');
        chiBtn.disabled = false;
        chiBtn.innerHTML = `<i class="fas fa-stream"></i> Chi ${tile.display || tile.value}`;
        
        chiBtn.onclick = () => {
            if (options.length === 1) {
                chiCallback(options[0].tiles);
            } else {
                this.showChiOptionsModal(tile, options, chiCallback);
            }
            this.hideChiButton();
        };
    }

    showKongButton(tile, kongCallback) {
        const kongBtn = document.getElementById('kongBtn');
        if (!kongBtn) return;

        // Cancel any previous auto-hide
        this._clearOpportunityTimeout();

        kongBtn.classList.remove('hidden');
        kongBtn.disabled = false;
        kongBtn.innerHTML = `<i class="fas fa-layer-group"></i> Kong ${tile.display || tile.value}!`;
        kongBtn.onclick = () => {
            kongCallback();
            this.hideKongButton();
            this._clearOpportunityTimeout();
        };

        this.showMessage('gameMessage', `You can KONG ${tile.display || tile.value}!`, 'success');
    }
    
    hidePungButton() {
        const pungBtn = document.getElementById('pungBtn');
        if (pungBtn) {
            pungBtn.classList.add('hidden');
            pungBtn.disabled = true;
            pungBtn.innerHTML = `<i class="fas fa-layer-group"></i> Pung`;
        }
    }

    hideChiButton() {
        const chiBtn = document.getElementById('chiBtn');
        if (chiBtn) {
            chiBtn.classList.add('hidden');
            chiBtn.disabled = true;
            chiBtn.innerHTML = `<i class="fas fa-stream"></i> Chi`;
        }
    }


    hideKongButton() {
        const kongBtn = document.getElementById('kongBtn');
        if (kongBtn) {
            kongBtn.classList.add('hidden');
            kongBtn.disabled = true;
            kongBtn.innerHTML = `<i class="fas fa-layer-group"></i> Kong!`;
        }
        this._clearOpportunityTimeout();
    }

    // Remove the last tile from the discard pile (used when a player takes a discard for Pung/Kong)
    removeLastDiscardFromPile() {
        const discardPile = document.getElementById('discardPile');
        if (discardPile && discardPile.lastElementChild) {
            discardPile.removeChild(discardPile.lastElementChild);
        }
    }

    // Render a modal of choices for kong combinations. options = [{ usedTileIds, label }]
    showKongOptionsModal(discardedTile, options, onSelect) {
        // remove existing modal
        const existing = document.querySelector('.kong-options-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'kong-options-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.background = 'rgba(0,0,0,0.95)';
        modal.style.padding = '18px';
        modal.style.borderRadius = '12px';
        modal.style.zIndex = '2000';
        modal.style.minWidth = '320px';
        modal.style.color = '#fff';

        const title = document.createElement('h3');
        title.textContent = `Kong options for ${discardedTile.display || discardedTile.value}`;
        title.style.marginBottom = '12px';
        modal.appendChild(title);

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.textContent = opt.label + ` (use ${opt.usedTileIds.length} tile(s))`;
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.margin = '6px 0';
            btn.style.padding = '8px';
            btn.style.borderRadius = '6px';
            btn.style.cursor = 'pointer';
            btn.onclick = () => {
                onSelect(opt.usedTileIds);
                modal.remove();
            };
            modal.appendChild(btn);
        });

        // fallback option: use all available (emit without usedTileIds)
        const fallback = document.createElement('button');
        fallback.textContent = 'Auto-select (server chooses)';
        fallback.style.display = 'block';
        fallback.style.width = '100%';
        fallback.style.margin = '6px 0';
        fallback.style.padding = '8px';
        fallback.style.borderRadius = '6px';
        fallback.style.cursor = 'pointer';
        fallback.onclick = () => {
            onSelect(null);
            modal.remove();
        };
        modal.appendChild(fallback);

        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';
        cancel.style.display = 'block';
        cancel.style.width = '100%';
        cancel.style.margin = '6px 0';
        cancel.style.padding = '8px';
        cancel.style.borderRadius = '6px';
        cancel.style.cursor = 'pointer';
        cancel.onclick = () => modal.remove();
        modal.appendChild(cancel);

        document.body.appendChild(modal);
    }

    showChiOptionsModal(tile, options, onSelect) {
        const existing = document.querySelector('.chi-options-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'chi-options-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.background = 'rgba(0,0,0,0.95)';
        modal.style.padding = '18px';
        modal.style.borderRadius = '12px';
        modal.style.zIndex = '2000';
        modal.style.minWidth = '300px';
        modal.style.color = '#fff';

        const title = document.createElement('h3');
        title.textContent = `Chi options for ${tile.display}`;
        modal.appendChild(title);

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.textContent = `Use ${opt.label}`;
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.margin = '8px 0';
            btn.style.padding = '10px';
            btn.onclick = () => {
                onSelect(opt.tiles);
                modal.remove();
            };
            modal.appendChild(btn);
        });

        document.body.appendChild(modal);
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



    // Track opportunity timeout to allow clearing it
    _clearOpportunityTimeout() {
        if (this._oppTimeout) {
            clearTimeout(this._oppTimeout);
            this._oppTimeout = null;
        }
    }









}

export default UIManager;