import { Room, Player } from "./types.ts";

const ROOM_TIMEOUT = 60000; // 60 seconds for reconnection window
const DISCONNECT_TIMEOUT = 60000; // 60 seconds before destroying room

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private waitingRoomId: string | null = null;
  private playerRoomMap: Map<string, string> = new Map(); // playerId -> roomId

  /**
   * Find or create a room for a player to join
   */
  findOrCreateRoom(player: Player): Room {
    // Check if there's a waiting room with exactly 1 player
    if (this.waitingRoomId) {
      const waitingRoom = this.rooms.get(this.waitingRoomId);
      if (
        waitingRoom &&
        waitingRoom.players.length === 1 &&
        !waitingRoom.started
      ) {
        // Add player to waiting room
        waitingRoom.players.push(player);
        this.playerRoomMap.set(player.id, waitingRoom.id);
        this.waitingRoomId = null; // Reset waiting room since it's now full
        return waitingRoom;
      }
    }

    // No waiting room, create a new one
    const newRoom: Room = {
      id: this.generateRoomId(),
      players: [player],
      deck: [],
      discardPile: [],
      currentTurn: player.id,
      direction: 1,
      started: false,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.rooms.set(newRoom.id, newRoom);
    this.playerRoomMap.set(player.id, newRoom.id);
    this.waitingRoomId = newRoom.id;

    return newRoom;
  }

  /**
   * Get a specific room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get a player's room
   */
  getPlayerRoom(playerId: string): Room | undefined {
    const roomId = this.playerRoomMap.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Mark a player as disconnected and start cleanup timer
   */
  handlePlayerDisconnect(playerId: string): void {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = false;
    }

    // Set timeout to destroy room if player doesn't reconnect
    setTimeout(() => {
      const currentRoom = this.rooms.get(roomId);
      if (currentRoom && !currentRoom.players.some((p) => p.connected)) {
        this.destroyRoom(roomId);
      }
    }, DISCONNECT_TIMEOUT);
  }

  /**
   * Restore a disconnected player's connection
   */
  restorePlayerConnection(playerId: string, socket: WebSocket): boolean {
    const roomId = this.playerRoomMap.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;

    player.socket = socket;
    player.connected = true;
    room.lastActivityAt = Date.now();

    return true;
  }

  /**
   * Destroy a room and clean up
   */
  destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove all player mappings
    room.players.forEach((player) => {
      this.playerRoomMap.delete(player.id);
    });

    // Remove room
    this.rooms.delete(roomId);

    // Reset waiting room if it was this room
    if (this.waitingRoomId === roomId) {
      this.waitingRoomId = null;
    }
  }

  /**
   * Generate a unique room ID
   */
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all active rooms (for debugging)
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
}

export const roomManager = new RoomManager();
