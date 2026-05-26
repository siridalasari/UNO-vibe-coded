# UNO Browser Game - Complete Implementation

A real-time 2-player UNO card game built with **Deno + Hono** (backend) and **Vanilla JavaScript** (frontend).

---

## ✅ What's Implemented

### Backend (Deno + Hono)

- ✅ WebSocket server for real-time communication
- ✅ Automatic room matchmaking (2 players per room)
- ✅ Game engine with complete UNO number cards (0-9, 4 colors)
- ✅ Server-authoritative game logic
- ✅ Card validation and turn management
- ✅ Win condition detection
- ✅ Disconnection handling with 60-second reconnection window
- ✅ 31 comprehensive unit tests (all passing)

### Frontend (Vanilla JS)

- ✅ Beautiful, responsive UI
- ✅ Real-time WebSocket client
- ✅ Interactive card playing interface
- ✅ Game state synchronization
- ✅ Turn indicator and opponent info
- ✅ Error messages and game-over screen
- ✅ localStorage for reconnection support

---

## 🚀 Quick Start

### Prerequisites

- **Deno** (v1.40+) - [Install Deno](https://deno.land)
- Two browser tabs/windows

### Run the Backend

```bash
cd backend
deno run --allow-net src/server.ts
```

The server will start on **http://localhost:8000**

### Play the Game

1. Open **two browser tabs** at: `http://localhost:8000`
2. Both players will automatically be matched into a room
3. When both players connect, the game starts automatically
4. Click cards to play or use the "Draw Card" button
5. First player to play all cards wins!

---

## 🧪 Run Tests

```bash
cd backend
deno test src/game/__tests__/
```

Expected result: **31 tests passed**

---

## 📊 Project Structure

```
uno/
├── backend/
│   ├── deno.json                    # Deno configuration
│   └── src/
│       ├── server.ts                # Hono WebSocket server
│       ├── types.ts                 # TypeScript interfaces
│       ├── room-manager.ts          # Room lifecycle management
│       └── game/
│           ├── deck.ts              # Deck generation & shuffling
│           ├── rules.ts             # Game rules & validation
│           ├── engine.ts            # Game state mutations
│           └── __tests__/
│               ├── deck.test.ts     # Deck tests
│               ├── rules.test.ts    # Rules tests
│               └── engine.test.ts   # Game engine tests
├── frontend/
│   ├── index.html                   # Game UI (no longer used - embedded in server)
│   ├── styles.css                   # Styling
│   └── app.js                       # WebSocket client & game logic
├── plan.md                          # Project specification
└── README.md                        # This file
```

---

## 🎮 Game Rules (MVP)

### Number Cards Only

- **0-9** values in **4 colors** (red, blue, green, yellow)
- Play a card if it matches the **color** or **number** of the top card
- If no playable card, draw 1 from the deck
- First player to play all cards **wins**

### Turn Flow

1. Player plays a card (or draws if no valid card)
2. Turn passes to opponent
3. Server validates all moves
4. Real-time game state sent to both players

---

## 💻 WebSocket Protocol

### Client → Server

```json
{
  "type": "PLAY_CARD",
  "payload": { "cardId": "red_5" }
}

{
  "type": "DRAW_CARD",
  "payload": {}
}

{
  "type": "PING",
  "payload": {}
}
```

### Server → Client

```json
{
  "type": "PLAYER_ASSIGNED",
  "payload": { "playerId": "p_...", "roomId": "room_..." }
}

{
  "type": "GAME_STATE",
  "payload": {
    "roomId": "room_...",
    "currentTurn": "p_...",
    "topCard": { "id": "red_5", "color": "red", "value": "5" },
    "players": [
      { "id": "p_1", "cardCount": 6 },
      { "id": "p_2", "cardCount": 8 }
    ],
    "hand": [...]  // Only this player's cards
  }
}

{
  "type": "GAME_OVER",
  "payload": { "winnerId": "p_..." }
}
```

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Browser Tab 1  │
│  (Player 1)     │
└────────┬────────┘
         │ WebSocket
         │
    ┌────▼─────────┐
    │  Hono Server │
    │  Port 8000   │
    │              │
    │ • Room Mgr   │
    │ • Game Eng   │
    │ • Rules Val  │
    └────▲─────────┘
         │ WebSocket
         │
┌────────┴────────┐
│  Browser Tab 2  │
│  (Player 2)     │
└─────────────────┘
```

**Key Design:**

- **Server-Authoritative:** All game logic runs on the server
- **Stateless Clients:** Players are renderers only
- **Real-time Sync:** Full game state broadcast after each action
- **Secure Validation:** All moves validated server-side

---

## 📝 Configuration

### Server Port

Edit `backend/src/server.ts`:

```typescript
const port = 8000;
```

### Reconnection Timeout

Edit `backend/src/room-manager.ts`:

```typescript
const DISCONNECT_TIMEOUT = 60000; // 60 seconds
```

### Room Cleanup

Edit `backend/src/server.ts` (lines ~207, ~240):

```typescript
setTimeout(() => {
  roomManager.destroyRoom(room.id);
}, 30000); // 30 seconds after game completion
```

---

## 🐛 Troubleshooting

### "WebSocket connection failed"

- Ensure backend is running: `deno run --allow-net src/server.ts`
- Check port 8000 is not in use
- Verify firewall allows localhost connections

### "Invalid move" error

- Card doesn't match discard pile (color or number)
- Not your turn yet
- Selected card not in your hand

### Game freezes / no updates

- Check browser console for errors (F12 → Console)
- Verify WebSocket connection: http://localhost:8000/health
- Try refreshing browser tab

### Can't reconnect after disconnect

- Reconnection window is 60 seconds
- After 60s, room is destroyed and game ends
- Open a new browser tab to start a new game

---

## 🚀 Future Enhancements

### Phase 1: Action Cards

- Skip, Reverse, Draw+2, Wild, Wild Draw+4
- Update `game/rules.ts` `applyCardEffect()`
- Minimal backend changes required

### Phase 2: Scaling

- Switch from in-memory to **Deno KV** storage
- Support for 3+ players
- Persistent game history

### Phase 3: UI Polish

- Card animations and transitions
- Sound effects
- User avatars and profiles
- Chat between players

### Phase 4: Production

- Deploy to **Deno Deploy**
- Add user authentication
- Leaderboard and statistics
- Mobile app (React Native)

---

## 📚 Learning Resources

- **Deno Docs:** https://docs.deno.com
- **Hono Docs:** https://hono.dev
- **WebSocket API:** https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **UNO Rules:** https://www.unorules.com

---

## ✅ Acceptance Criteria Met

- ✅ Two browser tabs auto-join same room
- ✅ Game starts automatically when 2 players connected
- ✅ Turns synchronize correctly in real-time
- ✅ Invalid moves are rejected with error messages
- ✅ Draw mechanics work correctly
- ✅ Win condition triggers at 0 cards
- ✅ Real-time gameplay functions reliably
- ✅ Disconnects don't crash server
- ✅ All 31 unit tests pass
- ✅ Clean, server-authoritative architecture

---

## 📄 License

Open source - use freely for learning and development.

---

## 🎉 Ready to Play!

```bash
# Terminal 1: Start backend
cd backend && deno run --allow-net src/server.ts

# Then open in two browser tabs:
# http://localhost:8000
```

Enjoy your game! 🃏
# UNO-vibe-coded
