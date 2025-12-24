const TileManager = require('./tile-manager');
const TurnManager = require('./turn-manager');
const FanCalculator = require('./fan-calculator');
const HandChecker = require('./hand-checker');
const WallManager = require('./wall-manager');

class MalaysiaMahjong3P {
    constructor() {
        this.tileManager = new TileManager();
        this.turnManager = new TurnManager();
        this.fanCalculator = new FanCalculator();
        this.handChecker = new HandChecker();
        this.wallManager = new WallManager();
        
        this.gameState = 'waiting';
        this.gameStarted = false;
        this.wildCardDeclarations = new Map(); // Track wild card usage

        // When true, this indicates the very first play of the round (East already has 14 tiles
        // and should DISCARD rather than DRAW). Cleared after East's first discard.
        this.firstTurn = false;
    }
    
    initializeGame(playerList) {
        console.log('Game: Initializing with', playerList.length, 'players');
        
        // 1. Initialize players and turns
        this.turnManager.initializePlayers(playerList);
        
        // 2. Generate and shuffle tiles
        const allTiles = this.tileManager.generateTileSet();
        const shuffledTiles = this.tileManager.shuffleTiles(allTiles);
        
        // 3. Setup walls and deal (Malaysian 3P: 4-4-4-1 pattern)
        const { playerTiles, dummyWall } = this.tileManager.setupMalaysian3PWalls(shuffledTiles);


        // IMPORTANT: initialize the dummy wall BEFORE replacing bonus tiles so replacements
        // can be drawn from the back of the wall.
        this.wallManager.initializeDummyWall(dummyWall);
        
        // 4. Assign hands to players and sort
        playerTiles.forEach((tiles, index) => {
            const player = this.turnManager.players[index];
            player.hand = this.tileManager.sortHand(tiles);
            console.log(`Game: Player ${player.name} got ${player.hand.length} tiles`);
            
            // Check for bonus tiles that need immediate replacement
            this.replaceBonusTiles(player);
        });


        
        // 5. Initialize dummy wall
        //this.wallManager.initializeDummyWall(dummyWall);
        
        // 6. Set game state
        this.gameState = 'playing';
        this.gameStarted = true;

        // Set firstTurn true so server enforces East to discard first (East already has 14)
        this.firstTurn = true;
        
        console.log('Game: Initialization complete');
        
        return this.getGameState();
    }
    
    // Replace bonus tiles immediately after dealing
    replaceBonusTiles(player) {
        const bonusTiles = player.hand.filter(tile => tile.isBonus);

        if (!player.bonusTiles) player.bonusTiles = [];
        
        bonusTiles.forEach(bonusTile => {
            // Remove bonus tile from hand and record it for the player
            const index = player.hand.findIndex(t => t.id === bonusTile.id);
            if (index !== -1) {
                player.hand.splice(index, 1);
                player.bonusTiles.push(bonusTile);
                
                // Draw replacement(s) from dummy wall: drawFromDummyWall now returns
                // { tile, poppedBonuses } where poppedBonuses are additional bonus tiles
                // popped from the back during the search for a non-bonus tile.
                if (this.wallManager.getDummyWallCount() > 0) {
                    const { tile: replacement, poppedBonuses } = this.wallManager.drawFromBack();
                    // Assign any popped bonuses to the same player (they belong to them)
                    if (poppedBonuses && poppedBonuses.length > 0) {
                        if (!player.bonusTiles) player.bonusTiles = [];
                        player.bonusTiles.push(...poppedBonuses);
                        console.log(`Game: ${player.name} received extra bonus tiles from back: ${poppedBonuses.map(t => t.display).join(', ')}`);
                    }
                    if (replacement) {
                        player.hand.push(replacement);
                        console.log(`Game: Replaced bonus ${bonusTile.display} with ${replacement.display} for ${player.name}`);
                    } else {
                        console.warn('Game: No non-bonus replacement available for', player.name);
                    }
                } else {
                    console.warn('Game: Dummy wall empty while replacing bonus tile');
                }
            }
        });
        
        // Re-sort hand after replacements
        player.hand = this.tileManager.sortHand(player.hand);
    }


    
    getGameState() {
        const currentPlayer = this.turnManager.getCurrentPlayer();
        
        // Get hands for all players
        const hands = {};
        const bonusTiles = {};
        
 
                
        this.turnManager.players.forEach(player => {
            if (player && player.id) {
                const handCopy = (player.hand || []).map(tile => {
                    if (tile.isWild) {
                        const key = `${player.id}-${tile.id}`;
                        if (this.wildCardDeclarations && this.wildCardDeclarations.has(key)) {
                            const decl = this.wildCardDeclarations.get(key);
                            return Object.assign({}, tile, { declaredAs: decl.declaredAs });
                        }
                    }
                    return Object.assign({}, tile);
                });

                hands[player.id] = handCopy;
                bonusTiles[player.id] = (player.bonusTiles || []).slice();
            }
        });


        // Build game state object
        const gameState = {
            gameState: this.gameState,
            currentPlayer: currentPlayer ? currentPlayer.id : null,
            currentPlayerName: currentPlayer ? currentPlayer.name : 'Unknown',
            currentPlayerWind: currentPlayer ? currentPlayer.seatWind : 'East',
            players: this.turnManager.getAllPlayers() || [],
            dummyWallCount: this.wallManager.getDummyWallCount(),
            discardCount: this.wallManager.getDiscardCount(),
            windRound: this.turnManager.windRound || 'East',
            playerWinds: this.turnManager.playerWinds || {},
            hands: hands,
            bonusTiles: bonusTiles,
            lastDiscard: this.wallManager.lastDiscard,
            wildCardDeclarations: Object.fromEntries(this.wildCardDeclarations),
            // flag telling clients whether it's the special first-turn (East discards)
            firstTurn: !!this.firstTurn
        };
        
        return gameState;
    }
    
    drawTile(playerId, fromBack = false) {
        console.log('Game: Player', playerId, 'attempting to draw');
        
        // Check if it's player's turn
        if (!this.turnManager.isValidTurn(playerId)) {
            const currentPlayer = this.turnManager.getCurrentPlayer();
            return { 
                error: 'Not your turn!',
                currentPlayer: currentPlayer.id,
                currentPlayerName: currentPlayer.name
            };
        }

        // Prevent East from drawing on firstTurn (East already has 14; must discard)
        const currentPlayer = this.turnManager.getCurrentPlayer();
        if (this.firstTurn && currentPlayer && currentPlayer.id === playerId) {
            return { error: 'First turn: dealer already has 14 tiles and must discard first' };
        }
        
        try {
            // Draw from dummy wall: get replacement tile and any popped bonuses
            const drawResult = fromBack ? this.wallManager.drawFromBack() : this.wallManager.drawFromFront();
            const tile = drawResult.tile;
            const poppedBonuses = drawResult.poppedBonuses || [];
            const player = this.turnManager.getPlayerById(playerId);

            // If any popped bonuses were found, assign them to the player
            if (poppedBonuses.length > 0) {
                if (!player.bonusTiles) player.bonusTiles = [];
                player.bonusTiles.push(...poppedBonuses);
                console.log(`Game: ${player.name} received bonus replacement tiles: ${poppedBonuses.map(t => t.display).join(', ')}`);
            }

            // If the returned tile is null it means no non-bonus tile available
            if (!tile) {
                return { error: 'No replacement tile available' };
            }

            // Normal tile (replacement tile after skipping any bonuses)
            player.hand.push(tile);
            
            // --- Auto-Swap Logic: Check if drawn tile can replace a declared Wild Card in a meld ---
            let swapMessage = '';
            if (player.melds && player.melds.length > 0) {
                for (const meld of player.melds) {
                    if (meld.usesWildCards) {
                        const wildTileIndex = meld.tiles.findIndex(t => t.isWild);
                        if (wildTileIndex !== -1) {
                            const wildTile = meld.tiles[wildTileIndex];
                            const declKey = `${playerId}-${wildTile.id}`;
                            const declaration = this.wildCardDeclarations.get(declKey);
                            
                            if (declaration && 
                                declaration.declaredAs.type === tile.type && 
                                declaration.declaredAs.value === tile.value) {
                                
                                console.log(`Game: Auto-swapping drawn ${tile.display} for wild card ${wildTile.id}`);
                                
                                // 1. Remove drawn tile from hand
                                const tileInHandIdx = player.hand.findIndex(t => t.id === tile.id);
                                if (tileInHandIdx !== -1) player.hand.splice(tileInHandIdx, 1);
                                
                                // 2. Add wild card to hand
                                player.hand.push(wildTile);
                                
                                // 3. Update meld: replace wild with drawn tile
                                meld.tiles[wildTileIndex] = tile;
                                meld.usesWildCards = meld.tiles.some(t => t.isWild);
                                
                                // 4. Remove declaration
                                this.wildCardDeclarations.delete(declKey);
                                
                                swapMessage = ` (Swapped for Wild Card)`;
                                break; // Only perform one swap per draw
                            }
                        }
                    }
                }
            }
            // -------------------------------------------------------------------------------------

            player.hand = this.tileManager.sortHand(player.hand);
            
            console.log('Game:', player.name, 'drew', tile.display);
            
            return {
                success: true,
                tile: tile,
                hand: player.hand,
                bonusTiles: player.bonusTiles || [],
                drawnBonusTiles: poppedBonuses,
                dummyWallCount: this.wallManager.getDummyWallCount(),
                message: `Drew ${tile.display}${swapMessage}`
            };
            
        } catch (error) {
            return { error: error.message };
        }
    }


    discardTile(playerId, tileId) {
        console.log('Game: Player', playerId, 'discarding tile', tileId);
        
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };
        
        // Check if it's player's turn (they just drew)
        const currentPlayer = this.turnManager.getCurrentPlayer();
        if (currentPlayer.id !== playerId) {
            return { error: 'Not your turn to discard' };
        }
        
        // Find and remove tile from hand
        const tileIndex = player.hand.findIndex(t => t.id === tileId);
        if (tileIndex === -1) return { error: 'Tile not found in hand' };
        
        const tile = player.hand.splice(tileIndex, 1)[0];
        
        // If discarding a wild card, remove its declaration
        if (tile.isWild) {
            const declarationKey = `${playerId}-${tileId}`;
            this.wildCardDeclarations.delete(declarationKey);
        }
        
        // Add to discard pile
        const discardRecord = this.wallManager.discardTile(
            tile, 
            playerId, 
            player.name, 
            player.seatWind
        );


        // If this was the firstTurn discard by East, clear the firstTurn flag
        if (this.firstTurn) {
            this.firstTurn = false;
            console.log('Game: First turn complete - clearing firstTurn flag');
        }
        
        // Move to next player
        const nextPlayer = this.turnManager.nextTurn();
        
        return {
            success: true,
            discardedTile: tile,
            playerHand: player.hand,
            currentPlayer: nextPlayer.id,
            currentPlayerName: nextPlayer.name,
            currentPlayerWind: nextPlayer.seatWind,
            discarderWind: player.seatWind
        };
    }
    
    declarePung(playerId, tileId, usedTileIds = null) {
        console.log('Game: Player', playerId, 'declaring pung for tile', tileId);
        
        const lastDiscard = this.wallManager.getLastDiscard();
        if (!lastDiscard || lastDiscard.tile.id !== tileId) {
            return { error: 'Invalid pung declaration' };
        }
        
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };
        
        const tileToPung = lastDiscard.tile;
        
        // Determine which tiles to remove
        const tilesToRemove = [];
        
        if (Array.isArray(usedTileIds) && usedTileIds.length > 0) {
            // Validate each id exists in player's hand
            for (const id of usedTileIds) {
                const idx = player.hand.findIndex(t => t.id === id);
                if (idx === -1) return { error: 'Invalid usedTileIds: tile not in hand' };
                const tile = player.hand[idx];
                if (!tile.isWild && !(tile.type === tileToPung.type && tile.value === tileToPung.value)) {
                    return { error: 'Invalid usedTileIds: non-wild tile does not match' };
                }
                tilesToRemove.push(player.hand.splice(idx, 1)[0]);
            }
        } else {
            // Greedy: remove up to 2 matching (prefer real tiles) then wilds
            const matchingTiles = [];
            const wilds = [];
            for (let i = player.hand.length - 1; i >= 0; i--) {
                const t = player.hand[i];
                if (!t.isWild && t.type === tileToPung.type && t.value === tileToPung.value) {
                    matchingTiles.push(player.hand.splice(i, 1)[0]);
                }
            }
            // If not enough, take wilds
            for (let i = player.hand.length - 1; i >= 0 && (matchingTiles.length + wilds.length) < 2; i--) {
                const t = player.hand[i];
                if (t.isWild) {
                    const removed = player.hand.splice(i, 1)[0];
                    wilds.push(removed);
                    // Auto-declare
                    const declarationKey = `${playerId}-${removed.id}`;
                    if (!this.wildCardDeclarations.has(declarationKey)) {
                        this.wildCardDeclarations.set(declarationKey, {
                            wildCard: removed,
                            declaredAs: { type: tileToPung.type, value: tileToPung.value },
                            playerId: playerId,
                            timestamp: Date.now()
                        });
                    }
                }
            }
            tilesToRemove.push(...matchingTiles, ...wilds);
        }
        
        if (tilesToRemove.length < 2) {
            // Put back if failed
            player.hand.push(...tilesToRemove);
            player.hand = this.tileManager.sortHand(player.hand);
            return { error: 'Not enough matching tiles' };
        }
        
        // Create pung meld
        const pungTiles = [...tilesToRemove, tileToPung];
        const meld = {
            type: 'pung',
            tiles: pungTiles,
            fromPlayer: lastDiscard.playerId,
            fromPlayerWind: lastDiscard.playerWind,
            isExposed: true,
            usesWildCards: tilesToRemove.some(t => t.isWild)
        };
        
        player.melds.push(meld);
        
        // Remove from discard pile
        this.wallManager.removeLastDiscard();
        
        // Set current player to pung player
        this.turnManager.setCurrentPlayer(playerId);
        const currentPlayer = this.turnManager.getCurrentPlayer();
        
        // Calculate fan
        const fan = this.fanCalculator.calculatePungFan(meld, player);
        const bonusFan = this.fanCalculator.calculateBonusFan(player);
        const totalFan = fan + bonusFan;
        
        console.log(`Game: ${player.name} punged ${tileToPung.display} +${totalFan} fan (${fan} + ${bonusFan} bonus)`);
        
        return {
            success: true,
            meld: meld,
            hand: player.hand,
            currentPlayer: playerId,
            currentPlayerName: player.name,
            currentPlayerWind: player.seatWind,
            fan: totalFan,
            bonusFan: bonusFan,
            message: `${player.name} (${player.seatWind}) punged ${tileToPung.display}! +${totalFan} fan`
        };
    }

    declareChi(playerId, tileId, usedTileIds) {
        console.log('Game: Player', playerId, 'declaring chi for tile', tileId);

        const lastDiscard = this.wallManager.getLastDiscard();
        if (!lastDiscard || lastDiscard.tile.id !== tileId) {
            return { error: 'Invalid chi declaration' };
        }

        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };

        // 1. Check if discarder is the "upper" player (previous player)
        const playerIndex = this.turnManager.players.findIndex(p => p.id === playerId);
        const discarderIndex = this.turnManager.players.findIndex(p => p.id === lastDiscard.playerId);
        const expectedDiscarderIndex = (playerIndex - 1 + this.turnManager.players.length) % this.turnManager.players.length;

        if (discarderIndex !== expectedDiscarderIndex) {
            return { error: 'Can only Chi from the player before you' };
        }

        const tileToChi = lastDiscard.tile;
        if (tileToChi.type !== 'dot') {
            return { error: 'Can only Chi numeric tiles (Dots)' };
        }

        if (!usedTileIds || usedTileIds.length !== 2) {
            return { error: 'Must provide exactly 2 tiles for Chi' };
        }

        // 2. Verify tiles in hand & Sequence
        const tilesToRemove = [];
        for (const id of usedTileIds) {
            const idx = player.hand.findIndex(t => t.id === id);
            if (idx === -1) return { error: 'Tile not in hand' };
            tilesToRemove.push(player.hand[idx]);
        }

        const sequence = [...tilesToRemove, tileToChi].sort((a, b) => a.value - b.value);
        if (!sequence.every(t => t.type === 'dot')) return { error: 'All tiles must be Dots' };
        if (sequence[1].value !== sequence[0].value + 1 || sequence[2].value !== sequence[1].value + 1) {
            return { error: 'Tiles do not form a sequence' };
        }

        // 3. Execute Chi
        usedTileIds.forEach(id => {
            const idx = player.hand.findIndex(t => t.id === id);
            if (idx !== -1) player.hand.splice(idx, 1);
        });

        const meld = {
            type: 'chi',
            tiles: sequence,
            fromPlayer: lastDiscard.playerId,
            fromPlayerWind: lastDiscard.playerWind,
            isExposed: true,
            usesWildCards: false
        };

        if (!player.melds) player.melds = [];
        player.melds.push(meld);

        this.wallManager.removeLastDiscard();
        this.turnManager.setCurrentPlayer(playerId);

        return {
            success: true,
            meld: meld,
            hand: player.hand,
            currentPlayer: playerId,
            currentPlayerName: player.name,
            currentPlayerWind: player.seatWind,
            fan: 0,
            message: `${player.name} declared Chi!`
        };
    }

    /**
     * Returns all valid combinations (arrays of tileIds) that the player could use from their hand
     * to form a KONG (needs 3 tiles from hand + the discarded tile). Wild cards (isWild) can be used.
     * Each combination is up to length 3 (exactly 3 tiles required to combine with discard).
     */
    getKongOptions(playerId, discardedTileId) {
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };

        const lastDiscard = this.wallManager.getLastDiscard();
        if (!lastDiscard || lastDiscard.tile.id !== discardedTileId) {
            return { error: 'Invalid discard' };
        }

        const tileToKong = lastDiscard.tile;

        // Strict Kong: Only exact matches, no wildcards allowed.
        const matchingTiles = player.hand.filter(t => 
            !t.isWild && t.type === tileToKong.type && t.value === tileToKong.value
        );

        const results = [];
        if (matchingTiles.length >= 3) {
            // We take the first 3 matching tiles.
            results.push({
                usedTileIds: matchingTiles.slice(0, 3).map(t => t.id),
                label: '3 matching tiles'
            });
        }

        return { options: results };
    }


    /**
     * Declare KONG. Accepts optional usedTileIds (array of tile ids from player's hand to use).
     * If usedTileIds not provided, it falls back to greedy removal (prefer non-wild real tiles).
     */
    declareKong(playerId, tileId, usedTileIds = null) {
        console.log('Game: Player', playerId, 'declaring kong for tile', tileId);

        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };

        const currentPlayer = this.turnManager.getCurrentPlayer();
        const isMyTurn = currentPlayer.id === playerId;

        // --- SELF KONG (An Gang) Logic ---
        if (isMyTurn) {
            // 1. Find the tile in hand to identify type/value
            const targetTile = player.hand.find(t => t.id === tileId);
            if (!targetTile) return { error: 'Tile not in hand for self-kong' };

            // 2. Check for 4 matching tiles (Strict: No Wilds)
            const matchingTiles = player.hand.filter(t => 
                !t.isWild && t.type === targetTile.type && t.value === targetTile.value
            );

            if (matchingTiles.length !== 4) {
                return { error: 'Need 4 matching tiles for self-kong' };
            }

            // 3. Remove all 4
            const tilesToRemove = [];
            const idsToRemove = matchingTiles.map(t => t.id);
            idsToRemove.forEach(id => {
                const idx = player.hand.findIndex(t => t.id === id);
                if (idx !== -1) tilesToRemove.push(player.hand.splice(idx, 1)[0]);
            });

            // 4. Create Meld
            const meld = {
                type: 'kong',
                tiles: tilesToRemove,
                fromPlayer: playerId, // Self
                fromPlayerWind: player.seatWind,
                isExposed: true, // An Gang is technically concealed, but we treat as meld
                isConcealed: true,
                usesWildCards: false
            };
            
            if (!player.melds) player.melds = [];
            player.melds.push(meld);

            // 5. Return success (Caller will handle draw)
            const fan = 2; // Kong base fan
            const bonusFan = this.fanCalculator.calculateBonusFan(player);
            const totalFan = fan + bonusFan;

            return {
                success: true,
                meld: meld,
                hand: player.hand,
                currentPlayer: playerId,
                currentPlayerName: player.name,
                currentPlayerWind: player.seatWind,
                fan: totalFan,
                bonusFan: bonusFan,
                message: `${player.name} declared Self-Kong (An Gang)!`
            };
        }

        // --- MING KONG (From Discard) Logic ---
        const lastDiscard = this.wallManager.getLastDiscard();
        if (!lastDiscard || lastDiscard.tile.id !== tileId) {
            return { error: 'Invalid kong declaration' };
        }

        const tileToKong = lastDiscard.tile;

        // Determine which tiles to remove: if client provided explicit usedTileIds, validate them;
        // otherwise fall back to greedy algorithm used previously.
        const tilesToRemove = [];

        if (Array.isArray(usedTileIds) && usedTileIds.length > 0) {
            // Validate each id exists in player's hand
            for (const id of usedTileIds) {
                const idx = player.hand.findIndex(t => t.id === id);
                if (idx === -1) {
                    return { error: 'Invalid usedTileIds: tile not in hand' };
                }
                const tile = player.hand[idx];
                
                // STRICT CHECK: No wildcards allowed for Kong
                if (tile.isWild) {
                    return { error: 'Invalid usedTileIds: wildcards not allowed for Kong' };
                }
                
                // Must match the kong tile
                if (tile.type !== tileToKong.type || tile.value !== tileToKong.value) {
                    return { error: 'Invalid usedTileIds: tile does not match' };
                }
                // Remove from hand and record
                tilesToRemove.push(player.hand.splice(idx, 1)[0]);
            }

            if (tilesToRemove.length < 3) {
                // It's allowed to use fewer than 3 (the discard + 3 from hand makes 4).
                // But we require totalAvailable >= 3 earlier — server will validate below.
            }
        } else {
            // Greedy: remove up to 3 matching tiles (NO WILDS)
            for (let i = player.hand.length - 1; i >= 0 && tilesToRemove.length < 3; i--) {
                const t = player.hand[i];
                if (!t.isWild && t.type === tileToKong.type && t.value === tileToKong.value) {
                    tilesToRemove.push(player.hand.splice(i, 1)[0]);
                }
            }
        }

        // Re-check total availability (matching + wilds)
        if (tilesToRemove.length < 3) {
            // Put removed tiles back into hand (reverse order)
            player.hand.push(...tilesToRemove);
            player.hand = this.tileManager.sortHand(player.hand);
            return { error: 'Not enough matching tiles for kong (wildcards not allowed)' };
        }

        // Build the kong meld (3 from hand + discarded tile)
        const kongTiles = [...tilesToRemove, tileToKong];
        const meld = {
            type: 'kong',
            tiles: kongTiles,
            fromPlayer: lastDiscard.playerId,
            fromPlayerWind: lastDiscard.playerWind,
            isExposed: true,
            usesWildCards: false
        };

        // Add meld to player's melds
        if (!player.melds) player.melds = [];
        player.melds.push(meld);

        // Remove last discard from discard pile
        this.wallManager.removeLastDiscard();

        // Set current player to kong player (they draw next)
        this.turnManager.setCurrentPlayer(playerId);

        // Calculate fan / scoring adjustments as needed
        const fan = this.fanCalculator.calculatePungFan(meld, player);
        const bonusFan = this.fanCalculator.calculateBonusFan(player);
        const kongExtra = 1;
        const totalFan = fan + bonusFan + kongExtra;

        console.log(`Game: ${player.name} konged ${tileToKong.display} +${totalFan} fan (including kong extra)`);

        return {
            success: true,
            meld: meld,
            hand: player.hand,
            currentPlayer: playerId,
            currentPlayerName: player.name,
            currentPlayerWind: player.seatWind,
            fan: totalFan,
            bonusFan: bonusFan,
            message: `${player.name} (${player.seatWind}) konged ${tileToKong.display}! +${totalFan} fan`
        };
    }

    declareDanFei(playerId, tileId) {
        console.log('Game: Player', playerId, 'declaring Dan Fei for tile', tileId);
        
        if (!this.turnManager.isValidTurn(playerId)) {
            return { error: 'Not your turn' };
        }

        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };

        const tileIndex = player.hand.findIndex(t => t.id === tileId);
        if (tileIndex === -1) return { error: 'Tile not found in hand' };

        const tile = player.hand[tileIndex];
        if (!tile.isWild) return { error: 'Tile is not a wild card' };

        // Remove from hand
        player.hand.splice(tileIndex, 1);

        // Add to bonus tiles
        if (!player.bonusTiles) player.bonusTiles = [];
        player.bonusTiles.push(tile);

        // Sort hand
        player.hand = this.tileManager.sortHand(player.hand);

        return {
            success: true,
            hand: player.hand,
            bonusTiles: player.bonusTiles,
            tile: tile,
            message: `${player.name} declared Dan Fei (Bonus)`
        };
    }








    
    checkWin(playerId) {
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };

        const currentPlayer = this.turnManager.getCurrentPlayer();
        const isSelfDraw = (currentPlayer.id === playerId);
        
        let winType = 'Self-Draw (Zimo)';
        let winningTile = null;

        if (isSelfDraw) {
            // Self-draw: Tile is already in hand
        } else {
            // Win on discard (Hu)
            const lastDiscard = this.wallManager.getLastDiscard();
            if (!lastDiscard) {
                return { error: 'No discard available to win on' };
            }
            winningTile = lastDiscard.tile;
            winType = 'Win on Discard (Hu)';
            
            // Add tile to hand and remove from discard pile
            player.hand.push(winningTile);
            this.wallManager.removeLastDiscard();
        }
        
        // Sort hand for display
        player.hand = this.tileManager.sortHand(player.hand);
        
        // Bypass validation/fan calc for now (Dummy values)
        const totalFan = 5; 
        
        return {
            win: true,
            playerId: playerId,
            playerName: player.name,
            playerWind: player.seatWind,
            fan: totalFan,
            message: `${player.name} wins! (${winType})`,
            hand: player.hand,
            melds: player.melds,
            winningTile: winningTile,
            isSelfDraw: isSelfDraw
        };
    }
}

module.exports = MalaysiaMahjong3P;