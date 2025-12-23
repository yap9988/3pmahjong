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
    }
    
    initializeGame(playerList) {
        console.log('Game: Initializing with', playerList.length, 'players');
        
        // 1. Initialize players and turns
        this.turnManager.initializePlayers(playerList);
        
        // 2. Generate and shuffle tiles
        const allTiles = this.tileManager.generateTileSet();
        const shuffledTiles = this.tileManager.shuffleTiles(allTiles);
        
        // 3. Setup walls and deal
        const { playerTiles, dummyWall } = this.tileManager.setupMalaysian3PWalls(shuffledTiles);
        
        // 4. Assign hands to players and sort
        playerTiles.forEach((tiles, index) => {
            const player = this.turnManager.players[index];
            player.hand = this.tileManager.sortHand(tiles);
        });
        
        // 5. Initialize dummy wall
        this.wallManager.initializeDummyWall(dummyWall);
        
        // 6. Set game state
        this.gameState = 'playing';
        this.gameStarted = true;
        
        console.log('Game: Initialization complete');
        
        return this.getGameState();
    }
    
    getGameState() {
        const currentPlayer = this.turnManager.getCurrentPlayer();

        // ✅ CRITICAL: Include hands in game state
        const hands = {};
        this.turnManager.players.forEach(player => {
            hands[player.id] = player.hand;
        });
        
        return {
            gameState: this.gameState,
            currentPlayer: currentPlayer.id,
            currentPlayerName: currentPlayer.name,
            currentPlayerWind: currentPlayer.seatWind,
            players: this.turnManager.getAllPlayers(),
            dummyWallCount: this.wallManager.getDummyWallCount(),
            discardCount: this.wallManager.getDiscardCount(),
            windRound: this.turnManager.windRound,
            playerWinds: this.turnManager.playerWinds,
            hands: hands, // ✅ THIS IS MISSING!
            lastDiscard: this.wallManager.lastDiscard
        };
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
            
            // Add to player's hand and sort
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
            
        } catch (error) {
            return { error: error.message };
        }
    }
    
    discardTile(playerId, tileId) {
        console.log('Game: Player', playerId, 'discarding tile', tileId);
        
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) {
            return { error: 'Player not found' };
        }
        
        // Find and remove tile from hand
        const tile = this.tileManager.removeTileById(player.hand, tileId);
        if (!tile) {
            return { error: 'Tile not found in hand' };
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
        if (!player) {
            return { error: 'Player not found' };
        }
        
        // Check if player can pung
        if (!this.handChecker.canPung(player.hand, lastDiscard.tile)) {
            return { error: 'Cannot form pung' };
        }
        
        // Remove 2 matching tiles from hand
        const tilesToRemove = [];
        for (let i = player.hand.length - 1; i >= 0 && tilesToRemove.length < 2; i--) {
            const tile = player.hand[i];
            if (tile.type === lastDiscard.tile.type && 
                tile.value === lastDiscard.tile.value) {
                tilesToRemove.push(player.hand.splice(i, 1)[0]);
            }
        }
        
        if (tilesToRemove.length < 2) {
            return { error: 'Not enough matching tiles' };
        }
        
        // Create pung meld
        const pungTiles = [...tilesToRemove, lastDiscard.tile];
        const meld = {
            type: 'pung',
            tiles: pungTiles,
            fromPlayer: lastDiscard.playerId,
            fromPlayerWind: lastDiscard.playerWind,
            isExposed: true
        };
        
        player.melds.push(meld);
        
        // Remove from discard pile
        this.wallManager.removeLastDiscard();
        
        // Set current player to pung player
        this.turnManager.setCurrentPlayer(playerId);
        const currentPlayer = this.turnManager.getCurrentPlayer();
        
        // Calculate fan
        const fan = this.fanCalculator.calculatePungFan(meld, player);
        
        console.log('Game:', player.name, 'punged', lastDiscard.tile.display, '+', fan, 'fan');
        
        return {
            success: true,
            meld: meld,
            hand: player.hand,
            currentPlayer: playerId,
            currentPlayerName: player.name,
            currentPlayerWind: player.seatWind,
            fan: fan,
            message: `${player.name} (${player.seatWind}) punged ${lastDiscard.tile.display}! +${fan} fan`
        };
    }
    

    // In game-logic/index.js add:
    handleWildCard(player, tileId) {
        const tile = this.tileManager.findTileById(player.hand, tileId);
        if (!tile || !tile.isWild) return null;
    
        // Wild card can be used as any tile
        // Player needs to declare what it represents
        return {
            success: true,
            tile: tile,
            isWild: true,
            message: 'Wild card selected. Declare what tile it represents.'
        };
    }

    // In hand checker:
    canUseWildCard(hand, neededTile) {
        const wildCards = hand.filter(tile => tile.isWild);
        return wildCards.length > 0;
    }






    checkWin(playerId) {
        const player = this.turnManager.getPlayerById(playerId);
        if (!player) {
            return { error: 'Player not found' };
        }
        
        // Validate hand
        const validation = this.handChecker.validateHandForWin(player);
        if (!validation.valid) {
            return validation;
        }
        
        // Calculate fan
        const totalFan = this.fanCalculator.calculateTotalFan(player);
        
        // Check minimum fan requirement
        if (totalFan < 1) {
            return { error: 'Need at least 1 fan to win' };
        }
        
        const handType = this.fanCalculator.determineHandType(player);
        
        return {
            win: true,
            playerId: playerId,
            playerName: player.name,
            playerWind: player.seatWind,
            fan: totalFan,
            handType: handType,
            score: totalFan * 100,
            message: `${player.name} (${player.seatWind}) wins with ${totalFan} fan! ${handType}`
        };
    }
}

module.exports = MalaysiaMahjong3P;