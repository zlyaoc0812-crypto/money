/**
 * Sudoku Game
 * Extends GameEngine for Sudoku puzzle mechanics
 */
import { GameEngine } from '../core/GameEngine.js';

const Difficulty = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

const CellType = {
  FIXED: 'fixed',
  USER: 'user',
  EMPTY: 'empty'
};

export class Sudoku extends GameEngine {
  constructor(config = {}) {
    const defaultConfig = {
      id: 'sudoku',
      name: '數獨挑戰',
      fps: 60,
      maxFps: 120,
      initialLives: 5,
      maxLives: 5,
      canvas: {
        width: 450,
        height: 450,
        background: '#ffffff'
      },
      features: {
        sound: true,
        hints: true,
        validation: true,
        timer: true
      }
    };

    super({ ...defaultConfig, ...config });

    // Game state
    this.gameState = {
      puzzle: [],
      solution: [],
      selectedCell: null,
      mistakes: 0,
      maxMistakes: 5,
      hintsUsed: 0,
      totalHints: 3,
      difficulty: Difficulty.MEDIUM,
      isGameComplete: false,
      startTime: 0,
      elapsedTime: 0
    };

    // Puzzle library
    this.puzzleLibrary = {
      [Difficulty.EASY]: [
        [0,0,0,2,6,0,7,0,1],
        [6,8,0,0,7,0,0,9,0],
        [1,9,0,0,0,4,5,0,0],
        [8,2,0,1,0,0,0,4,0],
        [0,0,4,6,0,2,9,0,0],
        [0,5,0,0,0,3,0,2,8],
        [0,0,9,3,0,0,0,7,4],
        [0,4,0,0,5,0,0,3,6],
        [7,0,3,0,1,8,0,0,0]
      ],
      [Difficulty.MEDIUM]: [
        [5,3,0,0,7,0,0,0,0],
        [6,0,0,1,9,5,0,0,0],
        [0,9,8,0,0,0,0,6,0],
        [8,0,0,0,6,0,0,0,3],
        [4,0,0,8,0,3,0,0,1],
        [7,0,0,0,2,0,0,0,6],
        [0,6,0,0,0,0,2,8,0],
        [0,0,0,4,1,9,0,0,5],
        [0,0,0,0,8,0,0,7,9]
      ],
      [Difficulty.HARD]: [
        [0,0,0,6,0,0,4,0,0],
        [7,0,0,0,0,3,6,0,0],
        [0,0,0,0,9,1,0,8,0],
        [0,0,0,0,0,0,0,0,0],
        [0,5,0,1,8,0,0,0,3],
        [0,0,0,3,0,6,0,4,5],
        [0,4,0,2,0,0,0,6,0],
        [9,0,3,0,0,0,0,0,0],
        [0,2,0,0,0,0,1,0,0]
      ]
    };

    // UI elements
    this.uiElements = {
      board: null,
      numberPad: null,
      timerElement: null,
      mistakesElement: null,
      difficultyElement: null,
      hintsElement: null,
      gameComplete: null,
      completeTimeElement: null,
      completeMistakesElement: null,
      completeHintsElement: null
    };

    // Timer interval
    this.timerInterval = null;
  }

  async loadAssets() {
    // Load game assets
    this.assets = {
      sounds: {
        click: null,
        correct: null,
        wrong: null,
        complete: null
      },
      images: {
        board: null,
        numbers: null
      }
    };

    console.log('Sudoku assets loaded');
  }

  setupEventListeners() {
    // Get UI elements
    this.uiElements.board = document.getElementById('sudokuBoard');
    this.uiElements.numberPad = document.getElementById('numberPad');
    this.uiElements.timerElement = document.getElementById('timer');
    this.uiElements.mistakesElement = document.getElementById('mistakes');
    this.uiElements.difficultyElement = document.getElementById('difficulty');
    this.uiElements.hintsElement = document.getElementById('hints');
    this.uiElements.gameComplete = document.getElementById('gameComplete');
    this.uiElements.completeTimeElement = document.getElementById('completeTime');
    this.uiElements.completeMistakesElement = document.getElementById('completeMistakes');
    this.uiElements.completeHintsElement = document.getElementById('completeHints');

    // Button events
    const checkBtn = document.querySelector('.action-btn.check');
    const solveBtn = document.querySelector('.action-btn.solve');
    const newBtn = document.querySelector('.action-btn.new');
    const hintBtn = document.querySelector('.action-btn.hint');

    if (checkBtn) checkBtn.addEventListener('click', () => this.checkSolution());
    if (solveBtn) solveBtn.addEventListener('click', () => this.solvePuzzle());
    if (newBtn) newBtn.addEventListener('click', () => this.newGame());
    if (hintBtn) hintBtn.addEventListener('click', () => this.giveHint());

    // Keyboard controls
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  update(deltaTime) {
    // Sudoku is turn-based, so update is minimal
    if (!this.state.running || this.gameState.isGameComplete) {
      return;
    }

    // Update timer
    if (this.gameState.startTime > 0) {
      this.gameState.elapsedTime = Math.floor((Date.now() - this.gameState.startTime) / 1000);
      this.updateTimerDisplay();
    }
  }

  render() {
    // Sudoku rendering is handled by DOM elements, not canvas
    // This method can be used for additional visual effects if needed
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
    this.gameState.isGameComplete = false;
    this.gameState.mistakes = 0;
    this.gameState.hintsUsed = 0;
    this.gameState.selectedCell = null;

    // Hide game complete screen
    if (this.uiElements.gameComplete) {
      this.uiElements.gameComplete.style.display = 'none';
    }

    // Clear board
    if (this.uiElements.board) {
      this.uiElements.board.innerHTML = '';
    }

    // Select random difficulty
    const difficulties = Object.values(Difficulty);
    this.gameState.difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

    // Load puzzle
    this.gameState.puzzle = JSON.parse(JSON.stringify(
      this.puzzleLibrary[this.gameState.difficulty]
    ));

    // Solve puzzle
    this.gameState.solution = this.solveSudoku(JSON.parse(JSON.stringify(this.gameState.puzzle)));

    // Fallback if solution fails
    if (!this.gameState.solution) {
      console.error('Sudoku solution failed, using medium puzzle');
      this.gameState.difficulty = Difficulty.MEDIUM;
      this.gameState.puzzle = JSON.parse(JSON.stringify(this.puzzleLibrary[Difficulty.MEDIUM]));
      this.gameState.solution = this.solveSudoku(JSON.parse(JSON.stringify(this.gameState.puzzle)));
    }

    // Create board
    this.createBoard();

    // Create number pad
    this.createNumberPad();

    // Update UI
    this.updateUI();

    // Start timer
    this.gameState.startTime = Date.now();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
  }

  createBoard() {
    if (!this.uiElements.board) return;

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        // Add thick borders for 3x3 blocks
        if ((col + 1) % 3 === 0 && col < 8) cell.classList.add('border-right');
        if ((row + 1) % 3 === 0 && row < 8) cell.classList.add('border-bottom');

        if (this.gameState.puzzle[row][col] !== 0) {
          cell.textContent = this.gameState.puzzle[row][col];
          cell.classList.add('fixed');
        } else {
          cell.classList.add('user');
        }

        cell.addEventListener('click', () => this.selectCell(cell));
        this.uiElements.board.appendChild(cell);
      }
    }
  }

  createNumberPad() {
    if (!this.uiElements.numberPad) return;

    this.uiElements.numberPad.innerHTML = '';

    // Number buttons 1-9
    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.className = 'number-btn';
      btn.textContent = i;
      btn.addEventListener('click', () => this.inputNumber(i));
      this.uiElements.numberPad.appendChild(btn);
    }

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'number-btn';
    clearBtn.textContent = '清除';
    clearBtn.style.background = '#ff3333';
    clearBtn.addEventListener('click', () => this.clearCell());
    this.uiElements.numberPad.appendChild(clearBtn);
  }

  selectCell(cell) {
    if (this.gameState.isGameComplete) return;

    // Deselect previous cell
    if (this.gameState.selectedCell) {
      this.gameState.selectedCell.classList.remove('selected');
      this.gameState.selectedCell.classList.remove('conflict');
    }

    // Don't select fixed cells
    if (cell.classList.contains('fixed')) {
      this.gameState.selectedCell = null;
      return;
    }

    // Select new cell
    this.gameState.selectedCell = cell;
    cell.classList.add('selected');

    // Check for conflicts
    this.checkConflicts();
  }

  inputNumber(num) {
    if (!this.gameState.selectedCell || 
        this.gameState.selectedCell.classList.contains('fixed') || 
        this.gameState.isGameComplete) {
      return;
    }

    const row = parseInt(this.gameState.selectedCell.dataset.row);
    const col = parseInt(this.gameState.selectedCell.dataset.col);

    // Clear previous error marks
    this.gameState.selectedCell.classList.remove('error');
    this.gameState.selectedCell.classList.remove('conflict');

    this.gameState.selectedCell.textContent = num;
    this.gameState.puzzle[row][col] = num;

    // Check if input is correct
    if (num !== this.gameState.solution[row][col]) {
      this.gameState.selectedCell.classList.add('error');
      this.gameState.mistakes++;
      this.updateMistakesDisplay();

      if (this.gameState.mistakes >= this.gameState.maxMistakes) {
        this.gameOver(false);
      }
    } else {
      // Input is correct, check conflicts
      this.checkConflicts();

      // Check if puzzle is complete
      if (this.checkComplete()) {
        this.gameOver(true);
      }
    }
  }

  clearCell() {
    if (!this.gameState.selectedCell || 
        this.gameState.selectedCell.classList.contains('fixed') || 
        this.gameState.isGameComplete) {
      return;
    }

    const row = parseInt(this.gameState.selectedCell.dataset.row);
    const col = parseInt(this.gameState.selectedCell.dataset.col);

    this.gameState.selectedCell.textContent = '';
    this.gameState.selectedCell.classList.remove('error');
    this.gameState.selectedCell.classList.remove('conflict');
    this.gameState.puzzle[row][col] = 0;
  }

  checkSolution() {
    if (this.gameState.isGameComplete) return;

    let hasErrors = false;
    const cells = document.querySelectorAll('.sudoku-cell.user');

    cells.forEach(cell => {
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      const value = parseInt(cell.textContent);

      if (value && value !== this.gameState.solution[row][col]) {
        cell.classList.add('error');
        hasErrors = true;
      } else if (value) {
        cell.classList.remove('error');
      }
    });

    if (!hasErrors) {
      if (this.checkComplete()) {
        this.gameOver(true);
      } else {
        alert('目前填寫的數字都是正確的，但還有空格需要填寫！');
      }
    } else {
      alert('發現錯誤！請檢查紅色標記的格子。');
    }
  }

  solvePuzzle() {
    if (this.gameState.isGameComplete || 
        !confirm('確定要顯示答案嗎？這將結束當前遊戲。')) {
      return;
    }

    const cells = document.querySelectorAll('.sudoku-cell.user');
    cells.forEach(cell => {
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      if (!cell.textContent) {
        cell.textContent = this.gameState.solution[row][col];
        cell.classList.add('fixed');
        cell.classList.remove('user');
        cell.classList.remove('error');
      }
    });

    this.gameOver(true, true);
  }

  giveHint() {
    if (!this.gameState.selectedCell || 
        this.gameState.selectedCell.classList.contains('fixed') || 
        this.gameState.isGameComplete) {
      return;
    }

    if (this.gameState.hintsUsed >= this.gameState.totalHints) {
      alert('提示已用完！');
      return;
    }

    const row = parseInt(this.gameState.selectedCell.dataset.row);
    const col = parseInt(this.gameState.selectedCell.dataset.col);

    this.gameState.selectedCell.textContent = this.gameState.solution[row][col];
    this.gameState.selectedCell.classList.remove('error');
    this.gameState.selectedCell.classList.remove('conflict');
    this.gameState.puzzle[row][col] = this.gameState.solution[row][col];

    this.gameState.hintsUsed++;
    this.updateHintsDisplay();

    // Check if puzzle is complete
    if (this.checkComplete()) {
      this.gameOver(true);
    }
  }

  newGame() {
    if (!this.gameState.isGameComplete && 
        !confirm('開始新遊戲？當前進度將丟失。')) {
      return;
    }
    this.initGame();
  }

  checkComplete() {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (this.gameState.puzzle[i][j] !== this.gameState.solution[i][j]) {
          return false;
        }
      }
    }
    return true;
  }

  checkConflicts() {
    // Clear all conflict marks
    document.querySelectorAll('.sudoku-cell.conflict').forEach(cell => {
      cell.classList.remove('conflict');
    });

    if (!this.gameState.selectedCell || !this.gameState.selectedCell.textContent) {
      return;
    }

    const row = parseInt(this.gameState.selectedCell.dataset.row);
    const col = parseInt(this.gameState.selectedCell.dataset.col);
    const value = parseInt(this.gameState.selectedCell.textContent);

    // Check row conflicts
    for (let c = 0; c < 9; c++) {
      if (c !== col && this.gameState.puzzle[row][c] === value) {
        const conflictCell = document.querySelector(
          `.sudoku-cell[data-row="${row}"][data-col="${c}"]`
        );
        if (conflictCell) conflictCell.classList.add('conflict');
      }
    }

    // Check column conflicts
    for (let r = 0; r < 9; r++) {
      if (r !== row && this.gameState.puzzle[r][col] === value) {
        const conflictCell = document.querySelector(
          `.sudoku-cell[data-row="${r}"][data-col="${col}"]`
        );
        if (conflictCell) conflictCell.classList.add('conflict');
      }
    }

    // Check 3x3 block conflicts
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        if (r !== row && c !== col && this.gameState.puzzle[r][c] === value) {
          const conflictCell = document.querySelector(
            `.sudoku-cell[data-row="${r}"][data-col="${c}"]`
          );
          if (conflictCell) conflictCell.classList.add('conflict');
        }
      }
    }
  }

  updateTimerDisplay() {
    if (!this.uiElements.timerElement || this.gameState.isGameComplete) return;

    const minutes = Math.floor(this.gameState.elapsedTime / 60).toString().padStart(2, '0');
    const seconds = (this.gameState.elapsedTime % 60).toString().padStart(2, '0');
    this.uiElements.timerElement.textContent = `${minutes}:${seconds}`;
  }

  gameOver(isWin, isSolved = false) {
    this.gameState.isGameComplete = true;
    if (this.timerInterval) clearInterval(this.timerInterval);

    if (isWin) {
      const minutes = Math.floor(this.gameState.elapsedTime / 60).toString().padStart(2, '0');
      const seconds = (this.gameState.elapsedTime % 60).toString().padStart(2, '0');

      if (this.uiElements.completeTimeElement) {
        this.uiElements.completeTimeElement.textContent = `${minutes}:${seconds}`;
      }
      if (this.uiElements.completeMistakesElement) {
        this.uiElements.completeMistakesElement.textContent = this.gameState.mistakes;
      }
      if (this.uiElements.completeHintsElement) {
        this.uiElements.completeHintsElement.textContent = this.gameState.hintsUsed;
      }
      if (this.uiElements.gameComplete) {
        this.uiElements.gameComplete.style.display = 'flex';
      }
    } else {
      alert(`遊戲結束！錯誤次數過多。\n正確答案是：`);
      this.solvePuzzle();
    }
  }

  handleKeyDown(e) {
    if (this.gameState.isGameComplete) return;

    // Number keys 1-9
    if (e.key >= '1' && e.key <= '9') {
      this.inputNumber(parseInt(e.key));
    }

    // Delete or Backspace to clear
    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.clearCell();
    }

    // Arrow keys to move selection
    if (this.gameState.selectedCell && e.key.startsWith('Arrow')) {
      const row = parseInt(this.gameState.selectedCell.dataset.row);
      const col = parseInt(this.gameState.selectedCell.dataset.col);

      let newRow = row;
      let newCol = col;

      switch(e.key) {
        case 'ArrowUp': newRow = Math.max(0, row - 1); break;
        case 'ArrowDown': newRow = Math.min(8, row + 1); break;
        case 'ArrowLeft': newCol = Math.max(0, col - 1); break;
        case 'ArrowRight': newCol = Math.min(8, col + 1); break;
      }

      const newCell = document.querySelector(
        `.sudoku-cell[data-row="${newRow}"][data-col="${newCol}"]`
      );
      if (newCell) {
        this.selectCell(newCell);
      }
    }
  }

  updateUI() {
    // Update difficulty display
    const difficultyNames = {
      [Difficulty.EASY]: '簡單',
      [Difficulty.MEDIUM]: '中等',
      [Difficulty.HARD]: '困難'
    };

    if (this.uiElements.difficultyElement) {
      this.uiElements.difficultyElement.textContent =
        difficultyNames[this.gameState.difficulty] || '中等';
    }

    // Update mistakes display
    this.updateMistakesDisplay();

    // Update hints display
    this.updateHintsDisplay();
  }

  updateMistakesDisplay() {
    if (this.uiElements.mistakesElement) {
      this.uiElements.mistakesElement.textContent =
        `${this.gameState.mistakes}/${this.gameState.maxMistakes}`;
    }
  }

  updateHintsDisplay() {
    if (this.uiElements.hintsElement) {
      this.uiElements.hintsElement.textContent =
        `${this.gameState.totalHints - this.gameState.hintsUsed}`;
    }
  }

  // Sudoku solving algorithm (backtracking)
  solveSudoku(board) {
    // Deep copy board
    const boardCopy = JSON.parse(JSON.stringify(board));

    function isValid(board, row, col, num) {
      // Check row
      for (let x = 0; x < 9; x++) {
        if (board[row][x] === num) return false;
      }

      // Check column
      for (let x = 0; x < 9; x++) {
        if (board[x][col] === num) return false;
      }

      // Check 3x3 block
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (board[startRow + i][startCol + j] === num) return false;
        }
      }

      return true;
    }

    function solve(board) {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (board[row][col] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (isValid(board, row, col, num)) {
                board[row][col] = num;
                if (solve(board)) {
                  return true;
                }
                board[row][col] = 0; // Backtrack
              }
            }
            return false; // No solution
          }
        }
      }
      return true; // Solved
    }

    // Try to solve
    if (solve(boardCopy)) {
      return boardCopy;
    } else {
      console.error('Sudoku has no solution');
      return null;
    }
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