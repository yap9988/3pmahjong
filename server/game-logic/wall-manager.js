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
    
    drawFromDummyWall() {
        if (this.dummyWall.length === 0) {
            throw new Error('No tiles left in dummy wall');
        }
        
        const tile = this.dummyWall.pop();
        
        // Check if it's a bonus tile (needs replacement)
        if (tile.isBonus && this.replacementWall.length > 0) {
            const replacement = this.replacementWall.pop();
            console.log(`WallManager: Bonus ${tile.display} drawn, replaced with ${replacement.display}`);
            return replacement;
        }
        
        return tile;
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