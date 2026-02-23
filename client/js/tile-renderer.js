// client/js/tile-renderer.js
// Neutral tile visuals: all tiles rendered like baiban (white).
// Prevents "big fat" white border and small tile image by:
// - removing outer padding/border on container (.tile)
// - placing any thin frame on the <img> itself with box-sizing:border-box
// - ensuring image fills container

class TileRenderer {

    createTileElement(tile, isClickable = false, scale = 1.0) {
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile';
        tileDiv.dataset.id = tile.id;
        tileDiv.dataset.type = tile.type;
        tileDiv.dataset.value = tile.value;

        // Set title/tooltip
        const tileName = this.getTileFullName(tile);
        tileDiv.title = tileName;

        // Apply styling based on tile type (container)
        this.applyTileStyle(tileDiv, tile, scale);

        // Add content: use an <img> that fills the container. Border goes on the image (box-sizing:border-box)
        const img = document.createElement('img');
        img.alt = tileName;

        // Make image fill the tile container exactly
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover'; // cover so image fills; change to 'contain' if you prefer letterbox
        img.style.borderRadius = '6px';

        // Put the thin frame (if desired) on the image itself and include it in the image size
        // Use a subtle 1px or 2px border — it will not shrink the inner image thanks to box-sizing
        img.style.boxSizing = 'border-box';
        img.style.border = '1px solid rgba(0,0,0,0.08)'; // subtle frame; change to '#FFFFFF' if you want white frame

        // Compute image path from tile.id (normalize to safe filename)
        const safeFileName = this.getTileImageFileName(tile);
        img.src = `/assets/tiles/${safeFileName}`;

        // If image fails to load, fallback to text
        img.onerror = () => {
            if (img.parentNode) img.parentNode.removeChild(img);
            // Insert fallback content without extra padding so size stays consistent
            const fallback = document.createElement('div');
            fallback.style.width = '100%';
            fallback.style.height = '100%';
            fallback.style.display = 'flex';
            fallback.style.alignItems = 'center';
            fallback.style.justifyContent = 'center';
            fallback.style.fontSize = '20px';
            fallback.style.boxSizing = 'border-box';
            fallback.innerHTML = this.getTileTextContent(tile);
            tileDiv.appendChild(fallback);
            this.addSpecialIndicators(tileDiv, tile);
        };

        tileDiv.appendChild(img);

        // Add special indicators (kept minimal / removed colored badges)
        this.addSpecialIndicators(tileDiv, tile);

        return tileDiv;
    }

    // Helper: create a safe filename from tile.id or tile properties
    getTileImageFileName(tile) {
        if (tile.imagePath) {
            return tile.imagePath.split('/').pop();
        }
        const raw = tile.id || `${tile.type}-${tile.value}`;
        const filename = raw.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
        return filename;
    }

    // Fallback textual content (used when image missing)
    getTileTextContent(tile) {
        if (tile.isWild) {
            return '<div style="font-size: 28px;">飛</div>';
        }

        if (tile.isBonus) {
            // If you want bonus tiles to be neutral too, return tile.display only.
            return `<div>${tile.display}</div>`;
        }

        // Regular tiles (neutral baiban look)
        return `<div>${tile.display}</div>`;
    }

    getTileFullName(tile) {
        if (tile.isWild) return '飛 (Wild Card)';
        if (tile.isBonus) {
            const bonusNames = { 'season': 'Season', 'flower': 'Flower', 'animal': 'Animal', 'face': 'Face' };
            return `${tile.display} (${bonusNames[tile.bonusType] || 'Bonus'})`;
        }
        return `${tile.display} (${tile.chinese || ''})`;
    }

    applyTileStyle(tileDiv, tile, scale = 1.0) {
        // Base container styles. Make sure there's NO padding which would shrink image space.
        const baseSize = 6 * scale; // Base size in vmin (increased for better visibility on mobile)
        const aspectRatio = 1.4; // height / width

        tileDiv.style.display = 'inline-block';
        tileDiv.style.width = `${baseSize}vmin`;
        tileDiv.style.height = `${baseSize * aspectRatio}vmin`;
        tileDiv.style.margin = '0 1px'; // Tight spacing ("stick together")
        tileDiv.style.flexShrink = '1'; // Allow tiles to shrink in flex containers
        tileDiv.style.minWidth = '0'; // Allow flex shrink in hand container
        tileDiv.style.padding = '0';     // important: no padding
        tileDiv.style.borderRadius = `${baseSize * 0.1}vmin`;
        tileDiv.style.boxSizing = 'border-box';
        tileDiv.style.fontWeight = 'bold';
        tileDiv.style.fontSize = `${baseSize * 0.35}vmin`; // Responsive font size
        tileDiv.style.cursor = 'pointer';
        tileDiv.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.12)';
        tileDiv.style.position = 'relative';
        tileDiv.style.overflow = 'hidden';
        tileDiv.style.background = '#FFFFFF'; // neutral white background for baiban look
        tileDiv.style.color = '#000000';
        tileDiv.style.border = 'none'; // no outer border on container; border placed on image
    }

    getTileContent(tile) {
        if (tile.isWild) {
            return '<div style="font-size: 28px;">飛</div>';
        }
        if (tile.isBonus) {
            return `<div>${tile.display}</div>`;
        }
        return `<div>${tile.display}</div>`;
    }

    addSpecialIndicators(tileDiv, tile) {
        // Wild tile indicator (keeps tile visually distinct)
        if (tile.isWild) {
            const wildBadge = document.createElement('div');
            wildBadge.style.position = 'absolute';
            wildBadge.style.top = '2px';
            wildBadge.style.right = '2px';
            wildBadge.style.background = '#FFEB3B';
            wildBadge.style.color = '#000';
            wildBadge.style.fontSize = '10px';
            wildBadge.style.padding = '1px 4px';
            wildBadge.style.borderRadius = '3px';
            //wildBadge.textContent = 'W';
            wildBadge.title = 'Wild tile (飛)';
            if (tile.declaredAs && tile.declaredAs.value) {
                wildBadge.title = `Declared as ${tile.declaredAs.value} ${tile.declaredAs.type}`;
            }
            tileDiv.appendChild(wildBadge);
        }

        // Bonus badge (keep small)
        if (tile.isBonus) {
            const bonusBadge = document.createElement('div');
            bonusBadge.style.position = 'absolute';
            bonusBadge.style.top = '2px';
            bonusBadge.style.left = '2px';
            bonusBadge.style.background = '#FFFFFF';
            bonusBadge.style.color = '#000';
            bonusBadge.style.fontSize = '10px';
            bonusBadge.style.padding = '1px 4px';
            bonusBadge.style.borderRadius = '3px';
            //bonusBadge.textContent = 'B';
            bonusBadge.title = 'Bonus Tile';
            tileDiv.appendChild(bonusBadge);
        }
    }


    // Bonus tiles display (keeps small tiles consistent)
    createBonusTileDisplay(bonusTiles, scale = 1.0) {
        const container = document.createElement('div');
        container.className = 'bonus-tiles-container';
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '2px';
        container.style.margin = '10px 0';
        container.style.padding = '6px 0';
        container.style.background = 'transparent';
        container.style.borderRadius = '8px';

        if (!bonusTiles || bonusTiles.length === 0) {
            container.innerHTML = '<div style="color: #ccc;">No bonus tiles</div>';
            return container;
        }

        bonusTiles.forEach(tile => {
            const tileElement = this.createTileElement(tile, false, scale);
            container.appendChild(tileElement);
        });

        return container;
    }

    // Create side hand (backs of tiles)
    createSideHandCount(count, side) {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column'; // Stack vertically for side view
        container.style.alignItems = 'center'; // Fix: Prevent tiles from stretching horizontally
        // Reset container sizing to prevent external CSS interference
        container.style.width = 'auto';
        container.style.height = 'auto';

        const imgPath = side === 'left' ? '/assets/tile_left.png' : '/assets/tile_right.png';
        
        // Determine rotation to make tiles face center
        const rotation = side === 'left' ? '90deg' : '-90deg';
        
        for (let i = 0; i < count; i++) {
            // Use div instead of img to prevent broken image icon layout issues
            const tileDiv = document.createElement('div');
            const sideWidth = 4.5; // vmin 
            const sideHeight = sideWidth * 1.4; // vmin (aspect ratio)
            
            tileDiv.style.width = `${sideWidth}vmin`;
            tileDiv.style.height = `${sideHeight}vmin`;
            
            // Rotate the tile to face center
            tileDiv.style.transform = `rotate(${rotation})`;
            
            // Only apply negative margin to stack tiles, not the last one
            // Visual height is now sideWidth (1.6). Layout height is sideHeight (3.2).
            // We need to pull them up by roughly (3.2 - 1.6) = 1.6 to stack them.
            if (i < count - 1) {
                tileDiv.style.marginBottom = `-${sideHeight * 0.62}vmin`;
            }
            
            tileDiv.style.flex = '0 0 auto';
            tileDiv.style.backgroundColor = '#1565C0'; // Fallback color
            tileDiv.style.backgroundImage = `url('${imgPath}')`;
            tileDiv.style.backgroundSize = 'cover';
            tileDiv.style.backgroundPosition = 'center';
            tileDiv.style.borderRadius = '2px';
            tileDiv.style.border = '1px solid rgba(0,0,0,0.2)';
            tileDiv.style.boxSizing = 'border-box';
            
            container.appendChild(tileDiv);
        }

        return container;
    }

    // Wild card declaration UI: neutral buttons for winds/dragons/dots
    createWildCardDeclarationInterface(wildCard, onDeclare) {
        const container = document.createElement('div');
        container.className = 'wild-card-declaration';
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.background = 'rgba(0, 0, 0, 0.9)';
        container.style.padding = '30px';
        container.style.borderRadius = '12px';
        container.style.zIndex = '1000';
        container.style.border = '2px solid rgba(255,255,255,0.08)';
        container.style.minWidth = '320px';

        const wildCardDisplay = this.createTileElement(wildCard);
        wildCardDisplay.style.margin = '0 auto 16px';
        wildCardDisplay.style.display = 'block';
        container.appendChild(wildCardDisplay);

        // --- Dan Fei Button (New) ---
        const danFeiBtn = document.createElement('button');
        danFeiBtn.textContent = 'Dan Fei (Play as Bonus)';
        danFeiBtn.style.display = 'block';
        danFeiBtn.style.width = '100%';
        danFeiBtn.style.padding = '12px';
        danFeiBtn.style.background = '#FF9800'; // Orange
        danFeiBtn.style.color = 'white';
        danFeiBtn.style.border = 'none';
        danFeiBtn.style.borderRadius = '6px';
        danFeiBtn.style.cursor = 'pointer';
        danFeiBtn.style.marginBottom = '20px';
        danFeiBtn.style.fontWeight = 'bold';
        danFeiBtn.style.fontSize = '1.1em';
        danFeiBtn.onclick = () => onDeclare('danfei', null);
        container.appendChild(danFeiBtn);
        // ---------------------------

        // Discard button
        const discardBtn = document.createElement('button');
        discardBtn.textContent = 'Discard Tile';
        discardBtn.style.padding = '10px 20px';
        discardBtn.style.background = '#607D8B'; // Grey/Blue
        discardBtn.style.color = 'white';
        discardBtn.style.border = 'none';
        discardBtn.style.borderRadius = '6px';
        discardBtn.style.cursor = 'pointer';
        discardBtn.style.width = '100%';
        discardBtn.style.marginBottom = '10px';
        discardBtn.onclick = () => onDeclare('discard', null);
        container.appendChild(discardBtn);

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.padding = '10px 20px';
        cancelBtn.style.background = '#f44336';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.width = '100%';
        cancelBtn.onclick = () => container.remove();
        container.appendChild(cancelBtn);

        return container;
    }
}

export default TileRenderer;