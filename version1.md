# UNO Browser Game – Technical Specification

## Overview

Build a real-time browser-based UNO game using:

- Backend: Hono + Deno
- Communication: WebSockets
- Frontend: Minimal browser UI (HTML/CSS/JS or lightweight framework)
- Multiplayer Flow: Automatic matchmaking
- Initial Scope: 2-player gameplay only

The system should automatically:

- Create rooms
- Match players into rooms
- Start games when 2 players are connected
- Handle reconnections gracefully
- Synchronize gameplay in real time

The implementation should prioritize:

- Simplicity
- Clean architecture
- Deterministic game state
- Server-authoritative gameplay
- Extensibility for future multiplayer expansion

---

# Product Requirements

## Core User Flow

1. Player opens website
2. Frontend automatically connects to backend WebSocket
3. Backend assigns player to an available waiting room
4. When 2 players are present:
   - Room locks
   - Game initializes
   - Initial hands dealt

5. Players take turns playing UNO
6. Backend validates all moves
7. Winner is declared when a player has no cards remaining
8. Room is destroyed after game completion and disconnect timeout

No login/authentication is required.

---

# Technical Stack

## Backend

### Required

- Deno
- Hono framework
- Native WebSocket support
- In-memory room/game state

### Recommended Structure

```txt
/backend
  /src
    server.ts
    routes/
    websocket/
    game/
      engine.ts
      rules.ts
      deck.ts
      room.ts
      player.ts
      types.ts
    utils/
```

---

## Frontend

### Minimal Requirements

- Browser-based UI
- Real-time WebSocket updates
- Render:
  - Player hand
  - Opponent card count
  - Current discard card
  - Current turn
  - Draw pile button
  - UNO/game status

### Recommended Structure

```txt
/frontend
  index.html
  styles.css
  app.js
```

Frameworks are optional.

Vanilla JS is acceptable.

---

# System Architecture

## High-Level Architecture

```txt
Browser Client
    ↓ WebSocket
Hono WebSocket Server
    ↓
Room Manager
    ↓
Game Engine
```

The backend is authoritative.

Clients never mutate state directly.

All gameplay actions are validated server-side.

---

# WebSocket Protocol

## Connection Flow

### Client Connects

Client opens WebSocket:

```txt
ws://host/ws
```

### Server Actions

Upon connection:

1. Generate player ID
2. Assign player to waiting room
3. If no room exists:
   - Create new room

4. Send lobby/game state to player

---

# Message Protocol

Use JSON messages.

## Envelope Format

```json
{
  "type": "message_type",
  "payload": {}
}
```

---

# Client → Server Messages

## PLAY_CARD

```json
{
  "type": "PLAY_CARD",
  "payload": {
    "cardId": "red_5"
  }
}
```

---

## DRAW_CARD

```json
{
  "type": "DRAW_CARD",
  "payload": {}
}
```

---

## SAY_UNO

Optional for MVP.

```json
{
  "type": "SAY_UNO",
  "payload": {}
}
```

---

## PING

```json
{
  "type": "PING",
  "payload": {}
}
```

---

# Server → Client Messages

## PLAYER_ASSIGNED

```json
{
  "type": "PLAYER_ASSIGNED",
  "payload": {
    "playerId": "p1",
    "roomId": "room_abc"
  }
}
```

---

## ROOM_WAITING

```json
{
  "type": "ROOM_WAITING",
  "payload": {
    "playersConnected": 1,
    "requiredPlayers": 2
  }
}
```

---

## GAME_STARTED

```json
{
  "type": "GAME_STARTED",
  "payload": {
    "startingPlayerId": "p1"
  }
}
```

---

## GAME_STATE

This is the primary synchronization event.

```json
{
  "type": "GAME_STATE",
  "payload": {
    "roomId": "room_abc",
    "currentTurn": "p1",
    "direction": 1,
    "topCard": {
      "id": "blue_8",
      "color": "blue",
      "value": "8"
    },
    "players": [
      {
        "id": "p1",
        "cardCount": 5
      },
      {
        "id": "p2",
        "cardCount": 3
      }
    ],
    "hand": []
  }
}
```

Each client should only receive its own hand.

---

## INVALID_MOVE

```json
{
  "type": "INVALID_MOVE",
  "payload": {
    "reason": "Card cannot be played"
  }
}
```

---

## GAME_OVER

```json
{
  "type": "GAME_OVER",
  "payload": {
    "winnerId": "p1"
  }
}
```

---

# Game Rules

## Initial Scope

Implement standard UNO gameplay with:

### Number Cards

- 0–9
- Red
- Blue
- Green
- Yellow

---

# Simplification Rules for MVP

# Game Logic Requirements

## Valid Move Conditions

A card is playable if:

- Same color
- Same value

---

## Turn Handling

After valid play:

- Apply card effects
- Advance turn
- Broadcast updated state

---

## Draw Logic

If no playable card:

- Player draws one card
- If playable:
  - Can optionally play immediately

- Otherwise:
  - Turn ends

Simplified option:

- Auto-end turn after draw if not playable

---

## UNO State

When player has 1 card:

- UI should show UNO warning

Penalty mechanics optional.

---

## Win Condition

Player wins when:

- Hand size reaches 0

---

# Data Models

## Card

```ts
interface Card {
  id: string;
  color: "red" | "blue" | "green" | "yellow" | "wild";
  value: string;
}
```

---

## Player

```ts
interface Player {
  id: string;
  socket: WebSocket;
  hand: Card[];
  connected: boolean;
}
```

---

## Room

```ts
interface Room {
  id: string;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentTurn: string;
  direction: number;
  started: boolean;
}
```

---

# Room Management

## Matchmaking Rules

Maintain:

```ts
Map<string, Room>;
```

On player join:

1. Search for room where:
   - started === false
   - players.length < 2

2. If found:
   - Add player

3. Otherwise:
   - Create room

---

## Room Lifecycle

### Create

When first player joins.

### Start

When second player joins.

### Destroy

When:

- Game completed
- All players disconnected
- Timeout exceeded

Recommended timeout:

- 60 seconds

---

# Disconnect Handling

## Temporary Disconnects

If player disconnects:

1. Mark player disconnected
2. Pause game
3. Allow reconnection window

If reconnecting:

- Restore player state

---

## Reconnect Strategy

Use:

- localStorage player token

On reconnect:

- Client sends stored player ID
- Backend attempts restoration

---

# Backend Implementation Details

## Hono Server

### Required Endpoints

#### Health Check

```txt
GET /health
```

Returns:

```json
{
  "status": "ok"
}
```

---

#### WebSocket Endpoint

```txt
GET /ws
```

Handles:

- Connections
- Game events
- Synchronization

---

# Suggested Backend Components

## Deck Generator

Responsibilities:

- Create standard UNO deck
- Shuffle deck
- Draw cards

Functions:

```ts
createDeck();
shuffleDeck(deck);
drawCard(room);
```

---

## Rules Engine

Responsibilities:

- Validate moves
- Apply effects
- Advance turns
- Detect winners

Functions:

```ts
isValidMove(card, topCard);
applyCardEffect(room, card);
nextTurn(room);
checkWinner(room);
```

---

## Game Manager

Responsibilities:

- Start games
- Broadcast state
- Handle actions
- Manage rooms

---

# Frontend Requirements

## UI Screens

### Connecting Screen

Displays:

```txt
Connecting...
```

---

### Matchmaking Screen

Displays:

```txt
Waiting for another player...
```

---

### Game Screen

Must render:

- Current top card
- Local player hand
- Opponent card count
- Current turn indicator
- Draw card button
- Game messages

---

## Frontend State

Minimal client state:

```ts
{
  connected: boolean,
  playerId: string,
  roomId: string,
  hand: [],
  topCard: null,
  players: [],
  currentTurn: null,
  gameStarted: false
}
```

---

# Rendering Rules

## Player Hand

Cards should be clickable.

On click:

- Send PLAY_CARD message

---

## Opponent Hand

Do not show actual cards.

Only show:

```txt
Opponent Cards: 5
```

---

## Current Turn

Show clear indicator:

```txt
Your Turn
```

or

```txt
Opponent Turn
```

---

# Synchronization Strategy

## Server Authoritative Model

The server owns:

- Turn state
- Deck state
- Player hands
- Card validation
- Win conditions

Clients are purely renderers.

---

## State Broadcasting

After every action:

1. Update game state
2. Send GAME_STATE to both players

Avoid partial updates in MVP.

Full state snapshots are acceptable.

---

# Security Requirements

## Validate Everything Server-Side

Never trust client messages.

Validate:

- Turn ownership
- Card existence in hand
- Card play legality
- Room membership

---

## Prevent State Leakage

Never send:

- Opponent hand contents
- Deck order

---

# Error Handling

## Invalid Messages

If malformed message received:

- Ignore
- Optionally send error response

---

## Invalid Actions

If illegal move:

- Reject action
- Send INVALID_MOVE

---

# Performance Considerations

## Expected Scale

Initial MVP:

- 2 of concurrent rooms

In-memory state is acceptable.

No database required.

---

# Suggested Development Phases

## Phase 1 — Core Networking

Implement:

- Hono server
- WebSocket endpoint
- Auto room assignment
- Basic connection flow

---

## Phase 2 — Game Engine

Implement:

- Deck generation
- Turn management
- Rule validation
- Win logic

---

## Phase 3 — Frontend

Implement:

- Basic UI
- WebSocket integration
- Real-time updates

---

## Phase 4 — Polish

Implement:

- Reconnect support
- Better styling
- Animations
- Error handling

---

# Acceptance Criteria

The project is complete when:

- Two browser tabs can automatically join same room
- Game starts automatically
- Turns synchronize correctly
- Invalid moves are rejected
- Draw mechanics work
- Win condition works
- Real-time gameplay functions reliably
- Disconnects do not crash server

---

# Recommended Coding Principles

## Keep Game Logic Pure

Game engine functions should avoid direct socket interaction.

Example:

```ts
const result = playCard(gameState, playerId, cardId);
```

Then separately:

```ts
broadcastGameState(room);
```

---

## Separate Concerns

Keep distinct layers:

- Networking
- Room management
- Game rules
- Rendering

---

# Final Notes

The implementation should prioritize:

1. Reliable synchronization
2. Clean server-authoritative logic
3. Simplicity
4. Easy future extensibility
