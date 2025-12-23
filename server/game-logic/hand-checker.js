class HandChecker {
    constructor() {
        this.winningCombinations = [];
    }
    
    canPung(hand, tile) {
        const matchingTiles = hand.filter(t => 
            t.type === tile.type && 
            t.value === tile.value
        );
        return matchingTiles.length >= 2;
    }
    
    canKong(hand, tile) {
        const matchingTiles = hand.filter(t => 
            t.type === tile.type && 
            t.value === tile.value
        );
        return matchingTiles.length >= 3;
    }
    
    checkStandardWin(hand, melds) {
        // Simplified win check for 4 sets + 1 pair
        const totalTiles = hand.length + (melds.length * 3);
        return totalTiles === 14;
    }
    
    checkSevenPairs(hand) {
        // Check for 7 pairs
        if (hand.length !== 14) return false;
        
        const tileCounts = {};
        hand.forEach(tile => {
            const key = `${tile.type}-${tile.value}`;
            tileCounts[key] = (tileCounts[key] || 0) + 1;
        });
        
        const pairs = Object.values(tileCounts).filter(count => count === 2);
        return pairs.length === 7;
    }
    
    validateHandForWin(player) {
        const handSize = player.hand.length + (player.melds.length * 3);
        
        if (handSize !== 14) {
            return { valid: false, error: 'Invalid hand size' };
        }
        
        // Check for minimum 1 fan (would need fan calculation)
        // This is a simplified check
        
        return { valid: true };
    }
}

module.exports = HandChecker;