/**
 * 極限躲避大挑戰遊戲
 * 基於GameEngine的現代化實現
 */

import { GameEngine } from '../core/GameEngine.js';
import { GameError, ErrorTypes } from '../core/GameError.js';

/**
 * 遊戲難度
 */
const Difficulty = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

/**
 * 道具類型
 */
const PowerupType = {
  SHIELD: 'shield',
  SPEED: 'speed',
  MAGNET: 'magnet'
};

/**
 * 極限躲避大挑戰遊戲類
 */
export class Dodge extends GameEngine {
  /**
   * 創建遊戲實例
   * @param {Object} config - 遊戲配置
   */
  constructor(config = {}) {
    const defaultConfig = {
      id: 'dodge',
      name: '極限躲避大挑戰',
      fps: 60,
      initialLives: 3,
      maxLives: 5,
      canvas: {
        width: 600,
        height: 400,
        backgroundColor: '#141E30'
      },
      features: {
        soundEnabled: true,
        vibrationEnabled: true,
        animationsEnabled: true
      }
    };
    
    super({ ...defaultConfig, ...config });
    
    // 遊戲特定狀態
    this.gameState = {
      difficulty: Difficulty.MEDIUM,
      score: 0,
      gameTime: 0,
      highScore: localStorage.getItem('dodgeHighScore') || 0,
      powerupsCollected: 0,
      comboCount: 0,
      comboMultiplier: 1.0,
      maxCombo: 0,
      gameActive: false,
      gamePaused: false,
      playerX: this.config.canvas.width / 2 - 20,
      playerY: this.config.canvas.height / 2 - 20,
      obstacles: [],
      collectibles: [],
      powerups: [],
      particles: [],
      isInvincible: false,
      invincibleTimer: 0,
      speedBoost: false,
      speedBoostTimer: 0,
      magnetActive: false,
      magnetTimer: 0,
      canDash: true,
      dashCooldown: 0,
      gameOver: false
    };
    
    // 遊戲常量
    this.PLAYER_SIZE = 40;
    this.DASH_COOLDOWN = 5000;
    
    // 難度設置
    this.difficultySettings = {
      easy: {
        obstacleSpeed: 1.0,
        obstacleSpawnRate: 1500,
        collectibleSpawnRate: 3000,
        playerSpeed: 6
      },
      medium: {
        obstacleSpeed: 1.5,
        obstacleSpawnRate: 1000,
        collectibleSpawnRate: 2000,
        playerSpeed: 7
      },
      hard: {
        obstacleSpeed: 2.0,
        obstacleSpawnRate: 700,
        collectibleSpawnRate: 1500,
        playerSpeed: 8
      }
    };
    
    // 綁定方法
    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._boundKeyUp = this._handleKeyUp.bind(this);
    this.keys = {};
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
    document.addEventListener('keyup', this._boundKeyUp);
  }
  
  /**
   * 更新遊戲邏輯
   * @override
   * @param {number} deltaTime - 距離上次更新的時間（毫秒）
   */
  update(deltaTime) {
    if (!this.state.isRunning || this.state.isPaused || !this.gameState.gameActive) {
      return;
    }
    
    // 更新遊戲時間
    this.gameState.gameTime += deltaTime / 1000;
    
    // 更新冷卻時間
    if (!this.gameState.canDash) {
      this.gameState.dashCooldown -= deltaTime;
      if (this.gameState.dashCooldown <= 0) {
        this.gameState.canDash = true;
      }
    }
    
    // 更新道具計時器
    if (this.gameState.isInvincible) {
      this.gameState.invincibleTimer -= deltaTime;
      if (this.gameState.invincibleTimer <= 0) {
        this.gameState.isInvincible = false;
      }
    }
    
    if (this.gameState.speedBoost) {
      this.gameState.speedBoostTimer -= deltaTime;
      if (this.gameState.speedBoostTimer <= 0) {
        this.gameState.speedBoost = false;
      }
    }
    
    if (this.gameState.magnetActive) {
      this.gameState.magnetTimer -= deltaTime;
      if (this.gameState.magnetTimer <= 0) {
        this.gameState.magnetActive = false;
      }
    }
    
    // 更新玩家位置
    this._updatePlayerPosition(deltaTime);
    
    // 更新障礙物
    this._updateObstacles(deltaTime);
    
    // 更新收集物
    this._updateCollectibles(deltaTime);
    
    // 更新道具
    this._updatePowerups(deltaTime);
    
    // 更新粒子效果
    this._updateParticles(deltaTime);
    
    // 檢查碰撞
    this._checkCollisions();
    
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
    
    // 繪製背景
    this._renderBackground(ctx);
    
    // 繪製粒子效果
    this._renderParticles(ctx);
    
    // 繪製障礙物
    this._renderObstacles(ctx);
    
    // 繪製收集物
    this._renderCollectibles(ctx);
    
    // 繪製道具
    this._renderPowerups(ctx);
    
    // 繪製玩家
    this._renderPlayer(ctx);
    
    // 繪製UI
    this._renderUI(ctx);
    
    // 繪製遊戲狀態
    if (this.state.isPaused && this.gameState.gameActive) {
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
    document.removeEventListener('keyup', this._boundKeyUp);
    
    // 清理資源
    this.resources.soundEffects.clear();
  }
  
  /**
   * 開始遊戲
   */
  startGame() {
    if (this.gameState.gameActive) return;
    
    this.gameState.gameActive = true;
    this.state.isPaused = false;
    this.gameState.gamePaused = false;
    this.gameState.gameOver = false;
    
    // 重置遊戲狀態
    this.gameState.score = 0;
    this.gameState.gameTime = 0;
    this.gameState.powerupsCollected = 0;
    this.gameState.comboCount = 0;
    this.gameState.comboMultiplier = 1.0;
    this.gameState.maxCombo = 0;
    this.gameState.isInvincible = false;
    this.gameState.speedBoost = false;
    this.gameState.magnetActive = false;
    this.gameState.canDash = true;
    
    // 清除所有遊戲元素
    this.gameState.obstacles = [];
    this.gameState.collectibles = [];
    this.gameState.powerups = [];
    this.gameState.particles = [];
    
    // 重置玩家位置
    this.gameState.playerX = this.config.canvas.width / 2 - 20;
    this.gameState.playerY = this.config.canvas.height / 2 - 20;
    
    // 開始生成遊戲元素
    this._startSpawnIntervals();
    
    this.events.emit('game:start');
  }
  
  /**
   * 暫停/繼續遊戲
   */
  togglePause() {
    if (!this.gameState.gameActive || this.gameState.gameOver) return;
    
    this.state.isPaused = !this.state.isPaused;
    this.gameState.gamePaused = this.state.isPaused;
    
    if (this.state.isPaused) {
      this._clearSpawnIntervals();
    } else {
      this._startSpawnIntervals();
    }
    
    this.events.emit('game:pause', { paused: this.state.isPaused });
  }
  
  /**
   * 重新開始遊戲
   */
  resetGame() {
    this.gameState.gameActive = false;
    this.state.isPaused = true;
    this.gameState.gamePaused = true;
    this.gameState.gameOver = false;
    
    // 重置遊戲狀態
    this.gameState.score = 0;
    this.gameState.gameTime = 0;
    this.gameState.powerupsCollected = 0;
    this.gameState.comboCount = 0;
    this.gameState.comboMultiplier = 1.0;
    this.gameState.maxCombo = 0;
    this.gameState.isInvincible = false;
    this.gameState.speedBoost = false;
    this.gameState.magnetActive = false;
    this.gameState.canDash = true;
    
    // 清除所有遊戲元素
    this.gameState.obstacles = [];
    this.gameState.collectibles = [];
    this.gameState.powerups = [];
    this.gameState.particles = [];
    
    // 重置玩家位置
    this.gameState.playerX = this.config.canvas.width / 2 - 20;
    this.gameState.playerY = this.config.canvas.height / 2 - 20;
    
    this._clearSpawnIntervals();
    
    this.events.emit('game:reset');
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
    
    // 重新調整生成間隔
    if (this.gameState.gameActive && !this.gameState.gamePaused) {
      this._clearSpawnIntervals();
      this._startSpawnIntervals();
    }
    
    this.events.emit('game:difficulty:change', { difficulty });
  }
  
  /**
   * 玩家衝刺
   */
  playerDash() {
    if (!this.gameState.canDash || !this.gameState.gameActive || this.gameState.gamePaused) {
      return;
    }
    
    this.gameState.canDash = false;
    this.gameState.dashCooldown = this.DASH_COOLDOWN;
    
    // 衝刺效果
    const dashDistance = 100;
    const direction = {
      x: (this.keys['ArrowRight'] || this.keys['d'] ? 1 : 0) - (this.keys['ArrowLeft'] || this.keys['a'] ? 1 : 0),
      y: (this.keys['ArrowDown'] || this.keys['s'] ? 1 : 0) - (this.keys['ArrowUp'] || this.keys['w'] ? 1 : 0)
    };
    
    // 如果沒有方向，預設向右
    if (direction.x === 0 && direction.y === 0) {
      direction.x = 1;
    }
    
    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    direction.x /= magnitude;
    direction.y /= magnitude;
    
    // 更新玩家位置
    this.gameState.playerX = Math.max(0, Math.min(
      this.config.canvas.width - this.PLAYER_SIZE,
      this.gameState.playerX + direction.x * dashDistance
    ));
    this.gameState.playerY = Math.max(0, Math.min(
      this.config.canvas.height - this.PLAYER_SIZE,
      this.gameState.playerY + direction.y * dashDistance
    ));
    
    // 衝刺視覺效果
    this._createParticles(
      this.gameState.playerX + this.PLAYER_SIZE/2,
      this.gameState.playerY + this.PLAYER_SIZE/2,
      'rgba(255, 255, 0, 0.8)',
      15
    );
    
    this.events.emit('game:dash');
  }
  
  /**
   * 私有方法：創建音效
   * @private
   */
  _createSoundEffects() {
    // 音效將在需要時動態創建
  }
  
  /**
   * 私有方法：處理鍵盤按下事件
   * @private
   * @param {KeyboardEvent} event - 鍵盤事件
   */
  _handleKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(event.key)) {
      this.keys[event.key] = true;
      
      // 防止空格鍵觸發頁面滾動
      if (event.key === ' ') {
        event.preventDefault();
        this.playerDash();
      }
    }
  }
  
  /**
   * 私有方法：處理鍵盤釋放事件
   * @private
   * @param {KeyboardEvent} event - 鍵盤事件
   */
  _handleKeyUp(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(event.key)) {
      this.keys[event.key] = false;
    }
  }
  
  /**
   * 私有方法：更新玩家位置
   * @private
   * @param {number} deltaTime - 時間增量
   */
  _updatePlayerPosition(deltaTime) {
    // 更新玩家移動速度
    let currentSpeed = this.difficultySettings[this.gameState.difficulty].playerSpeed;
    if (this.gameState.speedBoost) currentSpeed *= 2;
    
    // 根據按鍵更新位置
    const speed = currentSpeed * (deltaTime / 16); // 標準化速度
    
    if (this.keys['ArrowLeft'] || this.keys['a']) this.gameState.playerX -= speed;
    if (this.keys['ArrowRight'] || this.keys['d']) this.gameState.playerX += speed;
    if (this.keys['ArrowUp'] || this.keys['w']) this.gameState.playerY -= speed;
    if (this.keys['ArrowDown'] || this.keys['s']) this.gameState.playerY += speed;
    
    // 邊界檢查
    this.gameState.playerX = Math.max(0, Math.min(
      this.gameState.playerX,
      this.config.canvas.width - this.PLAYER_SIZE
    ));
    this.gameState.playerY = Math.max(0, Math.min(
      this.gameState.playerY,
      this.config.canvas.height - this.PLAYER_SIZE
    ));
  }
  
  /**
   * 私有方法：更新障礙物
   * @private
   * @param {number} deltaTime - 時間增量
   */
  _updateObstacles(deltaTime) {
    // 更新障礙物位置
    this.gameState.obstacles.forEach((obstacle, index) => {
      obstacle.x += obstacle.speedX * (deltaTime / 16);
      obstacle.y += obstacle.speedY * (deltaTime / 16);
      
      // 移除超出範圍的障礙物
      if (obstacle.x < -100 || obstacle.x > this.config.canvas.width + 100 ||
          obstacle.y < -100 || obstacle.y > this.config.canvas.height + 100) {
        this.gameState.obstacles.splice(index, 1);
      }
    });
  }
  
  /**
   * 私有方法：更新收集物
   * @private
   * @param {number} deltaTime - 時間增量
   */
  _updateCollectibles(deltaTime) {
    // 磁鐵效果
    if (this.gameState.magnetActive) {
      this.gameState.collectibles.forEach((collectible, index) => {
        const dx = (this.gameState.playerX + this.PLAYER_SIZE/2) - (collectible.x + 12.5);
        const dy = (this.gameState.playerY + this.PLAYER_SIZE/2) - (collectible.y + 12.5);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) { // 磁鐵吸引範圍
          const force = 0.2 * (deltaTime / 16);
          collectible.x += dx * force;
          collectible.y += dy * force;
        }
      });
    }
  }
  
  /**
   * 私有方法：更新道具
   * @private
   * @param {number} deltaTime - 時間增量
   */
  _updatePowerups(deltaTime) {
    // 道具將在需要時更新
  }
  
  /**
   * 私有方法：更新粒子效果
   * @private
