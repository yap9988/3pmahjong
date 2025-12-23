class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    
    createRoom(roomId, player, socketId) {
        const room = {
            id: roomId,
            players: [player],
            host: socketId,
            status: 'waiting',
            game: null,
            createdAt: Date.now()
        };
        
        this.rooms.set(roomId, room);
        console.log('RoomManager: Room created', roomId, 'with player:', player.name);
        return room;
    }
    
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    
    
  // Add this method to your RoomManager class:
  broadcastPlayerList(roomId, io) {
      const room = this.getRoom(roomId);
      if (!room || !io) return;
    
      // Broadcast updated player list to ALL players in the room
      io.to(roomId).emit('playerListUpdated', {
          players: room.players,
          playerCount: room.players.length,
          roomId: roomId
      });
    
      console.log(`RoomManager: Broadcast player list for ${roomId} (${room.players.length}/3)`);
  }

  // Update the joinRoom method to call broadcast:
  joinRoom(roomId, player, io = null) {
      const room = this.getRoom(roomId);
      if (!room) return null;
    
      room.players.push(player);
      console.log('RoomManager: Player', player.name, 'joined', roomId, 'Total:', room.players.length);
    
      // ✅ BROADCAST to all players if io is provided
      if (io) {
          this.broadcastPlayerList(roomId, io);
      }
    
      return room;
  }
    
    leaveRoom(roomId, playerId) {
        const room = this.getRoom(roomId);
        if (!room) return null;
        
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return room;
        
        const player = room.players.splice(playerIndex, 1)[0];
        console.log('RoomManager: Player left', roomId, 'Remaining:', room.players.length);
        
        // If room empty, delete it
        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            console.log('RoomManager: Room deleted (empty)', roomId);
            return null;
        }
        
        // If host left, assign new host
        if (room.host === playerId) {
            room.host = room.players[0].id;
            room.players[0].isHost = true;
            console.log('RoomManager: New host assigned:', room.host);
        }
        
        return room;
    }
    
    canStartGame(roomId, socketId) {
        const room = this.getRoom(roomId);
        if (!room) return { canStart: false, error: 'Room not found' };
        
        if (room.host !== socketId) {
            return { canStart: false, error: 'Only host can start game' };
        }
        
        if (room.players.length !== 3) {
            return { canStart: false, error: 'Need exactly 3 players' };
        }
        
        if (room.status !== 'waiting') {
            return { canStart: false, error: 'Game already in progress' };
        }
        
        return { canStart: true, room };
    }
    
    getRoomState(roomId) {
        const room = this.getRoom(roomId);
        if (!room) return null;
        
        return {
            roomId: room.id,
            players: room.players,
            host: room.host,
            status: room.status,
            gameState: room.game ? room.game.getGameState() : null
        };
    }
    
    cleanupEmptyRooms() {
        let deletedCount = 0;
        for (const [roomId, room] of this.rooms) {
            if (room.players.length === 0) {
                this.rooms.delete(roomId);
                deletedCount++;
            }
        }
        if (deletedCount > 0) {
            console.log('RoomManager: Cleaned up', deletedCount, 'empty rooms');
        }
    }
}

module.exports = RoomManager;