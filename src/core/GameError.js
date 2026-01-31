/**
 * 遊戲錯誤類型定義
 */
export const ErrorTypes = {
  // 遊戲初始化錯誤
  GAME_INIT: 'GAME_INIT_ERROR',
  
  // 資源載入錯誤
  ASSET_LOAD: 'ASSET_LOAD_ERROR',
  
  // 輸入驗證錯誤
  INPUT_VALIDATION: 'INPUT_VALIDATION_ERROR',
  
  // 運行時錯誤
  RUNTIME: 'RUNTIME_ERROR',
  
  // 網路錯誤
  NETWORK: 'NETWORK_ERROR',
  
  // 儲存錯誤
  STORAGE: 'STORAGE_ERROR'
};

/**
 * 自定義遊戲錯誤類
 * 提供統一的錯誤處理機制
 */
export class GameError extends Error {
  /**
   * 創建遊戲錯誤實例
   * @param {string} type - 錯誤類型，來自ErrorTypes
   * @param {string} message - 錯誤訊息
   * @param {Error|null} originalError - 原始錯誤物件（可選）
   */
  constructor(type, message, originalError = null) {
    super(message);
    
    // 確保錯誤類型有效
    if (!Object.values(ErrorTypes).includes(type)) {
      console.warn(`Invalid error type: ${type}. Using RUNTIME_ERROR instead.`);
      type = ErrorTypes.RUNTIME;
    }
    
    this.name = 'GameError';
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    
    // 保持正確的堆疊追蹤
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GameError);
    }
  }
  
  /**
   * 記錄錯誤到控制台
   */
  log() {
    const errorDetails = {
      name: this.name,
      type: this.type,
      message: this.message,
      timestamp: this.timestamp,
      stack: this.stack
    };
    
    if (this.originalError) {
      errorDetails.originalError = {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      };
    }
    
    console.error(`[${this.type}] ${this.message}`, errorDetails);
  }
  
  /**
   * 將錯誤轉換為可序列化的物件
   * @returns {Object} 序列化的錯誤物件
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      timestamp: this.timestamp,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message
      } : null
    };
  }
  
  /**
   * 創建友好的錯誤訊息用於顯示給使用者
   * @returns {string} 友好的錯誤訊息
   */
  getFriendlyMessage() {
    const messages = {
      [ErrorTypes.GAME_INIT]: '遊戲初始化失敗，請刷新頁面重試',
      [ErrorTypes.ASSET_LOAD]: '遊戲資源載入失敗，請檢查網路連接',
      [ErrorTypes.INPUT_VALIDATION]: '輸入資料無效，請重新操作',
      [ErrorTypes.RUNTIME]: '遊戲運行時發生錯誤',
      [ErrorTypes.NETWORK]: '網路連接失敗，請檢查網路設置',
      [ErrorTypes.STORAGE]: '遊戲資料儲存失敗'
    };
    
    return messages[this.type] || '發生未知錯誤，請聯繫開發人員';
  }
}

/**
 * 錯誤處理工具函數
 */
export const ErrorHandler = {
  /**
   * 安全執行函數，捕獲並處理錯誤
   * @param {Function} fn - 要執行的函數
   * @param {Object} context - 執行上下文
   * @param {...any} args - 函數參數
   * @returns {any} 函數執行結果
   */
  safeExecute(fn, context = null, ...args) {
    try {
      return fn.apply(context, args);
    } catch (error) {
      const gameError = error instanceof GameError 
        ? error 
        : new GameError(ErrorTypes.RUNTIME, '執行函數時發生錯誤', error);
      
      gameError.log();
      return null;
    }
  },
  
  /**
   * 非同步安全執行函數
   * @param {Function} fn - 要執行的非同步函數
   * @param {Object} context - 執行上下文
   * @param {...any} args - 函數參數
   * @returns {Promise<any>} 函數執行結果的Promise
   */
  async safeExecuteAsync(fn, context = null, ...args) {
    try {
      return await fn.apply(context, args);
    } catch (error) {
      const gameError = error instanceof GameError 
        ? error 
        : new GameError(ErrorTypes.RUNTIME, '執行非同步函數時發生錯誤', error);
      
      gameError.log();
      throw gameError;
    }
  },
  
  /**
   * 顯示錯誤訊息給使用者
   * @param {GameError|Error|string} error - 錯誤物件或訊息
   * @param {HTMLElement} container - 顯示錯誤的容器（可選）
   */
  showError(error, container = document.body) {
    let errorMessage;
    
    if (error instanceof GameError) {
      errorMessage = error.getFriendlyMessage();
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }
    
    // 創建錯誤訊息元素
    const errorElement = document.createElement('div');
    errorElement.className = 'game-error-message';
    errorElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;
    
    errorElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.2rem;">⚠️</span>
        <div>
          <strong style="display: block; margin-bottom: 5px;">錯誤</strong>
          <div style="font-size: 0.9rem;">${errorMessage}</div>
        </div>
      </div>
    `;
    
    // 添加到容器
    container.appendChild(errorElement);
    
    // 3秒後自動移除
    setTimeout(() => {
      errorElement.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (errorElement.parentNode) {
          errorElement.parentNode.removeChild(errorElement);
        }
      }, 300);
    }, 3000);
    
    // 添加動畫樣式
    if (!document.querySelector('#error-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'error-animation-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
};

// 預設導出
export default {
  ErrorTypes,
  GameError,
  ErrorHandler
};