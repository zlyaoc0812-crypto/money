/**
 * 記憶卡牌遊戲
 * 基於GameEngine的現代化實現
 */

import { GameEngine } from '../core/GameEngine.js';
import { GameError, ErrorTypes } from '../core/GameError.js';

/**
 * 遊戲難度
 */
const Difficulty = {
  EASY: 'easy',      // 4x4網格，8對卡片
  MEDIUM: 'medium',  // 4x5網格，10對卡片
  HARD: 'hard'       // 5x6網格，15對卡片
};

/**
 * 卡片狀態
 */
const CardState = {
  HIDDEN: 'hidden',      // 隱藏
  REVEALED: 'revealed',  // 翻開
  MATCHED: 'matched'     // 已配對
};

/**
 * 記憶卡牌遊戲類
 */
export class MemoryCard extends GameEngine {
  /**
   * 創建遊戲實例
   * @param {Object} config - 遊戲配置
   */
  constructor(config = {}) {
    const defaultConfig = {
      id: 'memory-card',
      name: '記憶卡牌',
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
        vibrationEnabled: true,
        animationsEnabled: true
      }
    };
    
    super({ ...defaultConfig, ...config });
    
    // 遊戲特定狀態
    this.gameState = {
      difficulty: Difficulty.MEDIUM,
      cards: [],
      gridRows: 4,
      gridCols: 4,
      totalPairs: 8,
      revealedCards: [],
      matchedPairs: 0,
      moves: 0,
      canClick: true,
      firstCard: null,
      secondCard: null,
      timer: 0,
      bestTime: localStorage.getItem('memoryCardBestTime') || null,
      bestMoves: localStorage.getItem('memoryCardBestMoves') || null
    };
    
    // 遊戲資源
    this.resources = {
      cardImages: new Map(),
      cardBackImage: null,
      soundEffects: new Map()
    };
    
    // 綁定方法
    this._boundHandleCardClick = this._handleCardClick.bind(this);
  }
  
  /**
   * 載入遊戲資源
   * @async
   * @override
   */
  async loadAssets() {
    try {
      this.events.emit('game:assets:loading');
      
      // 創建卡片圖像
      this._createCardImages();
      
      // 創建卡片背面圖像
      this._createCardBackImage();
      
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
    // 設置卡片點擊事件
    if (this.elements.canvas) {
      this.elements.canvas.addEventListener('click', this._boundHandleCardClick);
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
    
    // 更新遊戲計時器
    this.gameState.timer += deltaTime;
    
    // 檢查遊戲是否完成
    if (this.gameState.matchedPairs >= this.gameState.totalPairs) {
      this.gameOver(true);
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
    
    // 繪製卡片
    this._renderCards(ctx);
    
    // 繪製UI
    this._renderUI(ctx);
  }
  
  /**
   * 清理資源
   * @override
   */
  cleanup() {
    // 移除事件監聽器
    if (this.elements.canvas) {
      this.elements.canvas.removeEventListener('click', this._boundHandleCardClick);
    }
    
    // 清理資源
    this.resources.cardImages.clear();
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
        this.gameState.gridRows = 4;
        this.gameState.gridCols = 4;
        this.gameState.totalPairs = 8;
        break;
      case Difficulty.MEDIUM:
        this.gameState.gridRows = 4;
        this.gameState.gridCols = 5;
        this.gameState.totalPairs = 10;
        break;
      case Difficulty.HARD:
        this.gameState.gridRows = 5;
        this.gameState.gridCols = 6;
        this.gameState.totalPairs = 15;
        break;
    }
    
    // 重置遊戲
    this._resetGame();
    
    this.events.emit('game:difficulty:change', { difficulty });
  }
  
  /**
   * 私有方法：創建卡片圖像
   * @private
   */
  _createCardImages() {
    const symbols = ['♠', '♥', '♦', '♣', '★', '☀', '☁', '☂', '☃', '♫', '⚽', '⚾', '⛄', '✨', '⭐'];
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#EF476F', '#073B4C', '#7209B7', '#F72585', '#3A0CA3'];
    
    for (let i = 0; i < 15; i++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 100;
      canvas.height = 140;
      
      // 卡片背景（漸變色）
      const gradient = ctx.createLinearGradient(0, 0, 100, 140);
      gradient.addColorStop(0, colors[i % colors.length]);
      gradient.addColorStop(1, this._darkenColor(colors[i % colors.length], 30));
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 100, 140);
      
      // 卡片邊框
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, 96, 136);
      
      // 符號
      ctx.fillStyle = 'white';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbols[i], 50, 70);
      
      this.resources.cardImages.set(i, canvas);
    }
  }
  
  /**
   * 私有方法：創建卡片背面圖像
   * @private
   */
  _createCardBackImage() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 100;
    canvas.height = 140;
    
    // 卡片背面背景（藍色漸變）
    const gradient = ctx.createLinearGradient(0, 0, 100, 140);
    gradient.addColorStop(0, '#2196F3');
    gradient.addColorStop(1, '#0D47A1');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 100, 140);
    
    // 卡片背面圖案
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 50, 70);
    
    this.resources.cardBackImage = canvas;
  }
  
  /**
   * 私有方法：初始化卡片
   * @private
   */
  _initCards() {
    this.gameState.cards = [];
    this.gameState.matchedPairs = 0;
    this.gameState.moves = 0;
    this.gameState.revealedCards = [];
    this.gameState.canClick = true;
    this.gameState.firstCard = null;
    this.gameState.secondCard = null;
    
    // 創建卡片對
    const cardValues = [];
    for (let i = 0; i < this.gameState.totalPairs; i++) {
      cardValues.push(i);
      cardValues.push(i);
    }
    
    // 洗牌
    this._shuffleArray(cardValues);
    
    // 創建卡片物件
    const cardWidth = 100;
    const cardHeight = 140;
    const padding = 15;
    
    const totalWidth = this.gameState.gridCols * cardWidth + (this.gameState.gridCols - 1) * padding;
    const totalHeight = this.gameState.gridRows * cardHeight + (this.gameState.gridRows - 1) * padding;
    
    const startX = (this.elements.canvas.width - totalWidth) / 2;
    const startY = (this.elements.canvas.height - totalHeight) / 2 + 50;
    
    let cardIndex = 0;
    for (let row = 0; row < this.gameState.gridRows; row++) {
      for (let col = 0; col < this.gameState.gridCols; col++) {
        const x = startX + col * (cardWidth + padding);
        const y = startY + row * (cardHeight + padding);
        
        this.gameState.cards.push({
          id: cardIndex,
          value: cardValues[cardIndex],
          x,
          y,
          width: cardWidth,
          height: cardHeight,
          state: CardState.HIDDEN,
          isAnimating: false,
          animationProgress: 0
        });
        
        cardIndex++;
      }
    }
  }
  
  /**
   * 私有方法：處理卡片點擊
   * @private
   * @param {MouseEvent} event - 點擊事件
   */
  _handleCardClick(event) {
    if (!this.state.isRunning || this.state.isPaused || !this.gameState.canClick) {
      return;
    }
    
    const rect = this.elements.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 查找被點擊的卡片
    const clickedCard = this.gameState.cards.find(card => 
      x >= card.x && x <= card.x + card.width &&
      y >= card.y && y <= card.y + card.height &&
      card.state === CardState.HIDDEN
    );
    
    if (!clickedCard) {
      return;
    }
    
    // 翻開卡片
    this._revealCard(clickedCard);
  }
  
  /**
   * 私有方法：翻開卡片
   * @private
   * @param {Object} card - 卡片物件
   */
  _revealCard(card) {
    card.state = CardState.REVEALED;
    card.isAnimating = true;
    card.animationProgress = 0;
    
    this.gameState.revealedCards.push(card);
    
    if (this.gameState.firstCard === null) {
      this.gameState.firstCard = card;
    } else if (this.gameState.secondCard === null) {
      this.gameState.secondCard = card;
      this.gameState.moves++;
      
      // 檢查配對
      this._checkCardMatch();
    }
  }
  
  /**
   * 私有方法：檢查卡片配對
   * @private
   */
  _checkCardMatch() {
    this.gameState.canClick = false;
    
    setTimeout(() => {
      if (this.gameState.firstCard.value === this.gameState.secondCard.value) {
        // 配對成功
        this.gameState.firstCard.state = CardState.MATCHED;
        this.gameState.secondCard.state = CardState.MATCHED;
        this.gameState.matchedPairs++;
        
        // 檢查是否完成遊戲
        if (this.gameState.matchedPairs >= this.gameState.totalPairs) {
          setTimeout(() => {
            this.gameOver(true);
          }, 500);
        }
      } else {
        // 配對失敗
        this.gameState.firstCard.state = CardState.HIDDEN;
        this.gameState.secondCard.state = CardState.HIDDEN;
      }
      
      // 重置選擇
      this.gameState.revealedCards = [];
      this.gameState.firstCard = null;
      this.gameState.secondCard = null;
      this.gameState.canClick = true;
      
    }, 1000);
  }
  
  /**
   * 私有方法：渲染卡片
   * @private
   * @param {CanvasRenderingContext2D} ctx - 畫布上下文
   */
  _renderCards(ctx) {
    this.gameState.cards.forEach(card => {
      // 更新卡片動畫
      if (card.isAnimating) {
        card.animationProgress += 0.1;
        if (card.animationProgress >= 1) {
          card.isAnimating = false;
          card.animationProgress = 1;
        }
      }
      
      // 保存畫布狀態
      ctx.save();
      
      // 根據卡片狀態繪製
      if (card.state === CardState.HIDDEN) {
        // 繪製卡片背面
        if (this.resources.cardBackImage) {
          ctx.drawImage(this.resources.cardBackImage, card.x, card.y, card.width, card.height);
        }
      } else if (card.state === CardState.REVEALED || card.state === CardState.MATCHED) {
        // 繪製卡片正面
        const cardImage = this.resources.cardImages.get(card.value);
        if (cardImage) {
          ctx.drawImage(cardImage, card.x, card.y, card.width, card.height);
        }
        
        // 如果是已配對的卡片，添加綠色邊框
        if (card.state === CardState.MATCHED) {
          ctx.strokeStyle = '#4CAF50';
          ctx.lineWidth = 3;
          ctx.strokeRect(card.x, card.y, card.width, card.height);
        }
      }
      
      // 恢復畫布狀態
      ctx.restore();
    });
  }
  
  /**
   * 私有方法：渲染背景
   * @private
   * @param {CanvasRenderingContext2D} ctx - 畫布上下文
   */
  _renderBackground(ctx) {
    const canvas = this.elements.canvas;
    
    // 繪製漸變背景
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  /**
   * 私有方法：渲染UI
   * @private
   * @param {CanvasRenderingContext2D} ctx - 畫布上下文
   */
  _renderUI(ctx) {
    const canvas = this.elements.canvas;
    
    // 繪製遊戲標題
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('記憶卡牌遊戲', canvas.width / 2, 30);
    
    // 繪製遊戲信息
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`移動次數: ${this.gameState.moves}`, 20, 60);
    ctx.fillText(`配對成功: ${this.gameState.matchedPairs}/${this.gameState.totalPairs}`, 20, 85);
    
    // 繪製計時器
    const minutes = Math.floor(this.gameState.timer / 60000);
    const seconds = Math.floor((this.gameState.timer % 60000) / 1000);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    ctx.textAlign = 'right';
    ctx.fillText(`時間: ${timeString}`, canvas.width - 20, 60);
    
    // 繪製難度
    ctx.fillText(`難度: ${this.gameState.difficulty}`, canvas.width - 20, 85);
    
    // 繪製最佳紀錄
    ctx.textAlign = 'center';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#94a3b8';
    
    if (this.gameState.bestTime) {
      const bestMinutes = Math.floor(this.gameState.bestTime / 60000);
      const bestSeconds = Math.floor((this.gameState.bestTime % 60000) / 1000);
      const bestTimeString = `${bestMinutes.toString().padStart(2, '0')}:${bestSeconds.toString().padStart(2, '0')}`;
      ctx.fillText(`最佳時間: ${bestTimeString}`, canvas.width / 2, 110);
    }
    
    if (this.gameState.bestMoves) {
      ctx.fillText(`最佳移動: ${this.gameState.bestMoves}`, canvas.width / 2, 130);
    }
    
    // 繪製遊戲狀態
    if (this.state.isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('遊戲暫停', canvas.width / 2, canvas.height / 2 - 20);
      
      ctx.font = '18px Arial';
      ctx.fillText('按空格鍵繼續', canvas.width / 2, canvas.height / 2 + 20);
    }
    
    if (!this.state.isRunning && this.state.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('遊戲完成!', canvas.width / 2, canvas.height / 2 - 40);
      
      ctx.font = '20px Arial';
      ctx.fillText(`時間: ${timeString}`, canvas.width / 2, canvas.height / 2);
      ctx.fillText(`移動次數: ${this.gameState.moves}`, canvas.width / 2, canvas.height / 2 + 30);
      
      // 檢查是否打破紀錄
      if (!this.gameState.bestTime || this.gameState.timer < this.gameState.bestTime) {
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('新紀錄!', canvas.width / 2, canvas.height / 2 + 70);
      }
    }
  }
  
  /**
   * 私有方法：重置遊戲
   * @private
   */
  _resetGame() {
    this._initCards();
    this.gameState.timer = 0;
    this.gameState.moves = 0;
    this.gameState.matchedPairs = 0;
    this.gameState.revealedCards = [];
    this.gameState.canClick = true;
    this.gameState.firstCard = null;
    this.gameState.secondCard = null;
  }
  
  /**
   * 私有方法：加深顏色
   * @private
   * @param {string} color - 十六進制顏色
   * @param {number} percent - 加深百分比
   * @returns {string} 加深後的顏色
   */
  _darkenColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    
    return `#${(
      0x1000000 +
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1)}`;
  }
  
  /**
   * 私有方法：洗牌陣列
   * @private
   * @param {Array} array - 要洗牌的陣列
   */
  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
