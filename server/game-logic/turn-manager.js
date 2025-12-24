class TurnManager {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.windRound = 'East';
        this.playerWinds = {};
    }
    
    initializePlayers(playerList) {
        const seatWinds = ['East', 'South', 'West'];
        this.players = playerList.map((player, index) => ({
            id: player.id,
            name: player.name,
            hand: [],
            melds: [],
            seatWind: seatWinds[index],
            roundWind: 'East',
            score: 0,
            isHost: player.isHost || false,
            canDraw: (index === 0) // Only East starts with draw permission
        }));
        
        // Store wind mapping
        this.players.forEach(player => {
            this.playerWinds[player.id] = player.seatWind;
        });
        
        this.currentPlayerIndex = 0; // East starts
        console.log('TurnManager: Players initialized. Current player:', this.getCurrentPlayer().name);
    }
    
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    
    getPlayerById(playerId) {
        return this.players.find(p => p.id === playerId);
    }
    
    isValidTurn(playerId) {
        const currentPlayer = this.getCurrentPlayer();
        return currentPlayer.id === playerId;
    }
    
    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        const nextPlayer = this.getCurrentPlayer();
        console.log('TurnManager: Next turn -', nextPlayer.name);
        return nextPlayer;
    }
    
    setCurrentPlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.currentPlayerIndex = index;
            console.log('TurnManager: Set current player to', this.getCurrentPlayer().name);
        }
    }
    
    getPlayerWind(playerId) {
        return this.playerWinds[playerId] || 'East';
    }
    
    getAllPlayers() {
        return this.players.map(p => ({
            id: p.id,
            name: p.name,
            seatWind: p.seatWind,
            handCount: p.hand.length,
            melds: p.melds, // Send full melds array so client can render them
            score: p.score,
            isHost: p.isHost
        }));
    }
}

module.exports = TurnManager;