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
        this.wallManager.initializeDummyWall(dummyWall);
        
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
                    const { tile: replacement, poppedBonuses } = this.wallManager.drawFromDummyWall();
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
                hands[player.id] = player.hand || [];
                bonusTiles[player.id] = player.bonusTiles || [];
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
    
    drawTile(playerId) {
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
            const drawResult = this.wallManager.drawFromDummyWall();
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
            player.hand = this.tileManager.sortHand(player.hand);
            
            console.log('Game:', player.name, 'drew', tile.display);
            
            return {
                success: true,
                tile: tile,
                hand: player.hand,
                bonusTiles: player.bonusTiles || [],
                dummyWallCount: this.wallManager.getDummyWallCount(),
                message: `Drew ${tile.display}`
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
    
    declarePung(playerId, tileId) {
        console.log('Game: Player', playerId, 'declaring pung for tile', tileId);
        
        const lastDiscard = this.wallManager.getLastDiscard();
        if (!lastDiscard || lastDiscard.tile.id !== tileId) {
            return { error: 'Invalid pung declaration' };
        }
        
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };
        
        const tileToPung = lastDiscard.tile;
        
        // Check if player can pung (considering wild cards)
        const matchingTiles = player.hand.filter(t => 
            !t.isWild && t.type === tileToPung.type && t.value === tileToPung.value
        );
        
        const wildCards = player.hand.filter(t => t.isWild);
        const availableWilds = wildCards.length;
        
        // Check wild card declarations for this tile
        const wildDeclarations = Array.from(this.wildCardDeclarations.entries())
            .filter(([key, decl]) => key.startsWith(playerId))
            .filter(([key, decl]) => 
                decl.declaredAs.type === tileToPung.type && 
                decl.declaredAs.value === tileToPung.value
            );
        
        const totalAvailable = matchingTiles.length + availableWilds - wildDeclarations.length;
        
        if (totalAvailable < 2) {
            return { error: 'Cannot form pung - need 2 matching tiles' };
        }
        
        // Remove 2 matching tiles/wild cards
        const tilesToRemove = [];
        
        // First remove actual matching tiles
        for (let i = player.hand.length - 1; i >= 0 && tilesToRemove.length < 2; i--) {
            const tile = player.hand[i];
            if (!tile.isWild && tile.type === tileToPung.type && tile.value === tileToPung.value) {
                tilesToRemove.push(player.hand.splice(i, 1)[0]);
            }
        }

        
        // Then use wild cards if needed
        for (let i = player.hand.length - 1; i >= 0 && tilesToRemove.length < 2; i--) {
            const tile = player.hand[i];
            if (tile.isWild) {
                // Check if this wild card is already declared for something else
                const declarationKey = `${playerId}-${tile.id}`;
                if (!this.wildCardDeclarations.has(declarationKey)) {
                    tilesToRemove.push(player.hand.splice(i, 1)[0]);
                    // Auto-declare this wild card as the pung tile
                    this.wildCardDeclarations.set(declarationKey, {
                        wildCard: tile,
                        declaredAs: { type: tileToPung.type, value: tileToPung.value },
                        playerId: playerId,
                        timestamp: Date.now()
                    });
                }
            }
        }
        
        if (tilesToRemove.length < 2) {
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

        // Build candidate list of hand tiles with indices
        const hand = player.hand.slice(); // copy
        const candidates = hand.map(t => ({ id: t.id, isWild: !!t.isWild, type: t.type, value: t.value }));

        // We'll search all combinations of up to 3 distinct hand tiles and check if they can represent the required tile(s)
        // For a given combination, non-wild tiles must match tileToKong type/value.
        const combinations = [];

        // helper to add combination with a label
        const addCombination = (ids) => {
            // label e.g. "3x 2筒 (uses 1 wild)" - keep simple
            const nonWildCount = ids.reduce((acc, id) => {
                const t = hand.find(x => x.id === id);
                return acc + (t && t.isWild ? 0 : 1);
            }, 0);
            const wildCount = ids.length - nonWildCount;
            const label = `${ids.length} tiles (${nonWildCount} real, ${wildCount} wild)`;
            combinations.push({ usedTileIds: ids, label });
        };

        // generate combinations (choose 1..3 tiles)
        const n = candidates.length;
        for (let a = 0; a < n; a++) {
            for (let b = a + 1; b < n; b++) {
                for (let c = b + 1; c < n; c++) {
                    const combo = [candidates[a], candidates[b], candidates[c]];
                    // check validity: every non-wild must match tileToKong type/value
                    const ok = combo.every(t => t.isWild || (t.type === tileToKong.type && t.value === tileToKong.value));
                    if (ok) addCombination([combo[0].id, combo[1].id, combo[2].id]);
                }
            }
            // also consider pairs -> we can include combos of size 2 (if player wants to use 2 tiles + 1 wild)
            for (let b = a + 1; b < n; b++) {
                const combo = [candidates[a], candidates[b]];
                const ok = combo.every(t => t.isWild || (t.type === tileToKong.type && t.value === tileToKong.value));
                if (ok) addCombination([combo[0].id, combo[1].id]);
            }
            // singletons
            const combo1 = [candidates[a]];
            if (combo1.every(t => t.isWild || (t.type === tileToKong.type && t.value === tileToKong.value))) {
                addCombination([combo1[0].id]);
            }
        }

        // Deduplicate by tile id arrays (simple string key)
        const unique = {};
        const results = [];
        combinations.forEach(c => {
            const key = c.usedTileIds.slice().sort().join(',');
            if (!unique[key]) {
                unique[key] = true;
                results.push(c);
            }
        });

        return { options: results };
    }


    /**
     * Declare KONG. Accepts optional usedTileIds (array of tile ids from player's hand to use).
     * If usedTileIds not provided, it falls back to greedy removal (prefer non-wild real tiles).
     */
    declareKong(playerId, tileId, usedTileIds = null) {
        console.log('Game: Player', playerId, 'declaring kong for tile', tileId);

        const lastDiscard = this.wallManager.getLastDiscard();
        if (!lastDiscard || lastDiscard.tile.id !== tileId) {
            return { error: 'Invalid kong declaration' };
        }

        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };

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
                // Non-wild must match the kong tile
                if (!tile.isWild && !(tile.type === tileToKong.type && tile.value === tileToKong.value)) {
                    return { error: 'Invalid usedTileIds: non-wild tile does not match' };
                }
                // Remove from hand and record
                tilesToRemove.push(player.hand.splice(idx, 1)[0]);
            }

            if (tilesToRemove.length < 3) {
                // It's allowed to use fewer than 3 (the discard + 3 from hand makes 4).
                // But we require totalAvailable >= 3 earlier — server will validate below.
            }
        } else {
            // Greedy: remove up to 3 matching (prefer real tiles) then wilds
            const matchingTiles = [];
            const wilds = [];
            for (let i = player.hand.length - 1; i >= 0; i--) {
                const t = player.hand[i];
                if (!t.isWild && t.type === tileToKong.type && t.value === tileToKong.value) {
                    matchingTiles.push(player.hand.splice(i, 1)[0]);
                }
            }
            // If not enough, take wilds
            for (let i = player.hand.length - 1; i >= 0 && (matchingTiles.length + wilds.length) < 3; i--) {
                const t = player.hand[i];
                if (t.isWild) {
                    const removed = player.hand.splice(i, 1)[0];
                    wilds.push(removed);
                    // mark declaration if needed (auto-declare)
                    const declarationKey = `${playerId}-${removed.id}`;
                    if (!this.wildCardDeclarations.has(declarationKey)) {
                        this.wildCardDeclarations.set(declarationKey, {
                            wildCard: removed,
                            declaredAs: { type: tileToKong.type, value: tileToKong.value },
                            playerId: playerId,
                            timestamp: Date.now()
                        });
                    }
                }
            }
            tilesToRemove.push(...matchingTiles, ...wilds);
        }

        // Re-check total availability (matching + wilds)
        const realMatching = tilesToRemove.filter(t => !t.isWild).length;
        const wildUsed = tilesToRemove.filter(t => t.isWild).length;
        const totalAvailable = realMatching + wildUsed;

        if (totalAvailable < 3) {
            // Put removed tiles back into hand (reverse order)
            player.hand.push(...tilesToRemove);
            player.hand = this.tileManager.sortHand(player.hand);
            return { error: 'Not enough matching tiles for kong' };
        }

        // Build the kong meld (3 from hand + discarded tile)
        const kongTiles = [...tilesToRemove, tileToKong];
        const meld = {
            type: 'kong',
            tiles: kongTiles,
            fromPlayer: lastDiscard.playerId,
            fromPlayerWind: lastDiscard.playerWind,
            isExposed: true,
            usesWildCards: tilesToRemove.some(t => t.isWild)
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









    
    checkWin(playerId) {
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };
        
        // Validate hand (considering wild cards)
        const validation = this.handChecker.validateHandForWin(player, this.wildCardDeclarations);
        if (!validation.valid) {
            return validation;
        }
        
        // Calculate fan
        const meldFan = this.fanCalculator.calculateMeldFan(player.melds, player);
        const bonusFan = this.fanCalculator.calculateBonusFan(player);
        const handFan = this.fanCalculator.calculateHandFan(player, this.wildCardDeclarations);
        
        const totalFan = meldFan + bonusFan + handFan;
        
        // Check minimum fan requirement
        if (totalFan < 1) {
            return { error: 'Need at least 1 fan to win' };
        }
        
        const handType = this.fanCalculator.determineHandType(player);
        
        // Calculate score
        const baseScore = totalFan * 100;
        const bonusScore = bonusFan * 50; // Extra for bonus tiles
        const totalScore = baseScore + bonusScore;
        
        return {
            win: true,
            playerId: playerId,
            playerName: player.name,
            playerWind: player.seatWind,
            fan: totalFan,
            meldFan: meldFan,
            bonusFan: bonusFan,
            handFan: handFan,
            handType: handType,
            score: totalScore,
            bonusScore: bonusScore,
            message: `${player.name} (${player.seatWind}) wins with ${totalFan} fan! ${handType}`
        };
    }
}

module.exports = MalaysiaMahjong3P;