// Simple snake game
(function() {
  const canvas = document.getElementById('snake-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cell = 20;
  const THICKNESS_SCALE_BASE = 1;
  const THICKNESS_SCALE_BOOST = 1.8;
  const BONUS_GUY_DURATION = 15000;
  const BONUS_GUY_SPAWN_CHANCE = 0.18;
  const DEATH_ANIM_MS = 700;
  const WALL_DEATH_MULT = 1.25;
  const cols = canvas.width / cell;
  const rows = canvas.height / cell;
  const scoreEl = document.getElementById('snake-score');
  const restartBtn = document.getElementById('snake-restart');
  const snakeBestEl = document.getElementById('snake-best');
  const pauseBtn = document.getElementById('snake-pause');
  const speedButtons = document.querySelectorAll('.speed-btn');
  const powerToggleBtn = document.getElementById('snake-power-toggle');
  let snake, dir, food, score, loop;
  const FRUIT_STYLES = {
    strawberry: { emoji: '🍓', colors: ['#f74d5e', '#ff7b8a'], bg: '#0f1c2d' },
    apple: { emoji: '🍏', colors: ['#4caf50', '#7edc7a'], bg: '#0d1e13' },
    pineapple: { emoji: '🍍', colors: ['#f5c13b', '#f19c1a'], bg: '#0f1d32' },
    coconut: { emoji: '🥥', colors: ['#e8e1d5', '#c7b9a6'], bg: '#111820' },
    watermelon: { emoji: '🍉', colors: ['#1c6c3c', '#2f8a4f'], bg: '#b5333d' },
    doner: { emoji: '🧆', colors: ['#2ecc71', '#e74c3c'], bg: '#1a1f28' },
  };
  const POWERUPS = [
    { type: 'rainbow', emoji: '🌈', duration: 10000 },
    { type: 'bunny', emoji: '🐇', duration: 8000, speedFactor: 0.6 },
    { type: 'turtle', emoji: '🐢', duration: 8000, speedFactor: 1.6 },
    { type: 'star', emoji: '⭐️', duration: 8000, scoreMult: 2 },
  ];
  let currentFruit = 'pineapple';
  let controlsAttached = false;
  let started = false;
  let lastSnake = null;
  let animStart = 0;
  let paused = false;
  let speedMs = 140;
  let baseSpeedMs = 140;
  let rainbowUntil = 0;
  let speedUntil = 0;
  let scoreUntil = 0;
  let scoreMult = 1;
  let powerup = null;
  let powerupsEnabled = true;
  let lastDir = { x: 1, y: 0 };
  let lastEatTime = 0;
  let glowUntil = 0;
  let specialFlag = null;
  let thicknessBoostUntil = 0;
  let bonusGuy = null;
  let deathState = null;
  const SNAKE_STORAGE_KEY = 'snake-best-score';
  let snakeBest = parseInt(localStorage.getItem(SNAKE_STORAGE_KEY), 10) || 0;

  function initSnakeGame() {
    const startX = Math.floor(cols / 2);
    const startY = Math.floor(rows / 2);
    // Start with two segments to make the snake visible immediately
    snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY }
    ];
    lastSnake = snake.map(seg => ({ ...seg }));
    dir = { x: 1, y: 0 };
    score = 0;
    started = false;
    paused = false;
    animStart = 0;
    rainbowUntil = 0;
    speedUntil = 0;
    scoreUntil = 0;
    scoreMult = 1;
    powerup = null;
    specialFlag = null;
    glowUntil = 0;
    thicknessBoostUntil = 0;
    bonusGuy = null;
    deathState = null;
    lastEatTime = 0;
    baseSpeedMs = speedMs;
    placeFood();
    updateSnakeScore();
    draw();
    if (loop) clearInterval(loop);
    loop = setInterval(tick, speedMs);
    hideGameOver();
    attachControls();
    requestAnimationFrame(renderFrame);
  }

  function attachControls() {
    if (!controlsAttached) {
      document.addEventListener('keydown', handleKey);
      controlsAttached = true;
    }
    let touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDir(dx > 0 ? 'right' : 'left');
      } else {
        setDir(dy > 0 ? 'down' : 'up');
      }
    }, { passive: true });
    if (restartBtn) restartBtn.onclick = () => initSnakeGame();
    const overlayBtn = document.getElementById('snake-go-restart');
    if (overlayBtn) overlayBtn.onclick = () => initSnakeGame();
    if (pauseBtn) pauseBtn.onclick = () => togglePause();
    if (powerToggleBtn) powerToggleBtn.onclick = () => togglePowerups();
    const fruitButtons = document.querySelectorAll('.fruit-btn');
    fruitButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.fruit;
        if (FRUIT_STYLES[type]) {
          currentFruit = type;
          if (currentFruit !== 'doner') {
            bonusGuy = null;
            thicknessBoostUntil = 0;
          }
          draw();
        }
      });
    });
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        speedMs = parseInt(btn.dataset.speed, 10) || 140;
        baseSpeedMs = speedMs;
        restartLoop();
      });
    });
    // Set initial best display
    if (snakeBestEl) snakeBestEl.textContent = snakeBest;
    if (powerToggleBtn) {
      powerToggleBtn.textContent = `Powerups: ${powerupsEnabled ? 'On' : 'Off'}`;
      powerToggleBtn.classList.toggle('powerups-off', !powerupsEnabled);
    }
  }

  function handleKey(e) {
    switch (e.key) {
      case 'ArrowUp': setDir('up'); break;
      case 'ArrowDown': setDir('down'); break;
      case 'ArrowLeft': setDir('left'); break;
      case 'ArrowRight': setDir('right'); break;
      default: return;
    }
    if (!started) {
      started = true;
    }
    paused = false;
    e.preventDefault();
  }

  function setDir(direction) {
    if (direction === 'up' && dir.y === 0) dir = { x: 0, y: -1 };
    if (direction === 'down' && dir.y === 0) dir = { x: 0, y: 1 };
    if (direction === 'left' && dir.x === 0) dir = { x: -1, y: 0 };
    if (direction === 'right' && dir.x === 0) dir = { x: 1, y: 0 };
    lastDir = dir;
  }

  function placeFood() {
    food = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    };
    // Avoid placing on snake
    if (snake.some(s => s.x === food.x && s.y === food.y)) {
      placeFood();
    }
  }

  function tick() {
    if (!started || paused) return;
    updatePowerups();
    lastSnake = snake.map(seg => ({ ...seg }));
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    // No wrap: hitting walls resets
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
      const clampedHead = {
        x: Math.min(cols - 1, Math.max(0, head.x)),
        y: Math.min(rows - 1, Math.max(0, head.y))
      };
      deathState = {
        reason: 'wall',
        until: Date.now() + DEATH_ANIM_MS * WALL_DEATH_MULT,
        head: clampedHead,
        impact: { x: dir.x, y: dir.y }
      };
      snake.unshift(clampedHead);
      snake.pop();
      animStart = performance.now();
      draw();
      clearInterval(loop);
      setTimeout(showGameOver, DEATH_ANIM_MS * WALL_DEATH_MULT);
      return;
    }
    const willGrow = head.x === food.x && head.y === food.y;
    const bodyToCheck = willGrow ? snake : snake.slice(0, -1);
    // Collision with self (ignore tail that will move if not growing)
    if (bodyToCheck.some(s => s.x === head.x && s.y === head.y)) {
      deathState = { reason: 'self', until: Date.now() + DEATH_ANIM_MS, head };
      // Keep snake length consistent for the death frame
      snake.unshift(head);
      snake.pop();
      animStart = performance.now();
      draw();
      clearInterval(loop);
      setTimeout(showGameOver, DEATH_ANIM_MS);
      return;
    }
    snake.unshift(head);
    if (willGrow) {
      score += 10 * scoreMult;
      lastEatTime = Date.now();
      updateSnakeScore();
      placeFood();
      maybeSpawnPowerup();
    } else {
      snake.pop();
    }
    if (powerupsEnabled && powerup && head.x === powerup.x && head.y === powerup.y) {
      applyPowerup(powerup);
      powerup = null;
    }
    if (specialFlag && head.x === specialFlag.x && head.y === specialFlag.y) {
      glowUntil = Date.now() + 5000;
      score += 30;
      updateSnakeScore();
      specialFlag = null;
    }
    if (currentFruit === 'doner' && bonusGuy && head.x === bonusGuy.x && head.y === bonusGuy.y) {
      thicknessBoostUntil = Date.now() + BONUS_GUY_DURATION;
      score += 20;
      updateSnakeScore();
      bonusGuy = null;
    }
    animStart = performance.now();
    draw();
  }

  function draw() {
    if (!started) {
      lastSnake = snake.map(seg => ({ ...seg }));
      drawBackground();
      drawFood();
      drawSnakeSegments(lastSnake, 0);
      return;
    }
    const t = Math.min(1, animStart ? (performance.now() - animStart) / speedMs : 1);
    drawBackground();
    drawFood();
    drawSnakeSegments(snake, t);
    if (scoreEl) scoreEl.textContent = score;
    if (snakeBestEl) snakeBestEl.textContent = snakeBest;
  }

  function renderFrame() {
    draw();
    requestAnimationFrame(renderFrame);
  }

  function restartLoop() {
    if (loop) clearInterval(loop);
    loop = setInterval(tick, speedMs);
  }

  function drawBackground() {
    const baseBg = (FRUIT_STYLES[currentFruit] && FRUIT_STYLES[currentFruit].bg) || '#0e1b33';
    const colors = [baseBg, shadeColor(baseBg, 0.22)];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (x + y) % 2;
        ctx.fillStyle = colors[idx];
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  function drawFood() {
    ctx.font = `${cell}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","sans-serif"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fruit = FRUIT_STYLES[currentFruit] || FRUIT_STYLES.pineapple;
    ctx.fillText(fruit.emoji, food.x * cell + cell / 2, food.y * cell + cell / 2 + 1);
    if (powerupsEnabled && powerup) {
      ctx.fillText(powerup.emoji, powerup.x * cell + cell / 2, powerup.y * cell + cell / 2 + 1);
    }
    if (specialFlag) {
      ctx.fillText('🇮🇳', specialFlag.x * cell + cell / 2, specialFlag.y * cell + cell / 2 + 1);
    }
    if (bonusGuy) {
      ctx.fillText('👨🏻‍🦲', bonusGuy.x * cell + cell / 2, bonusGuy.y * cell + cell / 2 + 1);
    }
  }

  function drawSnakeSegments(snakeArr, t) {
    const rainbowActive = powerupsEnabled && rainbowUntil > Date.now();
    let baseColors = (FRUIT_STYLES[currentFruit] && FRUIT_STYLES[currentFruit].colors) || ['#3cbf49', '#3fa54b'];
    const rainbowColors = ['#ff4d6d', '#ffafcc', '#bde0fe', '#a2d2ff', '#caffbf', '#fdffb6', '#ffd6a5'];
    const boostActive = currentFruit === 'doner' && thicknessBoostUntil > Date.now();
    const thicknessScale = boostActive ? THICKNESS_SCALE_BOOST : THICKNESS_SCALE_BASE;
    const dyingSelf = deathState && deathState.reason === 'self';
    const dyingWall = deathState && deathState.reason === 'wall';
    const dying = dyingSelf || dyingWall;
    const positions = snakeArr.map((s, idx) => {
      const prev = lastSnake && lastSnake[idx] ? lastSnake[idx] : s;
      return {
        x: (prev.x + (s.x - prev.x) * t) * cell + cell / 2,
        y: (prev.y + (s.y - prev.y) * t) * cell + cell / 2
      };
    });
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const denom = Math.max(1, positions.length - 1);
    for (let i = 0; i < positions.length - 1; i++) {
      const radius = lerp(cell * 0.45, cell * 0.25, i / denom) * thicknessScale * (dyingWall ? 1.12 : 1);
      const colorPair = rainbowActive ? rainbowColors : baseColors;
      let color = rainbowActive ? colorPair[(i + Math.floor(Date.now() / 200)) % colorPair.length] : colorPair[i % colorPair.length];
      if (!rainbowActive && currentFruit === 'doner') {
        color = getDonerColor(i, positions.length);
      }
      ctx.strokeStyle = color;
      if (glowUntil > Date.now()) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.lineWidth = radius * 2;
      ctx.beginPath();
      ctx.moveTo(positions[i].x, positions[i].y);
      ctx.lineTo(positions[i + 1].x, positions[i + 1].y);
      ctx.stroke();
    }
    positions.forEach((p, idx) => {
      const radius = lerp(cell * 0.5, cell * 0.3, idx / denom) * thicknessScale * (dyingWall ? 1.08 : 1);
      const colorPair = rainbowActive ? rainbowColors : baseColors;
      let color = rainbowActive ? colorPair[(idx + Math.floor(Date.now() / 200)) % colorPair.length] : colorPair[idx % colorPair.length];
      if (!rainbowActive && currentFruit === 'doner') {
        color = getDonerColor(idx, positions.length);
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    if (positions.length) {
      const head = positions[0];
      const now = Date.now();
      const eatBoost = now - lastEatTime < 300 ? 2 : 0;
      const targetX = food.x * cell + cell / 2;
      const targetY = food.y * cell + cell / 2;
      const dx = Math.max(-3, Math.min(3, (targetX - head.x) / 20));
      const dy = Math.max(-3, Math.min(3, (targetY - head.y) / 20));
      const eyeSize = (3 + eatBoost) * thicknessScale * (dyingWall ? 1.1 : 1);
      const wobble = dyingWall ? Math.sin((now - animStart) / 50) * 4 : 0;
      const lookX = (lastDir.x * 2 + dx) + wobble * (deathState?.impact?.y || 0);
      const lookY = (lastDir.y * 2 + dy) + wobble * -(deathState?.impact?.x || 0);
      ctx.fillStyle = dying ? '#f4f4f4' : '#0b121d';
      ctx.beginPath();
      ctx.arc(head.x - 5 + lookX, head.y - 4 + lookY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(head.x + 5 + lookX, head.y - 4 + lookY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      if (dying) {
        // Tongue on death
        ctx.fillStyle = '#ff5c7a';
        const tongueW = (dyingWall ? 4.2 : 3) * thicknessScale;
        const tongueH = (dyingWall ? 8 : 5) * thicknessScale;
        ctx.beginPath();
        ctx.ellipse(head.x, head.y + 7 + lookY, tongueW, tongueH, 0, 0, Math.PI * 2);
        ctx.fill();
        if (dyingWall) {
          // Little impact star for wall hit
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.ellipse(head.x + (deathState?.impact?.x || 0) * 8, head.y + (deathState?.impact?.y || 0) * 8, 3, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawRoundedCell(x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();
    }
  }

  function shadeColor(hex, amt) {
    const num = parseInt(hex.replace('#',''),16);
    let r = (num >> 16) + Math.round(255 * amt);
    let g = (num >> 8 & 0x00FF) + Math.round(255 * amt);
    let b = (num & 0x0000FF) + Math.round(255 * amt);
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
  }

  function getDonerColor(idx, total) {
    const palette = FRUIT_STYLES.doner.colors;
    const baseT = (Date.now() / 1800) % palette.length; // slower cycle
    const phase = (idx / Math.max(1, total - 1)) * 0.6;
    const t = (baseT + phase) % palette.length;
    const i = Math.floor(t);
    const next = (i + 1) % palette.length;
    const frac = t - i;
    return lerpHex(palette[i], palette[next], frac);
  }

  function lerpHex(a, b, t) {
    const c1 = hexToRgb(a);
    const c2 = hexToRgb(b);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const bChan = Math.round(c1.b + (c2.b - c1.b) * t);
    return rgbToHex(r, g, bChan);
  }

  function hexToRgb(h) {
    const num = parseInt(h.replace('#',''), 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function showGameOver() {
    clearInterval(loop);
    const overlay = document.getElementById('snake-game-over');
    if (overlay) overlay.classList.remove('hidden');
  }

  function hideGameOver() {
    const overlay = document.getElementById('snake-game-over');
    if (overlay) overlay.classList.add('hidden');
  }

  function togglePause() {
    paused = !paused;
    if (!paused && !started) {
      started = true;
    }
    if (!paused) {
      restartLoop();
    }
  }

  function updateSnakeScore() {
    if (scoreEl) scoreEl.textContent = score;
    const prevBest = snakeBest;
    if (score > snakeBest) {
      snakeBest = score;
      localStorage.setItem(SNAKE_STORAGE_KEY, snakeBest);
      if (snakeBest > prevBest && window.showHighScoreToast) {
        window.showHighScoreToast();
      }
    }
    if (snakeBestEl) snakeBestEl.textContent = snakeBest;
  }

  function maybeSpawnPowerup() {
    if (!powerupsEnabled || powerup) return;
    if (Math.random() < 0.1) {
      const emptyCells = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (!snake.some(s => s.x === i && s.y === j) && (food.x !== i || food.y !== j)) {
            emptyCells.push({ x: i, y: j });
          }
        }
      }
      if (emptyCells.length) {
        const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const type = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
        powerup = { x, y, ...type };
      }
    }
    if (currentFruit === 'doner') {
      const emptyCells = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (!snake.some(s => s.x === i && s.y === j) &&
              (food.x !== i || food.y !== j) &&
              (!powerup || powerup.x !== i || powerup.y !== j) &&
              (!specialFlag || specialFlag.x !== i || specialFlag.y !== j) &&
              (!bonusGuy || bonusGuy.x !== i || bonusGuy.y !== j)) {
            emptyCells.push({ x: i, y: j });
          }
        }
      }
      if (!specialFlag && emptyCells.length && Math.random() < 0.2) {
        const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        specialFlag = { x, y };
      }
      if (!bonusGuy && emptyCells.length && Math.random() < BONUS_GUY_SPAWN_CHANCE) {
        const filtered = emptyCells.filter(c => !specialFlag || c.x !== specialFlag.x || c.y !== specialFlag.y);
        if (filtered.length) {
          const { x, y } = filtered[Math.floor(Math.random() * filtered.length)];
          bonusGuy = { x, y };
        }
      }
    }
  }

  function togglePowerups() {
    powerupsEnabled = !powerupsEnabled;
    if (!powerupsEnabled) {
      powerup = null;
      rainbowUntil = 0;
      speedUntil = 0;
      scoreUntil = 0;
      scoreMult = 1;
      speedMs = baseSpeedMs;
      restartLoop();
    }
    if (powerToggleBtn) {
      powerToggleBtn.textContent = `Powerups: ${powerupsEnabled ? 'On' : 'Off'}`;
      powerToggleBtn.classList.toggle('powerups-off', !powerupsEnabled);
    }
  }

  function applyPowerup(p) {
    const now = Date.now();
    if (p.type === 'rainbow') {
      rainbowUntil = now + p.duration;
    }
    if (p.speedFactor) {
      speedUntil = now + p.duration;
      speedMs = Math.max(40, Math.round(baseSpeedMs * p.speedFactor));
      restartLoop();
    }
    if (p.scoreMult) {
      scoreMult = p.scoreMult;
      scoreUntil = now + p.duration;
    }
  }

  function updatePowerups() {
    const now = Date.now();
    if (rainbowUntil && now > rainbowUntil) {
      rainbowUntil = 0;
    }
    if (speedUntil && now > speedUntil) {
      speedUntil = 0;
      speedMs = baseSpeedMs;
      restartLoop();
    }
    if (scoreUntil && now > scoreUntil) {
      scoreUntil = 0;
      scoreMult = 1;
    }
  }

  window.initSnakeGame = initSnakeGame;
})();
