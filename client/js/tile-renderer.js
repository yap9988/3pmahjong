// client/js/tile-renderer.js
// Neutral tile visuals: all tiles rendered like baiban (white).
// Prevents "big fat" white border and small tile image by:
// - removing outer padding/border on container (.tile)
// - placing any thin frame on the <img> itself with box-sizing:border-box
// - ensuring image fills container

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

        // Apply styling based on tile type (container)
        this.applyTileStyle(tileDiv, tile);

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

    applyTileStyle(tileDiv, tile) {
        // Base container styles. Make sure there's NO padding which would shrink image space.
        tileDiv.style.display = 'inline-block';
        tileDiv.style.width = '50px';   // control tile size here
        tileDiv.style.height = '70px';  // control tile size here
        tileDiv.style.margin = '5px';
        tileDiv.style.padding = '0';     // important: no padding
        tileDiv.style.borderRadius = '8px';
        tileDiv.style.boxSizing = 'border-box';
        tileDiv.style.fontWeight = 'bold';
        tileDiv.style.fontSize = '18px';
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
        // Remove colored badges/indicators for winds/dragons/wilds.
        // If you want to show a subtle non-colored badge for some rules, add it here.
        if (tile.isBonus) {
            const bonusBadge = document.createElement('div');
            bonusBadge.style.position = 'absolute';
            bonusBadge.style.top = '4px';
            bonusBadge.style.left = '4px';
            bonusBadge.style.background = 'rgba(255,255,255,0.9)';
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
    createBonusTileDisplay(bonusTiles) {
        const container = document.createElement('div');
        container.className = 'bonus-tiles-container';
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '5px';
        container.style.margin = '10px 0';
        container.style.padding = '6px 0';
        container.style.background = 'transparent';
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

        const title = document.createElement('h3');
        title.textContent = 'Declare Wild Card As:';
        title.style.color = '#fff';
        title.style.textAlign = 'center';
        title.style.marginBottom = '12px';
        container.appendChild(title);

        const optionsContainer = document.createElement('div');
        optionsContainer.style.display = 'grid';
        optionsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        optionsContainer.style.gap = '8px';
        optionsContainer.style.marginBottom = '12px';

        // Dots 1-9 (neutral)
        for (let i = 1; i <= 9; i++) {
            const option = document.createElement('button');
            option.textContent = `${i}筒`;
            option.style.padding = '8px';
            option.style.background = '#fff';
            option.style.color = '#000';
            option.style.border = '1px solid rgba(0,0,0,0.15)';
            option.style.borderRadius = '6px';
            option.style.cursor = 'pointer';
            option.onclick = () => onDeclare('dot', i);
            optionsContainer.appendChild(option);
        }

        // Winds (neutral)
        const winds = ['東', '南', '西', '北'];
        const windValues = ['East', 'South', 'West', 'North'];
        winds.forEach((wind, index) => {
            const option = document.createElement('button');
            option.textContent = wind;
            option.style.padding = '8px';
            option.style.background = '#fff';
            option.style.color = '#000';
            option.style.border = '1px solid rgba(0,0,0,0.15)';
            option.style.borderRadius = '6px';
            option.style.cursor = 'pointer';
            option.onclick = () => onDeclare('wind', windValues[index]);
            optionsContainer.appendChild(option);
        });

        // Dragons (neutral)
        const dragons = ['中', '發', '白'];
        const dragonValues = ['Red', 'Green', 'White'];
        dragons.forEach((dragon, index) => {
            const option = document.createElement('button');
            option.textContent = dragon;
            option.style.padding = '8px';
            option.style.background = '#fff';
            option.style.color = '#000';
            option.style.border = '1px solid rgba(0,0,0,0.15)';
            option.style.borderRadius = '6px';
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
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.width = '100%';
        cancelBtn.onclick = () => container.remove();
        container.appendChild(cancelBtn);

        return container;
    }
}

export default TileRenderer;