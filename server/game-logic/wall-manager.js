class WallManager {
    constructor() {
        this.dummyWall = [];
        this.discardedTiles = [];
        this.lastDiscard = null;
        this.replacementWall = []; // For bonus tile replacements
    }
    
    initializeDummyWall(tiles) {
        this.dummyWall = [...tiles];
        console.log('WallManager: Dummy wall initialized with', this.dummyWall.length, 'tiles');
    }
    
    // Draw from the back of the dummy wall. Collect any bonus tiles popped
    // into poppedBonuses array and return the first non-bonus tile along with them.
    drawFromDummyWall() {
        if (this.dummyWall.length === 0) {
            throw new Error('No tiles left in dummy wall');
        }

        const poppedBonuses = [];
        let tile = this.dummyWall.pop();

        // If popped tile is a bonus, collect it and keep popping until we find a non-bonus.
        while (tile && tile.isBonus) {
            poppedBonuses.push(tile);
            console.log(`WallManager: Bonus tile ${tile.display} popped from back and set aside`);
            if (this.dummyWall.length === 0) {
                tile = null;
                break;
            }
            tile = this.dummyWall.pop();
        }

        if (!tile) {
            // No non-bonus tile available; return popped bonuses and null tile
            return { tile: null, poppedBonuses };
        }

        return { tile, poppedBonuses };
    }

    // Optional getter for replacement piles
    getReplacementBonuses() {
        return this.replacementWall.slice();
    }
    
    replaceBonusTile(bonusTile) {
        if (this.dummyWall.length === 0) return null;
        
        const replacement = this.dummyWall.pop();
        console.log(`WallManager: Replacing bonus ${bonusTile.display} with ${replacement.display}`);
        return replacement;
    }

    discardTile(tile, playerId, playerName, playerWind) {
        const discardRecord = {
            tile: tile,
            playerId: playerId,
            playerName: playerName,
            playerWind: playerWind,
            timestamp: Date.now()
        };
        
        this.discardedTiles.push(discardRecord);
        this.lastDiscard = tile;
        
        console.log('WallManager:', playerName, 'discarded', tile.display);
        return discardRecord;
    }
    
    getLastDiscard() {
        return this.discardedTiles.length > 0 
            ? this.discardedTiles[this.discardedTiles.length - 1]
            : null;
    }
    
    removeLastDiscard() {
        const discarded = this.discardedTiles.pop();
        this.lastDiscard = this.discardedTiles.length > 0 
            ? this.discardedTiles[this.discardedTiles.length - 1]?.tile 
            : null;
        return discarded;
    }
    
    getDummyWallCount() {
        return this.dummyWall.length;
    }
    
    getDiscardCount() {
        return this.discardedTiles.length;
    }
    
    getRecentDiscards(count = 10) {
        return this.discardedTiles.slice(-count);
    }
}

module.exports = WallManager;