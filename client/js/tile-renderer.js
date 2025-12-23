class TileRenderer {
    createTileElement(tile, isClickable = false) {
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile';
        tileDiv.dataset.id = tile.id;
        tileDiv.dataset.type = tile.type;
        tileDiv.dataset.value = tile.value;
        
        // Set title/tooltip
        const tileName = this.getTileFullName(tile);
        tileDiv.title = tileName;
        
        // Apply styling based on tile type
        this.applyTileStyle(tileDiv, tile);
        
        // Add content
        tileDiv.innerHTML = this.getTileContent(tile);
        
        // Add special indicators
        this.addSpecialIndicators(tileDiv, tile);
        
        return tileDiv;
    }
    
    getTileFullName(tile) {
        if (tile.isWild) return '飛 (Wild Card) - Can be any tile';
        if (tile.isBonus) {
            const bonusNames = {
                'season': 'Season',
                'flower': 'Flower', 
                'animal': 'Animal',
                'face': 'Face'
            };
            return `${tile.display} (${bonusNames[tile.bonusType] || 'Bonus'})`;
        }
        return `${tile.display} (${tile.chinese || ''})`;
    }
    
    applyTileStyle(tileDiv, tile) {
        // Base styles
        tileDiv.style.display = 'inline-block';
        tileDiv.style.width = '50px';
        tileDiv.style.height = '70px';
        tileDiv.style.margin = '5px';
        tileDiv.style.borderRadius = '8px';
        tileDiv.style.textAlign = 'center';
        tileDiv.style.lineHeight = '70px';
        tileDiv.style.fontWeight = 'bold';
        tileDiv.style.fontSize = '18px';
        tileDiv.style.cursor = 'pointer';
        tileDiv.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.3)';
        tileDiv.style.transition = 'transform 0.2s';
        tileDiv.style.position = 'relative';
        
        // Color coding by tile type
        if (tile.isWild) {
            // Wild cards - special styling
            tileDiv.style.background = 'linear-gradient(135deg, #9C27B0, #7B1FA2)';
            tileDiv.style.color = '#FFFFFF';
            tileDiv.style.border = '3px dashed #FFEB3B';
            tileDiv.style.fontSize = '24px';
        } else if (tile.isBonus) {
            // Bonus tiles - different colors by type
            const bonusColors = {
                'season': '#4CAF50',    // Green for seasons
                'flower': '#2196F3',    // Blue for flowers
                'animal': '#FF9800',    // Orange for animals
                'face': '#E91E63'       // Pink for faces
            };
            tileDiv.style.background = bonusColors[tile.bonusType] || '#9E9E9E';
            tileDiv.style.color = '#FFFFFF';
            tileDiv.style.border = '2px solid #FFFFFF';
        } else if (tile.type === 'dot') {
            // Dots
            tileDiv.style.background = '#FFFFFF';
            tileDiv.style.color = '#000000';
            tileDiv.style.border = '2px solid #333333';
        } else if (tile.type === 'dragon') {
            // Dragons
            const dragonColors = {
                'Red': '#F44336',
                'Green': '#4CAF50', 
                'White': '#FFFFFF'
            };
            tileDiv.style.background = dragonColors[tile.value] || '#9C27B0';
            tileDiv.style.color = tile.value === 'White' ? '#000000' : '#FFFFFF';
            tileDiv.style.border = `2px solid ${dragonColors[tile.value] || '#7B1FA2'}`;
        } else if (tile.type === 'wind') {
            // Winds
            tileDiv.style.background = 'linear-gradient(135deg, #FFEB3B, #FBC02D)';
            tileDiv.style.color = '#000000';
            tileDiv.style.border = '2px solid #FF9800';
            
            // Special highlight for North wind
            if (tile.value === 'North') {
                tileDiv.style.border = '3px solid #2196F3';
            }
        }
        
        // Hover effect
        tileDiv.addEventListener('mouseenter', () => {
            tileDiv.style.transform = 'translateY(-5px) scale(1.05)';
            tileDiv.style.zIndex = '10';
        });
        
        tileDiv.addEventListener('mouseleave', () => {
            tileDiv.style.transform = 'translateY(0) scale(1)';
            tileDiv.style.zIndex = '1';
        });
    }
    
    getTileContent(tile) {
        if (tile.isWild) {
            return '<div style="font-size: 28px;">飛</div>';
        }
        
        // For bonus tiles, show both symbol and number if applicable
        if (tile.isBonus) {
            let content = `<div>${tile.display}</div>`;
            if (tile.value && typeof tile.value === 'number') {
                content += `<div style="font-size: 12px; position: absolute; bottom: 2px; right: 2px;">${tile.value}</div>`;
            }
            return content;
        }
        
        // Regular tiles
        return `<div>${tile.display}</div>`;
    }
    
    addSpecialIndicators(tileDiv, tile) {
        // Add wild card indicator
        if (tile.isWild) {
            const wildBadge = document.createElement('div');
            wildBadge.style.position = 'absolute';
            wildBadge.style.top = '2px';
            wildBadge.style.right = '2px';
            wildBadge.style.background = '#FFEB3B';
            wildBadge.style.color = '#000000';
            wildBadge.style.fontSize = '10px';
            wildBadge.style.padding = '1px 4px';
            wildBadge.style.borderRadius = '3px';
            //wildBadge.textContent = 'W';
            //wildBadge.title = 'Wild Card';
            tileDiv.appendChild(wildBadge);
        }
        
        // Add bonus tile indicator
        if (tile.isBonus) {
            const bonusBadge = document.createElement('div');
            bonusBadge.style.position = 'absolute';
            bonusBadge.style.top = '2px';
            bonusBadge.style.left = '2px';
            bonusBadge.style.background = '#FFFFFF';
            bonusBadge.style.color = '#000000';
            bonusBadge.style.fontSize = '10px';
            bonusBadge.style.padding = '1px 4px';
            bonusBadge.style.borderRadius = '3px';
            //bonusBadge.textContent = 'B';
            //bonusBadge.title = 'Bonus Tile';
            tileDiv.appendChild(bonusBadge);
        }
        
        // Add North wind indicator (special 1-fan for all)
        if (tile.type === 'wind' && tile.value === 'North') {
            const northBadge = document.createElement('div');
            northBadge.style.position = 'absolute';
            northBadge.style.bottom = '2px';
            northBadge.style.left = '2px';
            northBadge.style.background = '#2196F3';
            northBadge.style.color = '#FFFFFF';
            northBadge.style.fontSize = '10px';
            northBadge.style.padding = '1px 4px';
            northBadge.style.borderRadius = '3px';
            //northBadge.textContent = 'N';
            //northBadge.title = 'North Wind (1 fan for all)';
            tileDiv.appendChild(northBadge);
        }
        
        // Add East wind indicator (2 fans for East player)
        if (tile.type === 'wind' && tile.value === 'East') {
            const eastBadge = document.createElement('div');
            eastBadge.style.position = 'absolute';
            eastBadge.style.bottom = '2px';
            eastBadge.style.right = '2px';
            eastBadge.style.background = '#4CAF50';
            eastBadge.style.color = '#FFFFFF';
            eastBadge.style.fontSize = '10px';
            eastBadge.style.padding = '1px 4px';
            eastBadge.style.borderRadius = '3px';
            //eastBadge.textContent = 'E²';
            //eastBadge.title = 'East Wind (2 fans for East player)';
            tileDiv.appendChild(eastBadge);
        }
    }
    
    // Create bonus tiles display
    createBonusTileDisplay(bonusTiles) {
        const container = document.createElement('div');
        container.className = 'bonus-tiles-container';
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '5px';
        container.style.margin = '10px 0';
        container.style.padding = '10px';
        container.style.background = 'rgba(255, 255, 255, 0.1)';
        container.style.borderRadius = '8px';
        
        if (!bonusTiles || bonusTiles.length === 0) {
            container.innerHTML = '<div style="color: #ccc;">No bonus tiles</div>';
            return container;
        }
        
        bonusTiles.forEach(tile => {
            const tileElement = this.createTileElement(tile);
            tileElement.style.width = '40px';
            tileElement.style.height = '56px';
            tileElement.style.fontSize = '14px';
            container.appendChild(tileElement);
        });
        
        return container;
    }
    
    // Create wild card declaration interface
    createWildCardDeclarationInterface(wildCard, onDeclare) {
        const container = document.createElement('div');
        container.className = 'wild-card-declaration';
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.background = 'rgba(0, 0, 0, 0.9)';
        container.style.padding = '30px';
        container.style.borderRadius = '15px';
        container.style.zIndex = '1000';
        container.style.border = '3px solid #FFEB3B';
        container.style.minWidth = '300px';
        
        // Show the wild card
        const wildCardDisplay = this.createTileElement(wildCard);
        wildCardDisplay.style.margin = '0 auto 20px';
        wildCardDisplay.style.display = 'block';
        container.appendChild(wildCardDisplay);
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Declare Wild Card As:';
        title.style.color = '#FFEB3B';
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        container.appendChild(title);
        
        // Declaration options
        const optionsContainer = document.createElement('div');
        optionsContainer.style.display = 'grid';
        optionsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        optionsContainer.style.gap = '10px';
        optionsContainer.style.marginBottom = '20px';
        
        // Dots 1-9
        for (let i = 1; i <= 9; i++) {
            const option = document.createElement('button');
            option.textContent = `${i}筒`;
            option.style.padding = '10px';
            option.style.background = '#FFFFFF';
            option.style.color = '#000000';
            option.style.border = '2px solid #333';
            option.style.borderRadius = '5px';
            option.style.cursor = 'pointer';
            option.onclick = () => onDeclare('dot', i);
            optionsContainer.appendChild(option);
        }
        
        // Winds
        const winds = ['東', '南', '西', '北'];
        const windValues = ['East', 'South', 'West', 'North'];
        winds.forEach((wind, index) => {
            const option = document.createElement('button');
            option.textContent = wind;
            option.style.padding = '10px';
            option.style.background = '#FFEB3B';
            option.style.color = '#000000';
            option.style.border = '2px solid #FF9800';
            option.style.borderRadius = '5px';
            option.style.cursor = 'pointer';
            option.onclick = () => onDeclare('wind', windValues[index]);
            optionsContainer.appendChild(option);
        });
        
        // Dragons
        const dragons = ['中', '發', '白'];
        const dragonValues = ['Red', 'Green', 'White'];
        dragons.forEach((dragon, index) => {
            const option = document.createElement('button');
            option.textContent = dragon;
            option.style.padding = '10px';
            option.style.background = dragon === '白' ? '#FFFFFF' : '#4CAF50';
            option.style.color = dragon === '白' ? '#000000' : '#FFFFFF';
            option.style.border = `2px solid ${dragon === '白' ? '#333' : '#2E7D32'}`;
            option.style.borderRadius = '5px';
            option.style.cursor = 'pointer';
            option.onclick = () => onDeclare('dragon', dragonValues[index]);
            optionsContainer.appendChild(option);
        });
        
        container.appendChild(optionsContainer);
        
        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.padding = '10px 20px';
        cancelBtn.style.background = '#f44336';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '5px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.width = '100%';
        cancelBtn.onclick = () => container.remove();
        container.appendChild(cancelBtn);
        
        return container;
    }
}

export default TileRenderer;