// State management
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
};

// WebSocket connection
let ws = null;
console.log(window.location.host);

const WS_URL = `ws://${window.location.host}/ws`;
// const WS_URL = `ws://localhost:8000/ws`;

// DOM Elements
const statusEl = document.getElementById("status");
const gameContainer = document.getElementById("game-container");
const gameOverScreen = document.getElementById("game-over-screen");
const gameOverText = document.getElementById("game-over-text");
const winnerText = document.getElementById("winner-text");
const turnIndicator = document.getElementById("turn-indicator");
const turnText = document.getElementById("turn-text");
const topCardEl = document.getElementById("top-card");
const handContainer = document.getElementById("hand-container");
const messagesContainer = document.getElementById("messages-container");
const drawButton = document.getElementById("draw-button");
const opponentId = document.getElementById("opponent-id");
const opponentCardCount = document.getElementById("opponent-card-count");

// Store player ID in localStorage for reconnection
const PLAYER_ID_KEY = "uno_player_id";
const ROOM_ID_KEY = "uno_room_id";

/**
 * Connect to WebSocket server
 */
function connect() {
  ws = new WebSocket(WS_URL);

  ws.addEventListener("open", () => {
    console.log("Connected to server");
    state.connected = true;
    updateStatus("Connected. Waiting for game...");
  });

  ws.addEventListener("message", (e) => {
    try {
      const msg = JSON.parse(e.data);
      handleMessage(msg);
    } catch (err) {
      console.error("Failed to parse message:", err);
    }
  });

  ws.addEventListener("close", () => {
    console.log("Disconnected from server");
    state.connected = false;
    updateStatus("Disconnected. Reconnecting...");
    setTimeout(connect, 3000);
  });

  ws.addEventListener("error", (e) => {
    console.error("WebSocket error:", e);
    updateStatus("Connection error");
  });
}

/**
 * Send message to server
 */
function sendMessage(type, payload = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("WebSocket not connected");
    return;
  }

  ws.send(JSON.stringify({ type, payload }));
}

/**
 * Handle incoming message from server
 */
function handleMessage(msg) {
  console.log("Message received:", msg.type);

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

/**
 * Handle PLAYER_ASSIGNED message
 */
function handlePlayerAssigned(payload) {
  state.playerId = payload.playerId;
  state.roomId = payload.roomId;

  // Store in localStorage
  localStorage.setItem(PLAYER_ID_KEY, state.playerId);
  localStorage.setItem(ROOM_ID_KEY, state.roomId);

  console.log(`Assigned to player ${state.playerId} in room ${state.roomId}`);
  updateStatus("Assigned to room. Waiting for opponent...");
}

/**
 * Handle ROOM_WAITING message
 */
function handleRoomWaiting(payload) {
  const { playersConnected, requiredPlayers } = payload;
  updateStatus(`Waiting for players... ${playersConnected}/${requiredPlayers}`);
}

/**
 * Handle GAME_STARTED message
 */
function handleGameStarted(payload) {
  state.gameStarted = true;
  state.currentTurn = payload.startingPlayerId;
  gameContainer.classList.remove("hidden");
  updateStatus("Game started!");
  render();
}

/**
 * Handle GAME_STATE message
 */
function handleGameState(payload) {
  if (payload.error) {
    console.error("Game state error:", payload.error);
    return;
  }

  const gameState = payload;

  // Update state
  state.hand = gameState.hand || [];
  state.topCard = gameState.topCard;
  state.currentTurn = gameState.currentTurn;
  state.players = gameState.players || [];

  // Set opponent info if available
  if (state.players.length >= 2) {
    const opponent = state.players.find((p) => p.id !== state.playerId);
    if (opponent) {
      state.opponentId = opponent.id;
      opponentId.textContent = `Player ${opponent.id.substring(0, 4)}`;
      opponentCardCount.textContent = opponent.cardCount;
    }
  }

  render();
}

/**
 * Handle INVALID_MOVE message
 */
function handleInvalidMove(payload) {
  const reason = payload.reason || "Invalid move";
  addMessage(`❌ ${reason}`, "error");
  console.error("Invalid move:", reason);
  // Re-render UI to re-enable button and other controls
  render();
}

/**
 * Handle GAME_OVER message
 */
function handleGameOver(payload) {
  state.gameOver = true;
  const winnerId = payload.winnerId;
  const isWinner = winnerId === state.playerId;

  gameOverScreen.classList.remove("hidden");
  if (isWinner) {
    gameOverText.textContent = "🎉 You Won!";
    winnerText.textContent = `Congratulations! You're the UNO champion!`;
  } else {
    gameOverText.textContent = "Game Over";
    winnerText.textContent = `Player ${winnerId.substring(0, 4)} won the game.`;
  }

  disableGameControls();
}

/**
 * Disable all game controls
 */
function disableGameControls() {
  drawButton.disabled = true;
  const cards = handContainer.querySelectorAll(".playable-card");
  cards.forEach((card) => {
    card.classList.add("disabled");
    card.removeEventListener("click", handleCardClick);
  });
}

/**
 * Update status message
 */
function updateStatus(message) {
  statusEl.textContent = message;
}

/**
 * Add message to messages container
 */
function addMessage(text, type = "info") {
  const msgEl = document.createElement("div");
  msgEl.className = `message ${type}`;
  msgEl.textContent = text;
  messagesContainer.appendChild(msgEl);

  // Keep only last 5 messages
  const messages = messagesContainer.querySelectorAll(".message");
  if (messages.length > 5) {
    messages[0].remove();
  }

  // Auto-scroll
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Render the game UI
 */
function render() {
  renderTopCard();
  renderHand();
  renderTurnIndicator();
  updateDrawButton();
}

/**
 * Render the top card on the discard pile
 */
function renderTopCard() {
  topCardEl.innerHTML = "";

  if (!state.topCard) {
    topCardEl.innerHTML = `<span class="card-empty">No cards yet</span>`;
    return;
  }

  const card = state.topCard;
  const cardEl = document.createElement("div");
  cardEl.className = `card ${card.color}`;
  cardEl.textContent = card.value;
  topCardEl.appendChild(cardEl);
}

/**
 * Render player's hand
 */
function renderHand() {
  handContainer.innerHTML = "";

  if (!state.hand || state.hand.length === 0) {
    handContainer.innerHTML = `<span style="color: #999;">No cards</span>`;
    return;
  }

  state.hand.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = `playable-card ${card.color}`;
    cardEl.textContent = card.value;

    // Only make clickable if it's the player's turn and game is not over
    if (state.currentTurn === state.playerId && !state.gameOver) {
      cardEl.style.cursor = "pointer";
      cardEl.addEventListener("click", () => handleCardClick(card));
    } else {
      cardEl.classList.add("disabled");
    }

    handContainer.appendChild(cardEl);
  });
}

/**
 * Handle card click
 */
function handleCardClick(card) {
  if (state.currentTurn !== state.playerId || state.gameOver) {
    addMessage("❌ Not your turn or game is over", "error");
    return;
  }

  sendMessage("PLAY_CARD", { cardId: card.id });
  drawButton.disabled = true;
}

/**
 * Handle draw button click
 */
function handleDrawButtonClick() {
  if (state.currentTurn !== state.playerId || state.gameOver) {
    addMessage("❌ Not your turn or game is over", "error");
    return;
  }

  sendMessage("DRAW_CARD", {});
  drawButton.disabled = true;
}

/**
 * Update draw button state
 */
function updateDrawButton() {
  const isYourTurn = state.currentTurn === state.playerId;
  drawButton.disabled = !isYourTurn || state.gameOver;
}

/**
 * Render turn indicator
 */
function renderTurnIndicator() {
  if (!state.gameStarted) {
    turnText.textContent = "Waiting for game start...";
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
    const opponentName = `Player ${state.currentTurn?.substring(0, 4)}`;
    turnText.textContent = `${opponentName}'s Turn`;
    turnText.style.color = "rgba(255,255,255,0.8)";
  }
}

/**
 * Initialize the game
 */
function init() {
  console.log("Initializing game...");

  // Set up event listeners
  drawButton.addEventListener("click", handleDrawButtonClick);

  // Try to restore player ID from localStorage
  const savedPlayerId = localStorage.getItem(PLAYER_ID_KEY);
  const savedRoomId = localStorage.getItem(ROOM_ID_KEY);

  if (savedPlayerId) {
    console.log("Restoring player from localStorage");
    state.playerId = savedPlayerId;
    state.roomId = savedRoomId;
  }

  // Connect to server
  connect();
}

// Start the game when DOM is ready
document.addEventListener("DOMContentLoaded", init);
