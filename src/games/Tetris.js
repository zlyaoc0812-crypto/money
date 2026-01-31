/**
 * 俄羅斯方塊遊戲
 * 基於GameEngine的現代化實現
 */

import { GameEngine } from '../core/GameEngine.js';
import { GameError, ErrorTypes } from '../core/GameError.js';

/**
 * 方塊類型
 */
const TetrominoType = {
  I: 'I',
  J: 'J',
  L: 'L',
  O: 'O',
  S: 'S',
  T: 'T',
  Z: 'Z'
};

/**
 * 方塊顏色
 */
const COLORS = [
  '#000000', // 0: 黑色（空）
  '#00FFFF', // 1: I
  '#0000FF', // 2: J
  '#FFA500', // 3: L
  '#FFFF00', // 4: O
  '#00FF00', // 5: S
  '#800080', // 6: T
  '#FF0000'  // 7: Z
];

/**
 * 方塊形狀定義
 */
const SHAPES = [
  // I
  [
    [0,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0]
  ],
  // J
  [
    [2,0,0],
    [2,2,2],
    [0,0,0]
  ],
  // L
  [
    [0,0,3],
    [3,3,3],
    [0,0,0]
  ],
  // O
  [
    [4,4],
    [4,4]
  ],
  // S
  [
    [0,5,5],
    [5,5,0],
    [0,0,0]
  ],
  // T
  [
    [0,6,0],
    [6,6,6],
    [0,0,0]
  ],
  // Z
  [
    [7,7,0],
    [0,7,7],
    [0,0,0]
  ]
];

/**
 * 俄羅斯方塊遊戲類
 */
export class Tetris extends GameEngine {
  /**
   * 創建遊戲實例
   * @param {Object} config - 遊戲配置
   */
  constructor(config = {}) {
    const defaultConfig = {
      id: 'tetris',
      name: '俄羅斯方塊',
      fps: 60,
      initialLives: 1,
      maxLives: 1,
      canvas: {
        width: 300,
        height: 600,
        backgroundColor: '#000000'
      },
      features: {
        soundEnabled: true,
        vibrationEnabled: false,
        animationsEnabled: true
      }
    };
    
    super({ ...defaultConfig, ...config });
    
    // 遊戲常量
    this.COLS = 10;
    this.ROWS = 20;
    this.BLOCK_SIZE = 30;
    
    // 遊戲特定狀態
    this.gameState = {
      board: [],
      score: 0,
      level: 1,
      lines: 0,
      gameOver: false,
      paused: true,
      soundEnabled: true,
      dropInterval: 1000,
      dropCounter: 0,
      gameStarted: false,
      player: {
        pos: { x: 0, y: 0 },
        matrix: null,
        nextMatrix: null
      },
      bestScore: localStorage.getItem('tetrisBestScore') || 0,
      bestLines: localStorage.getItem('tetrisBestLines') || 0
    };
    
    // 遊戲資源
    this.resources = {
      soundEffects: new Map()
    };
    
    // 綁定方法
    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._boundStartBtn = this._handleStartBtn.bind(this);
    this._boundPauseBtn = this._handlePauseBtn.bind(this);
    this._boundResetBtn = this._handleResetBtn.bind(this);
    this._boundSoundBtn = this._handleSoundBtn.bind(this);
  }
  
  /**
   * 載入遊戲資源
   * @async
   * @override
   */
  async loadAssets() {
    try {
      this.events.emit('game:assets:loading');
      
      // 創建音效
      this._createSoundEffects();
      
      this.events.emit('game:assets:loaded');
      
    } catch (error) {
      throw new GameError(
        ErrorTypes.ASSET_LOAD,
        'Failed to load game assets',
        error
      );
    }
  }
  
  /**
   * 設置事件監聽器
   * @override
   */
  setupEventListeners() {
    // 設置鍵盤事件
    document.addEventListener('keydown', this._boundKeyDown);
    
    // 設置UI事件（這些將在遊戲初始化時由外部UI處理）
    // 實際的按鈕事件監聽器將在遊戲初始化時設置
  }
  
  /**
   * 更新遊戲邏輯
   * @override
   * @param {number} deltaTime - 距離上次更新的時間（毫秒）
   */
  update(deltaTime) {
    if (!this.state.isRunning || this.state.isPaused || !this.gameState.gameStarted) {
      return;
    }
    
    // 更新下落計時器
    this.gameState.dropCounter += deltaTime;
    if (this.gameState.dropCounter > this.gameState.dropInterval) {
      this._playerDrop();
      this.gameState.dropCounter = 0;
    }
    
    // 檢查遊戲是否結束
    if (this.gameState.gameOver) {
      this.gameOver(false);
    }
  }
  
  /**
   * 渲染遊戲畫面
   * @override
   */
  render() {
    if (!this.elements.context) {
      return;
    }
    
    const ctx = this.elements.context;
    const canvas = this.elements.canvas;
    
    // 清除畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製遊戲板
    this._drawBoard(ctx);
    
    // 繪製UI
    this._renderUI(ctx);
    
    // 繪製遊戲狀態
    if (this.state.isPaused && this.gameState.gameStarted) {
      this._renderPauseScreen(ctx);
    }
    
    if (!this.state.isRunning && this.state.gameOver) {
      this._renderGameOverScreen(ctx);
    }
  }
  
  /**
   * 清理資源
   * @override
   */
  cleanup() {
    // 移除事件監聽器
    document.removeEventListener('keydown', this._boundKeyDown);
    
    // 清理資源
    this.resources.soundEffects.clear();
  }
  
  /**
   * 開始遊戲
   */
  startGame() {
    if (!this.gameState.gameStarted) {
      // 首次開始
      this._createBoard();
      this.gameState.gameStarted = true;
      this._playerReset();
      this._drawNextPiece();
    } else {
      // 重新開始
      this._resetGame();
      return;
    }
    
    this.state.isPaused = false;
    this.gameState.paused = false;
    this.gameState.gameOver = false;
    
    this.events.emit('game:start');
  }
  
  /**
   * 暫停/繼續遊戲
   */
  togglePause() {
    if (!this.gameState.gameStarted || this.gameState.gameOver) return;
    
    this.state.isPaused = !this.state.isPaused;
    this.gameState.paused = this.state.isPaused;
    
    this.events.emit('game:pause', { paused: this.state.isPaused });
  }
  
  /**
   * 重新開始遊戲
   */
  resetGame() {
    this._resetGame();
    this.events.emit('game:reset');
  }
  
  /**
   * 切換音效
   */
  toggleSound() {
    this.gameState.soundEnabled = !this.gameState.soundEnabled;
    this.events.emit('game:sound:toggle', { enabled: this.gameState.soundEnabled });
  }
  
  /**
   * 私有方法：創建音效
   * @private
   */
  _createSoundEffects() {
    // 音效將在需要時動態創建
  }
  
  /**
   * 私有方法：處理鍵盤事件
   * @private
   * @param {KeyboardEvent} event - 鍵盤事件
   */
  _handleKeyDown(event) {
    if (!this.gameState.gameStarted || this.state.isPaused || this.gameState.gameOver) {
      return;
    }
    
    event.preventDefault();
    
    switch(event.key) {
      case 'ArrowLeft':
        this._playerMove(-1);
        break;
      case 'ArrowRight':
        this._playerMove(1);
        break;
      case 'ArrowDown':
        this._playerDrop();
        this.gameState.score += 1;
        this._updateScoreDisplay();
        break;
      case 'ArrowUp':
        this._playerRotate();
        break;
      case ' ':
      case 'Spacebar':
        // 硬降
        while (!this._collide()) {
          this.gameState.player.pos.y++;
          this.gameState.score += 2;
        }
        this.gameState.player.pos.y--;
        this._merge();
        this._clearLines();
        this._updateScore();
        this._playerReset();
        break;
    }
  }
  
  /**
   * 私有方法：處理開始按鈕
   * @private
   */
  _handleStartBtn() {
    this.startGame();
  }
  
  /**
   * 私有方法：處理暫停按鈕
   * @private
   */
  _handlePauseBtn() {
    this.togglePause();
  }
  
  /**
   * 私有方法：處理重置按鈕
   * @private
   */
  _handleResetBtn() {
    this.resetGame();
  }
  
  /**
   * 私有方法：處理音效按鈕
   * @private
   */
  _handleSoundBtn() {
    this.toggleSound();
  }
  
  /**
   * 私有方法：創建遊戲板
   * @private
   */
  _createBoard() {
    this.gameState.board = [];
    for (let y = 0; y < this.ROWS; y++) {
      this.gameState.board[y] = [];
      for (let x = 0; x < this.COLS; x++) {
        this.gameState.board[y][x] = 0;
      }
    }
  }
  
  /**
   * 私有方法：創建隨機方塊
   * @private
   * @returns {Object} 方塊物件
   */
  _createPiece() {
    const shapeId = Math.floor(Math.random() * SHAPES.length);
    return {
      matrix: SHAPES[shapeId].map(row => [...row]),
      colorIndex: shapeId + 1
    };
  }
  
  /**
   * 私有方法：繪製遊戲板
   * @private
   * @param {CanvasRenderingContext2D} ctx - 畫布上下文
   */
  _drawBoard(ctx) {
    const canvas = this.elements.canvas;
    
    // 繪製背景
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製網格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= this.COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.BLOCK_SIZE, 0);
      ctx.lineTo(x * this.BLOCK_SIZE, canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= this.ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.BLOCK_SIZE);
      ctx.lineTo(canvas.width, y * this.BLOCK_SIZE);
      ctx.stroke();
    }
    
    // 繪製已落下的方塊
    for (let y = 0; y < this.ROWS; y++) {
      for (let x = 0; x < this.COLS; x++) {
        if (this.gameState.board[y][x]) {
          this._drawBlock(ctx, x, y, this.gameState.board[y][x]);
        }
      }
    }
    
    // 繪製當前下落方塊
    if (this.gameState.player.matrix) {
      this._drawPiece(ctx, this.gameState.player.matrix, this.gameState.player.pos, this.gameState.player.matrix[0][0]);
    }
  }
  
  /**
   * 私有方法：繪製單個方塊
   * @private
   * @param {CanvasRenderingContext2D} ctx - 畫布上下文
   * @param {number} x - X座標
   * @param {number} y - Y座標
   * @param {number} colorIndex - 顏色索引
   */
  _drawBlock(ctx, x, y, colorIndex) {
    const color = COLORS[colorIndex];
    
    // 方塊主體
    ctx.fillStyle = color;
    ctx.fillRect(
      x * this.BLOCK_SIZE + 1, 
      y * this.BLOCK_SIZE + 1, 
      this.BLOCK_SIZE - 2, 
      this.BLOCK_SIZE - 2
    );
    
    // 高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * this.BLOCK_SIZE + 1, y * this.BLOCK_SIZE + 1, this.BLOCK_SIZE - 2, 3);
    ctx.fillRect(x * this.BLOCK_SIZE + 1, y * this.BLOCK_SIZE + 1, 3, this.BLOCK_SIZE - 2);
    
    // 陰影效果
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x * this.BLOCK_SIZE + 1, y * this.BLOCK_SIZE + this.BLOCK_SIZE - 4, this.BLOCK_SIZE - 2, 3);
    ctx.fillRect(x * this.BLOCK_SIZE + this.BLOCK_SIZE - 4, y * this.BLOCK_SIZE + 1, 3, this.BLOCK_SIZE - 2);
  }
  
  /**
   * 私有方法：繪製方塊
   * @private
   * @param {CanvasRenderingContext2D} ctx - 畫布上下文
   * @param {Array} matrix - 方塊矩陣
   * @param {Object} pos - 位置
   * @param {number} colorIndex - 顏色索引
   */
  _drawPiece(ctx, matrix, pos, colorIndex) {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          this._drawBlock(ctx, x + pos.x, y + pos.y, colorIndex);
        }
      });
    });
  }
  
  /**
   * 私有方法：繪製下一個方塊預覽
   * @private
   */
  _drawNextPiece() {
    // 這個方法需要外部canvas元素，將在UI中實現
  }
  
  /**
   * 私有方法：初始化新方塊
   * @private
   * @returns {boolean} 是否成功初始化
   */
  _playerReset() {
    // 如果沒有下一個方塊，創建一個
    if (!this.gameState.player.nextMatrix) {
      this.gameState.player.nextMatrix = this._createPiece();
    }
    
    // 設置當前方塊為下一個方塊
    this.gameState.player.matrix = this.gameState.player.nextMatrix.matrix;
    this.gameState.player.nextMatrix = this._createPiece();
    
    // 設置初始位置
    this.gameState.player.pos.x = Math.floor(this.COLS / 2) - Math.floor(this.gameState.player.matrix[0].length / 2);
    this.gameState.player.pos.y = 0;
    
    // 檢查遊戲是否結束
    if (this._collide()) {
      this._endGame();
      return false;
    }
    
    return true;
  }
  
  /**
   * 私有方法：碰撞檢測
   * @private
   * @returns {boolean} 是否發生碰撞
   */
  _collide() {
    const matrix = this.gameState.player.matrix;
    const pos = this.gameState.player.pos;
    
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] !== 0) {
          const boardX = pos.x + x;
          const boardY = pos.y + y;
          
          // 檢查邊界
          if (boardX < 0 || boardX >= this.COLS || boardY >= this.ROWS) {
            return true;
          }
          
          // 檢查與其他方塊的碰撞
          if (boardY >= 0 && this.gameState.board[boardY][boardX]) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  /**
   * 私有方法：方塊下落
   * @private
   */
  _playerDrop() {
    this.gameState.player.pos.y++;
    if (this._collide()) {
      this.gameState.player.pos.y--;
      this._merge();
      this._clearLines();
      this._updateScore();
      if (!this._playerReset()) {
        return;
      }
    }
  }
  
  /**
   * 私有方法：合併方塊到遊戲板
   * @private
   */
  _merge() {
    const matrix = this.gameState.player.matrix;
    const pos = this.gameState.player.pos;
    const colorIndex = matrix[0][0];
    
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const boardY = pos.y + y;
          if (boardY >= 0) {
            this.gameState.board[boardY][pos.x + x] = colorIndex;
          }
        }
      });
    });
  }
  
  /**
   * 私有方法：移動方塊
   * @private
   * @param {number} dir - 移動方向（-1左，1右）
   */
  _playerMove(dir) {
    this.gameState.player.pos.x += dir;
    if (this._collide()) {
      this.gameState.player.pos.x -= dir;
    }
  }
  
  /**
   * 私有方法：旋轉方塊
   * @private
   */
  _playerRotate() {
    const originalMatrix = this.gameState.player.matrix;
    const rotated = this._rotate(originalMatrix);
    const originalPos = { x: this.gameState.player.pos.x, y: this.gameState.player.pos.y };
    
    this.gameState.player.matrix = rotated;
    
    // 檢查碰撞並嘗試調整位置
    let offset = 1;
    while (this._collide()) {
      this.gameState.player.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      
      // 如果調整無效，恢復原狀
      if (Math.abs(offset) > rotated[0].length) {
        this.gameState.player.matrix = originalMatrix;
        this.gameState.player.pos = originalPos;
        return;
      }
    }
  }
  
  /**
   * 私有方法：旋轉矩陣
   * @private
   * @param {Array} matrix - 要旋轉的矩陣
   * @returns {Array} 旋轉後的矩陣
   */
  _rotate(matrix) {
    const N = matrix.length;
    const result = [];
    
    // 初始化結果矩陣
    for (let i = 0; i < N; i++) {
      result[i] = [];
      for (let j = 0; j < N; j++) {
        result[i][j] = 0;
      }
    }
    
    // 旋轉矩陣
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        result[x][N - 1 - y] = matrix[y][x];
      }
    }
    
    return result;
  }
  
  /**
   * 私有方法：清除完整的行
   * @private
   */
  _clearLines() {
    let linesCleared = 0;
    
    for (let y = this.ROWS - 1; y >= 0; y--) {
      if (this.gameState.board[y].every(value => value !== 0)) {
        // 移除該行
        const row = this.gameState.board.splice(y, 1)[0];
        // 在頂部添加新行
        this.gameState.board.unshift(Array(this.COLS).fill(0));
        linesCleared++;
        y++; // 重新檢查同一位置
      }
    }
    
    if (linesCleared > 0) {
      this.gameState.lines += linesCleared;
      
      // 計算分數（標準俄羅斯方塊計分）
      const points = [40, 100, 300, 1200];
      const scoreAdd = points[Math.min(linesCleared - 1, 3)] * this.gameState.level;
      this.gameState.score += scoreAdd;
      
      // 播放音效
      if (this.gameState.soundEnabled) {
        this._playClearSound(linesCleared);
      }
    }
  }
  
  /**
   * 私有方法：播放清除音效
   * @private
   * @param {number} linesCleared - 清除的行數
   */
  _playClearSound(linesCleared) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 400 + (linesCleared * 200);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('音效播放失敗');
    }
  }
  
  /**
   * 私有方法：更新分數
   * @private
   */
  _updateScore() {
    // 更新等級
    const newLevel = Math.floor(this.gameState.lines / 10) + 1;
    if (newLevel > this.gameState.level) {
      this.gameState.level = newLevel;
      
      // 更新下落速度
      this.gameState.dropInterval = Math.max(100, 1000 - (this.gameState.level - 1) * 100);
    }
    
    // 發送分數更新事件
    this.events.emit('score:update', {
      score: this.gameState.score,
      level: this.gameState.level,
      lines: this.gameState.lines
    });
  }
  
  /**
   * 私有方法：更新分數顯示
   * @private
   */
  _updateScoreDisplay() {
    this.events.emit('score:display:update', {
      score: this.gameState.score,
      level: this.gameState.level,
      lines: this.gameState.lines
    });
  }
  
  /**
   * 私有方法：重置遊戲
   * @private
   */
  _resetGame() {
    // 重置遊戲狀態
    this.gameState.gameStarted = false;
    this.state.isPaused = true;
    this.gameState.paused = true;
    this.gameState.gameOver = false;
    
    this.gameState.score = 0;
    this.gameState.lines = 0;
    this.gameState.level = 1;
    this.gameState.dropInterval = 1000;
    this.gameState.dropCounter = 0;
    
    this._createBoard();
    this.gameState.player.nextMatrix = null;
    
    this._updateScoreDisplay();
    
    // 初始化顯示
    this._playerReset();
    this._drawNextPiece();
  }
  
  /**
   * 私有方法：結束遊戲
   * @private
   */
  _endGame() {
    this.gameState.gameOver = true;
    this.state.isPaused = true;
    this.gameState.paused = true;
    
    // 檢查是否打破紀錄
    if (this.gameState.score > this.gameState.bestScore) {
      this.gameState.bestScore = this.gameState.score;
      localStorage.setItem('tetrisBestScore', this.gameState.bestScore);
    }
    
    if (this.gameState.lines > this.gameState.bestLines) {
      this.gameState.bestLines = this.gameState.lines;
      localStorage.setItem('tetrisBestLines', this.gameState.bestLines);
    }
    
    this.events.emit('game:over', {
      score: this.gameState.score,
      lines: this.gameState.lines,
      isWin: false,
      isNewRecord: this.gameState.score > this.gameState.bestScore
    });
  }
  
  /**
   * 私有方法：渲染UI
   * @private
   * @param {CanvasRenderingContext2D} ctx - 畫布上下文
   */
  _renderUI(ctx) {
    const canvas = this.elements.canvas;
    
    // 繪製遊戲標題
    ctx.fillStyle = '#00ff9d';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('俄羅斯方塊', canvas.width / 2, 30);
    
    // 繪製遊戲信息
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`分數: ${this.gameState.score}`, 10, 60);
    ctx.fillText(`等級: ${this.gameState.level}`, 10, 85);
    ctx.fillText(`行數: ${this.gameState.lines}`, 10, 110);
    
    // 繪製最佳紀錄
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`最佳分數: ${this.gameState.bestScore}`, canvas.width - 10, 60);
    ctx.fillText(`最佳行數: ${this.gameState.bestLines}`, canvas.width - 10, 85);
  }
  
  /**
   * 私有方法：渲染暫停畫面
   * @private
   * @param {CanvasRenderingContext2D} ctx - 畫布上下文
   */
  _renderPauseScreen(ctx) {
    const canvas = this.elements.canvas;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('遊戲暫停', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '18px Arial';
    ctx.fillText('按空格鍵繼續', canvas.width / 2, canvas.height / 2 + 20);
  }
  
  /**
   * 私有方法：渲染遊戲結束畫面
   * @private
   * @param {CanvasRenderingContext2D} ctx - 畫布上下文
   */
  _renderGameOverScreen(ctx) {
    const canvas = this.elements.canvas;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('遊戲結束!', canvas.width / 2, canvas.height / 2 - 60);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText(`最終分數: ${this.gameState.score}`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText(`已消除行數: ${this.gameState.lines}`, canvas.width / 2, canvas.height / 2 + 10);
    
    // 檢查是否打破紀錄
    if (this.gameState.score > this.gameState.bestScore) {
      ctx.fillStyle = '#4CAF50';
      ctx.fillText('新紀錄!', canvas.width / 2, canvas.height / 2 + 50);
    }
  }
}
