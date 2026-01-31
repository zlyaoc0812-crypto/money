/**
 * 打地鼠遊戲
 * 基於GameEngine的現代化實現
 */

import { GameEngine } from '../core/GameEngine.js';
import { GameError, ErrorTypes } from '../core/GameError.js';
import { GameValidators } from '../utils/validation.js';
import { DOM } from '../utils/dom.js';

/**
 * 地鼠類型
 */
const MoleType = {
  NORMAL: 'normal',     // 普通地鼠 - 1分
  GOLDEN: 'golden',     // 黃金地鼠 - 5分
  BOMB: 'bomb'          // 炸彈地鼠 - 扣1生命
};

/**
 * 遊戲難度
 */
const Difficulty = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

/**
 * 打地鼠遊戲類
 */
export class WhackAMole extends GameEngine {
  /**
   * 創建遊戲實例
   * @param {Object} config - 遊戲配置
   */
  constructor(config = {}) {
    const defaultConfig = {
      id: 'whack-a-mole',
      name: '打地鼠',
      fps: 60,
      initialLives: 3,
      maxLives: 5,
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#1e293b'
      },
      features: {
        soundEnabled: true,
        vibrationEnabled: true
      }
    };
    
    super({ ...defaultConfig, ...config });
    
    // 遊戲特定狀態
    this.gameState = {
      difficulty: Difficulty.MEDIUM,
      moles: [],
      holes: [],
      spawnRate: 1000, // 毫秒
      moleSpeed: 1.0,
      maxMoles: 6,
      activeMoles: 0,
      comboMultiplier: 1,
      lastSpawnTime: 0,
      hitCount: 0,
      missCount: 0,
      streak: 0,
      bestStreak: 0
    };
    
    // 遊戲資源
    this.resources = {
      moleImages: new Map(),
      soundEffects: new Map(),
      holeImage: null
    };
    
    // 遊戲元素
    this.gameElements = {
      scoreDisplay: null,
      livesDisplay: null,
      comboDisplay: null,
      timerDisplay: null,
      streakDisplay: null,
      gameArea: null,
      holesContainer: null
    };
    
    // 綁定方法
    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandleDifficultyChange = this._handleDifficultyChange.bind(this);
  }
  
  /**
   * 載入遊戲資源
   * @async
   * @override
   */
  async loadAssets() {
    try {
      this.events.emit('game:assets:loading');
      
      // 創建地鼠圖像（使用Canvas繪製）
      this._createMoleImages();
      
      // 創洞穴圖像
      this._createHoleImage();
      
      // 創建音效（使用Web Audio API）
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
    // 設置畫布點擊事件
    if (this.elements.canvas) {
      this.elements.canvas.addEventListener('click', this._boundHandleClick);
    }
    
    // 設置鍵盤事件
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case ' ':
        case 'Spacebar':
          if (this.state.isRunning && !this.state.isPaused) {
            this.pause();
          } else if (this.state.isPaused) {
            this.resume();
          }
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey) {
            this.restart();
          }
          break;
        case 'Escape':
          this.pause();
          break;
      }
    });
    
    // 設置遊戲事件
    this.events.on('score:update', (data) => {
      this._updateScoreDisplay(data.newScore);
    });
    
    this.events.on('lives:update', (data) => {
      this._updateLivesDisplay(data.newLives);
    });
    
    this.events.on('combo:update', (data) => {
      this._updateComboDisplay(data.newCombo);
    });
    
    this.events.on('game:over', (data) => {
      this._showGameOverScreen(data);
    });
  }
  
  /**
   * 更新遊戲邏輯
   * @override
   * @param {number} deltaTime - 距離上次更新的時間（毫秒）
   */
  update(deltaTime) {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }
    
    // 更新地鼠
    this._updateMoles(deltaTime);
    
    // 生成新地鼠
    this._spawnMoles(deltaTime);
    
    // 更新連擊計時器
    this._updateComboTimer(deltaTime);
    
    // 更新遊戲時間
    this.state.elapsedTime = performance.now() - this.state.startTime;
    this._updateTimerDisplay();
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
    
    // 繪製背景
    this._renderBackground(ctx);
    
    // 繪製洞穴
    this._renderHoles(ctx);
    
    // 繪製地鼠
    this._renderMoles(ctx);
    
    // 繪製UI
    this._renderUI(ctx);
    
    // 繪製除錯信息
    if (this.config.debug.enabled) {
      this._renderDebugInfo(ctx);
    }
  }
  
  /**
   * 清理資源
   * @override
   */
  cleanup() {
    // 移除事件監聽器
    if (this.elements.canvas) {
      this.elements.canvas.removeEventListener('click', this._boundHandleClick);
    }
    
    // 清理遊戲元素
    Object.values(this.gameElements).forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    // 清理資源
    this.resources.moleImages.clear();
    this.resources.soundEffects.clear();
  }
  
  /**
   * 設置遊戲難度
   * @param {string} difficulty - 難度級別
   */
  setDifficulty(difficulty) {
    if (!Object.values(Difficulty).includes(difficulty)) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `Invalid difficulty: ${difficulty}`
      );
    }
    
    this.gameState.difficulty = difficulty;
    
    // 根據難度調整遊戲參數
    switch (difficulty) {
      case Difficulty.EASY:
        this.gameState.spawnRate = 1500;
        this.gameState.moleSpeed = 0.8;
        this.gameState.maxMoles = 4;
        this.config.initialLives = 5;
        break;
      case Difficulty.MEDIUM:
        this.gameState.spawnRate = 1000;
        this.gameState.moleSpeed = 1.0;
        this.gameState.maxMoles = 6;
        this.config.initialLives = 3;
        break;
      case Difficulty.HARD:
        this.gameState.spawnRate = 700;
        this.gameState.moleSpeed = 1.3;
        this.gameState.maxMoles = 8;
        this.config.initialLives = 2;
        break;
    }
    
    // 重置生命值
    this.state.lives = this.config.initialLives;
    
    this.events.emit('game:difficulty:change', { difficulty });
  }
  
  /**
   * 私有方法：創建地鼠圖像
   * @private
   */
  _createMoleImages() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 80;
    canvas.height = 80;
    
    // 普通地鼠（棕色）
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(40, 40, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(30, 30, 6, 0, Math.PI * 2);
    ctx.arc(50, 30, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 瞳孔
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(30, 30, 3, 0, Math.PI * 2);
    ctx.arc(50, 30, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 鼻子
    ctx.fillStyle = 'pink';
    ctx.beginPath();
    ctx.arc(40, 45, 8, 0, Math.PI * 2);
    ctx.fill();
    
    this.resources.moleImages.set(MoleType.NORMAL, canvas);
    
    // 黃金地鼠（金色）
    const goldenCanvas = document.createElement('canvas');
    const goldenCtx = goldenCanvas.getContext('2d');
    goldenCanvas.width = 80;
    goldenCanvas.height = 80;
    
    // 創建金色漸變
    const gradient = goldenCtx.createRadialGradient(40, 40, 0, 40, 40, 30);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#B8860B');
    
    goldenCtx.fillStyle = gradient;
    goldenCtx.beginPath();
    goldenCtx.arc(40, 40, 30, 0, Math.PI * 2);
    goldenCtx.fill();
    
    // 眼睛（鑽石色）
    goldenCtx.fillStyle = '#B9F2FF';
    goldenCtx.beginPath();
    goldenCtx.arc(30, 30, 6, 0, Math.PI * 2);
    goldenCtx.arc(50, 30, 6, 0, Math.PI * 2);
    goldenCtx.fill();
    
    // 瞳孔
    goldenCtx.fillStyle = '#4169E1';
    goldenCtx.beginPath();
    goldenCtx.arc(30, 30, 3, 0, Math.PI * 2);
    goldenCtx.arc(50, 30, 3, 0, Math.PI * 2);
    goldenCtx.fill();
    
    // 鼻子（紅寶石色）
    goldenCtx.fillStyle = '#DC143C';
    goldenCtx.beginPath();
    goldenCtx.arc(40, 45, 8, 0, Math.PI * 2);
    goldenCtx.fill();
    
    // 添加皇冠
    goldenCtx.fillStyle = '#FFD700';
    goldenCtx.beginPath();
    goldenCtx.moveTo(25, 15);
    goldenCtx.lineTo(40, 5);
    goldenCtx.lineTo(55, 15);
    goldenCtx.lineTo(50, 20);
    goldenCtx.lineTo(30, 20);
    goldenCtx.closePath();
    goldenCtx.fill();
    
    this.resources.moleImages.set(MoleType.GOLDEN, goldenCanvas);
    
    // 炸彈地鼠（紅色帶引信）
    const bombCanvas = document.createElement('canvas');
    const bombCtx = bombCanvas.getContext('2d');
    bombCanvas.width = 80;
    bombCanvas.height = 80;
    
    // 炸彈身體（黑色）
    bombCtx.fillStyle = '#2C2C2C';
    bombCtx.beginPath();
    bombCtx.arc(40, 40, 30, 0, Math.PI * 2);
    bombCtx.fill();
    
    // 引信（紅色）
    bombCtx.fillStyle = '#FF4444';
    bombCtx.beginPath();
    bombCtx.arc(40, 10, 5, 0, Math.PI * 2);
    bombCtx.fill();
    
    // 引信線
    bombCtx.strokeStyle = '#FF4444';
    bombCtx.lineWidth = 3;
    bombCtx.beginPath();
    bombCtx.moveTo(40, 15);
    bombCtx.lineTo(40, 30);
    bombCtx.stroke();
    
    // 危險標誌
    bombCtx.fillStyle = '#FF4444';
    bombCtx.font = 'bold 20px Arial';
    bombCtx.textAlign = 'center';
    bombCtx.textBaseline = 'middle';
    bombCtx.fillText('!', 40, 40);
    
    this.resources.moleImages.set(MoleType.BOMB, bombCanvas);
  }
  
  /**
   * 私有方法：創建洞穴圖像
   * @private
   */
  _createHoleImage() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 100;
    canvas.height = 60;
    
    // 洞穴陰影
    const gradient = ctx.createRadialGradient(50, 30, 0, 50, 30, 40);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(50, 30, 40, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 洞穴邊緣
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(50, 30, 38, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    this.resources.holeImage = canvas;
  }
  
  /**
   * 私有方法：創建音效
   * @private
   */
  _createSoundEffects() {
    // 使用Web Audio API創建簡單音效
    // 實際實現會在需要時創建音頻上下文
    this.resources.soundEffects.set('hit', 'hit');
    this.resources.soundEffects.set('golden', 'golden');
    this.resources.soundEffects.set('bomb', 'bomb');
    this.resources.soundEffects.set('combo', 'combo');
    this.resources.soundEffects.set('miss', 'miss');
  }
  
  /**
   * 私有方法：初始化洞穴位置
   * @private
   */
  _initHoles() {
    const canvas = this.elements.canvas;
    const holeCount = 9; // 3x3網格
    
    this.gameState.holes = [];
    
    const gridCols = 3;
    const gridRows = 3;
    const holeWidth = 100;
    const holeHeight = 60;
    const paddingX = (canvas.width - gridCols * holeWidth) / (gridCols + 1);
    const paddingY = (canvas.height - gridRows * holeHeight) / (gridRows + 1);
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const x = paddingX + col * (holeWidth + paddingX);
        const y = paddingY + row * (holeHeight + paddingY);
        
        this.gameState.holes.push({
          x, y,
          width: holeWidth,
          height: holeHeight,
          isOccupied: false,
          moleId: null
        });
      }
    }
  }
  
  /**
   * 私有方法：更新地鼠
   * @private
   * @param {number} deltaTime - 距離上次更新的時間（毫秒）
   */
  _updateMoles(deltaTime) {
    for (let i = this.gameState.moles.length - 1; i >= 0; i--) {
      const mole = this.gameState.moles[i];
      
      // 更新地鼠動畫
      mole.y -= mole.speed * deltaTime * 0.05;
      mole.animationTime += deltaTime;
      
      // 檢查地鼠是否應該消失
      if (mole.y < mole.startY - 60 || mole.lifetime <= 0) {
        // 地鼠消失，算作錯過
        this._handleMissedMole(mole);
        this.gameState.moles.splice(i, 1);
        
        // 釋放洞穴
        if (mole.holeIndex !== -1) {
          const hole = this.gameState.holes[mole.holeIndex];
          hole.isOccupied = false;
          hole.moleId = null;
          this.gameState.activeMoles--;
        }
      } else {
        mole.lifetime -= deltaTime;
      }
    }
  }
  
  /**
   * 私有方法：生成地鼠
   * @private
   * @param {number} deltaTime - 距離上次更新的時間（毫秒）
   */
  _spawnMoles(deltaTime) {
    if (this.gameState.activeMoles >= this.gameState.maxMoles