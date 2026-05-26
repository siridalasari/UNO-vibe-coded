import { Card } from "../types.ts";

/**
 * Check if a card can be played on top of the current discard card
 *
 * Valid move if:
 * - Same color
 * - Same value
 */
export function isValidMove(card: Card, topCard: Card | null): boolean {
  if (!topCard) return false;

  // MVP: only number cards, so just check color or value match
  return card.color === topCard.color || card.value === topCard.value;
}

/**
 * Get the next player index in turn order
 */
export function getNextPlayerIndex(
  currentIndex: number,
  playerCount: number,
  direction: number = 1,
): number {
  const nextIndex = (currentIndex + direction + playerCount) % playerCount;
  return nextIndex;
}

/**
 * Check if any player has won (0 cards remaining)
 * Returns the winner's index or -1 if no winner
 */
export function checkWinner(playerHands: Map<string, Card[]>): string | null {
  for (const [playerId, hand] of playerHands) {
    if (hand.length === 0) {
      return playerId;
    }
  }
  return null;
}

/**
 * Apply card effects (MVP: no special effects, just return)
 * Future: implement Skip, Reverse, Draw+2, Wild, etc.
 */
export function applyCardEffect(
  card: Card,
  _direction: number,
): { newDirection: number; skipNextTurn: boolean } {
  // MVP: No special effects
  return { newDirection: 1, skipNextTurn: false };
}

/**
 * Check if a player can declare UNO
 * Returns true if player has exactly 1 card and hasn't declared UNO yet
 */
export function isValidUNODeclare(
  unoPending: boolean,
  unoDeclared: boolean,
): boolean {
  return unoPending && !unoDeclared;
}

/**
 * Check if a catch is valid
 * Returns true if target player has 1 card but hasn't declared UNO
 */
export function isValidCatch(
  targetUnoPending: boolean,
  targetUnoDeclared: boolean,
): boolean {
  return targetUnoPending && !targetUnoDeclared;
}
