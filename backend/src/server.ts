import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { Player, ServerMessage, WebSocketMessage, GameState } from "./types.ts";
import { roomManager } from "./room-manager.ts";
import {
  startGame,
  playCard,
  drawCardFromDeck,
  getGameWinner,
} from "./game/engine.ts";

interface ClientContext {
  playerId: string;
  roomId: string;
  socket: WebSocket;
}

const app = new Hono();
const clients: Map<string, ClientContext> = new Map();

/**
 * Generate a unique player ID
 */
function generatePlayerId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Send message to a player
 */
function sendToPlayer(playerId: string, message: ServerMessage): void {
  const ctx = clients.get(playerId);
  if (ctx && ctx.socket.readyState === WebSocket.OPEN) {
    ctx.socket.send(JSON.stringify(message));
  }
}

/**
 * Broadcast message to all players in a room
 */
function broadcastToRoom(roomId: string, message: ServerMessage): void {
  clients.forEach((ctx) => {
    if (ctx.roomId === roomId && ctx.socket.readyState === WebSocket.OPEN) {
      ctx.socket.send(JSON.stringify(message));
    }
  });
}

/**
 * Serialize room state to GAME_STATE message for a specific player
 */
function serializeGameState(roomId: string, playerId: string): ServerMessage {
  const room = roomManager.getRoom(roomId);

  if (!room) {
    return {
      type: "GAME_STATE",
      payload: { error: "Room not found" },
    };
  }

  const player = room.players.find((p) => p.id === playerId);
  const topCard = room.discardPile[room.discardPile.length - 1] || null;

  const gameState: GameState = {
    roomId: room.id,
    currentTurn: room.currentTurn,
    direction: room.direction,
    topCard,
    players: room.players.map((p) => ({
      id: p.id,
      cardCount: p.hand.length,
    })),
    hand: player?.hand || [],
  };

  return {
    type: "GAME_STATE",
    payload: gameState as unknown as Record<string, unknown>,
  };
}

/**
 * Broadcast game state to all players in a room
 */
function broadcastGameState(roomId: string): void {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  room.players.forEach((player) => {
    sendToPlayer(player.id, serializeGameState(roomId, player.id));
  });
}

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("*", serveStatic({ root: "public" }));

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
    // Handle WebSocket upgrade
    const { socket, response } = Deno.upgradeWebSocket(req);

    // Generate player ID
    const playerId = generatePlayerId();
    const clientCtx: ClientContext = {
      playerId,
      roomId: "",
      socket,
    };

    // Handle WebSocket connection
    socket.addEventListener("open", () => {
      // Create player object
      const player: Player = {
        id: playerId,
        socket,
        hand: [],
        connected: true,
      };

      // Find or create room
      const room = roomManager.findOrCreateRoom(player);
      clientCtx.roomId = room.id;
      clients.set(playerId, clientCtx);

      // Send PLAYER_ASSIGNED message
      const playerAssignedMsg: ServerMessage = {
        type: "PLAYER_ASSIGNED",
        payload: {
          playerId: player.id,
          roomId: room.id,
        },
      };
      socket.send(JSON.stringify(playerAssignedMsg));

      // Send ROOM_WAITING message to all players in room
      const roomWaitingMsg: ServerMessage = {
        type: "ROOM_WAITING",
        payload: {
          playersConnected: room.players.length,
          requiredPlayers: 2,
        },
      };
      broadcastToRoom(room.id, roomWaitingMsg);

      console.log(
        `[${new Date().toISOString()}] Player ${playerId} connected to room ${room.id} (${room.players.length}/2)`,
      );

      // If both players are connected, start the game
      if (room.players.length === 2 && !room.started) {
        const result = startGame(room);
        if (result.success) {
          const gameStartedMsg: ServerMessage = {
            type: "GAME_STARTED",
            payload: {
              startingPlayerId: room.currentTurn,
            },
          };
          broadcastToRoom(room.id, gameStartedMsg);

          // Send initial game state to both players
          broadcastGameState(room.id);

          console.log(
            `[${new Date().toISOString()}] Game started in room ${room.id}`,
          );
        }
      }
    });

    socket.addEventListener("message", (e) => {
      try {
        const msg: WebSocketMessage = JSON.parse(e.data as string);
        console.log(
          `[${new Date().toISOString()}] Message from ${playerId}:`,
          msg.type,
        );

        const room = roomManager.getPlayerRoom(playerId);
        if (!room) {
          console.error(`Player ${playerId} room not found`);
          return;
        }

        switch (msg.type) {
          case "PLAY_CARD": {
            const cardId = msg.payload.cardId as string;
            const result = playCard(room, playerId, cardId);

            if (!result.success) {
              const errorMsg: ServerMessage = {
                type: "INVALID_MOVE",
                payload: { reason: result.error },
              };
              sendToPlayer(playerId, errorMsg);
              // Broadcast current game state to keep client synced
              broadcastGameState(room.id);
            } else {
              // Broadcast updated game state
              broadcastGameState(room.id);

              // Check for winner
              const winner = getGameWinner(room);
              if (winner) {
                const gameOverMsg: ServerMessage = {
                  type: "GAME_OVER",
                  payload: { winnerId: winner },
                };
                broadcastToRoom(room.id, gameOverMsg);

                // Schedule room destruction after 30 seconds
                setTimeout(() => {
                  roomManager.destroyRoom(room.id);
                  console.log(
                    `[${new Date().toISOString()}] Room ${room.id} destroyed after game completion`,
                  );
                }, 30000);
              }
            }
            break;
          }

          case "DRAW_CARD": {
            const result = drawCardFromDeck(room, playerId);

            if (!result.success) {
              const errorMsg: ServerMessage = {
                type: "INVALID_MOVE",
                payload: { reason: result.error },
              };
              sendToPlayer(playerId, errorMsg);
            } else {
              // Broadcast updated game state
              broadcastGameState(room.id);

              // Check for winner
              const winner = getGameWinner(room);
              if (winner) {
                const gameOverMsg: ServerMessage = {
                  type: "GAME_OVER",
                  payload: { winnerId: winner },
                };
                broadcastToRoom(room.id, gameOverMsg);

                // Schedule room destruction after 30 seconds
                setTimeout(() => {
                  roomManager.destroyRoom(room.id);
                  console.log(
                    `[${new Date().toISOString()}] Room ${room.id} destroyed after game completion`,
                  );
                }, 30000);
              }
            }
            break;
          }

          case "PING": {
            const pongMsg: ServerMessage = {
              type: "PONG",
              payload: {},
            };
            sendToPlayer(playerId, pongMsg);
            break;
          }

          default:
            console.warn(`Unknown message type: ${msg.type}`);
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    });

    socket.addEventListener("close", () => {
      console.log(
        `[${new Date().toISOString()}] Player ${playerId} disconnected`,
      );

      const room = roomManager.getPlayerRoom(playerId);
      if (room) {
        roomManager.handlePlayerDisconnect(playerId);
        console.log(
          `[${new Date().toISOString()}] Room ${room.id} marked for cleanup after disconnect`,
        );
      }

      clients.delete(playerId);
    });

    socket.addEventListener("error", (e) => {
      console.error("WebSocket error:", e);
    });

    return response;
  }

  // Use Hono for regular HTTP routes
  return app.fetch(req);
};

const port = 8000;
Deno.serve({ port }, handler);
