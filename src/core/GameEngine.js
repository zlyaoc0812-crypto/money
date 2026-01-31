/**
 * 遊戲引擎基類
 * 提供統一的遊戲生命週期管理和基礎功能
 */

import { GameError, ErrorTypes, ErrorHandler } from './GameError.js';
import { ValidationHelpers, GameValidators } from '../utils/validation.js';

/**
 * 簡單的事件發射器
 */
class EventEmitter {
  constructor() {
    this.events = new Map();
  }
  
  /**
   * 註冊事件監聽器
   * @param {string} event - 事件名稱
   * @param {Function} listener - 事件監聽器
   */
  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(listener);
  }
  
  /**
   * 移除事件監聽器
   * @param {string} event - 事件名稱
   * @param {Function} listener - 事件監聽器
   */
  off(event, listener) {
    if (this.events.has(event)) {
      this.events.get(event).delete(listener);
    }
  }
  
  /**
   * 觸發事件
   * @param {string} event - 事件名稱
   * @param {...any} args - 事件參數
   */
  emit(event, ...args) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error);
        }
      });
    }
  }
  
  /**
   * 一次性事件監聽器
   * @param {string} event - 事件名稱
   * @param {Function} listener - 事件監聽器
   */
  once(event, listener) {
    const onceListener = (...args) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
  }
  
  /**
   * 清除所有事件監聽器
   * @param {string} event - 事件名稱（可選，如果未提供則清除所有事件）
   */
  clear(event = null) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

/**
 * 遊戲引擎基類
 * 所有遊戲都應該繼承這個類
 */
export class GameEngine {
  /**
   * 創建遊戲引擎實例
   * @param {Object} config - 遊戲配置
   */
  constructor(config = {}) {
    // 驗證並合併配置
    this.config = this._validateConfig(config);
    
    // 遊戲狀態
    this.state = {
      isInitialized: false,
      isRunning: false,
      isPaused: false,
      isGameOver: false,
      score: 0,
      level: 1,
      lives: this.config.initialLives,
      combo: 0,
      startTime: 0,
      elapsedTime: 0
    };
    
    // 遊戲元素
    this.elements = {
      canvas: null,
      context: null,
      containers: new Map()
    };
    
    // 遊戲資源
    this.assets = {
      images: new Map(),
      sounds: new Map(),
      fonts: new Map()
    };
    
    // 計時器
    this.timers = new Map();
    
    // 事件系統
    this.events = new EventEmitter();
    
    // 動畫幀
    this.lastUpdateTime = 0;
    this.animationFrameId = null;
    this.frameCount = 0;
    
    // 效能監控
    this.performance = {
      fps: 0,
      lastFpsUpdate: 0,
      frameTimes: []
    };
    
    // 綁定方法
    this._boundGameLoop = this._gameLoop.bind(this);
    this._boundHandleVisibilityChange = this._handleVisibilityChange.bind(this);
    
    // 設置頁面可見性監聽
    document.addEventListener('visibilitychange', this._boundHandleVisibilityChange);
  }
  
  /**
   * 驗證遊戲配置
   * @private
   * @param {Object} config - 原始配置
   * @returns {Object} 驗證後的配置
   */
  _validateConfig(config) {
    try {
      const validatedConfig = ValidationHelpers.validateObject(config, {
        defaultValue: {},
        fieldName: 'game config'
      });
      
      return {
        // 遊戲標識
        id: ValidationHelpers.validateString(validatedConfig.id, {
          defaultValue: `game-${Date.now()}`,
          fieldName: 'game id'
        }),
        name: ValidationHelpers.validateString(validatedConfig.name, {
          defaultValue: 'Unnamed Game',
          fieldName: 'game name'
        }),
        
        // 效能設置
        fps: ValidationHelpers.validateNumber(validatedConfig.fps, {
          min: 1,
          max: 240,
          defaultValue: 60,
          fieldName: 'fps'
        }),
        maxFps: ValidationHelpers.validateNumber(validatedConfig.maxFps, {
          min: 1,
          max: 240,
          defaultValue: 120,
          fieldName: 'max fps'
        }),
        
        // 遊戲設置
        initialLives: ValidationHelpers.validateNumber(validatedConfig.initialLives, {
          min: 1,
          max: 99,
          defaultValue: 3,
          fieldName: 'initial lives'
        }),
        maxLives: ValidationHelpers.validateNumber(validatedConfig.maxLives, {
          min: 1,
          max: 99,
          defaultValue: 10,
          fieldName: 'max lives'
        }),
        
        // 畫布設置
        canvas: ValidationHelpers.validateObject(validatedConfig.canvas, {
          defaultValue: {},
          fieldName: 'canvas config'
        }),
        
        // 除錯設置
        debug: ValidationHelpers.validateObject(validatedConfig.debug, {
          defaultValue: {
            enabled: false,
            showFps: false,
            showStats: false,
            logEvents: false
          },
          fieldName: 'debug config'
        }),
        
        // 功能開關
        features: ValidationHelpers.validateObject(validatedConfig.features, {
          defaultValue: {
            pauseOnBlur: true,
            autoSave: true,
            soundEnabled: true,
            vibrationEnabled: false
          },
          fieldName: 'features config'
        })
      };
    } catch (error) {
      throw new GameError(
        ErrorTypes.GAME_INIT,
        'Invalid game configuration',
        error
      );
    }
  }
  
  /**
   * 初始化遊戲
   * @async
   * @returns {Promise<void>}
   */
  async init() {
    try {
      if (this.state.isInitialized) {
        console.warn('Game is already initialized');
        return;
      }
      
      this.events.emit('game:init:start');
      
      // 設置畫布
      await this._setupCanvas();
      
      // 載入資源
      await this.loadAssets();
      
      // 設置事件監聽器
      this.setupEventListeners();
      
      // 初始化遊戲狀態
      this._initGameState();
      
      this.state.isInitialized = true;
      this.events.emit('game:init:complete');
      
      if (this.config.debug.enabled) {
        console.log(`Game "${this.config.name}" initialized successfully`);
      }
      
    } catch (error) {
      const gameError = error instanceof GameError 
        ? error 
        : new GameError(ErrorTypes.GAME_INIT, 'Failed to initialize game', error);
      
      gameError.log();
      this.events.emit('game:init:error', gameError);
      throw gameError;
    }
  }
  
  /**
   * 開始遊戲
   */
  start() {
    if (!this.state.isInitialized) {
      throw new GameError(
        ErrorTypes.RUNTIME,
        'Game must be initialized before starting'
      );
    }
    
    if (this.state.isRunning) {
      console.warn('Game is already running');
      return;
    }
    
    // 重置遊戲狀態
    this._resetGameState();
    
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.isGameOver = false;
    this.state.startTime = performance.now();
    
    // 開始遊戲循環
    this.lastUpdateTime = performance.now();
    this._gameLoop();
    
    this.events.emit('game:start');
    
    if (this.config.debug.enabled) {
      console.log('Game started');
    }
  }
  
  /**
   * 暫停遊戲
   */
  pause() {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }
    
    this.state.isPaused = true;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // 暫停所有計時器
    this.timers.forEach(timer => {
      if (timer.pause) timer.pause();
    });
    
    this.events.emit('game:pause');
    
    if (this.config.debug.enabled) {
      console.log('Game paused');
    }
  }
  
  /**
   * 繼續遊戲
   */
  resume() {
    if (!this.state.isRunning || !this.state.isPaused) {
      return;
    }
    
    this.state.isPaused = false;
    this.lastUpdateTime = performance.now();
    
    // 恢復所有計時器
    this.timers.forEach(timer => {
      if (timer.resume) timer.resume();
    });
    
    // 重新開始遊戲循環
    this._gameLoop();
    
    this.events.emit('game:resume');
    
    if (this.config.debug.enabled) {
      console.log('Game resumed');
    }
  }
  
  /**
   * 停止遊戲
   */
  stop() {
    if (!this.state.isRunning && !this.state.isPaused) {
      return;
    }
    
    this.state.isRunning = false;
    this.state.isPaused = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // 清除所有計時器
    this._clearAllTimers();
    
    // 清理資源
    this.cleanup();
    
    this.events.emit('game:stop');
    
    if (this.config.debug.enabled) {
      console.log('Game stopped');
    }
  }
  
  /**
   * 重新開始遊戲
   */
  restart() {
    this.stop();
    this.start();
  }
  
  /**
   * 遊戲結束
   * @param {boolean} isWin - 是否勝利
   */
  gameOver(isWin = false) {
    if (this.state.isGameOver) {
      return;
    }
    
    this.state.isGameOver = true;
    this.state.isRunning = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // 計算最終時間
    this.state.elapsedTime = performance.now() - this.state.startTime;
    
    this.events.emit('game:over', {
      isWin,
      score: this.state.score,
      level: this.state.level,
      lives: this.state.lives,
      elapsedTime: this.state.elapsedTime
    });
    
    if (this.config.debug.enabled) {
      console.log(`Game over. Win: ${isWin}, Score: ${this.state.score}`);
    }
  }
  
  /**
   * 更新分數
   * @param {number} points - 要增加的分數
   */
  updateScore(points) {
    if (!GameValidators.isValidScore(points)) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `Invalid points: ${points}`
      );
    }
    
    const oldScore = this.state.score;
    this.state.score += points;
    
    this.events.emit('score:update', {
      oldScore,
      newScore: this.state.score,
      delta: points
    });
    
    // 檢查等級提升
    this._checkLevelUp();
  }
  
  /**
   * 更新生命值
   * @param {number} delta - 生命值變化（正數為增加，負數為減少）
   */
  updateLives(delta) {
    if (!GameValidators.isValidLives(delta)) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `Invalid lives delta: ${delta}`
      );
    }
    
    const oldLives = this.state.lives;
    this.state.lives = Math.max(0, Math.min(
      this.config.maxLives,
      this.state.lives + delta
    ));
    
    this.events.emit('lives:update', {
      oldLives,
      newLives: this.state.lives,
      delta
    });
    
    // 檢查遊戲結束
    if (this.state.lives <= 0) {
      this.gameOver(false);
    }
  }
  
  /**
   * 更新連擊數
   * @param {number} delta - 連擊數變化
   */
  updateCombo(delta) {
    const oldCombo = this.state.combo;
    this.state.combo = Math.max(0, this.state.combo + delta);
    
    this.events.emit('combo:update', {
      oldCombo,
      newCombo: this.state.combo,
      delta
    });
    
    // 重置連擊計時器
    this._resetComboTimer();
  }
  
  /**
   * 設置計時器
   * @param {string} id - 計時器ID
   * @param {Function} callback - 回調函數
   * @param {number} delay - 延遲時間（毫秒）
   * @param {Object} options - 選項
   * @returns {Object} 計時器控制物件
   */
  setTimer(id, callback, delay, options = {}) {
    if (this.timers.has(id)) {
      this.clearTimer(id);
    }
    
    const timer = {
      id,
      callback,
      delay,
      startTime: performance.now(),
      elapsed: 0,
      isPaused: false,
      timeoutId: null
    };
    
    const startTimeout = () => {
      timer.timeoutId = setTimeout(() => {
        try {
          callback();
        } catch (error) {
          console.error(`Error in timer callback "${id}":`, error);
        }
        this.timers.delete(id);
      }, delay - timer.elapsed);
    };
    
    timer.pause = () => {
      if (timer.isPaused) return;
      
      timer.isPaused = true;
      timer.elapsed = performance.now() - timer.startTime;
      
      if (timer.timeoutId) {
        clearTimeout(timer.timeoutId);
        timer.timeoutId = null;
      }
    };
    
    timer.resume = () => {
      if (!timer.isPaused) return;
      
      timer.isPaused = false;
      timer.startTime = performance.now() - timer.elapsed;
      startTimeout();
    };
    
    timer.cancel = () => {
      if (timer.timeoutId) {
        clearTimeout(timer.timeoutId);
      }
      this.timers.delete(id);
    };
    
    startTimeout();
    this.timers.set(id, timer);
    
    return {
      pause: timer.pause,
      resume: timer.resume,
      cancel: timer.cancel
    };
  }
  
  /**
   * 清除計時器
   * @param {string} id - 計時器ID
   */
  clearTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      timer.cancel();
    }
  }
  
  /**
   * 抽象方法：載入資源（必須由子類實現）
   * @async
   * @abstract
   */
  async loadAssets() {
    throw new GameError(
      ErrorTypes.RUNTIME,
      'loadAssets() must be implemented by subclass'
    );
  }
  
  /**
   * 抽象方法：設置事件監聽器（必須由子類實現）
   * @abstract
   */
  setupEventListeners() {
    throw new GameError(
      ErrorTypes.RUNTIME,
      'setupEventListeners() must be implemented by subclass'
    );
  }
  
  /**
   * 抽象方法：更新遊戲邏輯（必須由子類實現）
   * @abstract
   * @param {number} deltaTime - 距離上次更新的時間（毫秒）
   */
  update(deltaTime) {
    throw new GameError(
      ErrorTypes.RUNTIME,
      'update() must be implemented by subclass'
    );
  }
  
  /**
   * 抽象方法：渲染遊戲畫面（必須由子類實現）
   * @abstract
   */
  render() {
    throw new GameError(
      ErrorTypes.RUNTIME,
      'render() must be implemented by subclass'
    );
  }
  
  /**
   * 清理資源（可選，由子類實現）
   */
  cleanup() {
    // 預設實現為空，子類可以覆蓋
  }
  
  /**
   * 私有方法：設置畫布
   * @private
   */
  async _setupCanvas() {
    // 如果配置中指定了畫布元素，使用它
    if (this.config.canvas.element) {
      this.elements.canvas = this.config.canvas.element;
    } else {
      // 否則創建新的畫布元素
      this.elements.canvas = document.createElement('canvas');
      this.elements.canvas.id = `canvas-${this.config.id}`;
      this.elements.canvas.className = 'game-canvas';
      
      // 設置畫布尺寸
      const width = this.config.canvas.width || 800;
      const height = this.config.canvas.height || 600;
      
      this.elements.canvas.width = width;
      this.elements.canvas.height = height;
      this.elements.canvas.style.width = `${width}px`;
      this.elements.canvas.style.height = `${height}px`;
      
      // 添加到文檔中
      const container = document.getElementById(this.config.canvas.container) || document.body;
      container.appendChild(this.elements.canvas);
    }
    
    // 獲取繪圖上下文
    this.elements.context = this.elements.canvas.getContext('2d');
    
    if (!this.elements.context) {
      throw new GameError(
        ErrorTypes.GAME_INIT,
        'Failed to get canvas context'
      );
    }
    
    // 設置畫布樣式
    this.elements.canvas.style.display = 'block';
    this.elements.canvas.style.margin = '0 auto';
    this.elements.canvas.style.backgroundColor = this.config.canvas.backgroundColor || '#000000';
    
    this.events.emit('canvas:ready', this.elements.canvas);
  }
  
  /**
   * 私有方法：初始化遊戲狀態
   * @private
   */
  _initGameState() {
    this.state.score = 0;
    this.state.level = 1;
    this.state.lives = this.config.initialLives;
    this.state.combo = 0;
    this.state.startTime = 0;
    this.state.elapsedTime = 0;
  }
  
  /**
   * 私有方法：重置遊戲狀態
   * @private
   */
  _resetGameState() {
    this._initGameState();
    this.frameCount = 0;
    this.performance.fps = 0;
    this.performance.lastFpsUpdate = 0;
    this.performance.frameTimes = [];
  }
  
  /**
   * 私有方法：檢查等級提升
   * @private
   */
  _checkLevelUp() {
    const oldLevel = this.state.level;
    const newLevel = Math.floor(this.state.score / 1000) + 1;
    
    if (newLevel > oldLevel) {
      this.state.level = newLevel;
      this.events.emit('level:up', {
        oldLevel,
        newLevel,
        score: this.state.score
      });
    }
  }
  
  /**
   * 私有方法：重置連擊計時器
   * @private
   */
  _resetComboTimer() {
    this.clearTimer('combo-reset');
    
    this.setTimer('combo-reset', () => {
      if (this.state.combo > 0) {
        const oldCombo = this.state.combo;
        this.state.combo = 0;
        this.events.emit('combo:reset', { oldCombo });
      }
    }, 3000);
  }
  
  /**
   * 私有方法：清除所有計時器
   * @private
   */
  _clearAllTimers() {
    this.timers.forEach(timer => timer.cancel());
    this.timers.clear();
  }
  
  /**
   * 私有方法：遊戲主循環
   * @private
   */
  _gameLoop(currentTime = 0) {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }
    
    // 計算時間差
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // 更新效能監控
    this._updatePerformance(currentTime, deltaTime);
    
    // 限制更新頻率
    const minFrameTime = 1000 / this.config.maxFps;
    if (deltaTime >= minFrameTime) {
      // 更新遊戲邏輯
      try {
        this.update(deltaTime);
      } catch (error) {
        const gameError = error instanceof GameError
          ? error
          : new GameError(ErrorTypes.RUNTIME, 'Error in game update', error);
        
        gameError.log();
        this.events.emit('game:error', gameError);
      }
      
      // 渲染遊戲畫面
      try {
        this.render();
      } catch (error) {
        const gameError = error instanceof GameError
          ? error
          : new GameError(ErrorTypes.RUNTIME, 'Error in game render', error);
        
        gameError.log();
        this.events.emit('game:error', gameError);
      }
      
      this.frameCount++;
    }
    
    // 請求下一幀
    this.animationFrameId = requestAnimationFrame(this._boundGameLoop);
  }
  
  /**
   * 私有方法：更新效能監控
   * @private
   */
  _updatePerformance(currentTime, deltaTime) {
    // 記錄幀時間
    this.performance.frameTimes.push(deltaTime);
    
    // 限制幀時間記錄數量
    if (this.performance.frameTimes.length > 60) {
      this.performance.frameTimes.shift();
    }
    
    // 每秒更新一次FPS
    if (currentTime - this.performance.lastFpsUpdate >= 1000) {
      const averageFrameTime = this.performance.frameTimes.reduce((a, b) => a + b, 0) /
                              this.performance.frameTimes.length;
      this.performance.fps = averageFrameTime > 0 ? Math.round(1000 / averageFrameTime) : 0;
      this.performance.lastFpsUpdate = currentTime;
      
      if (this.config.debug.showFps) {
        this.events.emit('performance:update', {
          fps: this.performance.fps,
          frameTime: averageFrameTime,
          frameCount: this.frameCount
        });
      }
    }
  }
  
  /**
   * 私有方法：處理頁面可見性變化
   * @private
   */
  _handleVisibilityChange() {
    if (this.config.features.pauseOnBlur) {
      if (document.hidden) {
        // 頁面隱藏，暫停遊戲
        if (this.state.isRunning && !this.state.isPaused) {
          this.pause();
          this.events.emit('game:auto-pause');
        }
      } else {
        // 頁面顯示，恢復遊戲
        if (this.state.isRunning && this.state.isPaused) {
          this.resume();
          this.events.emit('game:auto-resume');
        }
      }
    }
  }
  
  /**
   * 銷毀遊戲引擎
   */
  destroy() {
    // 停止遊戲
    this.stop();
    
    // 移除事件監聽器
    document.removeEventListener('visibilitychange', this._boundHandleVisibilityChange);
    
    // 清除事件系統
    this.events.clear();
    
    // 清理畫布
    if (this.elements.canvas && this.elements.canvas.parentNode) {
      this.elements.canvas.parentNode.removeChild(this.elements.canvas);
    }
    
    // 清理資源
    this.assets.images.clear();
    this.assets.sounds.clear();
    this.assets.fonts.clear();
    
    // 清理容器
    this.elements.containers.clear();
    
    this.events.emit('game:destroy');
    
    if (this.config.debug.enabled) {
      console.log('Game engine destroyed');
    }
  }
}

// 預設導出
export default GameEngine;