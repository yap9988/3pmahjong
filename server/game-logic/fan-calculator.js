class FanCalculator {
    constructor() {
        this.windRound = 'East';
    }
    
    setRoundWind(wind) {
        this.windRound = wind;
    }
    
    calculatePungFan(meld, player) {
        let fan = 0;
        const tile = meld.tiles[0];
        
        // 1. Pung of Dragon tiles = 1 fan
        if (tile.type === 'dragon') {
            fan += 1;
        }
        
        // 2. Pung of Seat Wind (門風) = 1 fan
        if (tile.type === 'wind' && tile.value === player.seatWind) {
            fan += 1;
        }
        
        // 3. NORTH WIND = 1 fan for ALL players (special rule!)
        if (tile.type === 'wind' && tile.value === 'North') {
            fan += 1;
        }

        // 4. EAST WIND PUNG by East player +1 fan
        if (tile.type === 'wind' && tile.value === 'East' && player.seatWind === 'East') {
            fan += 1;
        }
        
        // 5. Pung of Terminals (1 or 9 Dots) = 1 fan
        if (tile.type === 'dot' && (tile.value === 1 || tile.value === 9)) {
            fan += 1;
        }
        
        // 6. Pung of any Wind = 1 fan (minimum)
        if (tile.type === 'wind' && fan === 0) {
            fan = 1;
        }
        
        return fan;
    }



    calculateBonusFan(player) {
        let fan = 0;
    
        // Count bonus tiles in hand
        const bonusTiles = player.hand.filter(tile => tile.isBonus);
    
        // Each complete set of Seasons/Flowers = 1 fan
        const seasons = bonusTiles.filter(t => t.type === 'season');
        const flowers = bonusTiles.filter(t => t.type === 'flower');
        const animals = bonusTiles.filter(t => t.type === 'animal');
        const faces = bonusTiles.filter(t => t.type === 'face');
    
        // Complete set of 4 Seasons = 1 fan
        if (seasons.length === 4) fan += 1;
    
        // Complete set of 4 Flowers = 1 fan
        if (flowers.length === 4) fan += 1;
    
        // Each Animal or Face tile = 0.5 fan (usually)
        // For simplicity, let's say 2 of these = 1 fan
        const otherBonus = animals.length + faces.length;
        fan += Math.floor(otherBonus / 2);
    
        return fan;
    }






    
    calculateTotalFan(player) {
        let totalFan = 1; // Base fan for winning
        
        // Add fan from melds
        player.melds.forEach(meld => {
            if (meld.type === 'pung') {
                totalFan += this.calculatePungFan(meld, player);
            } else if (meld.type === 'kong') {
                totalFan += 2; // Kong = 2 fan
            }
        });
        
        // Check for Half Flush (混一色) - Dots + Honors = 2 fan
        const hasDots = player.hand.some(t => t.type === 'dot') || 
                       player.melds.some(m => m.tiles.some(t => t.type === 'dot'));
        const hasHonors = player.hand.some(t => t.type === 'wind' || t.type === 'dragon') ||
                         player.melds.some(m => m.tiles.some(t => t.type === 'wind' || t.type === 'dragon'));
        
        if (hasDots && hasHonors) {
            totalFan += 2; // Half Flush
        }
        
        // Check for Full Flush (清一色) - All Dots = 5 fan
        const allDots = !player.hand.some(t => t.type !== 'dot') &&
                       !player.melds.some(m => m.tiles.some(t => t.type !== 'dot'));
        if (allDots) {
            totalFan += 5; // Full Flush
        }
        
        // Check for All Honors (字一色) - All Winds/Dragons = 10 fan
        const allHonors = !player.hand.some(t => t.type === 'dot') &&
                         !player.melds.some(m => m.tiles.some(t => t.type === 'dot'));
        if (allHonors) {
            totalFan += 10; // All Honors
        }
        
        return Math.min(totalFan, 5); // Cap at 5 fan for simplicity
    }
    
    determineHandType(player) {
        const hasDots = player.hand.some(t => t.type === 'dot') || 
                       player.melds.some(m => m.tiles.some(t => t.type === 'dot'));
        const hasHonors = player.hand.some(t => t.type === 'wind' || t.type === 'dragon') ||
                         player.melds.some(m => m.tiles.some(t => t.type === 'wind' || t.type === 'dragon'));
        
        if (!hasDots && hasHonors) {
            return 'All Honors (字一色)';
        } else if (hasDots && !hasHonors) {
            return 'Full Flush (清一色)';
        } else {
            return 'Half Flush (混一色)';
        }
    }
}

module.exports = FanCalculator;