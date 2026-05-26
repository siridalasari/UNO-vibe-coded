import {
  assertEquals,
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  startGame,
  playCard,
  drawCardFromDeck,
  getGameWinner,
} from "../engine.ts";
import { Room, Player } from "../../types.ts";

function createTestRoom(): Room {
  const mockSocket = { readyState: WebSocket.OPEN } as any;

  return {
    id: "test_room",
    players: [
      { id: "p1", socket: mockSocket, hand: [], connected: true },
      { id: "p2", socket: mockSocket, hand: [], connected: true },
    ],
    deck: [],
    discardPile: [],
    currentTurn: "p1",
    direction: 1,
    started: false,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };
}

Deno.test("startGame: initializes game correctly", () => {
  const room = createTestRoom();

  const result = startGame(room);

  assertEquals(result.success, true);
  assertEquals(room.started, true);
  assertEquals(room.players[0].hand.length, 7);
  assertEquals(room.players[1].hand.length, 7);
  assert(room.deck.length > 0);
  assert(room.discardPile.length > 0);
  assertEquals(room.currentTurn, "p1");
});

Deno.test("startGame: fails if already started", () => {
  const room = createTestRoom();
  startGame(room);

  const result = startGame(room);

  assertEquals(result.success, false);
  assertStringIncludes(result.error || "", "already started");
});

Deno.test("startGame: fails with < 2 players", () => {
  const room = createTestRoom();
  room.players = [room.players[0]];

  const result = startGame(room);

  assertEquals(result.success, false);
  assertStringIncludes(result.error || "", "at least 2");
});

Deno.test("playCard: valid move changes turn", () => {
  const room = createTestRoom();
  startGame(room);

  // Strategy: keep trying cards until we find a valid one
  let validCard = null;
  let cardIndex = -1;
  const topCard = room.discardPile[room.discardPile.length - 1];

  for (let i = 0; i < room.players[0].hand.length; i++) {
    const card = room.players[0].hand[i];
    if (card.color === topCard.color || card.value === topCard.value) {
      validCard = card;
      cardIndex = i;
      break;
    }
  }

  if (!validCard) {
    // If no valid cards, skip this test
    return;
  }

  const originalHandSize = room.players[0].hand.length;

  const result = playCard(room, "p1", validCard.id);

  assertEquals(result.success, true);
  assertEquals(room.players[0].hand.length, originalHandSize - 1);
  assertEquals(room.currentTurn, "p2");
  assertEquals(room.discardPile[room.discardPile.length - 1].id, validCard.id);
});

Deno.test("playCard: fails on wrong turn", () => {
  const room = createTestRoom();
  startGame(room);

  // Try to play p2's card when it's p1's turn
  const card = room.players[1].hand[0];

  const result = playCard(room, "p2", card.id);

  assertEquals(result.success, false);
  assertStringIncludes(result.error || "", "turn");
});

Deno.test("playCard: fails with invalid move", () => {
  const room = createTestRoom();
  startGame(room);

  // Top card on discard pile
  const topCard = room.discardPile[room.discardPile.length - 1];

  // Find a card that doesn't match
  let invalidCard = null;
  for (const card of room.players[0].hand) {
    if (card.color !== topCard.color && card.value !== topCard.value) {
      invalidCard = card;
      break;
    }
  }

  if (invalidCard) {
    // Swap hand to guarantee invalid card is playable
    const tempCard = room.players[0].hand[0];
    const idx = room.players[0].hand.indexOf(invalidCard);
    room.players[0].hand[0] = invalidCard;
    room.players[0].hand[idx] = tempCard;

    const result = playCard(room, "p1", invalidCard.id);
    assertEquals(result.success, false);
  }
});

Deno.test("playCard: fails card not in hand", () => {
  const room = createTestRoom();
  startGame(room);

  const result = playCard(room, "p1", "nonexistent_card");

  assertEquals(result.success, false);
  assertStringIncludes(result.error || "", "not in hand");
});

Deno.test("drawCardFromDeck: draws card to hand", () => {
  const room = createTestRoom();
  startGame(room);

  const originalHandSize = room.players[0].hand.length;
  const originalDeckSize = room.deck.length;

  const result = drawCardFromDeck(room, "p1");

  assertEquals(result.success, true);
  assertEquals(room.players[0].hand.length, originalHandSize + 1);
  assertEquals(room.currentTurn, "p2");
});

Deno.test("drawCardFromDeck: fails on wrong turn", () => {
  const room = createTestRoom();
  startGame(room);

  const result = drawCardFromDeck(room, "p2");

  assertEquals(result.success, false);
  assertStringIncludes(result.error || "", "turn");
});

Deno.test("getGameWinner: no winner initially", () => {
  const room = createTestRoom();
  startGame(room);

  const winner = getGameWinner(room);

  assertEquals(winner, null);
});

Deno.test("getGameWinner: detects winner", () => {
  const room = createTestRoom();
  startGame(room);

  // Remove all cards from p1's hand
  room.players[0].hand = [];

  const winner = getGameWinner(room);

  assertEquals(winner, "p1");
});
