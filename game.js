const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");
const message = document.getElementById("message");
const victoryBanner = document.getElementById("victoryBanner");
const menuScreen = document.getElementById("menuScreen");
const exitConfirmScreen = document.getElementById("exitConfirmScreen");
const levelTitle = document.getElementById("levelTitle");
const levelSubtitle = document.getElementById("levelSubtitle");
const levelButtons = Array.from(document.querySelectorAll(".menu-option[data-level]"));
const confirmExitButton = document.getElementById("confirmExit");
const cancelExitButton = document.getElementById("cancelExit");

const fov = Math.PI / 3;
const maxViewDistance = 20;

const baseLevels = {
  maze: {
    name: "Maze Complex",
    subtitle: "Storm a neon-bathed killbox and wipe out every hostile in the facility.",
    mapRows: [
      "1111111111111111",
      "1000001000000001",
      "1011101011110101",
      "1000100000010101",
      "1010111111010101",
      "1010000011010001",
      "1010111011011101",
      "1000101000000001",
      "1110101011111101",
      "1000001001000001",
      "1011111001011101",
      "1000000000010001",
      "1011110111010101",
      "1000010000010001",
      "1000000010000001",
      "1111111111111111",
    ],
    playerStart: { x: 1.6, y: 1.6, angle: 0 },
    enemies: [
      ["scout", 3.5, 2.5],
      ["trooper", 6.5, 3.5],
      ["scout", 13.5, 2.4],
      ["brute", 12.5, 5.3],
      ["trooper", 2.6, 7.5],
      ["scout", 6.2, 9.6],
      ["trooper", 11.4, 9.4],
      ["brute", 3.6, 13.4],
      ["scout", 13.4, 13.2],
      ["trooper", 8.5, 13.4],
    ],
    powerups: [
      ["health", 3.5, 5.5],
      ["shells", 8.5, 3.5],
      ["battery", 12.5, 9.5],
      ["rapid", 6.5, 12.5],
      ["health", 13.5, 6.5],
    ],
  },
  open: {
    name: "Open Killfield",
    subtitle: "Wide sightlines, hard strafes, and nowhere to hide while the arena closes in.",
    mapRows: [
      "1111111111111111",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1000000000000001",
      "1111111111111111",
    ],
    playerStart: { x: 8, y: 8, angle: -Math.PI / 2 },
    enemies: [
      ["scout", 3.2, 3.1],
      ["trooper", 7.9, 2.7],
      ["scout", 12.8, 3.1],
      ["brute", 4.2, 5.6],
      ["trooper", 11.8, 5.7],
      ["scout", 2.8, 8.3],
      ["brute", 13.1, 8.4],
      ["trooper", 4.5, 11.5],
      ["scout", 8, 12.8],
      ["trooper", 11.8, 11.6],
      ["brute", 8, 4.5],
      ["scout", 13.2, 13],
    ],
    powerups: [
      ["health", 8, 8.8],
      ["shells", 5.2, 8],
      ["battery", 10.8, 8],
      ["rapid", 8, 5.1],
      ["health", 8, 11.2],
    ],
  },
  random: {
    name: "Random Sector",
    subtitle: "A procedurally generated combat zone that can open wide or tighten into brutal lanes.",
  },
};

let currentLevelId = "maze";
let currentLevel = baseLevels[currentLevelId];
let map = currentLevel.mapRows.map((row) => row.split("").map(Number));
let mapWidth = map[0].length;
let mapHeight = map.length;

const keys = Object.create(null);
const pointer = { locked: false, primaryDown: false };

const weaponDefs = [
  {
    name: "Pistol",
    color: "#ffd285",
    accent: "#fff2c8",
    damage: 26,
    cooldown: 0.35,
    pellets: 1,
    spread: 0.02,
    range: 11,
    ammoCost: 0,
    ammoType: "battery",
  },
  {
    name: "Shotgun",
    color: "#ff9955",
    accent: "#ffe0ae",
    damage: 13,
    cooldown: 0.85,
    pellets: 6,
    spread: 0.16,
    range: 6.5,
    ammoCost: 1,
    ammoType: "shells",
  },
  {
    name: "Pulse Rifle",
    color: "#75e3ff",
    accent: "#d8fbff",
    damage: 12,
    cooldown: 0.12,
    pellets: 1,
    spread: 0.04,
    range: 13,
    ammoCost: 1,
    ammoType: "battery",
  },
];

const enemyDefs = {
  scout: {
    name: "Scout",
    color: "#ff7a7a",
    highlight: "#ffd8d8",
    speed: 1.55,
    radius: 0.24,
    health: 35,
    attackRange: 0.72,
    damage: 9,
    attackCooldown: 0.85,
    score: 100,
    ranged: false,
    scale: 1,
  },
  trooper: {
    name: "Trooper",
    color: "#ffc14d",
    highlight: "#fff1bf",
    speed: 0.9,
    radius: 0.28,
    health: 52,
    attackRange: 5.5,
    damage: 11,
    attackCooldown: 1.15,
    projectileSpeed: 4.5,
    score: 160,
    ranged: true,
    scale: 1.18,
  },
  brute: {
    name: "Brute",
    color: "#a874ff",
    highlight: "#ead4ff",
    speed: 0.62,
    radius: 0.34,
    health: 96,
    attackRange: 0.95,
    damage: 18,
    attackCooldown: 1.45,
    score: 250,
    ranged: false,
    scale: 1.36,
  },
};

const powerupDefs = {
  health: {
    label: "Med Patch",
    color: "#8df2a6",
    glow: "#d5ffe0",
    effect(state) {
      state.player.health = Math.min(state.player.maxHealth, state.player.health + 35);
      state.flash = { color: "rgba(141, 242, 166, 0.18)", time: 0.22 };
      state.statusText = "Health restored";
      state.statusTimer = 2;
    },
  },
  shells: {
    label: "Shell Crate",
    color: "#ffd285",
    glow: "#fff1c2",
    effect(state) {
      state.player.ammo.shells = Math.min(30, state.player.ammo.shells + 6);
      state.statusText = "Shotgun shells up";
      state.statusTimer = 2;
    },
  },
  battery: {
    label: "Battery Cell",
    color: "#75e3ff",
    glow: "#d8fbff",
    effect(state) {
      state.player.ammo.battery = Math.min(180, state.player.ammo.battery + 30);
      state.statusText = "Rifle energy refilled";
      state.statusTimer = 2;
    },
  },
  rapid: {
    label: "Overclock",
    color: "#ff7cf0",
    glow: "#ffd4fa",
    effect(state) {
      state.player.rapidFireTimer = 8;
      state.statusText = "Rapid fire engaged";
      state.statusTimer = 2;
    },
  },
};

const state = {
  time: 0,
  delta: 0,
  lastFrame: 0,
  wallDistances: [],
  projectiles: [],
  particles: [],
  flash: null,
  score: 0,
  statusText: "Sweep the arena",
  statusTimer: 2,
  gameOver: false,
  win: false,
  menuOpen: true,
  exitConfirmOpen: false,
  killCount: 0,
  totalEnemies: 0,
  viewTilt: 0,
  pitch: 0,
  cameraOffsetY: 0,
  player: {
    x: 1.6,
    y: 1.6,
    angle: 0,
    radius: 0.22,
    health: 100,
    maxHealth: 100,
    ammo: {
      shells: 12,
      battery: 90,
    },
    weaponIndex: 0,
    cooldown: 0,
    bob: 0,
    rapidFireTimer: 0,
    recoil: 0,
    muzzleTimer: 0,
    velocity: 0,
  },
  enemies: [],
  powerups: [],
};

function updateLevelText() {
  levelTitle.textContent = currentLevel.name;
  levelSubtitle.textContent = currentLevel.subtitle;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createFilledGrid(width, height, value) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => value));
}

function carveRect(grid, x0, y0, width, height, value = 0) {
  for (let y = y0; y < y0 + height; y += 1) {
    for (let x = x0; x < x0 + width; x += 1) {
      if (x > 0 && y > 0 && x < grid[0].length - 1 && y < grid.length - 1) {
        grid[y][x] = value;
      }
    }
  }
}

function gridToRows(grid) {
  return grid.map((row) => row.join(""));
}

function findOpenCellsFromGrid(grid) {
  const cells = [];
  for (let y = 1; y < grid.length - 1; y += 1) {
    for (let x = 1; x < grid[0].length - 1; x += 1) {
      if (grid[y][x] === 0) {
        cells.push({ x: x + 0.5, y: y + 0.5 });
      }
    }
  }
  return cells;
}

function pickSpreadPositions(cells, count, minDistance) {
  const chosen = [];
  for (const cell of shuffle(cells)) {
    if (chosen.every((picked) => distance(cell.x, cell.y, picked.x, picked.y) >= minDistance)) {
      chosen.push(cell);
      if (chosen.length >= count) break;
    }
  }
  if (chosen.length < count) {
    for (const cell of shuffle(cells)) {
      if (!chosen.includes(cell)) {
        chosen.push(cell);
        if (chosen.length >= count) break;
      }
    }
  }
  return chosen;
}

function generateOpenRandomLevel() {
  const width = 16;
  const height = 16;
  const grid = createFilledGrid(width, height, 0);

  for (let x = 0; x < width; x += 1) {
    grid[0][x] = 1;
    grid[height - 1][x] = 1;
  }
  for (let y = 0; y < height; y += 1) {
    grid[y][0] = 1;
    grid[y][width - 1] = 1;
  }

  for (let i = 0; i < randomInt(4, 8); i += 1) {
    if (Math.random() < 0.5) {
      const rw = randomInt(2, 4);
      const rh = randomInt(2, 4);
      const rx = randomInt(2, width - rw - 2);
      const ry = randomInt(2, height - rh - 2);
      carveRect(grid, rx, ry, rw, rh, 1);
    } else {
      grid[randomInt(2, height - 3)][randomInt(2, width - 3)] = 1;
    }
  }

  carveRect(grid, 6, 6, 4, 4, 0);
  const playerStart = { x: 8, y: 8, angle: -Math.PI / 2 };
  const cells = findOpenCellsFromGrid(grid);
  const enemyCells = pickSpreadPositions(cells.filter((cell) => distance(cell.x, cell.y, playerStart.x, playerStart.y) > 3.8), randomInt(10, 13), 1.7);
  const powerCells = pickSpreadPositions(cells.filter((cell) => distance(cell.x, cell.y, playerStart.x, playerStart.y) > 1.5), 5, 2.2);
  const enemyTypes = ["scout", "trooper", "scout", "trooper", "brute"];
  const powerKinds = ["health", "shells", "battery", "rapid", "health"];

  return {
    name: "Random Sector",
    subtitle: "Open procedural arena with long sightlines and scattered cover.",
    mapRows: gridToRows(grid),
    playerStart,
    enemies: enemyCells.map((cell, index) => [enemyTypes[index % enemyTypes.length], cell.x, cell.y]),
    powerups: powerCells.map((cell, index) => [powerKinds[index % powerKinds.length], cell.x, cell.y]),
  };
}

function generateMazeRandomLevel() {
  const width = 16;
  const height = 16;
  const grid = createFilledGrid(width, height, 1);

  function carveMazeCell(cx, cy) {
    grid[cy][cx] = 0;
    const directions = shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]]);
    for (const [dx, dy] of directions) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx <= 0 || ny <= 0 || nx >= width - 1 || ny >= height - 1) continue;
      if (grid[ny][nx] === 0) continue;
      grid[cy + dy / 2][cx + dx / 2] = 0;
      carveMazeCell(nx, ny);
    }
  }

  carveMazeCell(1, 1);
  for (let i = 0; i < randomInt(3, 5); i += 1) {
    const rw = randomInt(2, 4);
    const rh = randomInt(2, 4);
    carveRect(grid, randomInt(1, width - rw - 2), randomInt(1, height - rh - 2), rw, rh, 0);
  }

  carveRect(grid, 1, 1, 2, 2, 0);
  const playerStart = { x: 1.6, y: 1.6, angle: 0 };
  const cells = findOpenCellsFromGrid(grid);
  const enemyCells = pickSpreadPositions(cells.filter((cell) => distance(cell.x, cell.y, playerStart.x, playerStart.y) > 3.2), randomInt(10, 12), 1.5);
  const powerCells = pickSpreadPositions(cells.filter((cell) => distance(cell.x, cell.y, playerStart.x, playerStart.y) > 1.8), 5, 2);
  const enemyTypes = ["scout", "trooper", "scout", "trooper", "brute"];
  const powerKinds = ["health", "shells", "battery", "rapid", "health"];

  return {
    name: "Random Sector",
    subtitle: "Procedural close-quarters sector with carved lanes and improvised rooms.",
    mapRows: gridToRows(grid),
    playerStart,
    enemies: enemyCells.map((cell, index) => [enemyTypes[index % enemyTypes.length], cell.x, cell.y]),
    powerups: powerCells.map((cell, index) => [powerKinds[index % powerKinds.length], cell.x, cell.y]),
  };
}

function buildLevel(levelId) {
  if (levelId === "random") {
    return Math.random() < 0.5 ? generateMazeRandomLevel() : generateOpenRandomLevel();
  }
  return baseLevels[levelId];
}

function loadLevel(levelId) {
  currentLevelId = levelId;
  currentLevel = buildLevel(levelId);
  map = currentLevel.mapRows.map((row) => row.split("").map(Number));
  mapWidth = map[0].length;
  mapHeight = map.length;
  updateLevelText();
}

function isWall(x, y) {
  const gridX = Math.floor(x);
  const gridY = Math.floor(y);
  if (gridX < 0 || gridY < 0 || gridX >= mapWidth || gridY >= mapHeight) {
    return true;
  }
  return map[gridY][gridX] === 1;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function normalizeAngle(angle) {
  while (angle < -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function hasLineOfSight(ax, ay, bx, by) {
  const dist = distance(ax, ay, bx, by);
  const steps = Math.max(2, Math.ceil(dist / 0.08));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (isWall(x, y)) return false;
  }
  return true;
}

function isCircleBlocked(x, y, radius) {
  const r = radius * 0.92;
  const samples = [
    [x, y],
    [x + r, y],
    [x - r, y],
    [x, y + r],
    [x, y - r],
    [x + r * 0.7, y + r * 0.7],
    [x - r * 0.7, y + r * 0.7],
    [x + r * 0.7, y - r * 0.7],
    [x - r * 0.7, y - r * 0.7],
  ];
  return samples.some(([sx, sy]) => isWall(sx, sy));
}

function tryMoveCircle(entity, targetX, targetY, radius) {
  const startX = entity.x;
  const startY = entity.y;
  const moveX = targetX - startX;
  const moveY = targetY - startY;
  const distanceToMove = Math.hypot(moveX, moveY);
  const steps = Math.max(1, Math.ceil(distanceToMove / 0.05));

  for (let step = 1; step <= steps; step += 1) {
    const nextX = startX + (moveX * step) / steps;
    const nextY = startY + (moveY * step) / steps;
    const canMoveX = !isCircleBlocked(nextX, entity.y, radius);
    const canMoveY = !isCircleBlocked(entity.x, nextY, radius);
    const canMoveDiag = !isCircleBlocked(nextX, nextY, radius);

    if (canMoveDiag) {
      entity.x = nextX;
      entity.y = nextY;
      continue;
    }

    if (canMoveX) entity.x = nextX;
    if (canMoveY) entity.y = nextY;
  }
}

function findNearestOpenPosition(x, y, radius) {
  if (!isCircleBlocked(x, y, radius)) return { x, y };

  for (let ring = 1; ring <= 20; ring += 1) {
    const step = 0.18;
    const distanceFromOrigin = ring * step;
    const samples = Math.max(12, ring * 10);
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      const candidateX = x + Math.cos(angle) * distanceFromOrigin;
      const candidateY = y + Math.sin(angle) * distanceFromOrigin;
      if (!isCircleBlocked(candidateX, candidateY, radius)) {
        return { x: candidateX, y: candidateY };
      }
    }
  }
  return { x, y };
}

function spawnEnemy(type, x, y) {
  const def = enemyDefs[type];
  const spawn = findNearestOpenPosition(x, y, def.radius);
  state.enemies.push({
    type,
    x: spawn.x,
    y: spawn.y,
    angle: 0,
    radius: def.radius,
    health: def.health,
    cooldown: Math.random() * def.attackCooldown,
    hurtFlash: 0,
    stride: Math.random() * Math.PI * 2,
    alertTimer: 0,
    wanderTimer: 0.8 + Math.random() * 1.8,
    wanderAngle: Math.random() * Math.PI * 2,
    patrolTarget: { x: spawn.x, y: spawn.y },
  });
}

function spawnPowerup(kind, x, y) {
  state.powerups.push({
    kind,
    x,
    y,
    radius: 0.18,
    pulse: Math.random() * Math.PI * 2,
  });
}

function populateWorld() {
  for (const [type, x, y] of currentLevel.enemies) {
    spawnEnemy(type, x, y);
  }
  for (const [kind, x, y] of currentLevel.powerups) {
    spawnPowerup(kind, x, y);
  }
  state.totalEnemies = state.enemies.length;
}

function setWeapon(index) {
  if (index < 0 || index >= weaponDefs.length) return;
  state.player.weaponIndex = index;
  state.statusText = `Equipped ${weaponDefs[index].name}`;
  state.statusTimer = 1.25;
}

function castRay(x, y, angle, limit = maxViewDistance) {
  const step = 0.02;
  let dist = 0;
  while (dist < limit) {
    dist += step;
    const rx = x + Math.cos(angle) * dist;
    const ry = y + Math.sin(angle) * dist;
    if (isWall(rx, ry)) return { distance: dist, x: rx, y: ry };
  }
  return {
    distance: limit,
    x: x + Math.cos(angle) * limit,
    y: y + Math.sin(angle) * limit,
  };
}

function raycastHitEnemy(x, y, angle, limit) {
  const step = 0.03;
  let dist = 0;
  while (dist < limit) {
    dist += step;
    const rx = x + Math.cos(angle) * dist;
    const ry = y + Math.sin(angle) * dist;
    if (isWall(rx, ry)) return { enemy: null, x: rx, y: ry };
    for (const enemy of state.enemies) {
      if (distance(rx, ry, enemy.x, enemy.y) < enemy.radius) {
        return { enemy, x: rx, y: ry };
      }
    }
  }
  return { enemy: null, x: x + Math.cos(angle) * limit, y: y + Math.sin(angle) * limit };
}

function spawnImpact(x, y, color, count = 8) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      kind: "spark",
      x,
      y,
      dx: (Math.random() - 0.5) * 0.9,
      dy: (Math.random() - 0.5) * 0.9,
      life: 0.2 + Math.random() * 0.35,
      size: 0.05 + Math.random() * 0.06,
      color,
    });
  }
}

function choosePatrolTarget(enemy) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distanceAway = 0.7 + Math.random() * 2.8;
    const targetX = enemy.x + Math.cos(angle) * distanceAway;
    const targetY = enemy.y + Math.sin(angle) * distanceAway;
    if (!isCircleBlocked(targetX, targetY, enemy.radius) && hasLineOfSight(enemy.x, enemy.y, targetX, targetY)) {
      return { x: targetX, y: targetY };
    }
  }
  return { x: enemy.x, y: enemy.y };
}

function moveEnemy(enemy, angle, speed, dt) {
  const move = speed * dt;
  tryMoveCircle(enemy, enemy.x + Math.cos(angle) * move, enemy.y + Math.sin(angle) * move, enemy.radius);
}

function getSwarmPressure(enemy) {
  let nearbyCount = 0;
  let pushX = 0;
  let pushY = 0;
  for (const other of state.enemies) {
    if (other === enemy) continue;
    const dx = enemy.x - other.x;
    const dy = enemy.y - other.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < 1.6) {
      nearbyCount += 1;
      const strength = (1.6 - dist) / 1.6;
      pushX += (dx / dist) * strength;
      pushY += (dy / dist) * strength;
    }
  }
  return { nearbyCount, pushX, pushY };
}

function spawnMuzzleBurst(color) {
  for (let i = 0; i < 12; i += 1) {
    state.particles.push({
      kind: "muzzle",
      x: state.player.x + Math.cos(state.player.angle) * 0.4,
      y: state.player.y + Math.sin(state.player.angle) * 0.4,
      dx: Math.cos(state.player.angle) * (1.5 + Math.random() * 2) + (Math.random() - 0.5) * 0.8,
      dy: Math.sin(state.player.angle) * (1.5 + Math.random() * 2) + (Math.random() - 0.5) * 0.8,
      life: 0.1 + Math.random() * 0.15,
      size: 0.05 + Math.random() * 0.05,
      color,
    });
  }
}

function shoot() {
  if (state.menuOpen || state.exitConfirmOpen) return;
  if (state.gameOver) {
    if (!state.win) restart();
    return;
  }

  const player = state.player;
  const weapon = weaponDefs[player.weaponIndex];
  if (player.cooldown > 0) return;

  if (weapon.ammoCost > 0) {
    const available = player.ammo[weapon.ammoType];
    if (available < weapon.ammoCost) {
      state.statusText = `Out of ${weapon.ammoType}`;
      state.statusTimer = 1.2;
      return;
    }
    player.ammo[weapon.ammoType] -= weapon.ammoCost;
  }

  const rapidMult = player.rapidFireTimer > 0 ? 0.6 : 1;
  player.cooldown = weapon.cooldown * rapidMult;
  player.recoil = 1;
  player.muzzleTimer = 0.08;
  state.flash = { color: "rgba(255, 244, 204, 0.08)", time: 0.05 };
  state.statusText = `${weapon.name} fired`;
  state.statusTimer = 0.45;
  spawnMuzzleBurst(weapon.color);

  for (let i = 0; i < weapon.pellets; i += 1) {
    const shotAngle = player.angle + (Math.random() - 0.5) * weapon.spread;
    const hit = raycastHitEnemy(player.x, player.y, shotAngle, weapon.range);
    if (hit.enemy) {
      hit.enemy.health -= weapon.damage;
      hit.enemy.hurtFlash = 0.15;
      spawnImpact(hit.x, hit.y, weapon.color, 10);
      if (hit.enemy.health <= 0) killEnemy(hit.enemy);
    } else {
      const endPoint = castRay(player.x, player.y, shotAngle, weapon.range);
      spawnImpact(endPoint.x, endPoint.y, "rgba(255,255,255,0.35)", 5);
    }
  }
}

function updateAutoFire() {
  if (state.menuOpen || state.exitConfirmOpen || state.gameOver || !pointer.locked || !pointer.primaryDown) return;
  if (weaponDefs[state.player.weaponIndex].name === "Pulse Rifle") shoot();
}

function killEnemy(enemy) {
  const def = enemyDefs[enemy.type];
  state.enemies = state.enemies.filter((entry) => entry !== enemy);
  state.score += def.score;
  state.killCount += 1;
  state.statusText = `${def.name} eliminated`;
  state.statusTimer = 1.4;

  for (let i = 0; i < 18; i += 1) {
    state.particles.push({
      kind: "burst",
      x: enemy.x,
      y: enemy.y,
      dx: (Math.random() - 0.5) * 2.2,
      dy: (Math.random() - 0.5) * 2.2,
      life: 0.35 + Math.random() * 0.35,
      size: 0.06 + Math.random() * 0.06,
      color: def.color,
    });
  }

  if (Math.random() < 0.45) {
    const drops = ["health", "shells", "battery", "rapid"];
    spawnPowerup(drops[Math.floor(Math.random() * drops.length)], enemy.x, enemy.y);
  }

  if (state.enemies.length === 0) {
    state.win = true;
    state.gameOver = true;
    state.statusText = "Arena cleared";
    state.statusTimer = 999;
  }
}

function updatePlayer(dt) {
  const player = state.player;
  const moveSpeed = 2.65;
  const turnSpeed = 2.2;

  if (keys.ArrowLeft) player.angle -= turnSpeed * dt;
  if (keys.ArrowRight) player.angle += turnSpeed * dt;

  const forward = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const factor = forward !== 0 && strafe !== 0 ? Math.SQRT1_2 : 1;
  const speed = moveSpeed * factor;
  const dx = (Math.cos(player.angle) * forward + Math.cos(player.angle + Math.PI / 2) * strafe) * speed * dt;
  const dy = (Math.sin(player.angle) * forward + Math.sin(player.angle + Math.PI / 2) * strafe) * speed * dt;

  tryMoveCircle(player, player.x + dx, player.y + dy, player.radius);
  player.velocity = Math.hypot(dx, dy) / Math.max(dt, 0.0001);
  player.bob += Math.hypot(dx, dy) * 10;
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.rapidFireTimer = Math.max(0, player.rapidFireTimer - dt);
  player.recoil = Math.max(0, player.recoil - dt * 6);
  player.muzzleTimer = Math.max(0, player.muzzleTimer - dt);
  state.viewTilt = lerp(state.viewTilt, strafe * 0.03, dt * 7);

  for (const powerup of [...state.powerups]) {
    powerup.pulse += dt * 3;
    if (distance(player.x, player.y, powerup.x, powerup.y) < player.radius + powerup.radius + 0.05) {
      powerupDefs[powerup.kind].effect(state);
      state.powerups = state.powerups.filter((item) => item !== powerup);
    }
  }
}

function updateEnemies(dt) {
  const player = state.player;
  const pressuredEnemies = state.enemies
    .map((enemy) => ({ enemy, dist: distance(enemy.x, enemy.y, player.x, player.y) }))
    .sort((a, b) => a.dist - b.dist);
  const engageSet = new Set(pressuredEnemies.slice(0, 4).map((entry) => entry.enemy));

  for (const enemy of state.enemies) {
    const def = enemyDefs[enemy.type];
    const toPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    enemy.hurtFlash = Math.max(0, enemy.hurtFlash - dt);
    enemy.stride += dt * (1.5 + def.speed);
    enemy.wanderTimer -= dt;

    const distToPlayer = distance(enemy.x, enemy.y, player.x, player.y);
    const seesPlayer = hasLineOfSight(enemy.x, enemy.y, player.x, player.y);
    const isNearby = distToPlayer < 6.5;
    const isEngager = engageSet.has(enemy);
    const swarm = getSwarmPressure(enemy);

    if (seesPlayer && (isNearby || distToPlayer < 8.5)) {
      enemy.alertTimer = 3.5;
      enemy.patrolTarget = { x: player.x, y: player.y };
    } else {
      enemy.alertTimer = Math.max(0, enemy.alertTimer - dt);
    }

    const isAlerted = enemy.alertTimer > 0;
    enemy.angle = isAlerted ? toPlayer : enemy.wanderAngle;

    if (!isAlerted) {
      if (enemy.wanderTimer <= 0 || distance(enemy.x, enemy.y, enemy.patrolTarget.x, enemy.patrolTarget.y) < 0.22) {
        enemy.patrolTarget = choosePatrolTarget(enemy);
        enemy.wanderTimer = 1.6 + Math.random() * 2.4;
      }
      const patrolAngle = Math.atan2(enemy.patrolTarget.y - enemy.y, enemy.patrolTarget.x - enemy.x);
      enemy.wanderAngle = patrolAngle;
      moveEnemy(enemy, patrolAngle, def.speed * 0.45, dt);
      continue;
    }

    let desiredAngle = toPlayer;
    if (swarm.nearbyCount > 0) {
      const separationAngle = Math.atan2(swarm.pushY, swarm.pushX);
      desiredAngle = Math.atan2(
        Math.sin(toPlayer) * 1.2 + Math.sin(separationAngle) * 0.8,
        Math.cos(toPlayer) * 1.2 + Math.cos(separationAngle) * 0.8,
      );
    }

    const preferredRange = def.ranged ? Math.max(2.8, def.attackRange * 0.72) : def.attackRange + 0.35;
    const tooCloseForCrowd = !def.ranged && !isEngager && distToPlayer < 2.2;

    if (tooCloseForCrowd) {
      moveEnemy(enemy, toPlayer + (Math.sin(enemy.stride) > 0 ? Math.PI / 2 : -Math.PI / 2), def.speed * 0.55, dt);
    } else if (distToPlayer > preferredRange) {
      moveEnemy(enemy, desiredAngle, def.speed * (isEngager ? 1 : 0.7), dt);
    } else if (def.ranged && distToPlayer < preferredRange * 0.72) {
      moveEnemy(enemy, desiredAngle + Math.PI, def.speed * 0.4, dt);
    } else if (!def.ranged && !isEngager) {
      moveEnemy(enemy, toPlayer + (Math.sin(enemy.stride * 0.7) > 0 ? Math.PI / 2 : -Math.PI / 2), def.speed * 0.45, dt);
    }

    const canAttack = seesPlayer && (isEngager || def.ranged || distToPlayer < 1.35);
    if (canAttack && distToPlayer <= def.attackRange && enemy.cooldown <= 0) {
      enemy.cooldown = def.attackCooldown;
      if (def.ranged) {
        state.projectiles.push({
          owner: "enemy",
          x: enemy.x,
          y: enemy.y,
          dx: Math.cos(toPlayer) * def.projectileSpeed,
          dy: Math.sin(toPlayer) * def.projectileSpeed,
          damage: def.damage,
          life: 2.4,
          color: def.color,
          radius: 0.08,
        });
        spawnImpact(enemy.x, enemy.y, def.color, 5);
      } else if (distToPlayer <= def.attackRange + 0.12) {
        damagePlayer(def.damage);
      }
    }
  }
}

function damagePlayer(amount) {
  if (state.gameOver) return;
  state.player.health = Math.max(0, state.player.health - amount);
  state.flash = { color: "rgba(255, 80, 120, 0.22)", time: 0.18 };
  state.statusText = `Took ${amount} damage`;
  state.statusTimer = 0.9;
  if (state.player.health <= 0) {
    state.gameOver = true;
    state.win = false;
    state.statusText = "You were overwhelmed";
    state.statusTimer = 999;
  }
}

function updateProjectiles(dt) {
  for (const projectile of [...state.projectiles]) {
    projectile.x += projectile.dx * dt;
    projectile.y += projectile.dy * dt;
    projectile.life -= dt;

    if (isWall(projectile.x, projectile.y) || projectile.life <= 0) {
      spawnImpact(projectile.x, projectile.y, projectile.color, 4);
      state.projectiles = state.projectiles.filter((entry) => entry !== projectile);
      continue;
    }

    if (projectile.owner === "enemy" && distance(projectile.x, projectile.y, state.player.x, state.player.y) < state.player.radius + projectile.radius) {
      damagePlayer(projectile.damage);
      state.projectiles = state.projectiles.filter((entry) => entry !== projectile);
    }
  }
}

function updateParticles(dt) {
  state.particles = state.particles.filter((particle) => {
    particle.x += particle.dx * dt;
    particle.y += particle.dy * dt;
    particle.life -= dt;
    particle.dx *= 0.96;
    particle.dy *= 0.96;
    return particle.life > 0;
  });
}

function updateHud() {
  const weapon = weaponDefs[state.player.weaponIndex];
  const rapid = state.player.rapidFireTimer > 0 ? ` <span class="accent">BOOST ${state.player.rapidFireTimer.toFixed(1)}s</span>` : "";
  hud.innerHTML = `
    <p><strong>Hull</strong> <span class="${state.player.health < 35 ? "danger" : state.player.health < 70 ? "accent" : "heal"}">${Math.ceil(state.player.health)}</span></p>
    <p><strong>Weapon</strong> <span class="energy">${weapon.name}</span></p>
    <p><strong>Ammo</strong> S:${state.player.ammo.shells} B:${state.player.ammo.battery}${rapid}</p>
    <p><strong>Hostiles</strong> ${state.enemies.length} / ${state.totalEnemies}</p>
    <p><strong>Level</strong> ${currentLevel.name}</p>
    <p><strong>Score</strong> ${state.score}</p>
  `;
}

function renderBackground(width, height, horizon) {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, currentLevelId === "open" ? "#0d1d3d" : "#09172e");
  sky.addColorStop(0.5, currentLevelId === "open" ? "#22496d" : "#173254");
  sky.addColorStop(1, currentLevelId === "open" ? "#3c6b72" : "#294f64");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);

  const glowLeft = ctx.createRadialGradient(width * 0.18, horizon * 0.35, 20, width * 0.18, horizon * 0.35, width * 0.45);
  glowLeft.addColorStop(0, "rgba(108, 228, 255, 0.22)");
  glowLeft.addColorStop(1, "rgba(108, 228, 255, 0)");
  ctx.fillStyle = glowLeft;
  ctx.fillRect(0, 0, width, horizon);

  const glowRight = ctx.createRadialGradient(width * 0.82, horizon * 0.28, 20, width * 0.82, horizon * 0.28, width * 0.38);
  glowRight.addColorStop(0, "rgba(255, 200, 87, 0.16)");
  glowRight.addColorStop(1, "rgba(255, 200, 87, 0)");
  ctx.fillStyle = glowRight;
  ctx.fillRect(0, 0, width, horizon);

  const floor = ctx.createLinearGradient(0, horizon, 0, height);
  floor.addColorStop(0, currentLevelId === "open" ? "#2a2014" : "#27180f");
  floor.addColorStop(0.22, "#170f10");
  floor.addColorStop(1, "#05070d");
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, width, height - horizon);
  renderFloorGrid(width, height, horizon);
}

function renderFloorGrid(width, height, horizon) {
  ctx.save();
  ctx.strokeStyle = "rgba(108, 228, 255, 0.04)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 9; i += 1) {
    const y = horizon + ((i / 9) ** 1.8) * (height - horizon);
    ctx.beginPath();
    ctx.moveTo(width * 0.12, y);
    ctx.lineTo(width * 0.88, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255, 200, 87, 0.025)";
  for (let i = 0; i < 5; i += 1) {
    const y = horizon + (0.58 + i * 0.085) * (height - horizon);
    ctx.beginPath();
    ctx.moveTo(width * 0.18, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function renderWalls(width, height, cameraOffsetY) {
  state.wallDistances = new Array(width);
  for (let column = 0; column < width; column += 1) {
    const rayAngle = state.player.angle - fov / 2 + (column / width) * fov;
    const ray = castRay(state.player.x, state.player.y, rayAngle);
    const corrected = ray.distance * Math.cos(rayAngle - state.player.angle);
    const wallHeight = Math.min(height, height / Math.max(corrected, 0.0001));
    const wallTop = (height - wallHeight) / 2 + cameraOffsetY;
    state.wallDistances[column] = corrected;

    const depth = clamp(1 - corrected / maxViewDistance, 0, 1);
    const localWave = (Math.sin(ray.x * 6) + Math.cos(ray.y * 6)) * 0.5;
    const baseHue = currentLevelId === "open" ? 32 + Math.floor((ray.x * 20 + ray.y * 14)) % 12 : 204 + Math.floor((ray.x * 20 + ray.y * 14)) % 18;
    const lightness = 14 + depth * 28 + localWave * 3;
    ctx.fillStyle = `hsl(${baseHue} 38% ${lightness}%)`;
    ctx.fillRect(column, wallTop, 1, wallHeight);

    if (column % 2 === 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + depth * 0.05})`;
      ctx.fillRect(column, wallTop + wallHeight * 0.08, 1, wallHeight * 0.84);
    }

    const stripeY = wallTop + wallHeight * (0.16 + ((Math.floor(ray.x) + Math.floor(ray.y)) % 3) * 0.18);
    ctx.fillStyle = `rgba(108,228,255,${0.04 + depth * 0.14})`;
    ctx.fillRect(column, stripeY, 1, Math.max(2, wallHeight * 0.03));

    const shadowFade = 1 - depth;
    if (shadowFade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${shadowFade * 0.32})`;
      ctx.fillRect(column, wallTop, 1, wallHeight);
    }
  }
}

function renderSprites(cameraOffsetY) {
  const sprites = [];
  for (const enemy of state.enemies) sprites.push({ type: "enemy", entity: enemy, x: enemy.x, y: enemy.y, scale: enemyDefs[enemy.type].scale });
  for (const powerup of state.powerups) sprites.push({ type: "powerup", entity: powerup, x: powerup.x, y: powerup.y, scale: 0.54 + Math.sin(powerup.pulse) * 0.06 });
  for (const projectile of state.projectiles) sprites.push({ type: "projectile", entity: projectile, x: projectile.x, y: projectile.y, scale: 0.22 });
  for (const particle of state.particles) sprites.push({ type: "particle", entity: particle, x: particle.x, y: particle.y, scale: particle.size });

  sprites
    .map((sprite) => {
      const dx = sprite.x - state.player.x;
      const dy = sprite.y - state.player.y;
      return {
        ...sprite,
        distanceToPlayer: Math.hypot(dx, dy),
        angleToSprite: normalizeAngle(Math.atan2(dy, dx) - state.player.angle),
      };
    })
    .filter((sprite) => Math.abs(sprite.angleToSprite) < fov * 0.74 && sprite.distanceToPlayer > 0.08)
    .sort((a, b) => b.distanceToPlayer - a.distanceToPlayer)
    .forEach((sprite) => drawSprite(sprite, cameraOffsetY));
}

function drawSprite(sprite, cameraOffsetY) {
  const screenX = (0.5 + sprite.angleToSprite / fov) * canvas.width;
  const correctedDistance = sprite.distanceToPlayer * Math.cos(sprite.angleToSprite);
  const baseSize = (canvas.height / Math.max(correctedDistance, 0.001)) * sprite.scale;

  if (sprite.type === "enemy") return drawEnemySprite(sprite, screenX, correctedDistance, baseSize, cameraOffsetY);
  if (sprite.type === "powerup") return drawPowerupSprite(sprite, screenX, correctedDistance, baseSize, cameraOffsetY);
  if (sprite.type === "projectile") return drawProjectileSprite(sprite, screenX, correctedDistance, baseSize, cameraOffsetY);
  drawParticleSprite(sprite, screenX, correctedDistance, baseSize, cameraOffsetY);
}

function drawEnemySprite(sprite, screenX, correctedDistance, baseSize, cameraOffsetY) {
  const def = enemyDefs[sprite.entity.type];
  const width = baseSize * 0.68;
  const height = baseSize * 1.35;
  const stride = Math.sin(sprite.entity.stride) * width * 0.06;
  const left = screenX - width / 2;
  const top = canvas.height / 2 - height / 2 + cameraOffsetY + Math.sin(sprite.entity.stride * 2) * 4;
  const glowAlpha = clamp(1 - correctedDistance / 14, 0.08, 0.4);

  drawBillboardGlow(screenX, top + height * 0.45, width * 1.6, height * 1.2, def.color, glowAlpha, correctedDistance);
  fillVisibleRect(left + width * 0.23 + stride, top + height * 0.06, width * 0.54, height * 0.23, sprite.entity.hurtFlash > 0 ? "#ffffff" : def.highlight, correctedDistance);
  fillVisibleRect(left + width * 0.13, top + height * 0.26, width * 0.74, height * 0.44, shadeColor(def.color, -0.08), correctedDistance);
  fillVisibleRect(left + width * 0.19, top + height * 0.33, width * 0.62, height * 0.12, def.highlight, correctedDistance);
  fillVisibleRect(left + width * 0.04 - stride, top + height * 0.3, width * 0.12, height * 0.46, shadeColor(def.color, -0.2), correctedDistance);
  fillVisibleRect(left + width * 0.84 + stride, top + height * 0.3, width * 0.12, height * 0.46, shadeColor(def.color, -0.2), correctedDistance);
  fillVisibleRect(left + width * 0.18 - stride, top + height * 0.69, width * 0.18, height * 0.34, shadeColor(def.color, -0.28), correctedDistance);
  fillVisibleRect(left + width * 0.64 + stride, top + height * 0.69, width * 0.18, height * 0.34, shadeColor(def.color, -0.28), correctedDistance);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(left, top - 11, width, 4);
  ctx.fillStyle = def.color;
  ctx.fillRect(left, top - 11, width * (Math.max(0, sprite.entity.health) / def.health), 4);
}

function drawPowerupSprite(sprite, screenX, correctedDistance, baseSize, cameraOffsetY) {
  const def = powerupDefs[sprite.entity.kind];
  const size = baseSize * 0.68;
  const left = screenX - size / 2;
  const top = canvas.height / 2 - size / 2 + cameraOffsetY - Math.sin(sprite.entity.pulse) * 8;
  drawBillboardGlow(screenX, top + size * 0.5, size * 1.8, size * 1.8, def.color, 0.28, correctedDistance);
  fillVisibleRect(left, top, size, size, shadeColor(def.color, -0.1), correctedDistance);
  fillVisibleRect(left + size * 0.1, top + size * 0.1, size * 0.8, size * 0.8, def.glow, correctedDistance);
  fillVisibleRect(left + size * 0.42, top + size * 0.18, size * 0.16, size * 0.64, def.color, correctedDistance);
  fillVisibleRect(left + size * 0.18, top + size * 0.42, size * 0.64, size * 0.16, def.color, correctedDistance);
}

function drawProjectileSprite(sprite, screenX, correctedDistance, baseSize, cameraOffsetY) {
  const size = baseSize * 0.55;
  const left = screenX - size / 2;
  const top = canvas.height / 2 - size / 2 + cameraOffsetY;
  drawBillboardGlow(screenX, top + size / 2, size * 2.5, size * 2.5, sprite.entity.color, 0.35, correctedDistance);
  fillVisibleRect(left, top, size, size, sprite.entity.color, correctedDistance);
}

function drawParticleSprite(sprite, screenX, correctedDistance, baseSize, cameraOffsetY) {
  const size = baseSize * 0.8 * clamp(sprite.entity.life * 4, 0.2, 1);
  fillVisibleRect(screenX - size / 2, canvas.height / 2 - size / 2 + cameraOffsetY, size, size, sprite.entity.color, correctedDistance, clamp(sprite.entity.life * 2, 0.15, 0.9));
}

function fillVisibleRect(left, top, widthPx, heightPx, color, correctedDistance, alpha = 1) {
  const startX = Math.max(0, Math.floor(left));
  const endX = Math.min(canvas.width - 1, Math.floor(left + widthPx));
  ctx.fillStyle = toAlphaColor(color, alpha);
  for (let x = startX; x <= endX; x += 1) {
    if (state.wallDistances[x] < correctedDistance) continue;
    ctx.fillRect(x, top, 1, heightPx);
  }
}

function drawBillboardGlow(centerX, centerY, widthPx, heightPx, color, alpha, correctedDistance) {
  const left = centerX - widthPx / 2;
  const top = centerY - heightPx / 2;
  const startX = Math.max(0, Math.floor(left));
  const endX = Math.min(canvas.width - 1, Math.floor(left + widthPx));
  for (let x = startX; x <= endX; x += 1) {
    if (state.wallDistances[x] < correctedDistance) continue;
    const t = (x - left) / widthPx;
    ctx.fillStyle = toAlphaColor(color, alpha * Math.sin(t * Math.PI) * 0.7);
    ctx.fillRect(x, top, 1, heightPx);
  }
}

function renderWeapon() {
  const weapon = weaponDefs[state.player.weaponIndex];
  const bob = Math.sin(state.player.bob) * 10;
  const sway = Math.cos(state.player.bob * 0.5) * 8 + state.viewTilt * 300;
  const recoil = state.player.recoil * 34;
  const weaponX = canvas.width * 0.63 + sway;
  const weaponY = canvas.height * 0.79 + bob + recoil - state.pitch * 18;

  ctx.save();
  ctx.shadowBlur = 24;
  ctx.shadowColor = toAlphaColor(weapon.color, 0.24);

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(weaponX + 12, weaponY + 28, 180, 60, -0.16, 0, Math.PI * 2);
  ctx.fill();

  const bodyGradient = ctx.createLinearGradient(weaponX - 80, weaponY - 80, weaponX + 160, weaponY + 40);
  bodyGradient.addColorStop(0, weapon.accent);
  bodyGradient.addColorStop(0.22, weapon.color);
  bodyGradient.addColorStop(0.8, shadeColor(weapon.color, -0.35));
  bodyGradient.addColorStop(1, "#0c1220");
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.moveTo(weaponX - 94, weaponY - 30);
  ctx.lineTo(weaponX + 74, weaponY - 78);
  ctx.lineTo(weaponX + 188, weaponY - 18);
  ctx.lineTo(weaponX + 140, weaponY + 42);
  ctx.lineTo(weaponX - 16, weaponY + 50);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(weaponX - 46, weaponY - 28, 138, 9);
  ctx.fillStyle = shadeColor(weapon.color, -0.18);
  ctx.fillRect(weaponX + 52, weaponY - 56, 120, 14);
  ctx.fillStyle = "#0f1623";
  ctx.fillRect(weaponX + 146, weaponY - 26, 44, 18);
  ctx.fillStyle = weapon.accent;
  ctx.fillRect(weaponX + 158, weaponY - 22, 18, 10);

  ctx.fillStyle = "#1a1415";
  ctx.beginPath();
  ctx.moveTo(weaponX - 4, weaponY + 2);
  ctx.lineTo(weaponX + 46, weaponY + 66);
  ctx.lineTo(weaponX + 18, weaponY + 118);
  ctx.lineTo(weaponX - 42, weaponY + 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#312728";
  ctx.beginPath();
  ctx.moveTo(weaponX - 70, weaponY + 10);
  ctx.lineTo(weaponX - 20, weaponY + 32);
  ctx.lineTo(weaponX - 6, weaponY + 84);
  ctx.lineTo(weaponX - 66, weaponY + 64);
  ctx.closePath();
  ctx.fill();

  if (state.player.muzzleTimer > 0) {
    const alpha = state.player.muzzleTimer / 0.08;
    ctx.fillStyle = toAlphaColor("#fff2cf", alpha * 0.95);
    ctx.beginPath();
    ctx.moveTo(weaponX + 186, weaponY - 12);
    ctx.lineTo(weaponX + 252 + Math.random() * 26, weaponY - 34);
    ctx.lineTo(weaponX + 214, weaponY + 8);
    ctx.lineTo(weaponX + 252 + Math.random() * 24, weaponY + 34);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function renderReticle() {
  const spread = 12 + state.player.recoil * 12 + (state.player.velocity > 0.3 ? 5 : 0);
  const pulse = 1 + Math.sin(state.time * 4) * 0.08;
  ctx.save();
  ctx.strokeStyle = "rgba(216, 251, 255, 0.92)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "rgba(108, 228, 255, 0.4)";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 6 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - spread - 14, canvas.height / 2);
  ctx.lineTo(canvas.width / 2 - spread, canvas.height / 2);
  ctx.moveTo(canvas.width / 2 + spread, canvas.height / 2);
  ctx.lineTo(canvas.width / 2 + spread + 14, canvas.height / 2);
  ctx.moveTo(canvas.width / 2, canvas.height / 2 - spread - 14);
  ctx.lineTo(canvas.width / 2, canvas.height / 2 - spread);
  ctx.moveTo(canvas.width / 2, canvas.height / 2 + spread);
  ctx.lineTo(canvas.width / 2, canvas.height / 2 + spread + 14);
  ctx.stroke();
  ctx.restore();
}

function renderMinimap() {
  const scale = 11;
  const x0 = canvas.width - mapWidth * scale - 26;
  const y0 = 34;

  ctx.save();
  ctx.fillStyle = "rgba(3, 10, 18, 0.76)";
  ctx.fillRect(x0 - 12, y0 - 12, mapWidth * scale + 24, mapHeight * scale + 24);
  ctx.strokeStyle = "rgba(108, 228, 255, 0.22)";
  ctx.strokeRect(x0 - 12, y0 - 12, mapWidth * scale + 24, mapHeight * scale + 24);
  ctx.fillStyle = "rgba(216, 251, 255, 0.92)";
  ctx.font = "bold 14px Segoe UI";
  ctx.textAlign = "left";
  ctx.fillText("RADAR", x0 - 10, y0 - 18);

  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      ctx.fillStyle = map[y][x] === 1 ? "#35506a" : "#0e1a26";
      ctx.fillRect(x0 + x * scale, y0 + y * scale, scale - 1, scale - 1);
    }
  }

  for (const powerup of state.powerups) {
    ctx.fillStyle = powerupDefs[powerup.kind].color;
    ctx.fillRect(x0 + powerup.x * scale - 2, y0 + powerup.y * scale - 2, 5, 5);
  }
  for (const enemy of state.enemies) {
    ctx.fillStyle = enemyDefs[enemy.type].color;
    ctx.beginPath();
    ctx.arc(x0 + enemy.x * scale, y0 + enemy.y * scale, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x0 + state.player.x * scale, y0 + state.player.y * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8fbff";
  ctx.beginPath();
  ctx.moveTo(x0 + state.player.x * scale, y0 + state.player.y * scale);
  ctx.lineTo(
    x0 + (state.player.x + Math.cos(state.player.angle) * 0.8) * scale,
    y0 + (state.player.y + Math.sin(state.player.angle) * 0.8) * scale,
  );
  ctx.stroke();
  ctx.restore();
}

function renderPostEffects(width, height) {
  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.18, width / 2, height / 2, height * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.52)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(108,228,255,0.035)";
  ctx.fillRect(0, height * 0.505, width, 2);
  if (state.flash) {
    ctx.fillStyle = state.flash.color;
    ctx.fillRect(0, 0, width, height);
  }
}

function renderScene() {
  const width = canvas.width;
  const height = canvas.height;
  const cameraOffsetY = state.pitch * height * 0.32;
  const horizon = height * (0.5 + Math.sin(state.player.bob * 0.2) * 0.004 + state.viewTilt * 0.2) + cameraOffsetY;
  state.cameraOffsetY = cameraOffsetY;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(state.viewTilt);
  ctx.translate(-width / 2, -height / 2);
  renderBackground(width, height, horizon);
  renderWalls(width, height, cameraOffsetY);
  renderSprites(cameraOffsetY);
  renderWeapon();
  renderReticle();
  if (!state.menuOpen) renderMinimap();
  renderPostEffects(width, height);
  ctx.restore();
}

function updateMessage() {
  if (state.menuOpen) {
    message.textContent = "Select a level to deploy.";
    return;
  }
  if (state.exitConfirmOpen) {
    message.textContent = "Confirm whether you want to leave the current level.";
    return;
  }
  if (state.gameOver) {
    message.textContent = state.win ? "Facility secured." : "Mission failed. Click or press Space to try again.";
    return;
  }
  if (!pointer.locked) {
    message.textContent = "Click the arena to lock the cursor. Use WASD to move and clear every enemy.";
    return;
  }
  message.textContent = state.statusTimer > 0 ? state.statusText : "Keep moving. Powerups drop from enemies and can swing the fight.";
}

function updateEndOverlay() {
  victoryBanner.classList.toggle("hidden", !(state.gameOver && state.win));
}

function updateMenuOverlay() {
  menuScreen.classList.toggle("hidden", !state.menuOpen);
}

function updateExitConfirmOverlay() {
  exitConfirmScreen.classList.toggle("hidden", !state.exitConfirmOpen);
}

function shadeColor(hex, delta) {
  const value = hex.replace("#", "");
  const parts = value.match(/.{1,2}/g).map((part) => parseInt(part, 16));
  const shifted = parts.map((part) => clamp(Math.round(part * (1 + delta)), 0, 255));
  return `rgb(${shifted[0]}, ${shifted[1]}, ${shifted[2]})`;
}

function toAlphaColor(color, alpha) {
  if (color.startsWith("rgba")) return color;
  if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  if (color.startsWith("#")) {
    const value = color.slice(1);
    const size = value.length === 3 ? 1 : 2;
    const parts = value.match(new RegExp(`.{1,${size}}`, "g")).map((part) => parseInt(size === 1 ? part + part : part, 16));
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  }
  return color;
}

function resetPlayerForLevel() {
  const start = currentLevel.playerStart;
  state.player.x = start.x;
  state.player.y = start.y;
  state.player.angle = start.angle;
  state.player.health = 100;
  state.player.cooldown = 0;
  state.player.weaponIndex = 0;
  state.player.bob = 0;
  state.player.rapidFireTimer = 0;
  state.player.recoil = 0;
  state.player.muzzleTimer = 0;
  state.player.velocity = 0;
  state.player.ammo.shells = 12;
  state.player.ammo.battery = 90;
}

function restart() {
  state.time = 0;
  state.delta = 0;
  state.lastFrame = 0;
  state.projectiles = [];
  state.particles = [];
  state.flash = null;
  state.score = 0;
  state.statusText = "Sweep the arena";
  state.statusTimer = 2;
  state.gameOver = false;
  state.win = false;
  state.killCount = 0;
  state.totalEnemies = 0;
  state.viewTilt = 0;
  state.pitch = 0;
  state.cameraOffsetY = 0;
  state.enemies = [];
  state.powerups = [];
  pointer.primaryDown = false;
  resetPlayerForLevel();
  populateWorld();
}

function startLevel(levelId) {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  loadLevel(levelId);
  state.menuOpen = false;
  state.exitConfirmOpen = false;
  restart();
  updateMenuOverlay();
  updateExitConfirmOverlay();
}

function showMenu() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  state.menuOpen = true;
  state.exitConfirmOpen = false;
  state.gameOver = false;
  state.win = false;
  pointer.primaryDown = false;
  updateMenuOverlay();
  updateExitConfirmOverlay();
}

function openExitConfirm() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock();
  }
  state.exitConfirmOpen = true;
  pointer.primaryDown = false;
}

function closeExitConfirm() {
  state.exitConfirmOpen = false;
}

function tick(timestamp) {
  if (!state.lastFrame) state.lastFrame = timestamp;
  const dt = Math.min(0.033, (timestamp - state.lastFrame) / 1000);
  state.lastFrame = timestamp;
  state.delta = dt;
  state.time += dt;

  if (!state.menuOpen && !state.exitConfirmOpen && !state.gameOver) {
    updatePlayer(dt);
    updateAutoFire();
    updateEnemies(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    if (state.statusTimer > 0) state.statusTimer -= dt;
    if (state.flash) {
      state.flash.time -= dt;
      if (state.flash.time <= 0) state.flash = null;
    }
  }

  renderScene();
  updateHud();
  updateMessage();
  updateEndOverlay();
  updateMenuOverlay();
  updateExitConfirmOverlay();
  requestAnimationFrame(tick);
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    event.preventDefault();
    if (state.menuOpen) {
      return;
    }
    if (state.exitConfirmOpen) {
      closeExitConfirm();
    } else {
      openExitConfirm();
    }
    return;
  }

  if (state.exitConfirmOpen) {
    if (event.code === "Enter" || event.code === "KeyY") {
      showMenu();
      return;
    }
    if (event.code === "Space" || event.code === "KeyN") {
      event.preventDefault();
      closeExitConfirm();
    }
    return;
  }

  if (state.menuOpen) return;
  if (state.gameOver && state.win) {
    restart();
    return;
  }

  keys[event.code] = true;
  if (["Digit1", "Digit2", "Digit3"].includes(event.code)) {
    setWeapon(Number(event.code.replace("Digit", "")) - 1);
  }
  if (event.code === "Space") {
    event.preventDefault();
    shoot();
  }
});

document.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

canvas.addEventListener("mousedown", (event) => {
  if (state.menuOpen || state.exitConfirmOpen || event.button !== 0) return;
  if (!pointer.locked && !state.gameOver) canvas.requestPointerLock();
  if (!state.gameOver) {
    pointer.primaryDown = true;
    shoot();
  } else if (!state.win) {
    restart();
  }
});

window.addEventListener("mouseup", (event) => {
  if (event.button === 0) pointer.primaryDown = false;
});

document.addEventListener("pointerlockchange", () => {
  pointer.locked = document.pointerLockElement === canvas;
});

document.addEventListener("mousemove", (event) => {
  if (!pointer.locked || state.gameOver || state.menuOpen || state.exitConfirmOpen) return;
  state.player.angle += event.movementX * 0.0025;
  state.pitch = clamp(state.pitch - event.movementY * 0.0018, -0.75, 0.75);
});

window.addEventListener("blur", () => {
  Object.keys(keys).forEach((key) => {
    keys[key] = false;
  });
  pointer.primaryDown = false;
});

levelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    startLevel(button.dataset.level);
  });
});

confirmExitButton.addEventListener("click", () => {
  showMenu();
});

cancelExitButton.addEventListener("click", () => {
  closeExitConfirm();
});

loadLevel(currentLevelId);
updateLevelText();
updateHud();
updateMessage();
updateEndOverlay();
updateMenuOverlay();
updateExitConfirmOverlay();
requestAnimationFrame(tick);
