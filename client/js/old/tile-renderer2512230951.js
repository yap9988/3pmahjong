class TileRenderer {
    createTileElement(tile) {
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile';
        tileDiv.dataset.id = tile.id;
        tileDiv.title = `${tile.display} (${tile.chinese || ''})`;
        
        // Style based on tile type
        if (tile.type === 'dot') {
            tileDiv.style.background = '#ffffff';
            tileDiv.style.color = '#000000';
            tileDiv.style.border = '2px solid #333';
        } else if (tile.type === 'wind') {
            tileDiv.style.background = 'linear-gradient(135deg, #FFEB3B, #FFC107)';
            tileDiv.style.color = '#000000';
            tileDiv.style.border = '2px solid #FF9800';
        } else if (tile.type === 'dragon') {
            const dragonColors = {
                'Red': '#f44336',
                'Green': '#4CAF50',
                'White': '#ffffff'
            };
            tileDiv.style.background = dragonColors[tile.value] || '#9C27B0';
            tileDiv.style.color = tile.value === 'White' ? '#000000' : '#ffffff';
            tileDiv.style.border = `2px solid ${dragonColors[tile.value] || '#7B1FA2'}`;
        }
        
        tileDiv.style.display = 'inline-block';
        tileDiv.style.padding = '10px';
        tileDiv.style.margin = '5px';
        tileDiv.style.borderRadius = '8px';
        tileDiv.style.cursor = 'pointer';
        tileDiv.style.textAlign = 'center';
        tileDiv.style.minWidth = '50px';
        tileDiv.style.fontWeight = 'bold';
        tileDiv.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.2)';
        tileDiv.style.transition = 'transform 0.2s';
        
        tileDiv.addEventListener('mouseenter', () => {
            tileDiv.style.transform = 'translateY(-5px)';
        });
        
        tileDiv.addEventListener('mouseleave', () => {
            tileDiv.style.transform = 'translateY(0)';
        });
        
        tileDiv.innerHTML = `<strong>${tile.chinese || tile.display}</strong>`;
        
        return tileDiv;
    }
}

export default TileRenderer;