const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3002;

// Import managers
const RoomManager = require('./room-manager');
const roomManager = new RoomManager();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Helper to broadcast room list to all clients
const broadcastRoomList = () => {
    io.emit('roomListUpdated', roomManager.getPublicRooms());
};

// Handle Socket.io connections
io.on('connection', (socket) => {
    console.log('👤 Client connected:', socket.id);
    socket.emit('roomListUpdated', roomManager.getPublicRooms());

    // Create room
    socket.on('createRoom', (data) => {
        const { playerName } = data;
        const roomId = 'ROOM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        const player = {
            id: socket.id,
            name: playerName || `Player_${socket.id.substring(0, 4)}`,
            isHost: true
        };
        
        const room = roomManager.createRoom(roomId, player, socket.id);
        socket.join(roomId);
        
        socket.emit('roomCreated', {
            roomId,
            player: player,
            players: room.players,
            isHost: true
        });
        
        broadcastRoomList();
        console.log(`✅ Room ${roomId} created by ${player.name}`);
    });

    // Join room
    socket.on('joinRoom', (data) => {
        const { roomId, playerName } = data;
    
        const room = roomManager.getRoom(roomId);

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            console.log(`❌ Room ${roomId} not found`);
            return;
        }
        
        if (room.status !== 'waiting') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }
        
        if (room.players.length >= 3) {
            socket.emit('error', { message: 'Room is full (3 players max)' });
            return;
        }
        
        const player = {
            id: socket.id,
            name: playerName || `Player_${socket.id.substring(0, 4)}`,
            isHost: false
        };
        
        //const updatedRoom = roomManager.joinRoom(roomId, player);
        const updatedRoom = roomManager.joinRoom(roomId, player, io);
        socket.join(roomId);
        
        // Send to joining player
        socket.emit('joinedRoom', {
            roomId,
            player: player,
            players: updatedRoom.players,
            playerCount: updatedRoom.players.length,
            isHost: false,
            hostId: updatedRoom.host
        });
        
        // Notify everyone in the room
        //io.to(roomId).emit('playerJoined', {
        //    player: player,
        //    players: updatedRoom.players
        //});
        
        broadcastRoomList();
        console.log(`✅ ${player.name} joined ${roomId}. Players: ${updatedRoom.players.length}/3`);
    });

    // Start game
    socket.on('startGame', (roomId) => {
        const { canStart, error, room } = roomManager.canStartGame(roomId, socket.id);
        
        if (!canStart) {
            socket.emit('error', { message: error });
            return;
        }
        
        console.log(`🎮 Starting game in ${roomId}...`);
        
        // Initialize game
        const MalaysiaMahjong3P = require('./game-logic');
        room.game = new MalaysiaMahjong3P();
        room.status = 'playing';
        
        // Initialize game with players
        const gameState = room.game.initializeGame(room.players);


        // In the startGame handler, before emitting:
        console.log('📤 DEBUG: Sending gameStarted to room', roomId);
        console.log('Game state to send:', {
            ...gameState,
            roomId,
            // players comes from gameState now (includes handCount)
        });

        
        // Send game started event to all players
        io.to(roomId).emit('gameStarted', {
            ...gameState,
            roomId
        });
        
        broadcastRoomList(); // Room is now playing, remove from lobby list
        console.log(`✅ Game started in ${roomId}`);
    });

    // Game actions
    const handleGameAction = (action, roomId, data, callback) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }
        
        try {
            const result = room.game[action](socket.id, data);
            if (result.error) {
                socket.emit('error', result);
            } else {
                // Acknowledge caller
                callback(result);

                // Broadcast any relevant updates to the room
                // 1) If the action produced bonus tiles for a player (initial replacements or draws),
                //    inform everyone so they update per-player bonus tiles display.
                if (result.bonusTiles) {
                    io.to(roomId).emit('bonusTilesUpdated', {
                        playerId: socket.id,
                        bonusTiles: result.bonusTiles
                    });
                }

                // 2) If the game state changed in other ways you want to broadcast, consider emitting
                //    a compact update or the full game state here (optional).
                // Example: io.to(roomId).emit('gameStateUpdated', room.game.getGameState());
            }
        } catch (error) {
            console.error('Game action error:', error);
            socket.emit('error', { message: 'Game action failed' });
        }
    };


    // Draw tile
    socket.on('drawTile', (roomId) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) return;
        
        const result = room.game.drawTile(socket.id, false); // Normal draw from front
        if (result.error) {
            socket.emit('error', result);
            return;
        }
        
        socket.emit('tileDrawn', result);

        // Broadcast bonus tiles update if any were drawn
        if (result.drawnBonusTiles && result.drawnBonusTiles.length > 0) {
            io.to(roomId).emit('bonusTilesUpdated', {
                playerId: socket.id,
                bonusTiles: result.bonusTiles
            });
        }

        // Broadcast meld updates if changed (e.g. auto-swap of wild card)
        if (result.meldsChanged) {
            io.to(roomId).emit('gameStateUpdated', room.game.getGameState());
        }

        socket.to(roomId).emit('playerDrewTile', {
            playerId: socket.id,
            dummyWallCount: result.dummyWallCount
        });
    });

    // Discard tile
    socket.on('discardTile', (data) => {
        const { roomId, tileId } = data;
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) return;
        
        const result = room.game.discardTile(socket.id, tileId);
        if (result.error) {
            socket.emit('error', result);
            return;
        }
        
        io.to(roomId).emit('tileDiscarded', {
            playerId: socket.id,
            tile: result.discardedTile,
            currentPlayer: result.currentPlayer,
            currentPlayerWind: result.currentPlayerWind,
            discarderWind: result.discarderWind
        });
        
        socket.emit('handUpdated', { hand: result.playerHand });
    });

    // Declare Pung
    socket.on('declarePung', (data) => {
        const { roomId, tileId, usedTileIds } = data;
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) return;
        
        const result = room.game.declarePung(socket.id, tileId, usedTileIds);
        if (result.error) {
            socket.emit('error', result);
            return;
        }
        
        io.to(roomId).emit('pungDeclared', {
            playerId: socket.id,
            meld: result.meld,
            currentPlayer: result.currentPlayer,
            currentPlayerWind: result.currentPlayerWind,
            fan: result.fan,
            message: result.message
        });
        
        socket.emit('handUpdated', { hand: result.hand });
    });

    // Declare Chi
    socket.on('declareChi', (data) => {
        const { roomId, tileId, usedTileIds } = data;
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) return;

        const result = room.game.declareChi(socket.id, tileId, usedTileIds);
        if (result.error) {
            socket.emit('error', result);
            return;
        }

        io.to(roomId).emit('chiDeclared', {
            playerId: socket.id,
            meld: result.meld,
            currentPlayer: result.currentPlayer,
            message: result.message
        });

        socket.emit('handUpdated', { hand: result.hand });
    });

    // Declare Dan Fei
    socket.on('declareDanFei', (data) => {
        const { roomId, tileId } = data;
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) return;

        const result = room.game.declareDanFei(socket.id, tileId);
        if (result.error) {
            socket.emit('error', result);
            return;
        }

        // 1. Broadcast bonus tiles update
        io.to(roomId).emit('bonusTilesUpdated', {
            playerId: socket.id,
            bonusTiles: result.bonusTiles
        });

        // 2. Update player's hand
        socket.emit('handUpdated', { hand: result.hand });

        // 3. Notify room
        io.to(roomId).emit('danFeiDeclared', {
            playerId: socket.id,
            playerName: room.game.turnManager.getPlayerById(socket.id).name,
            tile: result.tile,
            bonusTiles: result.bonusTiles,
            message: result.message
        });

        // 4. Draw replacement tile from back
        try {
            const drawResult = room.game.drawTile(socket.id, true); // true = fromBack
            
            // Send draw result to player
            socket.emit('tileDrawn', drawResult);

            // Broadcast bonus tiles if draw triggered more bonuses
            if (drawResult.drawnBonusTiles && drawResult.drawnBonusTiles.length > 0) {
                io.to(roomId).emit('bonusTilesUpdated', {
                    playerId: socket.id,
                    bonusTiles: drawResult.bonusTiles
                });
            }
            
            // Broadcast meld updates if changed (e.g. auto-swap of wild card)
            if (drawResult.meldsChanged) {
                io.to(roomId).emit('gameStateUpdated', room.game.getGameState());
            }
            
            // Notify others that player drew
            socket.to(roomId).emit('playerDrewTile', {
                playerId: socket.id,
                dummyWallCount: drawResult.dummyWallCount
            });
        } catch (err) {
            socket.emit('error', { message: 'Failed to draw replacement for Dan Fei' });
        }
    });

    // Get possible kong options (combinations) for the caller for the given discarded tile
    socket.on('getKongOptions', (roomId, tileId, callback) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) {
            if (callback) callback({ error: 'Game not found' });
            return;
        }
        try {
            const result = room.game.getKongOptions(socket.id, tileId);
            if (callback) callback(result);
        } catch (err) {
            console.error('getKongOptions error', err);
            if (callback) callback({ error: 'Failed to compute kong options' });
        }
    });



    // Declare Kong - accept optional usedTileIds from client (array)
    socket.on('declareKong', (roomId, tileId, usedTileIds, cb) => {
        // Allow older clients that send (roomId, tileId) only
        if (Array.isArray(usedTileIds) === false && typeof usedTileIds === 'function') {
            cb = usedTileIds;
            usedTileIds = null;
        }

        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) {
            if (cb) cb({ error: 'Game not found' });
            return;
        }

        try {
            const result = room.game.declareKong(socket.id, tileId, usedTileIds);
            if (result.error) {
                socket.emit('error', result);
                if (cb) cb(result);
                return;
            }

            // Broadcast kongDeclared to everyone
            io.to(roomId).emit('kongDeclared', {
                playerId: socket.id,
                meld: result.meld,
                currentPlayer: result.currentPlayer,
                currentPlayerName: result.currentPlayerName,
                currentPlayerWind: result.currentPlayerWind,
                fan: result.fan,
                message: result.message
            });

            // Send updated hand to kong player
            socket.emit('handUpdated', { hand: result.hand });

            // Now draw for the kong player from the wall and send them the draw result
            try {
                const drawResult = room.game.drawTile(socket.id, true); // Kong replacement from back
                
                // Broadcast bonus tiles update if any were drawn during kong replacement
                if (drawResult.drawnBonusTiles && drawResult.drawnBonusTiles.length > 0) {
                    io.to(roomId).emit('bonusTilesUpdated', {
                        playerId: socket.id,
                        bonusTiles: drawResult.bonusTiles
                    });
                }

                // give a kong-specific message
                const kongDrawPayload = Object.assign({}, drawResult, {
                    kongOrigin: true,
                    message: `You konged and drew ${drawResult.tile ? drawResult.tile.display : 'a tile'}. Please discard one tile.`
                });
                socket.emit('kongDraw', kongDrawPayload);

                // Broadcast full game state after changes
                io.to(roomId).emit('gameStateUpdated', room.game.getGameState());

                if (cb) cb({ success: true });
            } catch (drawErr) {
                console.error('Error drawing after kong:', drawErr);
                socket.emit('error', { error: drawErr.message || 'Draw after kong failed' });
                if (cb) cb({ error: 'Draw failed' });
            }
        } catch (err) {
            console.error('declareKong handler error:', err);
            socket.emit('error', { error: 'declareKong failed' });
            if (cb) cb({ error: 'declareKong failed' });
        }
    });



    // Declare Win
    socket.on('declareWin', (roomId) => {
        const room = roomManager.getRoom(roomId);
        if (!room || !room.game) return;
        
        const result = room.game.checkWin(socket.id);
        if (result.error) {
            socket.emit('error', result);
            return;
        }
        
        if (result.win) {
            // Reset room status to waiting so we can start a new game
            room.status = 'waiting';
            
            // Rotate players so winner becomes East (index 0) for the next game
            const winnerIndex = room.players.findIndex(p => p.id === socket.id);
            if (winnerIndex !== -1 && winnerIndex !== 0) {
                const newOrder = [
                    ...room.players.slice(winnerIndex),
                    ...room.players.slice(0, winnerIndex)
                ];
                room.players = newOrder;
            }
            
            io.to(roomId).emit('gameWon', result);
            
            // Broadcast updated player list (new East)
            io.to(roomId).emit('playerListUpdated', {
                players: room.players,
                playerCount: room.players.length,
                roomId: roomId
            });
            
            console.log(`🎉 Game won in ${roomId}: ${result.message}`);
        }
    });

    // Get room state
    socket.on('getRoomState', (roomId) => {
        const state = roomManager.getRoomState(roomId);
        if (!state) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        socket.emit('roomState', state);
    });

    // Disconnect
    // In the disconnect handler, update the playerLeft emission:
    // In your server.js disconnect handler, replace this section:
    socket.on('disconnect', () => {
        console.log('👋 Client disconnected:', socket.id);
    
        // ✅ FIX: Use roomManager to handle disconnection
        // We need to find which room the player was in first
        let roomIdToUpdate = null;
        let playerName = null;
    
        // First, find which room the player was in
        for (const [roomId, room] of roomManager.rooms) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                playerName = room.players[playerIndex].name;
                roomIdToUpdate = roomId;
                break;
            }
        }
    
        if (!roomIdToUpdate) {
            console.log('Player was not in any room');
            return;
        }
    
        // Remove player using roomManager
        const updatedRoom = roomManager.leaveRoom(roomIdToUpdate, socket.id);
    
        if (!updatedRoom) {
            console.log(`Room ${roomIdToUpdate} was deleted (empty)`);
            return;
        }
    
        console.log(`➖ ${playerName} left ${roomIdToUpdate}. Remaining: ${updatedRoom.players.length}/3`);
    
        // ✅ FIX: Broadcast updated player list to all remaining players
        io.to(roomIdToUpdate).emit('playerListUpdated', {
            players: updatedRoom.players,
            playerCount: updatedRoom.players.length,
            roomId: roomIdToUpdate
        });
    
        // Also send individual notification
        io.to(roomIdToUpdate).emit('playerLeft', {
            playerId: socket.id,
            playerName: playerName,
            playerCount: updatedRoom.players.length
        });
    
        // If host changed, the roomManager should have already updated it
        // Check if we need to notify about new host
        const room = roomManager.getRoom(roomIdToUpdate);
        if (room && room.players.length > 0) {
            const newHost = room.players.find(p => p.isHost);
            if (newHost && newHost.id !== socket.id) {
                // Host changed, notify players
                io.to(roomIdToUpdate).emit('playerListUpdated', {
                    players: room.players,
                    playerCount: room.players.length,
                    roomId: roomIdToUpdate
                });
            }
            broadcastRoomList();
        }
    });



});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🎮 Malaysian 3-Player Mahjong Ready!`);
});