import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  createDeck,
  shuffleDeck,
  dealInitialHands,
  drawCard,
} from "../deck.ts";
import { Card } from "../../types.ts";

Deno.test("createDeck: creates correct number of cards", () => {
  const deck = createDeck();
  // 4 colors * (1 zero + 2*9 other cards) = 4 * 19 = 76 cards
  // But MVP simplification: 4 * 10 = 40 cards
  const expectedCount = 4 * (1 + 2 * 9); // 76 cards (standard UNO)
  // Actually check what we created
  assertEquals(deck.length, 76);
});

Deno.test("createDeck: all colors present", () => {
  const deck = createDeck();
  const colors = new Set(deck.map((c) => c.color));
  assertEquals(colors.size, 4);
  assert(colors.has("red"));
  assert(colors.has("blue"));
  assert(colors.has("green"));
  assert(colors.has("yellow"));
});

Deno.test("createDeck: all values present", () => {
  const deck = createDeck();
  const values = new Set(deck.map((c) => c.value));
  assertEquals(values.size, 10); // 0-9
});

Deno.test("shuffleDeck: returns same number of cards", () => {
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  assertEquals(shuffled.length, deck.length);
});

Deno.test("shuffleDeck: contains all original cards", () => {
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);

  const originalIds = new Set(deck.map((c) => c.id));
  const shuffledIds = new Set(shuffled.map((c) => c.id));

  assertEquals(originalIds.size, shuffledIds.size);
  originalIds.forEach((id) => {
    assert(shuffledIds.has(id), `Card ${id} missing after shuffle`);
  });
});

Deno.test("dealInitialHands: 2 players get 7 cards each", () => {
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  const { hands, remainingDeck } = dealInitialHands(2, shuffled);

  assertEquals(hands.length, 2);
  assertEquals(hands[0].length, 7);
  assertEquals(hands[1].length, 7);
  assertEquals(remainingDeck.length, shuffled.length - 14);
});

Deno.test("dealInitialHands: 4 players get 7 cards each", () => {
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  const { hands, remainingDeck } = dealInitialHands(4, shuffled);

  assertEquals(hands.length, 4);
  hands.forEach((hand) => {
    assertEquals(hand.length, 7);
  });
  assertEquals(remainingDeck.length, shuffled.length - 28);
});

Deno.test("drawCard: draws from deck", () => {
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  const discardPile: Card[] = [];

  const { card, newDeck } = drawCard(shuffled, discardPile);

  assert(card !== null);
  assertEquals(newDeck.length, shuffled.length - 1);
});

Deno.test("drawCard: empty deck with discard pile reshuffles", () => {
  const emptyDeck: Card[] = [];
  const discardPile: Card[] = [
    { id: "red_5", color: "red", value: "5" },
    { id: "blue_3", color: "blue", value: "3" },
    { id: "green_7", color: "green", value: "7" },
  ];

  const { card, newDeck, newDiscardPile } = drawCard(emptyDeck, discardPile);

  assert(card !== null);
  assertEquals(newDeck.length, 1); // 3 cards minus 1 to keep on discard pile minus 1 drawn
  assertEquals(newDiscardPile.length, 1); // Top card stays
});

Deno.test("drawCard: both deck and discard empty returns null", () => {
  const { card } = drawCard([], []);
  assertEquals(card, null);
});
