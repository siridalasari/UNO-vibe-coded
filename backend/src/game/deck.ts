import { Card, CardColor, CardValue } from "../types.ts";

const COLORS: CardColor[] = ["red", "blue", "green", "yellow"];
const VALUES: CardValue[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Create a standard UNO deck (MVP: number cards only)
 *
 * Standard UNO deck has:
 * - Each color (red, blue, green, yellow) has cards 0-9
 * - One 0 per color
 * - Two of each 1-9 per color
 * Total: 4 * (1 + 2*9) = 4 * 19 = 76 cards
 *
 * But keeping it simple for MVP: 4 * 10 = 40 cards
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  COLORS.forEach((color) => {
    VALUES.forEach((value) => {
      // Add 2 of each card (except 0, add 1)
      const count = value === "0" ? 1 : 2;
      for (let i = 0; i < count; i++) {
        deck.push({
          id: `${color}_${value}_${i}`,
          color,
          value,
        });
      }
    });
  });

  return deck;
}

/**
 * Shuffle deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draw a card from the deck
 * If deck is empty, reshuffle discard pile
 */
export function drawCard(
  deck: Card[],
  discardPile: Card[],
): { card: Card | null; newDeck: Card[]; newDiscardPile: Card[] } {
  let newDeck = [...deck];

  if (newDeck.length === 0) {
    // Reshuffle discard pile if deck is empty
    if (discardPile.length === 0) {
      return { card: null, newDeck: [], newDiscardPile: [] };
    }

    // Keep the top card of discard pile, shuffle the rest
    const topCard = discardPile[discardPile.length - 1];
    const reshuffleCards = discardPile.slice(0, -1);
    newDeck = shuffleDeck(reshuffleCards);

    return {
      card: newDeck.pop() || null,
      newDeck,
      newDiscardPile: [topCard],
    };
  }

  const card = newDeck.pop() || null;
  return { card, newDeck, newDiscardPile: discardPile };
}

/**
 * Deal initial hands to players (7 cards each)
 */
export function dealInitialHands(
  numPlayers: number,
  deck: Card[],
): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = [];
  let remainingDeck = [...deck];

  for (let i = 0; i < numPlayers; i++) {
    const hand: Card[] = [];
    for (let j = 0; j < 7; j++) {
      const card = remainingDeck.pop();
      if (card) hand.push(card);
    }
    hands.push(hand);
  }

  return { hands, remainingDeck };
}

/**
 * Draw the first card for the discard pile
 * Must be a number card (not action card) for MVP
 */
export function getInitialTopCard(deck: Card[]): Card | null {
  if (deck.length === 0) return null;
  return deck[deck.length - 1];
}
