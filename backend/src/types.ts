// Card types
export type CardColor = "red" | "blue" | "green" | "yellow";
export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9";

export interface Card {
  id: string; // e.g., "red_5", "blue_3"
  color: CardColor;
  value: CardValue;
}

// Player types
export interface Player {
  id: string;
  socket: WebSocket;
  hand: Card[];
  connected: boolean;
}

// Room types
export interface Room {
  id: string;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentTurn: string; // playerId of current turn
  direction: number; // 1 for forward, -1 for reverse (not used in MVP, reserved for future)
  started: boolean;
  createdAt: number;
  lastActivityAt: number;
}

// Game state sent to clients
export interface GameState {
  roomId: string;
  currentTurn: string;
  direction: number;
  topCard: Card | null;
  players: Array<{ id: string; cardCount: number }>;
  hand: Card[]; // Only filled for the receiving player
}

// WebSocket message types
export interface WebSocketMessage {
  type: "PLAY_CARD" | "DRAW_CARD" | "SAY_UNO" | "PING";
  payload: Record<string, unknown>;
}

export interface ServerMessage {
  type:
    | "PLAYER_ASSIGNED"
    | "ROOM_WAITING"
    | "GAME_STARTED"
    | "GAME_STATE"
    | "INVALID_MOVE"
    | "GAME_OVER"
    | "PONG";
  payload: Record<string, unknown>;
}
