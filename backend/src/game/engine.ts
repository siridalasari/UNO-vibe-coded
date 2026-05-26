import { Card, Room } from "../types.ts";
import {
  createDeck,
  shuffleDeck,
  dealInitialHands,
  getInitialTopCard,
  drawCard,
} from "./deck.ts";
import {
  isValidMove,
  getNextPlayerIndex,
  checkWinner,
  applyCardEffect,
} from "./rules.ts";

/**
 * Start a game in a room
 * - Shuffle deck
 * - Deal initial hands
 * - Set first turn
 * - Place first card on discard pile
 */
export function startGame(room: Room): { success: boolean; error?: string } {
  if (room.players.length < 2) {
    return { success: false, error: "Need at least 2 players" };
  }

  if (room.started) {
    return { success: false, error: "Game already started" };
  }

  // Create and shuffle deck
  const deck = shuffleDeck(createDeck());

  // Deal initial hands
  const { hands, remainingDeck } = dealInitialHands(room.players.length, deck);

  // Assign hands to players
  room.players.forEach((player, idx) => {
    player.hand = hands[idx];
  });

  // Place first card on discard pile
  const topCard = remainingDeck.pop();
  if (topCard) {
    room.discardPile.push(topCard);
  }

  room.deck = remainingDeck;
  room.started = true;
  room.currentTurn = room.players[0].id;

  return { success: true };
}

/**
 * Play a card from a player's hand
 *
 * Returns:
 * - success: true if card was played
 * - error: error message if failed
 */
export function playCard(
  room: Room,
  playerId: string,
  cardId: string,
): {
  success: boolean;
  error?: string;
  newTurnPlayerId?: string;
} {
  // Verify it's this player's turn
  if (room.currentTurn !== playerId) {
    return { success: false, error: "Not your turn" };
  }

  // Find player
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, error: "Player not found" };
  }

  // Find card in hand
  const cardIndex = player.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { success: false, error: "Card not in hand" };
  }

  const card = player.hand[cardIndex];
  const topCard = room.discardPile[room.discardPile.length - 1] || null;

  // Validate move
  if (!isValidMove(card, topCard)) {
    return { success: false, error: "Cannot play this card" };
  }

  // Remove card from hand and place on discard pile
  player.hand.splice(cardIndex, 1);
  room.discardPile.push(card);

  // Apply card effects (MVP: none)
  const { newDirection } = applyCardEffect(card, room.direction);
  room.direction = newDirection;

  // Advance turn
  const currentPlayerIndex = room.players.findIndex((p) => p.id === playerId);
  const nextPlayerIndex = getNextPlayerIndex(
    currentPlayerIndex,
    room.players.length,
    room.direction,
  );
  const newTurnPlayerId = room.players[nextPlayerIndex].id;
  room.currentTurn = newTurnPlayerId;

  return { success: true, newTurnPlayerId };
}

/**
 * Draw a card and potentially end turn
 *
 * Returns:
 * - success: true if card was drawn
 * - error: error message if failed
 * - drawnCard: the card that was drawn
 * - newTurnPlayerId: who's turn it is now (may be same player if card is playable)
 */
export function drawCardFromDeck(
  room: Room,
  playerId: string,
): {
  success: boolean;
  error?: string;
  drawnCard?: Card;
  newTurnPlayerId?: string;
} {
  // Verify it's this player's turn
  if (room.currentTurn !== playerId) {
    return { success: false, error: "Not your turn" };
  }

  // Find player
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, error: "Player not found" };
  }

  // Draw card from deck (handles deck reshuffle)
  const { card, newDeck, newDiscardPile } = drawCard(
    room.deck,
    room.discardPile,
  );

  if (!card) {
    return { success: false, error: "Cannot draw card (no cards available)" };
  }

  room.deck = newDeck;
  room.discardPile = newDiscardPile;
  player.hand.push(card);

  // End turn (move to next player)
  const currentPlayerIndex = room.players.findIndex((p) => p.id === playerId);
  const nextPlayerIndex = getNextPlayerIndex(
    currentPlayerIndex,
    room.players.length,
    room.direction,
  );
  const newTurnPlayerId = room.players[nextPlayerIndex].id;
  room.currentTurn = newTurnPlayerId;

  return { success: true, drawnCard: card, newTurnPlayerId };
}

/**
 * Check if the game is over (any player has 0 cards)
 */
export function getGameWinner(room: Room): string | null {
  return checkWinner(new Map(room.players.map((p) => [p.id, p.hand])));
}
