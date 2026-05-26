import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { isValidMove, getNextPlayerIndex, checkWinner } from "../rules.ts";
import { Card } from "../../types.ts";

Deno.test("isValidMove: same color", () => {
  const topCard: Card = { id: "red_5", color: "red", value: "5" };
  const playCard: Card = { id: "red_7", color: "red", value: "7" };

  assertEquals(isValidMove(playCard, topCard), true);
});

Deno.test("isValidMove: same value", () => {
  const topCard: Card = { id: "red_5", color: "red", value: "5" };
  const playCard: Card = { id: "blue_5", color: "blue", value: "5" };

  assertEquals(isValidMove(playCard, topCard), true);
});

Deno.test("isValidMove: different color and value", () => {
  const topCard: Card = { id: "red_5", color: "red", value: "5" };
  const playCard: Card = { id: "blue_7", color: "blue", value: "7" };

  assertEquals(isValidMove(playCard, topCard), false);
});

Deno.test("isValidMove: null top card", () => {
  const playCard: Card = { id: "red_5", color: "red", value: "5" };

  assertEquals(isValidMove(playCard, null), false);
});

Deno.test("getNextPlayerIndex: 2 players, forward", () => {
  const nextIdx = getNextPlayerIndex(0, 2, 1);
  assertEquals(nextIdx, 1);

  const nextIdx2 = getNextPlayerIndex(1, 2, 1);
  assertEquals(nextIdx2, 0);
});

Deno.test("getNextPlayerIndex: 4 players, forward", () => {
  assertEquals(getNextPlayerIndex(0, 4, 1), 1);
  assertEquals(getNextPlayerIndex(1, 4, 1), 2);
  assertEquals(getNextPlayerIndex(2, 4, 1), 3);
  assertEquals(getNextPlayerIndex(3, 4, 1), 0);
});

Deno.test("getNextPlayerIndex: reverse direction", () => {
  assertEquals(getNextPlayerIndex(0, 2, -1), 1);
  assertEquals(getNextPlayerIndex(1, 2, -1), 0);
});

Deno.test("checkWinner: no winner", () => {
  const hands = new Map<string, Card[]>([
    ["p1", [{ id: "red_5", color: "red", value: "5" }]],
    ["p2", [{ id: "blue_3", color: "blue", value: "3" }]],
  ]);

  assertEquals(checkWinner(hands), null);
});

Deno.test("checkWinner: player has 0 cards", () => {
  const hands = new Map<string, Card[]>([
    ["p1", []],
    ["p2", [{ id: "blue_3", color: "blue", value: "3" }]],
  ]);

  assertEquals(checkWinner(hands), "p1");
});

Deno.test("checkWinner: multiple players with cards", () => {
  const hands = new Map<string, Card[]>([
    ["p1", [{ id: "red_5", color: "red", value: "5" }]],
    ["p2", [{ id: "blue_3", color: "blue", value: "3" }]],
    ["p3", [{ id: "green_1", color: "green", value: "1" }]],
  ]);

  assertEquals(checkWinner(hands), null);
});
