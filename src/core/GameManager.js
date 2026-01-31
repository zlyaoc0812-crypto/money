/**
 * 遊戲管理器
 * 負責管理多個遊戲實例、處理遊戲之間的切換和提供統一的遊戲管理介面
 */

import { GameError, ErrorTypes } from './GameError.js';
import { ValidationHelpers } from '../utils/validation.js';
import { DOM } from '../utils/dom.js';

/**
 * 遊戲管理器類
 */
export class GameManager {
  /**
   * 創建遊戲管理器實例
   * @param {Object} options - 管理器選項
   */
  constructor(options = {}) {
    // 驗證並合併配置
    this.config = this._validateConfig(options);
    
    // 遊戲註冊表
    this.games = new Map();
    
    // 當前遊戲
    this.currentGame = null;
    
    // 遊戲歷史記錄
    this.gameHistory = [];
    
    // 遊戲狀態
    this.state = {
      isInitialized: false,
      isRunning: false,
      activeGameId: null,
      totalPlayTime: 0,
      startTime: 0
    };
    
    // 事件系統
    this.events = {
      onGameStart: new Set(),
      onGameEnd: new Set(),
      onGameSwitch: new Set(),
      onError: new Set()
    };
    
    // 綁定方法
    this._boundHandleGameError = this._handleGameError.bind(this);
    this._boundHandleGameEnd = this._handleGameEnd.bind(this);
    
    // 初始化DOM元素
    this._initDOM();
  }
  
  /**
   * 驗證配置
   * @private
   * @param {Object} config - 原始配置
   * @returns {Object} 驗證後的配置
   */
  _validateConfig(config) {
    try {
      const validatedConfig = ValidationHelpers.validateObject(config, {
        defaultValue: {},
        fieldName: 'game manager config'
      });
      
      return {
        // 容器設置
        container: ValidationHelpers.validateString(validatedConfig.container, {
          defaultValue: 'game-manager-container',
          fieldName: 'container selector'
        }),
        
        // UI設置
        ui: ValidationHelpers.validateObject(validatedConfig.ui, {
          defaultValue: {
            showGameList: true,
            showStats: true,
            showControls: true,
            autoCreateUI: true
          },
          fieldName: 'UI config'
        }),
        
        // 遊戲設置
        games: ValidationHelpers.validateObject(validatedConfig.games, {
          defaultValue: {},
          fieldName: 'games config'
        }),
        
        // 除錯設置
        debug: ValidationHelpers.validateObject(validatedConfig.debug, {
          defaultValue: {
            enabled: false,
            logEvents: false,
            logPerformance: false
          },
          fieldName: 'debug config'
        })
      };
    } catch (error) {
      throw new GameError(
        ErrorTypes.GAME_INIT,
        'Invalid game manager configuration',
        error
      );
    }
  }
  
  /**
   * 初始化DOM元素
   * @private
   */
  _initDOM() {
    if (!this.config.ui.autoCreateUI) {
      return;
    }
    
    // 創建管理器容器
    this.container = DOM.getElement(this.config.container);
    
    if (!this.container) {
      this.container = DOM.createElement('div', {
        id: this.config.container.replace('#', ''),
        className: 'game-manager-container',
        style: {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          zIndex: '1000',
          display: 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }
      });
      
      document.body.appendChild(this.container);
    }
    
    // 創建遊戲選擇器
    if (this.config.ui.showGameList) {
      this._createGameSelector();
    }
    
    // 創建統計面板
    if (this.config.ui.showStats) {
      this._createStatsPanel();
    }
    
    // 創建控制面板
    if (this.config.ui.showControls) {
      this._createControlPanel();
    }
  }
  
  /**
   * 創建遊戲選擇器
   * @private
   */
  _createGameSelector() {
    const selectorContainer = DOM.createElement('div', {
      className: 'game-selector-container',
      style: {
        width: '80%',
        maxWidth: '800px',
        marginBottom: '30px'
      }
    });
    
    const title = DOM.createElement('h1', {
      className: 'game-selector-title',
      text: '選擇遊戲',
      style: {
        color: '#f8fafc',
        textAlign: 'center',
        marginBottom: '20px',
        fontSize: '2.5rem'
      }
    });
    
    const gamesGrid = DOM.createElement('div', {
      className: 'games-grid',
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px'
      }
    });
    
    DOM.addToContainer(title, selectorContainer);
    DOM.addToContainer(gamesGrid, selectorContainer);
    DOM.addToContainer(selectorContainer, this.container);
    
    this.elements = {
      ...this.elements,
      selectorContainer,
      gamesGrid
    };
  }
  
  /**
   * 創建統計面板
   * @private
   */
  _createStatsPanel() {
    const statsContainer = DOM.createElement('div', {
      className: 'stats-container',
      style: {
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        width: '80%',
        maxWidth: '600px'
      }
    });
    
    const statsTitle = DOM.createElement('h2', {
      className: 'stats-title',
      text: '遊戲統計',
      style: {
        color: '#cbd5e1',
        marginBottom: '15px',
        fontSize: '1.5rem'
      }
    });
    
    const statsContent = DOM.createElement('div', {
      className: 'stats-content',
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px'
      }
    });
    
    // 創建統計項目
    const statsItems = [
      { id: 'total-games', label: '遊戲數量', value: '0' },
      { id: 'total-play-time', label: '總遊玩時間', value: '0s' },
      { id: 'active-game', label: '當前遊戲', value: '無' },
      { id: 'total-score', label: '總分數', value: '0' }
    ];
    
    statsItems.forEach(item => {
      const statItem = DOM.createElement('div', {
        className: 'stat-item',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '10px',
          textAlign: 'center'
        }
      });
      
      const label = DOM.createElement('div', {
        className: 'stat-label',
        text: item.label,
        style: {
          fontSize: '0.9rem',
          color: '#94a3b8',
          marginBottom: '5px'
        }
      });
      
      const value = DOM.createElement('div', {
        id: `stat-${item.id}`,
        className: 'stat-value',
        text: item.value,
        style: {
          fontSize: '1.2rem',
          color: '#f8fafc',
          fontWeight: 'bold'
        }
      });
      
      DOM.addToContainer(label, statItem);
      DOM.addToContainer(value, statItem);
      DOM.addToContainer(statItem, statsContent);
    });
    
    DOM.addToContainer(statsTitle, statsContainer);
    DOM.addToContainer(statsContent, statsContainer);
    DOM.addToContainer(statsContainer, this.container);
    
    this.elements = {
      ...this.elements,
      statsContainer,
      statsContent
    };
  }
  
  /**
   * 創建控制面板
   * @private
   */
  _createControlPanel() {
    const controlContainer = DOM.createElement('div', {
      className: 'control-container',
      style: {
        display: 'flex',
        gap: '15px',
        marginTop: '20px'
      }
    });
    
    // 創建控制按鈕
    const buttons = [
      {
        id: 'btn-back',
        text: '返回遊戲',
        type: 'primary',
        onClick: () => this.hideManager()
      },
      {
        id: 'btn-restart',
        text: '重新開始',
        type: 'secondary',
        onClick: () => this.currentGame?.restart()
      },
      {
        id: 'btn-exit',
        text: '退出遊戲',
        type: 'danger',
        onClick: () => this.exitGame()
      }
    ];
    
    buttons.forEach(buttonConfig => {
      const button = DOM.createGameButton({
        id: buttonConfig.id,
        text: buttonConfig.text,
        type: buttonConfig.type,
        onClick: buttonConfig.onClick,
        style: {
          padding: '12px 24px',
          fontSize: '1rem'
        }
      });
      
      DOM.addToContainer(button, controlContainer);
    });
    
    DOM.addToContainer(controlContainer, this.container);
    
    this.elements = {
      ...this.elements,
      controlContainer
    };
  }
  
  /**
   * 註冊遊戲
   * @param {string} gameId - 遊戲ID
   * @param {Function} GameClass - 遊戲類（必須繼承GameEngine）
   * @param {Object} config - 遊戲配置
   * @returns {boolean} 是否註冊成功
   */
  registerGame(gameId, GameClass, config = {}) {
    try {
      if (!ValidationHelpers.isString(gameId, 1)) {
        throw new GameError(
          ErrorTypes.INPUT_VALIDATION,
          'Game ID must be a non-empty string'
        );
      }
      
      if (this.games.has(gameId)) {
        console.warn(`Game "${gameId}" is already registered`);
        return false;
      }
      
      if (typeof GameClass !== 'function') {
        throw new GameError(
          ErrorTypes.INPUT_VALIDATION,
          'GameClass must be a constructor function'
        );
      }
      
      // 驗證遊戲配置
      const gameConfig = {
        id: gameId,
        name: config.name || gameId,
        description: config.description || '',
        category: config.category || 'uncategorized',
        difficulty: config.difficulty || 'medium',
        thumbnail: config.thumbnail || '',
        ...config
      };
      
      this.games.set(gameId, {
        GameClass,
        config: gameConfig,
        stats: {
          playCount: 0,
          totalScore: 0,
          totalPlayTime: 0,
          bestScore: 0,
          lastPlayed: null
        }
      });
      
      // 更新遊戲選擇器UI
      this._updateGameSelector();
      
      this._log(`Game "${gameId}" registered successfully`);
      return true;
      
    } catch (error) {
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * 啟動遊戲
   * @param {string} gameId - 遊戲ID
   * @param {Object} gameConfig - 遊戲特定配置
   * @returns {Promise<GameEngine|null>} 遊戲實例或null
   */
  async startGame(gameId, gameConfig = {}) {
    try {
      if (!this.games.has(gameId)) {
        throw new GameError(
          ErrorTypes.RUNTIME,
          `Game "${gameId}" is not registered`
        );
      }
      
      const gameInfo = this.games.get(gameId);
      
      // 停止當前遊戲
      if (this.currentGame) {
        await this.stopCurrentGame();
      }
      
      // 創建遊戲實例
      const mergedConfig = {
        ...gameInfo.config,
        ...gameConfig,
        debug: {
          ...this.config.debug,
          ...gameConfig.debug
        }
      };
      
      const gameInstance = new gameInfo.GameClass(mergedConfig);
      
      // 設置錯誤處理
      gameInstance.events.on('game:error', this._boundHandleGameError);
      gameInstance.events.on('game:over', this._boundHandleGameEnd);
      
      // 初始化遊戲
      await gameInstance.init();
      
      // 更新狀態
      this.currentGame = gameInstance;
      this.state.activeGameId = gameId;
      this.state.isRunning = true;
      this.state.startTime = Date.now();
      
      // 更新遊戲統計
      gameInfo.stats.playCount++;
      gameInfo.stats.lastPlayed = new Date();
      
      // 觸發事件
      this._triggerEvent('onGameStart', {
        gameId,
        gameInstance,
        config: mergedConfig
      });
      
      // 隱藏管理器UI
      this.hideManager();
      
      // 開始遊戲
      gameInstance.start();
      
      this._log(`Game "${gameId}" started`);
      return gameInstance;
      
    } catch (error) {
      this._handleError(error);
      return null;
    }
  }
  
  /**
   * 停止當前遊戲
   * @returns {Promise<boolean>} 是否停止成功
   */
  async stopCurrentGame() {
    try {
      if (!this.currentGame) {
        return true;
      }
      
      const gameId = this.state.activeGameId;
      
      // 停止遊戲
      this.currentGame.stop();
      
      // 移除事件監聽器
      this.currentGame.events.off('game:error', this._boundHandleGameError);
      this.currentGame.events.off('game:over', this._boundHandleGameEnd);
      
      // 更新統計
      if (gameId && this.games.has(gameId)) {
        const gameInfo = this.games.get(gameId);
        const playTime = Date.now() - this.state.startTime;
        
        gameInfo.stats.totalPlayTime += playTime;
        gameInfo.stats.totalScore += this.currentGame.state.score;
        
        if (this.currentGame.state.score > gameInfo.stats.bestScore) {
          gameInfo.stats.bestScore = this.currentGame.state.score;
        }
        
        this.state.totalPlayTime += playTime;
      }
      
      // 銷毀遊戲實例
      this.currentGame.destroy();
      this.currentGame = null;
      this.state.activeGameId = null;
      this.state.isRunning = false;
      
      // 更新統計UI
      this._updateStats();
      
      this._log(`Current game stopped`);
      return true;
      
    } catch (error) {
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * 切換到另一個遊戲
   * @param {string} gameId - 要切換到的遊戲ID
   * @returns {Promise<boolean>} 是否切換成功
   */
  async switchGame(gameId) {
    try {
      if (!this.games.has(gameId)) {
        throw new GameError(
          ErrorTypes.RUNTIME,
          `Game "${gameId}" is not registered`
        );
      }
      
      if (this.state.activeGameId === gameId) {
        console.warn(`Already playing game "${gameId}"`);
        return false;
      }
      
      // 停止當前遊戲
      await this.stopCurrentGame();
      
      // 啟動新遊戲
      const gameInstance = await this.startGame(gameId);
      
      if (gameInstance) {
        this._triggerEvent('onGameSwitch', {
          fromGameId: this.state.activeGameId,
          toGameId: gameId,
          gameInstance
        });
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * 退出當前遊戲並顯示管理器
   */
  async exitGame() {
    await this.stopCurrentGame();
    this.showManager();
  }
  
  /**
   * 顯示遊戲管理器UI
   */
  showManager() {
    if (this.container) {
      DOM.showElement(this.container, 'flex');
      this._updateGameSelector();
      this._updateStats();
    }
  }
  
  /**
   * 隱藏遊戲管理器UI
   */
  hideManager() {
    if (this.container) {
      DOM.hideElement(this.container);
    }
  }
  
  /**
   * 獲取遊戲統計
   * @param {string} gameId - 遊戲ID（可選，如果未提供則返回所有遊戲統計）
   * @returns {Object} 遊戲統計
   */
  getGameStats(gameId = null) {
    if (gameId) {
      return this.games.has(gameId) ? this.games.get(gameId).stats : null;
    }
    
    const allStats = {};
    this.games.forEach((gameInfo, id) => {
      allStats[id] = gameInfo.stats;
    });
    
    return allStats;
  }
  
  /**
   * 添加事件監聽器
   * @param {string} event - 事件名稱
   * @param {Function} listener - 事件監聽器
   */
  on(event, listener) {
    if (this.events[event]) {
      this.events[event].add(listener);
    }
  }
  
  /**
   * 移除事件監聽器
   * @param {string} event - 事件名稱
   * @param {Function} listener - 事件監聽器
   */
  off(event, listener) {
    if (this.events[event]) {
      this.events[event].delete(listener);
    }
  }
  
  /**
   * 銷毀遊戲管理器
   */
  destroy() {
    // 停止當前遊戲
    this.stopCurrentGame().catch(console.error);
    
    // 清理事件監聽器
    Object.values(this.events).forEach(eventSet => eventSet.clear());
    
    // 清理DOM元素
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // 清理遊戲註冊表
    this.games.clear();
    
    // 重置狀態
    this.state = {
      isInitialized: false,
      isRunning: false,
      activeGameId: null,
      totalPlayTime: 0,
      startTime: 0
    };
    
    this.currentGame = null;
    this.gameHistory = [];
    
    this._log('Game manager destroyed');
  }
  
  /**
   * 私有方法：更新遊戲選擇器
   * @private
   */
  _updateGameSelector() {
    if (!this.elements?.gamesGrid) {
      return;
    }
    
    // 清空現有內容
    DOM.setText(this.elements.gamesGrid, '');
    
    // 添加遊戲卡片
    this.games.forEach((gameInfo, gameId) => {
      const gameCard = DOM.createElement('div', {
        className: 'game-card',
        style: {
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          border: '2px solid transparent'
        },
        events: {
          click: () => this.startGame(gameId),
          mouseenter: (e) => {
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)';
          },
          mouseleave: (e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.borderColor = 'transparent';
            e.target.style.boxShadow = 'none';
          }
        }
      });
      
      // 遊戲標題
      const title = DOM.createElement('h3', {
        className: 'game-card-title',
        text: gameInfo.config.name,
        style: {
          color: '#f8fafc',
          marginBottom: '10px',
          fontSize: '1.2rem'
        }
      });
      
      // 遊戲描述
      const description = DOM.createElement('p', {
        className: 'game-card-description',
        text: gameInfo.config.description || '沒有描述',
        style: {
          color: '#94a3b8',
          fontSize: '0.9rem',
          marginBottom: '15px',
          height: '40px',
          overflow: 'hidden'
        }
      });
      
      // 遊戲統計
      const stats = DOM.createElement('div', {
        className: 'game-card-stats',
        style: {
          display: 'flex',
          gap: '10px',
          fontSize: '0.8rem',
          color: '#64748b'
        }
      });
      
      const playCount = DOM.createElement('span', {
        text: `遊玩: ${gameInfo.stats.playCount}`,
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '4px 8px',
          borderRadius: '4px'
        }
      });
      
      const bestScore = DOM.createElement('span', {
        text: `最高分: ${gameInfo.stats.bestScore}`,
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          padding: '4px 8px',
          borderRadius: '4px'
        }
      });
      
      DOM.addToContainer(playCount, stats);
      DOM.addToContainer(bestScore, stats);
      
      // 添加到卡片
      DOM.addToContainer(title, gameCard);
      DOM.addToContainer(description, gameCard);
      DOM.addToContainer(stats, gameCard);
      
      // 添加到網格
      DOM.addToContainer(gameCard, this.elements.gamesGrid);
    });
  }
  
  /**
   * 私有方法：更新統計面板
   * @private
   */
  _updateStats() {
    if (!this.elements?.statsContent) {
      return;
    }
    
    // 計算總遊戲數量
    const totalGames = this.games.size;
    
    // 格式化遊玩時間
    const formatTime = (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    };
    
    // 計算總分數
    let totalScore = 0;
    this.games.forEach(gameInfo => {
      totalScore += gameInfo.stats.totalScore;
    });
    
    // 更新統計項目
    DOM.setText(DOM.getElement('#stat-total-games'), totalGames.toString());
    DOM.setText(DOM.getElement('#stat-total-play-time'), formatTime(this.state.totalPlayTime));
    DOM.setText(DOM.getElement('#stat-active-game'), this.state.activeGameId || '無');
    DOM.setText(DOM.getElement('#stat-total-score'), totalScore.toString());
  }
  
  /**
   * 私有方法：處理遊戲錯誤
   * @private
   * @param {GameError} error - 遊戲錯誤
   */
  _handleGameError(error) {
    this._log(`Game error: ${error.message}`, 'error');
    this._triggerEvent('onError', error);
    
    // 顯示錯誤訊息
    if (this.config.debug.enabled) {
      this._showErrorModal(error);
    }
  }
  
  /**
   * 私有方法：處理遊戲結束
   * @private
   * @param {Object} data - 遊戲結束數據
   */
  _handleGameEnd(data) {
    this._log(`Game ended. Score: ${data.score}, Win: ${data.isWin}`);
    this._triggerEvent('onGameEnd', data);
    
    // 顯示遊戲結束畫面
    if (this.config.ui.autoCreateUI) {
      this._showGameOverModal(data);
    }
  }
  
  /**
   * 私有方法：顯示錯誤模態框
   * @private
   * @param {GameError} error - 遊戲錯誤
   */
  _showErrorModal(error) {
    const modal = DOM.createGameModal({
      title: '遊戲錯誤',
      content: `
        <p>發生錯誤：${error.message}</p>
        <p>錯誤類型：${error.type}</p>
        <p>時間：${new Date(error.timestamp).toLocaleString()}</p>
        ${error.originalError ? `<p>原始錯誤：${error.originalError.message}</p>` : ''}
      `,
      closable: true,
      buttons: [
        {
          text: '重新開始',
          type: 'primary',
          onClick: () => this.currentGame?.restart()
        },
        {
          text: '返回主選單',
          type: 'secondary',
          onClick: () => this.showManager()
        }
      ]
    });
    
    DOM.addToContainer(modal, document.body);
    modal.show();
  }
  
  /**
   * 私有方法：顯示遊戲結束模態框
   * @private
   * @param {Object} data - 遊戲結束數據
   */
  _showGameOverModal(data) {
    const modal = DOM.createGameModal({
      title: data.isWin ? '恭喜！你贏了！' : '遊戲結束',
      content: `
        <div style="text-align: center;">
          <p style="font-size: 1.5rem; color: ${data.isWin ? '#10b981' : '#ef4444'}; margin-bottom: 20px;">
            ${data.isWin ? '🎉 勝利！' : '😢 失敗了'}
          </p>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
              <div style="color: #94a3b8; font-size: 0.9rem;">分數</div>
              <div style="color: #ffd700; font-size: 2rem; font-weight: bold;">${data.score}</div>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
              <div style="color: #94a3b8; font-size: 0.9rem;">等級</div>
              <div style="color: #3b82f6; font-size: 2rem; font-weight: bold;">${data.level}</div>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
              <div style="color: #94a3b8; font-size: 0.9rem;">生命</div>
              <div style="color: #ef4444; font-size: 2rem; font-weight: bold;">${data.lives}</div>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
              <div style="color: #94a3b8; font-size: 0.9rem;">時間</div>
              <div style="color: #10b981; font-size: 2rem; font-weight: bold;">${Math.round(data.elapsedTime / 1000)}s</div>
            </div>
          </div>
        </div>
      `,
      closable: true,
      buttons: [
        {
          text: '再玩一次',
          type: 'primary',
          onClick: () => this.currentGame?.restart()
        },
        {
          text: '選擇其他遊戲',
          type: 'secondary',
          onClick: () => this.showManager()
        },
        {
          text: '分享成績',
          type: 'success',
          onClick: () => this._shareScore(data)
        }
      ]
    });
    
    DOM.addToContainer(modal, document.body);
    modal.show();
  }
  
  /**
   * 私有方法：分享分數
   * @private
   * @param {Object} data - 遊戲數據
   */
  _shareScore(data) {
    const shareText = `我在遊戲中獲得了 ${data.score} 分！等級 ${data.level}，遊玩時間 ${Math.round(data.elapsedTime / 1000)} 秒。`;
    
    if (navigator.share) {
      navigator.share({
        title: '我的遊戲成績',
        text: shareText,
        url: window.location.href
      }).catch(console.error);
    } else {
      // 複製到剪貼簿
      navigator.clipboard.writeText(shareText).then(() => {
        alert('成績已複製到剪貼簿！');
      }).catch(console.error);
    }
  }
  
  /**
   * 私有方法：觸發事件
   * @private
   * @param {string} eventName - 事件名稱
   * @param {any} data - 事件數據
   */
  _triggerEvent(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${eventName} event listener:`, error);
        }
      });
    }
    
    if (this.config.debug.logEvents) {
      this._log(`Event fired: ${eventName}`, 'debug', data);
    }
  }
  
  /**
   * 私有方法：處理錯誤
   * @private
   * @param {Error} error - 錯誤對象
   */
  _handleError(error) {
    const gameError = error instanceof GameError
      ? error
      : new GameError(ErrorTypes.RUNTIME, 'Game manager error', error);
    
    gameError.log();
    this._triggerEvent('onError', gameError);
  }
  
  /**
   * 私有方法：記錄日誌
   * @private
   * @param {string} message - 日誌訊息
   * @param {string} level - 日誌級別
   * @param {any} data - 附加數據
   */
  _log(message, level = 'info', data = null) {
    if (!this.config.debug.enabled && level !== 'error') {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const prefix = `[GameManager ${timestamp}]`;
    
    switch (level) {
      case 'error':
        console.error(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'debug':
        console.debug(prefix, message, data || '');
        break;
      default:
        console.log(prefix, message, data || '');
    }
  }
};

// 預設導出
export default GameManager;