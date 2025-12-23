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
        
        console.log('Game: Initialization complete');
        
        return this.getGameState();
    }
    
    // Replace bonus tiles immediately after dealing
    replaceBonusTiles(player) {
        const bonusTiles = player.hand.filter(tile => tile.isBonus);
        
        bonusTiles.forEach(bonusTile => {
            // Remove bonus tile from hand
            const index = player.hand.indexOf(bonusTile);
            if (index !== -1) {
                player.hand.splice(index, 1);
                
                // Draw replacement from dummy wall
                if (this.wallManager.getDummyWallCount() > 0) {
                    const replacement = this.wallManager.drawFromDummyWall();
                    player.hand.push(replacement);
                    console.log(`Game: Replaced bonus ${bonusTile.display} with ${replacement.display} for ${player.name}`);
                    
                    // Add bonus tile to player's bonus collection
                    if (!player.bonusTiles) player.bonusTiles = [];
                    player.bonusTiles.push(bonusTile);
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
            wildCardDeclarations: Object.fromEntries(this.wildCardDeclarations)
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
        
        try {
            // Draw from dummy wall
            const tile = this.wallManager.drawFromDummyWall();
            const player = this.turnManager.getPlayerById(playerId);
            
            // Check if drawn tile is a bonus tile
            if (tile.isBonus) {
                // Add to bonus tiles and draw replacement
                if (!player.bonusTiles) player.bonusTiles = [];
                player.bonusTiles.push(tile);
                
                // Draw replacement
                if (this.wallManager.getDummyWallCount() > 0) {
                    const replacement = this.wallManager.drawFromDummyWall();
                    player.hand.push(replacement);
                    player.hand = this.tileManager.sortHand(player.hand);
                    
                    console.log(`Game: ${player.name} drew bonus ${tile.display}, replaced with ${replacement.display}`);
                    
                    return {
                        success: true,
                        tile: replacement,
                        bonusTile: tile,
                        hand: player.hand,
                        bonusTiles: player.bonusTiles,
                        dummyWallCount: this.wallManager.getDummyWallCount(),
                        message: `Drew ${replacement.display} (replaced bonus ${tile.display})`
                    };
                }
            } else {
                // Normal tile
                player.hand.push(tile);
                player.hand = this.tileManager.sortHand(player.hand);
                
                console.log('Game:', player.name, 'drew', tile.display);
                
                return {
                    success: true,
                    tile: tile,
                    hand: player.hand,
                    dummyWallCount: this.wallManager.getDummyWallCount(),
                    message: `Drew ${tile.display}`
                };
            }
            
        } catch (error) {
            return { error: error.message };
        }
    }
    
    // Handle wild card declaration
    declareWildCard(playerId, wildCardId, declaredAs) {
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return { error: 'Player not found' };
        
        // Find wild card in player's hand
        const wildCardIndex = player.hand.findIndex(t => t.id === wildCardId && t.isWild);
        if (wildCardIndex === -1) return { error: 'Wild card not found' };
        
        const wildCard = player.hand[wildCardIndex];
        
        // Store declaration
        const declarationKey = `${playerId}-${wildCardId}`;
        this.wildCardDeclarations.set(declarationKey, {
            wildCard: wildCard,
            declaredAs: declaredAs,
            playerId: playerId,
            timestamp: Date.now()
        });
        
        console.log(`Game: ${player.name} declared wild card ${wildCard.display} as ${declaredAs.type} ${declaredAs.value}`);
        
        return {
            success: true,
            wildCard: wildCard,
            declaredAs: declaredAs,
            message: `Wild card declared as ${declaredAs.type} ${declaredAs.value}`
        };
    }
    
    // Check if a tile can be used (considering wild cards)
    canUseTile(playerId, tileType, tileValue) {
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) return false;
        
        // Check for actual tile
        const hasTile = player.hand.some(t => 
            t.type === tileType && t.value === tileValue && !t.isWild
        );
        
        if (hasTile) return true;
        
        // Check for wild cards
        const hasWild = player.hand.some(t => t.isWild);
        
        // Check if wild card is already declared for this tile
        const wildDeclarations = Array.from(this.wildCardDeclarations.entries())
            .filter(([key, decl]) => key.startsWith(playerId))
            .filter(([key, decl]) => 
                decl.declaredAs.type === tileType && 
                decl.declaredAs.value === tileValue
            );
        
        return hasWild && wildDeclarations.length === 0;
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