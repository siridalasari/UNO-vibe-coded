````md
# UNO Browser Game — V2 Specification

## New Feature: UNO Catch System

When a player reaches 1 card remaining, they must declare UNO.

If they fail to declare UNO before the opponent performs the next action, the
opponent can catch them.

If caught successfully:

- offending player draws 3 cards

---

# New Client Messages

## SAY_UNO

```json
{
  "type": "SAY_UNO",
  "payload": {}
}
```
````

## CATCH_UNO

```json
{
  "type": "CATCH_UNO",
  "payload": {
    "targetPlayerId": "p1"
  }
}
```

---

# New Server Messages

## UNO_DECLARED

```json
{
  "type": "UNO_DECLARED",
  "payload": {
    "playerId": "p1"
  }
}
```

## UNO_CAUGHT

```json
{
  "type": "UNO_CAUGHT",
  "payload": {
    "targetPlayerId": "p1",
    "penaltyCards": 3
  }
}
```

---

# Player State Updates

```ts
interface Player {
  id: string;
  hand: Card[];

  unoPending: boolean;
  unoDeclared: boolean;
}
```

---

# UNO Flow

## When Player Plays a Card

```ts
if (player.hand.length === 1) {
  player.unoPending = true;
  player.unoDeclared = false;
}
```

---

## SAY_UNO Validation

```ts
player.unoPending === true;
```

On success:

```ts
player.unoPending = false;
player.unoDeclared = true;
```

---

## CATCH_UNO Validation

```ts
target.unoPending === true &&
  target.unoDeclared === false;
```

If valid:

```ts
drawCards(target, 3);

target.unoPending = false;
```

---

# Conflict Resolution

If SAY_UNO and CATCH_UNO happen simultaneously:

```txt
First message received by server wins
```

---

# Frontend Requirements

## Show UNO Button

When:

```ts
myHand.length === 1 &&
  unoPending === true;
```

On click:

- send SAY_UNO

---

## Show Catch Button

When:

- opponent has 1 card
- opponent has not declared UNO

On click:

- send CATCH_UNO

---

# Rules

- UNO required only when player has exactly 1 card
- No UNO needed when player reaches 0 cards
- Invalid catches are rejected
- No penalty for false catches in MVP

---

# Architecture Notes

Backend remains server-authoritative.

Server controls:

- UNO state
- validation
- penalties
- synchronization

Clients only:

- render state
- send actions

---

# Acceptance Criteria

- UNO state activates at 1 card
- SAY_UNO works
- Opponent can catch missing UNO
- Penalty cards applied correctly
- Synchronization remains stable
- Invalid actions rejected
- Reconnect does not corrupt UNO state

```
```
