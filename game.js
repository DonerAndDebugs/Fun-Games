const STORAGE_KEY = 'sucuk-best-score';
// Game state
let grid = [];
let score = 0;
let bestScore = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
let gameOver = false;
let canMove = true;

// DOM elements
const gridContainer = document.querySelector('.grid-container');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('best-score');
const newGameButton = document.getElementById('new-game');
const tryAgainButton = document.getElementById('try-again');
const gameOverElement = document.querySelector('.game-over');
const comboLevelText = document.getElementById('combo-level');
const comboFill = document.querySelector('.combo-fill');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleSnake = document.getElementById('theme-toggle-snake');
const resetBestButton = document.getElementById('reset-best');
const highScoreToast = document.getElementById('high-score-toast');
const comboUIEnabled = Boolean(comboLevelText && comboFill);
const TILE_SIZE = 23;
const TILE_GAP = 2;
const MOVE_DELAY = 140;
const MAX_COMBO = 6;
let comboLevel = 0;
let comboTimeout = null;
let pendingBonusValue = null;
let darkMode = false;
let toastTimeout = null;
const BONUS_TYPES = [
    { emoji: '⭐️', bonus: 50, chance: 0.04 },
    { emoji: '🔥', bonus: 80, chance: 0.025 },
    { emoji: '💎', bonus: 150, chance: 0.012 }
];

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the game
    function initGame() {
        // Clear the grid
        grid = Array.from({ length: 4 }, () => Array(4).fill(null));
        score = 0;
        gameOver = false;
        canMove = true;
        comboLevel = 0;
        pendingBonusValue = null;
        clearTimeout(comboTimeout);
        
        // Update UI
        updateScore();
        renderGrid();
        gameOverElement.style.display = 'none';
        
        // Add initial tiles
        addRandomTile();
        addRandomTile();
        updateComboMeter();
    }
    
    // Render the grid and tiles
    function renderGrid() {
        gridContainer.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 16; i++) {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.style.top = `${(row * TILE_SIZE) + ((row + 1) * TILE_GAP)}%`;
            cell.style.left = `${(col * TILE_SIZE) + ((col + 1) * TILE_GAP)}%`;
            cell.style.width = `${TILE_SIZE}%`;
            cell.style.height = `${TILE_SIZE}%`;
            fragment.appendChild(cell);
        }
        gridContainer.appendChild(fragment);
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const tileData = grid[row][col];
                if (!tileData) continue;
                drawTile(row, col, tileData);
            }
        }
    }

    function drawTile(row, col, tileData) {
        const tile = document.createElement('div');
        const isBonus = tileData.type === 'bonus';
        const valueClass = !isBonus ? `tile-${tileData.value}` : 'tile-bonus';
        tile.className = `tile ${isBonus ? 'tile-bonus' : 'tile-number'} ${valueClass}`;
        tile.style.top = `${(row * TILE_SIZE) + ((row + 1) * TILE_GAP)}%`;
        tile.style.left = `${(col * TILE_SIZE) + ((col + 1) * TILE_GAP)}%`;
        tile.style.width = `${TILE_SIZE}%`;
        tile.style.height = `${TILE_SIZE}%`;
        
        const tileInner = document.createElement('div');
        tileInner.className = 'tile-inner';
        tileInner.textContent = isBonus ? tileData.emoji : tileData.value;
        tile.appendChild(tileInner);
        gridContainer.appendChild(tile);
        
        if (tileData.justSpawned) {
            tile.classList.add('new-tile');
            setTimeout(() => tile.classList.remove('new-tile'), 350);
            delete tileData.justSpawned;
        }
        
        if (tileData.justMerged) {
            tile.classList.add('merged-tile');
            setTimeout(() => tile.classList.remove('merged-tile'), 220);
            delete tileData.justMerged;
        }
    }

    function updateComboMeter() {
        if (!comboUIEnabled) return;
        const ratio = Math.min(1, comboLevel / MAX_COMBO);
        comboLevelText.textContent = `x${comboLevel}`;
        comboFill.style.width = `${ratio * 100}%`;
        comboFill.classList.toggle('combo-active', comboLevel > 0);
    }

    // Shared toast for new high scores across both games
    function showHighScoreToast() {
        if (!highScoreToast) return;
        highScoreToast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            highScoreToast.classList.remove('show');
        }, 2000);
    }
    window.showHighScoreToast = showHighScoreToast;

    function setTheme(isDark) {
        darkMode = isDark;
        document.body.classList.toggle('dark', isDark);
        if (themeToggle) {
            themeToggle.checked = isDark;
        }
        if (themeToggleSnake) {
            themeToggleSnake.checked = isDark;
        }
        localStorage.setItem('sucuk-theme', isDark ? 'dark' : 'light');
    }

    function updateThemeFromStorage() {
        const stored = localStorage.getItem('sucuk-theme');
        if (stored === 'dark') {
            setTheme(true);
        } else {
            setTheme(false);
        }
    }

    function handleCombo(merges) {
        if (merges > 0) {
            comboLevel = Math.min(MAX_COMBO, comboLevel + merges);
            const bonus = merges * comboLevel * 5;
            score += bonus;
            scheduleComboDecay();
            pendingBonusValue = null;
        } else if (comboLevel > 0) {
            comboLevel = Math.max(0, comboLevel - 1);
        }
        updateComboMeter();
    }

    function scheduleComboDecay() {
        if (comboTimeout) {
            clearTimeout(comboTimeout);
        }
        comboTimeout = setTimeout(() => {
            comboLevel = Math.max(0, comboLevel - 1);
            updateComboMeter();
            if (comboLevel > 0) {
                scheduleComboDecay();
            }
        }, 5000);
    }

    function spawnBonusTile(value) {
        if (!value) return;
        const emptyCells = [];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (!grid[i][j]) {
                    emptyCells.push({ row: i, col: j });
                }
            }
        }
        if (!emptyCells.length) return;
        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        grid[row][col] = { type: 'bonus', emoji: '⭐️', bonus: value, justSpawned: true };
        renderGrid();
    }

    function pickBonusTile() {
        const roll = Math.random();
        let cumulative = 0;
        for (const bonus of BONUS_TYPES) {
            cumulative += bonus.chance;
            if (roll < cumulative) {
                return bonus;
            }
        }
        return null;
    }

    function collectBonusTiles() {
        let collected = 0;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const cell = grid[i][j];
                if (cell && cell.type === 'bonus') {
                    collected += cell.bonus || 0;
                    grid[i][j] = null;
                }
            }
        }
        if (collected > 0) {
            score += collected;
            updateScore();
            renderGrid();
        }
    }

    
    function initAvatarFallback() {
        const avatarImg = document.querySelector('.creator-avatar img');
        if (!avatarImg) return;
        const wrapper = avatarImg.parentElement;
        
        const showImage = () => {
            avatarImg.classList.remove('avatar-hidden');
            wrapper.classList.remove('avatar-placeholder');
        };
        
        const showPlaceholder = () => {
            avatarImg.classList.add('avatar-hidden');
            wrapper.classList.add('avatar-placeholder');
        };
        
        avatarImg.addEventListener('load', showImage);
        avatarImg.addEventListener('error', showPlaceholder);
        
        if (avatarImg.complete) {
            if (avatarImg.naturalWidth > 0) {
                showImage();
            } else {
                showPlaceholder();
            }
        }
    }
    
    // Add a random tile (2 or 4) to an empty cell
    function addRandomTile() {
        const emptyCells = [];
        
        // Find all empty cells
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (!grid[i][j]) {
                    emptyCells.push({ row: i, col: j });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            // Choose a random empty cell
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            // Decide bonus vs normal
            const bonusTile = pickBonusTile();
            if (bonusTile) {
                grid[row][col] = { type: 'bonus', emoji: bonusTile.emoji, bonus: bonusTile.bonus, justSpawned: true };
            } else {
                grid[row][col] = { type: 'number', value: 2, justSpawned: true };
            }
            
            renderGrid();
            
            // Check if the game is over after adding a new tile
            if (hasNoMoves()) {
                endGame();
            }
        }
    }
    
    // Update the score
    function updateScore() {
        scoreElement.textContent = score;
        const prevBest = bestScore;
        bestScore = Math.max(score, bestScore);
        if (bestScore > prevBest) {
            showHighScoreToast();
        }
        bestScoreElement.textContent = bestScore;
        localStorage.setItem(STORAGE_KEY, bestScore);
    }

    function resetBestScore() {
        bestScore = 0;
        localStorage.setItem(STORAGE_KEY, bestScore);
        if (bestScoreElement) {
            bestScoreElement.textContent = bestScore;
        }
    }
    
    // Check if there are any moves left
    function hasNoMoves() {
        // Check for any empty cells
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (!grid[i][j]) {
                    return false;
                }
            }
        }
        
            // Check for possible merges (numbers only)
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const current = grid[i][j];
                    if (!current || current.type !== 'number') continue;
                    
                    const right = j < 3 ? grid[i][j + 1] : null;
                    if (right && right.type === 'number' && right.value === current.value) return false;
                    
                    const below = i < 3 ? grid[i + 1][j] : null;
                    if (below && below.type === 'number' && below.value === current.value) return false;
                }
            }
        
        return true;
    }
    
    // Handle game over
    function endGame() {
        gameOver = true;
        gameOverElement.style.display = 'flex';
    }
    
    // Move tiles in the specified direction
    function moveTiles(direction) {
        if (gameOver || !canMove) return false;
        
        let moved = false;
        let mergesThisMove = 0;
        
        const slideLine = (line, reverse = false) => {
            const working = reverse ? line.slice().reverse() : line.slice();
            const compacted = working.filter(cell => cell);
            
            for (let i = 0; i < compacted.length - 1; i++) {
                if (
                    compacted[i].type === 'number' &&
                    compacted[i + 1].type === 'number' &&
                    compacted[i].value === compacted[i + 1].value
                ) {
                    compacted[i].value *= 2;
                    compacted[i].justMerged = true;
                    score += compacted[i].value;
                    mergesThisMove += 1;
                    compacted.splice(i + 1, 1);
                }
            }
            
            while (compacted.length < 4) {
                compacted.push(null);
            }
            
            const newLine = reverse ? compacted.reverse() : compacted;
            const lineMoved = line.some((cell, idx) => cell !== newLine[idx]);
            return { newLine, lineMoved };
        };
        
        if (direction === 'left' || direction === 'right') {
            const reverse = direction === 'right';
            for (let i = 0; i < 4; i++) {
                const { newLine, lineMoved } = slideLine(grid[i], reverse);
                if (lineMoved) moved = true;
                grid[i] = newLine;
            }
        } else {
            const reverse = direction === 'down';
            for (let j = 0; j < 4; j++) {
                const column = [grid[0][j], grid[1][j], grid[2][j], grid[3][j]];
                const { newLine, lineMoved } = slideLine(column, reverse);
                if (lineMoved) moved = true;
                for (let i = 0; i < 4; i++) {
                    grid[i][j] = newLine[i];
                }
            }
        }
        
        if (moved) {
            canMove = false;
            renderGrid();
            handleCombo(mergesThisMove);
            updateScore();
            setTimeout(() => {
                collectBonusTiles();
                addRandomTile();
                canMove = true;
            }, MOVE_DELAY);
        } else {
            handleCombo(0);
        }
        
        return moved;
    }
    
    // Handle keyboard input
    function handleKeyDown(e) {
        if (gameOver) return;
        
        const { key } = e;
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
            return;
        }

        e.preventDefault();

        switch (key) {
            case 'ArrowLeft':
                moveTiles('left');
                break;
            case 'ArrowRight':
                moveTiles('right');
                break;
            case 'ArrowUp':
                moveTiles('up');
                break;
            case 'ArrowDown':
                moveTiles('down');
                break;
        }
    }
    
    // Touch handling for mobile devices
    let touchStartX = 0;
    let touchStartY = 0;
    
    function handleTouchStart(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
    
    function handleTouchEnd(e) {
        if (!touchStartX || !touchStartY) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // Determine the direction of the swipe
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            if (diffX > 0) {
                moveTiles('left');
            } else {
                moveTiles('right');
            }
        } else {
            // Vertical swipe
            if (diffY > 0) {
                moveTiles('up');
            } else {
                moveTiles('down');
            }
        }
        
        // Reset touch coordinates
        touchStartX = 0;
        touchStartY = 0;
    }

    // Input bindings
    document.addEventListener('keydown', handleKeyDown);
    gridContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    gridContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Button event listeners
    newGameButton.addEventListener('click', initGame);
    tryAgainButton.addEventListener('click', initGame);
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => setTheme(e.target.checked));
    }
    if (themeToggleSnake) {
        themeToggleSnake.addEventListener('change', (e) => setTheme(e.target.checked));
    }
    if (resetBestButton) {
        resetBestButton.addEventListener('click', resetBestScore);
    }
    
    // Prevent default touch behavior to prevent scrolling
    document.body.addEventListener('touchmove', function(e) {
        if (e.target.className === 'grid-container' || e.target.closest('.grid-container')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    initAvatarFallback();
    updateThemeFromStorage();
    
    // Initialize the game
    initGame();
    
    // Handle window resize
    window.addEventListener('resize', renderGrid);
    
    // Initial render
    renderGrid();
    updateScore();
});
