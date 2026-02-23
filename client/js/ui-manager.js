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
                    <p class="subtitle">正宗马来西亚三人麻将 - 84 Tiles Only</p>
                    
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

                    <div class="section">
                        <h2><i class="fas fa-list"></i> Available Rooms</h2>
                        <div id="roomList" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 5px; padding: 10px;">
                            <p style="color: #aaa; text-align: center;">Connecting to server...</p>
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
                    <div id="game-table">

                        <!-- Info Overlay -->
                        <div id="game-info">
                            <div>Room: <span id="gameRoomId">---</span></div>
                            <div>Wall: <span id="dummyWallCount">0</span> | Turn: <span id="currentTurn">---</span></div>
                            <button id="endGameBtn" class="btn btn-sm btn-danger" style="margin-top:4px;">Exit</button>
                        </div>

                        <!-- Center: Discards -->
                        <div id="center-area">
                            <div id="discardPile"></div>
                        </div>

                        <!-- Left Player -->
                        <div id="player-left">
                            <div id="hand-left" class="side-hand"></div>
                            <div id="melds-bonus-left" class="side-melds"></div>
                            <div id="name-left" class="player-name-label"></div>
                        </div>

                        <!-- Right Player -->
                        <div id="player-right">
                            <div id="hand-right" class="side-hand"></div>
                            <div id="melds-bonus-right" class="side-melds"></div>
                            <div id="name-right" class="player-name-label"></div>
                        </div>

                        <!-- Me (Bottom) -->
                        <div id="player-me">
                            <div id="melds-bonus-me"></div>
                            <div id="currentHand"></div>
                            <div id="player-bottom-bar">
                                <div id="player-me-info">
                                    <span id="playerNameDisplay">You</span> (<span id="seatWindDisplay">-</span>)
                                </div>
                                <div id="game-controls">
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
                            </div>
                        </div>

                        <!-- Game Message -->
                        <div id="gameMessage" class="message message-info">
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
    
    resetGameUI() {
        // Clear discard pile
        const discardPile = document.getElementById('discardPile');
        if (discardPile) discardPile.innerHTML = '';
        
        // Clear any open modals
        const modals = document.querySelectorAll('.kong-options-modal, .chi-options-modal, .wild-card-declaration, .win-modal');
        modals.forEach(el => el.remove());
        
        // Hide action buttons
        this.hidePungButton();
        this.hideChiButton();
        this.hideKongButton();
    }
    
    updateRoomList(rooms) {
        const list = document.getElementById('roomList');
        if (!list) return;
        
        if (!rooms || rooms.length === 0) {
            list.innerHTML = '<p style="color: #aaa; text-align: center;">No rooms available. Create one!</p>';
            return;
        }
        
        list.innerHTML = '';
        rooms.forEach(room => {
            const item = document.createElement('div');
            item.style.background = 'rgba(255,255,255,0.05)';
            item.style.padding = '10px';
            item.style.marginBottom = '8px';
            item.style.borderRadius = '5px';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            
            item.innerHTML = `
                <div>
                    <div style="font-weight: bold; color: #00adb5;">${room.id}</div>
                    <div style="font-size: 0.85em; color: #ccc;">Host: ${room.hostName} | Players: ${room.playerCount}/3</div>
                </div>
                <button class="btn btn-sm btn-primary join-room-btn">Join</button>
            `;
            
            const btn = item.querySelector('.join-room-btn');
            btn.onclick = () => {
                this.setInputValue('roomCode', room.id);
                this.gameManager.joinRoom();
            };
            
            list.appendChild(item);
        });
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
                this.setElementText('playerNameDisplay', `${this.gameManager.playerName} (East東)`);
                this.setElementText('opponent1Name', `${players[1].name} (South南)`);
                this.setElementText('opponent2Name', `${players[2].name} (West西)`);
                this.setElementText('seatWindDisplay', 'East東');
            } else if (ourIndex === 1) {
                this.setElementText('playerNameDisplay', `${this.gameManager.playerName} (South南)`);
                this.setElementText('opponent1Name', `${players[0].name} (East東)`);
                this.setElementText('opponent2Name', `${players[2].name} (West西)`);
                this.setElementText('seatWindDisplay', 'South南');
            } else {
                this.setElementText('playerNameDisplay', `${this.gameManager.playerName} (West西)`);
                this.setElementText('opponent1Name', `${players[0].name} (East東)`);
                this.setElementText('opponent2Name', `${players[1].name} (South南)`);
                this.setElementText('seatWindDisplay', 'West西');
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
        this.renderSideHand('hand-left', (leftPlayer.handCount !== undefined ? leftPlayer.handCount : 13), 'left');
        this.renderPlayerMeldsAndBonus(leftPlayer.id, 'left');

        // Update Right
        this.setElementText('name-right', `${rightPlayer.name} (${rightPlayer.seatWind})`);
        this.renderSideHand('hand-right', (rightPlayer.handCount !== undefined ? rightPlayer.handCount : 13), 'right');
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

        // Use smaller tiles for side players to prevent overflow
        const isSide = (position === 'left' || position === 'right');
        const scale = isSide ? 0.5 : 0.8;

        // Render Bonus Tiles first
        if (bonusTiles.length > 0) {

            const bonusDiv = this.tileRenderer.createBonusTileDisplay(bonusTiles, scale);
            bonusDiv.style.margin = '0';
            bonusDiv.style.flexWrap = 'nowrap';
            container.appendChild(bonusDiv);
        }

        // Render Melds
        melds.forEach(meld => {
            const meldDiv = document.createElement('div');
            meldDiv.className = 'meld-group';
            meldDiv.style.display = 'flex';
            meldDiv.style.gap = '0';
            meldDiv.style.marginLeft = isSide ? '0' : '10px';
            if (isSide) meldDiv.style.marginTop = '2px';

            meld.tiles.forEach(tile => {
                const el = this.tileRenderer.createTileElement(tile, false, scale);
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
            if (tile.isWild) tileElement.onclick = (e) => {
                e.stopPropagation(); // Prevent global event handler from discarding immediately
                this.handleWildCardClick(tile);
            };
            handContainer.appendChild(tileElement);
        });

        // Render drawn tile with gap
        if (drawnTile) {
            const spacer = document.createElement('div');
            spacer.style.width = '2vmin';
            handContainer.appendChild(spacer);

            const tileElement = this.tileRenderer.createTileElement(drawnTile, true);
            if (drawnTile.isWild) tileElement.onclick = (e) => {
                e.stopPropagation();
                this.handleWildCardClick(drawnTile);
            };
            handContainer.appendChild(tileElement);
        }
        
        // document.getElementById('playerTileCount').textContent = hand.length; // Removed as layout changed
    }
    

    handleWildCardClick(wildCard) {
        if (!this.gameManager) return;
        
        console.log('Wild card clicked:', wildCard.id);
        
        // Show declaration interface
        this.showWildCardDeclaration(wildCard, (wildCardId, tileType, tileValue) => {
            if (tileType === 'danfei') {
                console.log('Declaring Dan Fei for:', wildCardId);
                this.gameManager.declareDanFei(wildCardId);
            } else if (tileType === 'discard') {
                console.log('Discarding wild card:', wildCardId);
                this.gameManager.discardTile(wildCardId);
            } else {
                console.log('Declaring wild card as:', tileType, tileValue);
                if (this.gameManager.declareWildCard) {
                    this.gameManager.declareWildCard(wildCardId, tileType, tileValue);
                }
            }
        });
    }

    makeTilesDiscardable(hand, discardCallback) {
        // Only select tiles in the current hand, not discard pile or opponents
        const tiles = document.querySelectorAll('#currentHand .tile');
        tiles.forEach(tile => {
            // Skip wild cards, they have their own handler set in renderCurrentHand
            if (tile.dataset.type === 'wild') return;

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
        
        const tileElement = this.tileRenderer.createTileElement(tile, false, 0.7);
        tileElement.style.margin = '1px';
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

    showWinModal(data, onBackToRoom) {
        const existing = document.querySelector('.win-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'win-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0,0,0,0.85)';
        modal.style.zIndex = '3000';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.color = '#fff';

        const container = document.createElement('div');
        container.style.background = '#333';
        container.style.padding = '30px';
        container.style.borderRadius = '15px';
        container.style.textAlign = 'center';
        container.style.maxWidth = '90%';
        container.style.border = '2px solid #FFD700';

        const title = document.createElement('h1');
        title.textContent = `🏆 ${data.playerName} Wins!`;
        title.style.color = '#FFD700';
        title.style.marginBottom = '10px';
        container.appendChild(title);

        const info = document.createElement('p');
        info.textContent = `${data.message} (Fan: ${data.fan})`;
        info.style.fontSize = '1.2em';
        info.style.marginBottom = '20px';
        container.appendChild(info);

        // Main container for tiles (Green background)
        const tilesContainer = document.createElement('div');
        tilesContainer.style.display = 'flex';
        tilesContainer.style.flexDirection = 'column';
        tilesContainer.style.alignItems = 'center';
        tilesContainer.style.gap = '15px';
        tilesContainer.style.marginBottom = '30px';
        tilesContainer.style.padding = '20px';
        tilesContainer.style.background = '#2e7d32';
        tilesContainer.style.borderRadius = '10px';

        // --- Top Row: Bonus Tiles & Melds ---
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.flexWrap = 'wrap';
        topRow.style.justifyContent = 'center';
        topRow.style.gap = '20px';
        topRow.style.alignItems = 'center';

        // 1. Bonus Tiles
        if (data.bonusTiles && data.bonusTiles.length > 0) {
            const bonusDiv = this.tileRenderer.createBonusTileDisplay(data.bonusTiles, 0.85);
            bonusDiv.style.margin = '0';
            topRow.appendChild(bonusDiv);
        }

        // 2. Melds
        if (data.melds && data.melds.length > 0) {
            const meldsDiv = document.createElement('div');
            meldsDiv.style.display = 'flex';
            meldsDiv.style.gap = '10px';

            data.melds.forEach(meld => {
                const meldGroup = document.createElement('div');
                meldGroup.style.display = 'flex';
                meldGroup.style.gap = '0';

                meld.tiles.forEach(tile => {
                    const el = this.tileRenderer.createTileElement(tile, false, 0.85);
                    el.style.margin = '0';
                    meldGroup.appendChild(el);
                });
                meldsDiv.appendChild(meldGroup);
            });
            topRow.appendChild(meldsDiv);
        }

        if (topRow.children.length > 0) {
            tilesContainer.appendChild(topRow);
        }

        // --- Bottom Row: Hand Tiles ---
        const handRow = document.createElement('div');
        handRow.style.display = 'flex';
        handRow.style.flexWrap = 'wrap';
        handRow.style.justifyContent = 'center';
        
        if (data.hand && data.hand.length > 0) {
            data.hand.forEach(tile => {
                const el = this.tileRenderer.createTileElement(tile, true, 0.9);
                handRow.appendChild(el);
            });
        }
        tilesContainer.appendChild(handRow);

        container.appendChild(tilesContainer);

        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn-primary';
        backBtn.innerHTML = '<i class="fas fa-home"></i> Back to Room';
        backBtn.onclick = onBackToRoom;
        container.appendChild(backBtn);

        modal.appendChild(container);
        document.body.appendChild(modal);
    }

    removeWinModal() {
        const modal = document.querySelector('.win-modal');
        if (modal) modal.remove();
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