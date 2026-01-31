/**
 * Puzzle Game (Sliding Puzzle)
 * Extends GameEngine for sliding puzzle mechanics
 */
import { GameEngine } from '../core/GameEngine.js';

export class Puzzle extends GameEngine {
  constructor(config = {}) {
    const defaultConfig = {
      id: 'puzzle',
      name: '滑動拼圖',
      fps: 60,
      maxFps: 120,
      initialLives: 1,
      maxLives: 1,
      canvas: {
        width: 400,
        height: 400,
        background: '#ffffff'
      },
      features: {
        sound: true,
        timer: true,
        moveCounter: true
      }
    };

    super({ ...defaultConfig, ...config });

    // Game state
    this.gameState = {
      board: [],
      emptyPosition: { row: 2, col: 2 },
      moves: 0,
      isSolved: false,
      startTime: 0,
      elapsedTime: 0,
      bestTime: localStorage.getItem('puzzleBestTime') || Infinity
    };

    // Timer interval
    this.timerInterval = null;
  }

  async loadAssets() {
    // Load game assets
    this.assets = {
      sounds: {
        move: null,
        complete: null
      },
      images: {
        tiles: null
      }
    };

    console.log('Puzzle assets loaded');
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Button events
    const newGameBtn = document.getElementById('newGameBtn');
    const resetBtn = document.getElementById('resetBtn');
    const hintBtn = document.getElementById('hintBtn');

    if (newGameBtn) newGameBtn.addEventListener('click', () => this.newGame());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetGame());
    if (hintBtn) hintBtn.addEventListener('click', () => this.giveHint());
  }

  update(deltaTime) {
    if (!this.state.running || this.gameState.isSolved) {
      return;
    }

    // Update timer
    if (this.gameState.startTime > 0) {
      this.gameState.elapsedTime = Math.floor((Date.now() - this.gameState.startTime) / 1000);
      this.updateTimerDisplay();
    }
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw board
    this.drawBoard();

    // Draw UI
    this.renderUI();
  }

  cleanup() {
    // Clear timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  // Game-specific methods
  initGame() {
    // Reset game state
    this.gameState.moves = 0;
    this.gameState.isSolved = false;
    this.gameState.startTime = Date.now();
    this.gameState.elapsedTime = 0;

    // Initialize board
    this.initBoard();

    // Shuffle board
    this.shuffleBoard(100);

    // Start timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);

    // Update UI
    this.updateUI();
  }

  initBoard() {
    this.gameState.board = [];
    let number = 1;

    for (let row = 0; row < 3; row++) {
      this.gameState.board[row] = [];
      for (let col = 0; col < 3; col++) {
        if (row === 2 && col === 2) {
          this.gameState.board[row][col] = 0; // Empty tile
          this.gameState.emptyPosition = { row, col };
        } else {
          this.gameState.board[row][col] = number++;
        }
      }
    }
  }

  shuffleBoard(moves) {
    for (let i = 0; i < moves; i++) {
      const possibleMoves = this.getPossibleMoves();
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      this.moveTile(randomMove.row, randomMove.col);
    }
  }

  getPossibleMoves() {
    const moves = [];
    const { row, col } = this.gameState.emptyPosition;

    // Check up
    if (row > 0) moves.push({ row: row - 1, col, direction: 'down' });
    // Check down
    if (row < 2) moves.push({ row: row + 1, col, direction: 'up' });
    // Check left
    if (col > 0) moves.push({ row, col: col - 1, direction: 'right' });
    // Check right
    if (col < 2) moves.push({ row, col: col + 1, direction: 'left' });

    return moves;
  }

  moveTile(row, col) {
    const { row: emptyRow, col: emptyCol } = this.gameState.emptyPosition;

    // Swap tiles
    [this.gameState.board[emptyRow][emptyCol], this.gameState.board[row][col]] = 
    [this.gameState.board[row][col], this.gameState.board[emptyRow][emptyCol]];

    // Update empty position
    this.gameState.emptyPosition = { row, col };
    this.gameState.moves++;

    // Check if solved
    if (this.checkSolved()) {
      this.gameState.isSolved = true;
      this.gameComplete();
    }

    // Update UI
    this.updateUI();
  }

  checkSolved() {
    let number = 1;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (row === 2 && col === 2) {
          if (this.gameState.board[row][col] !== 0) return false;
        } else {
          if (this.gameState.board[row][col] !== number++) return false;
        }
      }
    }
    return true;
  }

  drawBoard() {
    const tileSize = this.canvas.width / 3;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const value = this.gameState.board[row][col];
        const x = col * tileSize;
        const y = row * tileSize;

        // Draw tile background
        this.ctx.fillStyle = value === 0 ? '#f0f0f0' : '#4d79ff';
        this.ctx.fillRect(x, y, tileSize, tileSize);

        // Draw border
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, tileSize, tileSize);

        // Draw number
        if (value !== 0) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = `${tileSize / 3}px Arial`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(value, x + tileSize / 2, y + tileSize / 2);
        }
      }
    }
  }

  handleKeyDown(e) {
    if (this.gameState.isSolved) return;

    const { row, col } = this.gameState.emptyPosition;
    let moveRow = row;
    let moveCol = col;

    switch(e.key) {
      case 'ArrowUp':
        if (row < 2) moveRow = row + 1;
        break;
      case 'ArrowDown':
        if (row > 0) moveRow = row - 1;
        break;
      case 'ArrowLeft':
        if (col < 2) moveCol = col + 1;
        break;
      case 'ArrowRight':
        if (col > 0) moveCol = col - 1;
        break;
      default:
        return;
    }

    if (moveRow !== row || moveCol !== col) {
      this.moveTile(moveRow, moveCol);
    }
  }

  newGame() {
    this.initGame();
  }

  resetGame() {
    this.initBoard();
    this.gameState.moves = 0;
    this.gameState.isSolved = false;
    this.updateUI();
  }

  giveHint() {
    // Show possible moves
    const possibleMoves = this.getPossibleMoves();
    if (possibleMoves.length > 0) {
      alert(`可以移動的方塊: ${possibleMoves.map(m => `(${m.row + 1}, ${m.col + 1})`).join(', ')}`);
    }
  }

  gameComplete() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Save best time
    if (this.gameState.elapsedTime < this.gameState.bestTime) {
      this.gameState.bestTime = this.gameState.elapsedTime;
      localStorage.setItem('puzzleBestTime', this.gameState.bestTime);
    }

    // Show completion message
    const minutes = Math.floor(this.gameState.elapsedTime / 60);
    const seconds = this.gameState.elapsedTime % 60;
    alert(`🎉 拼圖完成！\n移動次數: ${this.gameState.moves}\n時間: ${minutes}:${seconds.toString().padStart(2, '0')}\n最佳時間: ${Math.floor(this.gameState.bestTime / 60)}:${(this.gameState.bestTime % 60).toString().padStart(2, '0')}`);
  }

  updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
      const minutes = Math.floor(this.gameState.elapsedTime / 60).toString().padStart(2, '0');
      const seconds = (this.gameState.elapsedTime % 60).toString().padStart(2, '0');
      timerElement.textContent = `${minutes}:${seconds}`;
    }
  }

  updateUI() {
    // Update moves display
    const movesElement = document.getElementById('moves');
    if (movesElement) {
      movesElement.textContent = this.gameState.moves;
    }

    // Update best time display
    const bestTimeElement = document.getElementById('bestTime');
    if (bestTimeElement) {
      const minutes = Math.floor(this.gameState.bestTime / 60);
      const seconds = this.gameState.bestTime % 60;
      bestTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  renderUI() {
    // Additional UI rendering if needed
  }

  // GameEngine lifecycle methods
  async start() {
    await super.start();
    this.initGame();
  }

  stop() {
    super.stop();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  restart() {
    this.stop();
    this.start();
  }
}