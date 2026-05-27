// =========================================
// STATE MANAGEMENT
// =========================================

const state = {
  connected: false,
  playerId: null,
  roomId: null,

  hand: [],
  topCard: null,

  players: [],
  currentTurn: null,

  gameStarted: false,
  gameOver: false,

  opponentId: null,
  opponentCardCount: 0,
};

// =========================================
// WEBSOCKET
// =========================================

let ws = null;

const WS_URL = `ws://${window.location.host}/ws`;

// =========================================
// DOM ELEMENTS
// =========================================

const statusEl = document.getElementById("status");

const gameContainer = document.getElementById("game-container");

const gameOverScreen = document.getElementById("game-over-screen");
const gameOverText = document.getElementById("game-over-text");
const winnerText = document.getElementById("winner-text");

const turnText = document.getElementById("turn-text");

const topCardEl = document.getElementById("top-card");

const handContainer = document.getElementById("hand-container");

const messagesContainer = document.getElementById("messages-container");

const drawButton = document.getElementById("draw-button");

const opponentCardsEl = document.getElementById("opponent-cards");

// =========================================
// LOCAL STORAGE KEYS
// =========================================

const PLAYER_ID_KEY = "uno_player_id";
const ROOM_ID_KEY = "uno_room_id";

// =========================================
// CONNECT TO SERVER
// =========================================

function connect() {
  ws = new WebSocket(WS_URL);

  // -------------------------
  // OPEN
  // -------------------------

  ws.addEventListener("open", () => {
    console.log("Connected");

    state.connected = true;

    updateStatus("Connected. Waiting for game...");
  });

  // -------------------------
  // MESSAGE
  // -------------------------

  ws.addEventListener("message", (e) => {
    try {
      const msg = JSON.parse(e.data);

      console.log("Received:", msg.type);

      handleMessage(msg);
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  });

  // -------------------------
  // CLOSE
  // -------------------------

  ws.addEventListener("close", () => {
    console.log("Disconnected");

    state.connected = false;

    updateStatus("Disconnected. Reconnecting...");

    setTimeout(connect, 3000);
  });

  // -------------------------
  // ERROR
  // -------------------------

  ws.addEventListener("error", (e) => {
    console.error("Socket error:", e);

    updateStatus("Connection error");
  });
}

// =========================================
// SEND MESSAGE
// =========================================

function sendMessage(type, payload = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket not connected");
    return;
  }

  ws.send(
    JSON.stringify({
      type,
      payload,
    })
  );
}

// =========================================
// HANDLE SERVER MESSAGES
// =========================================

function handleMessage(msg) {
  switch (msg.type) {
    case "PLAYER_ASSIGNED":
      handlePlayerAssigned(msg.payload);
      break;

    case "ROOM_WAITING":
      handleRoomWaiting(msg.payload);
      break;

    case "GAME_STARTED":
      handleGameStarted(msg.payload);
      break;

    case "GAME_STATE":
      handleGameState(msg.payload);
      break;

    case "INVALID_MOVE":
      handleInvalidMove(msg.payload);
      break;

    case "GAME_OVER":
      handleGameOver(msg.payload);
      break;

    case "PONG":
      console.log("Pong received");
      break;

    default:
      console.warn("Unknown message type:", msg.type);
  }
}

// =========================================
// PLAYER ASSIGNED
// =========================================

function handlePlayerAssigned(payload) {
  state.playerId = payload.playerId;
  state.roomId = payload.roomId;

  localStorage.setItem(PLAYER_ID_KEY, state.playerId);
  localStorage.setItem(ROOM_ID_KEY, state.roomId);

  console.log(
    `Assigned player ${state.playerId} in room ${state.roomId}`
  );

  updateStatus("Waiting for opponent...");
}

// =========================================
// ROOM WAITING
// =========================================

function handleRoomWaiting(payload) {
  const { playersConnected, requiredPlayers } = payload;

  updateStatus(
    `Waiting for players... ${playersConnected}/${requiredPlayers}`
  );
}

// =========================================
// GAME STARTED
// =========================================

function handleGameStarted(payload) {
  state.gameStarted = true;

  state.currentTurn = payload.startingPlayerId;

  gameContainer.classList.remove("hidden");

  updateStatus("Game Started!");

  render();
}

// =========================================
// GAME STATE
// =========================================

function handleGameState(payload) {
  if (payload.error) {
    console.error("Game state error:", payload.error);
    return;
  }

  const gameState = payload;

  // -------------------------
  // UPDATE STATE
  // -------------------------

  state.hand = gameState.hand || [];

  state.topCard = gameState.topCard;

  state.currentTurn = gameState.currentTurn;

  state.players = gameState.players || [];

  // -------------------------
  // OPPONENT
  // -------------------------

  if (state.players.length >= 2) {
    const opponent = state.players.find(
      (p) => p.id !== state.playerId
    );

    if (opponent) {
      state.opponentId = opponent.id;

      state.opponentCardCount = opponent.cardCount;
    }
  }

  render();
}

// =========================================
// INVALID MOVE
// =========================================

function handleInvalidMove(payload) {
  const reason = payload.reason || "Invalid move";

  addMessage(`❌ ${reason}`, "error");

  render();
}

// =========================================
// GAME OVER
// =========================================

function handleGameOver(payload) {
  state.gameOver = true;

  const winnerId = payload.winnerId;

  const isWinner = winnerId === state.playerId;

  gameOverScreen.classList.remove("hidden");

  if (isWinner) {
    gameOverText.textContent = "🎉 You Won!";
    winnerText.textContent =
      "Congratulations! You're the UNO champion!";
  } else {
    gameOverText.textContent = "Game Over";

    winnerText.textContent =
      "Opponent won the game.";
  }

  disableGameControls();
}

// =========================================
// DISABLE CONTROLS
// =========================================

function disableGameControls() {
  drawButton.disabled = true;

  const cards =
    handContainer.querySelectorAll(".playable-card");

  cards.forEach((card) => {
    card.classList.add("disabled");
  });
}

// =========================================
// STATUS TEXT
// =========================================

function updateStatus(message) {
  statusEl.textContent = message;
}

// =========================================
// ADD MESSAGE
// =========================================

function addMessage(text, type = "info") {
  const msgEl = document.createElement("div");

  msgEl.className = `message ${type}`;

  msgEl.textContent = text;

  messagesContainer.appendChild(msgEl);

  const messages =
    messagesContainer.querySelectorAll(".message");

  if (messages.length > 5) {
    messages[0].remove();
  }

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}

// =========================================
// RENDER
// =========================================

function render() {
  renderTopCard();

  renderHand();

  renderOpponentCards();

  renderTurnIndicator();

  updateDrawButton();
}

// =========================================
// RENDER TOP CARD
// =========================================

function renderTopCard() {
  topCardEl.innerHTML = "";

  if (!state.topCard) {
    topCardEl.innerHTML =
      `<span class="card-empty">Waiting...</span>`;

    return;
  }

  const card = state.topCard;

  const cardEl = document.createElement("div");

  cardEl.className = `card ${card.color}`;

  cardEl.textContent = card.value;

  topCardEl.appendChild(cardEl);
}

// =========================================
// RENDER PLAYER HAND
// =========================================

function renderHand() {
  handContainer.innerHTML = "";

  if (!state.hand || state.hand.length === 0) {
    handContainer.innerHTML =
      `<span style="color:#999;">No cards</span>`;

    return;
  }

  state.hand.forEach((card) => {
    const cardEl = document.createElement("div");

    cardEl.className =
      `playable-card ${card.color}`;

    cardEl.textContent = card.value;

    // -------------------------
    // CLICKABLE ONLY ON TURN
    // -------------------------

    if (
      state.currentTurn === state.playerId &&
      !state.gameOver
    ) {
      cardEl.addEventListener("click", () =>
        handleCardClick(card)
      );
    } else {
      cardEl.classList.add("disabled");
    }

    handContainer.appendChild(cardEl);
  });
}

// =========================================
// RENDER OPPONENT CARDS
// =========================================

function renderOpponentCards() {
  opponentCardsEl.innerHTML = "";

  const count = state.opponentCardCount || 0;

  for (let i = 0; i < count; i++) {
    const cardEl = document.createElement("div");

    cardEl.className = "opponent-card";

    // slight curve like original UNO

    const rotate = (i - count / 2) * 2;

    cardEl.style.transform =
      `rotate(${rotate}deg)`;

    cardEl.style.zIndex = i;

    opponentCardsEl.appendChild(cardEl);
  }
}

// =========================================
// TURN INDICATOR
// =========================================

function renderTurnIndicator() {
  if (!state.gameStarted) {
    turnText.textContent =
      "Waiting for game start...";

    return;
  }

  if (state.gameOver) {
    turnText.textContent = "Game Over";

    return;
  }

  if (state.currentTurn === state.playerId) {
    turnText.textContent = "Your Turn ✨";

    turnText.style.color = "white";
  } else {
    turnText.textContent =
      "Opponent's Turn";

    turnText.style.color =
      "rgba(255,255,255,0.8)";
  }
}

// =========================================
// PLAY CARD
// =========================================

function handleCardClick(card) {
  if (
    state.currentTurn !== state.playerId ||
    state.gameOver
  ) {
    addMessage(
      "❌ Not your turn or game over",
      "error"
    );

    return;
  }

  sendMessage("PLAY_CARD", {
    cardId: card.id,
  });

  drawButton.disabled = true;
}

// =========================================
// DRAW CARD
// =========================================

function handleDrawButtonClick() {
  if (
    state.currentTurn !== state.playerId ||
    state.gameOver
  ) {
    addMessage(
      "❌ Not your turn or game over",
      "error"
    );

    return;
  }

  sendMessage("DRAW_CARD", {});

  drawButton.disabled = true;
}

// =========================================
// UPDATE DRAW BUTTON
// =========================================

function updateDrawButton() {
  const isYourTurn =
    state.currentTurn === state.playerId;

  drawButton.disabled =
    !isYourTurn || state.gameOver;
}

// =========================================
// INIT
// =========================================

function init() {
  console.log("Initializing UNO...");

  // -------------------------
  // EVENTS
  // -------------------------

  drawButton.addEventListener(
    "click",
    handleDrawButtonClick
  );

  // -------------------------
  // RESTORE PLAYER
  // -------------------------

  const savedPlayerId =
    localStorage.getItem(PLAYER_ID_KEY);

  const savedRoomId =
    localStorage.getItem(ROOM_ID_KEY);

  if (savedPlayerId) {
    state.playerId = savedPlayerId;

    state.roomId = savedRoomId;

    console.log("Restored player session");
  }

  // -------------------------
  // CONNECT
  // -------------------------

  connect();
}

// =========================================
// START
// =========================================

document.addEventListener(
  "DOMContentLoaded",
  init
);