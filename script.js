const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const posLabel = document.getElementById("pos");
const seedsLabel = document.getElementById("seeds");
const statusLabel = document.getElementById("status");
const resetButton = document.getElementById("reset");

const TILE_SIZE = 32;
const MAP_COLS = 30;
const MAP_ROWS = 17;
const SAVE_KEY = "farm-valley-save";

const tiles = {
  grass: "#8bc34a",
  soil: "#b57b4a",
  water: "#5aa9e6",
  path: "#d4b483",
  crop: "#4f6d2f",
};

const baseMap = Array.from({ length: MAP_ROWS }, (_, row) =>
  Array.from({ length: MAP_COLS }, (_, col) => {
    if (row < 3 || row > MAP_ROWS - 4 || col < 2 || col > MAP_COLS - 3) {
      return "water";
    }
    if (row === 8 || col === 14) {
      return "path";
    }
    return "grass";
  })
);

const gameState = {
  player: { x: 6, y: 8 },
  seeds: 5,
  crops: new Set(),
  status: "Listo",
};

const keyState = new Set();
let lastFrame = performance.now();

function loadState() {
  const stored = localStorage.getItem(SAVE_KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    if (parsed?.player) {
      gameState.player.x = parsed.player.x;
      gameState.player.y = parsed.player.y;
    }
    if (Number.isInteger(parsed?.seeds)) {
      gameState.seeds = parsed.seeds;
    }
    if (Array.isArray(parsed?.crops)) {
      gameState.crops = new Set(parsed.crops);
    }
  } catch (error) {
    console.warn("No se pudo cargar el guardado", error);
  }
}

function saveState() {
  const payload = {
    player: gameState.player,
    seeds: gameState.seeds,
    crops: [...gameState.crops],
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

function setStatus(message) {
  gameState.status = message;
  statusLabel.textContent = message;
}

function resetState() {
  localStorage.removeItem(SAVE_KEY);
  gameState.player = { x: 6, y: 8 };
  gameState.seeds = 5;
  gameState.crops = new Set();
  setStatus("Reiniciado");
  saveState();
}

function isWalkable(tileType) {
  return tileType !== "water";
}

function getTileAt(x, y) {
  if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) {
    return "water";
  }
  return baseMap[y][x];
}

function handleMovement(delta) {
  const speed = delta > 0 ? 1 : 0;
  let dx = 0;
  let dy = 0;

  if (keyState.has("KeyW")) dy -= speed;
  if (keyState.has("KeyS")) dy += speed;
  if (keyState.has("KeyA")) dx -= speed;
  if (keyState.has("KeyD")) dx += speed;

  if (dx === 0 && dy === 0) return;

  const nextX = gameState.player.x + dx;
  const nextY = gameState.player.y + dy;
  if (!isWalkable(getTileAt(nextX, nextY))) {
    setStatus("No puedes cruzar el agua");
    return;
  }

  gameState.player.x = nextX;
  gameState.player.y = nextY;
  setStatus("Explorando");
  saveState();
}

function plantSeed() {
  const { x, y } = gameState.player;
  const key = `${x},${y}`;

  if (getTileAt(x, y) !== "grass") {
    setStatus("Solo puedes plantar en césped");
    return;
  }
  if (gameState.crops.has(key)) {
    setStatus("Ya hay un brote aquí");
    return;
  }
  if (gameState.seeds <= 0) {
    setStatus("No tienes semillas");
    return;
  }

  gameState.seeds -= 1;
  gameState.crops.add(key);
  setStatus("Semilla plantada");
  saveState();
}

function drawTile(tileType, col, row) {
  ctx.fillStyle = tiles[tileType];
  ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

  if (tileType === "path") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(col * TILE_SIZE + 8, row * TILE_SIZE + 8, 16, 16);
  }
}

function drawCrop(col, row) {
  ctx.fillStyle = tiles.crop;
  ctx.fillRect(col * TILE_SIZE + 8, row * TILE_SIZE + 8, 16, 16);
}

function drawPlayer() {
  const { x, y } = gameState.player;
  ctx.fillStyle = "#3b2f2f";
  ctx.fillRect(x * TILE_SIZE + 6, y * TILE_SIZE + 6, 20, 20);
  ctx.fillStyle = "#ffe0b2";
  ctx.fillRect(x * TILE_SIZE + 10, y * TILE_SIZE + 10, 12, 12);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      drawTile(baseMap[row][col], col, row);
    }
  }

  for (const crop of gameState.crops) {
    const [col, row] = crop.split(",").map(Number);
    drawCrop(col, row);
  }

  drawPlayer();

  posLabel.textContent = `x: ${gameState.player.x}, y: ${gameState.player.y}`;
  seedsLabel.textContent = gameState.seeds;
}

function gameLoop(now) {
  const delta = now - lastFrame;
  if (delta > 120) {
    handleMovement(delta);
    lastFrame = now;
  }
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
    keyState.add(event.code);
  }
  if (event.code === "Space") {
    plantSeed();
  }
  if (event.code === "KeyR") {
    resetState();
  }
});

window.addEventListener("keyup", (event) => {
  keyState.delete(event.code);
});

resetButton.addEventListener("click", resetState);

loadState();
render();
requestAnimationFrame(gameLoop);
