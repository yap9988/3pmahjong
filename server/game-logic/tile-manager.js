class TileManager {
    constructor() {
        this.tiles = [];
        this.dummyWall = [];
    }
    
    generateTileSet() {
        const tiles = [];
        
        // Dots (筒) 1-9, 4 copies each
        for (let i = 1; i <= 9; i++) {
            for (let j = 0; j < 4; j++) {
                tiles.push({
                    type: 'dot',
                    value: i,
                    id: `D${i}-${j}`,
                    display: `${i}筒`,
                    chinese: `${i}筒`,
                    isHonor: false,
                    isBonus: false,
                    isWild: false
                });
            }
        }
        
        // Winds: East, South, West (No North)
        const winds = [
            { value: 'East', display: '東', chinese: '東' },
            { value: 'South', display: '南', chinese: '南' },
            { value: 'West', display: '西', chinese: '西' },
            { value: 'North', display: '北', chinese: '北' }
        ];
        
        winds.forEach(wind => {
            for (let j = 0; j < 4; j++) {
                tiles.push({
                    type: 'wind',
                    value: wind.value,
                    display: wind.display,
                    chinese: wind.chinese,
                    id: `W${wind.value}-${j}`,
                    isHonor: true,
                    isBonus: false,
                    isWild: false
                });
            }
        });
        
        // Dragons
        const dragons = [
            { value: 'Red', display: '中', chinese: '中' },
            { value: 'Green', display: '發', chinese: '發' },
            { value: 'White', display: '白', chinese: '白' }
        ];
        
        dragons.forEach(dragon => {
            for (let j = 0; j < 4; j++) {
                tiles.push({
                    type: 'dragon',
                    value: dragon.value,
                    display: dragon.display,
                    chinese: dragon.chinese,
                    id: `DR${dragon.value}-${j}`,
                    isHonor: true,
                    isBonus: false,
                    isWild: false
                });
            }
        });
        

        // 4) Flowers — 4 distinct singletons (梅 蘭 菊 竹) (4)
        const flowers = [
            { value: 1, display: '梅', chinese: '梅' },
            { value: 2, display: '蘭', chinese: '蘭' },
            { value: 3, display: '菊', chinese: '菊' },
            { value: 4, display: '竹', chinese: '竹' }
        ];
        flowers.forEach((flower, idx) => {
            tiles.push({
                type: 'flower',
                value: flower.value,
                display: flower.display,
                chinese: flower.chinese,
                id: `F${flower.value}`, // singletons
                isHonor: false,
                isBonus: true,
                isWild: false,
                bonusType: 'flower'
            });
        });

        // 5) Seasons — 4 distinct singletons (春 夏 秋 冬) (4)
        const seasons = [
            { value: 1, display: '春', chinese: '春' },
            { value: 2, display: '夏', chinese: '夏' },
            { value: 3, display: '秋', chinese: '秋' },
            { value: 4, display: '冬', chinese: '冬' }
        ];
        seasons.forEach(season => {
            tiles.push({
                type: 'season',
                value: season.value,
                display: season.display,
                chinese: season.chinese,
                id: `S${season.value}`, // singletons
                isHonor: false,
                isBonus: true,
                isWild: false,
                bonusType: 'season'
            });
        });

        // 6. ANIMALS (動物牌) = 4
        const animals = [
            { value: 'Mouse', display: '鼠', chinese: '鼠' },
            { value: 'Cat', display: '貓', chinese: '貓' },
            { value: 'Chicken', display: '雞', chinese: '雞' },
            { value: 'Centipede', display: '蜈蚣', chinese: '蜈蚣' }
        ];
    
        animals.forEach(animal => {
            tiles.push({
                type: 'animal',
                value: animal.value,
                display: animal.display,
                chinese: animal.chinese,
                id: `A${animal.value}`,
                isHonor: false,
                isBonus: true,
                isWild: false,
                bonusType: 'animal'
            });
        });

        // 7. FACES (人頭) = 4
        for (let i = 1; i <= 4; i++) {
            tiles.push({
                type: 'face',
                value: i,
                display: `人${i}`,
                chinese: `人${i}`,
                id: `FC${i}`,
                isHonor: false,
                isBonus: true,
                isWild: false,
                bonusType: 'face'
            });
        }

        // 8. WILD CARDS (飛) = 4
        for (let i = 1; i <= 4; i++) {
            tiles.push({
                type: 'wild',
                value: 'Joker',
                display: '飛',
                chinese: '飛',
                id: `J${i}`,
                isHonor: false,
                isBonus: false,
                isWild: true,
                canReplace: true
            });
        }


        return tiles;
    }
    
    shuffleTiles(tiles) {
        const shuffled = [...tiles];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    setupMalaysian3PWalls(tiles) {
        // Malaysian 3P: Deal 4-4-4-1 pattern
        const playerTiles = [[], [], []];
        
        // Deal 4 rounds
        for (let round = 0; round < 4; round++) {
            const tilesToDeal = (round === 3) ? 1 : 4;
            
            for (let playerIndex = 0; playerIndex < 3; playerIndex++) {
                const tilesForPlayer = tiles.splice(0, tilesToDeal);
                playerTiles[playerIndex].push(...tilesForPlayer);
            }
        }

        // Give dealer (East, index 0) one extra tile to make 14 tiles
        const extraForEast = tiles.splice(0, 1);
        if (extraForEast.length > 0) {
            playerTiles[0].push(extraForEast[0]);
        }
        
        // Remaining tiles become dummy wall
        const dummyWall = [...tiles];
        
        return { playerTiles, dummyWall };
    }
    
    sortHand(tiles) {
        return tiles.sort((a, b) => {
            // Define a comprehensive order for all tile types
            const typeOrder = { 'dot': 1, 'wind': 2, 'dragon': 3, 'flower': 4, 'season': 4, 'animal': 4, 'face': 4, 'wild': 5 };
            const windOrder = { 'East': 1, 'South': 2, 'West': 3, 'North': 4 };
            const dragonOrder = { 'Red': 1, 'Green': 2, 'White': 3 };
            
            const aTypeVal = typeOrder[a.type] || 99; // Place unknown types at the end
            const bTypeVal = typeOrder[b.type] || 99;

            if (aTypeVal !== bTypeVal) {
                return aTypeVal - bTypeVal;
            }
            
            // Within the same type, sort by value
            if (a.type === 'dot') {
                return a.value - b.value;
            }
            
            if (a.type === 'wind') {
                return (windOrder[a.value] || 99) - (windOrder[b.value] || 99);
            }
            
            if (a.type === 'dragon') {
                return (dragonOrder[a.value] || 99) - (dragonOrder[b.value] || 99);
            }
            
            // For bonus tiles or others, sort by value if available, otherwise by ID
            if (a.value && b.value) return a.value - b.value;
            return (a.id || '').localeCompare(b.id || '');
        });
    }
    
    findTileById(tiles, tileId) {
        return tiles.find(tile => tile.id === tileId);
    }
    
    removeTileById(tiles, tileId) {
        const index = tiles.findIndex(tile => tile.id === tileId);
        if (index !== -1) {
            return tiles.splice(index, 1)[0];
        }
        return null;
    }
}

module.exports = TileManager;