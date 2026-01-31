/**
 * 驗證工具函數
 * 提供統一的輸入驗證和資料檢查
 */

import { GameError, ErrorTypes } from '../core/GameError.js';

/**
 * 驗證器集合
 */
export const Validators = {
  /**
   * 檢查是否為有效數字
   * @param {any} value - 要檢查的值
   * @param {number} min - 最小值（包含）
   * @param {number} max - 最大值（包含）
   * @returns {boolean} 是否為有效數字
   */
  isNumber(value, min = -Infinity, max = Infinity) {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  },
  
  /**
   * 檢查是否為有效字串
   * @param {any} value - 要檢查的值
   * @param {number} minLength - 最小長度（包含）
   * @param {number} maxLength - 最大長度（包含）
   * @returns {boolean} 是否為有效字串
   */
  isString(value, minLength = 0, maxLength = Infinity) {
    return typeof value === 'string' && 
           value.length >= minLength && 
           value.length <= maxLength;
  },
  
  /**
   * 檢查是否為有效陣列
   * @param {any} value - 要檢查的值
   * @param {number} minLength - 最小長度（包含）
   * @param {Function} itemValidator - 項目驗證函數（可選）
   * @returns {boolean} 是否為有效陣列
   */
  isArray(value, minLength = 0, itemValidator = null) {
    if (!Array.isArray(value) || value.length < minLength) {
      return false;
    }
    
    if (itemValidator && typeof itemValidator === 'function') {
      return value.every(item => itemValidator(item));
    }
    
    return true;
  },
  
  /**
   * 檢查是否為有效物件
   * @param {any} value - 要檢查的值
   * @param {Array<string>} requiredKeys - 必需的鍵名陣列（可選）
   * @returns {boolean} 是否為有效物件
   */
  isObject(value, requiredKeys = []) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    
    if (requiredKeys.length > 0) {
      return requiredKeys.every(key => key in value);
    }
    
    return true;
  },
  
  /**
   * 檢查是否為有效布林值
   * @param {any} value - 要檢查的值
   * @returns {boolean} 是否為有效布林值
   */
  isBoolean(value) {
    return typeof value === 'boolean';
  },
  
  /**
   * 檢查是否為有效函數
   * @param {any} value - 要檢查的值
   * @returns {boolean} 是否為有效函數
   */
  isFunction(value) {
    return typeof value === 'function';
  },
  
  /**
   * 檢查是否為有效HTML元素
   * @param {any} value - 要檢查的值
   * @returns {boolean} 是否為有效HTML元素
   */
  isHTMLElement(value) {
    return value instanceof HTMLElement;
  },
  
  /**
   * 檢查是否為有效CSS選擇器
   * @param {any} value - 要檢查的值
   * @returns {boolean} 是否為有效CSS選擇器
   */
  isCSSSelector(value) {
    if (!this.isString(value, 1)) return false;
    
    try {
      document.querySelector(value);
      return true;
    } catch {
      return false;
    }
  },
  
  /**
   * 檢查是否為有效顏色值
   * @param {any} value - 要檢查的值
   * @returns {boolean} 是否為有效顏色值
   */
  isColor(value) {
    if (!this.isString(value, 1)) return false;
    
    // 檢查常見顏色格式
    const colorRegex = /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\))$/i;
    return colorRegex.test(value.trim());
  },
  
  /**
   * 檢查是否為有效URL
   * @param {any} value - 要檢查的值
   * @returns {boolean} 是否為有效URL
   */
  isURL(value) {
    if (!this.isString(value, 1)) return false;
    
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  
  /**
   * 檢查是否為有效電子郵件
   * @param {any} value - 要檢查的值
   * @returns {boolean} 是否為有效電子郵件
   */
  isEmail(value) {
    if (!this.isString(value, 1)) return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  },
  
  /**
   * 檢查值是否在指定範圍內
   * @param {any} value - 要檢查的值
   * @param {Array<any>} allowedValues - 允許的值陣列
   * @returns {boolean} 值是否在允許範圍內
   */
  isInRange(value, allowedValues) {
    if (!this.isArray(allowedValues)) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        'allowedValues must be an array'
      );
    }
    
    return allowedValues.includes(value);
  }
};

/**
 * 驗證輔助函數
 */
export const ValidationHelpers = {
  /**
   * 驗證並轉換數字
   * @param {any} value - 要驗證的值
   * @param {Object} options - 驗證選項
   * @returns {number} 驗證後的數字
   * @throws {GameError} 驗證失敗時拋出錯誤
   */
  validateNumber(value, options = {}) {
    const {
      min = -Infinity,
      max = Infinity,
      defaultValue = null,
      fieldName = 'value'
    } = options;
    
    if (value === undefined || value === null) {
      if (defaultValue !== null) {
        return defaultValue;
      }
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} is required`
      );
    }
    
    const num = Number(value);
    
    if (!Validators.isNumber(num, min, max)) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} must be a number between ${min} and ${max}, got ${value}`
      );
    }
    
    return num;
  },
  
  /**
   * 驗證並清理字串
   * @param {any} value - 要驗證的值
   * @param {Object} options - 驗證選項
   * @returns {string} 驗證後的字串
   * @throws {GameError} 驗證失敗時拋出錯誤
   */
  validateString(value, options = {}) {
    const {
      minLength = 0,
      maxLength = Infinity,
      trim = true,
      allowEmpty = false,
      pattern = null,
      defaultValue = null,
      fieldName = 'value'
    } = options;
    
    if (value === undefined || value === null) {
      if (defaultValue !== null) {
        return defaultValue;
      }
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} is required`
      );
    }
    
    let str = String(value);
    if (trim) {
      str = str.trim();
    }
    
    if (!allowEmpty && str.length === 0) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} cannot be empty`
      );
    }
    
    if (!Validators.isString(str, minLength, maxLength)) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} must be between ${minLength} and ${maxLength} characters, got ${str.length}`
      );
    }
    
    if (pattern && !pattern.test(str)) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} does not match required pattern`
      );
    }
    
    return str;
  },
  
  /**
   * 驗證陣列
   * @param {any} value - 要驗證的值
   * @param {Object} options - 驗證選項
   * @returns {Array} 驗證後的陣列
   * @throws {GameError} 驗證失敗時拋出錯誤
   */
  validateArray(value, options = {}) {
    const {
      minLength = 0,
      itemValidator = null,
      defaultValue = null,
      fieldName = 'value'
    } = options;
    
    if (value === undefined || value === null) {
      if (defaultValue !== null) {
        return defaultValue;
      }
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} is required`
      );
    }
    
    if (!Validators.isArray(value, minLength, itemValidator)) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} must be an array with at least ${minLength} items`
      );
    }
    
    return Array.isArray(value) ? value : [value];
  },
  
  /**
   * 驗證物件
   * @param {any} value - 要驗證的值
   * @param {Object} options - 驗證選項
   * @returns {Object} 驗證後的物件
   * @throws {GameError} 驗證失敗時拋出錯誤
   */
  validateObject(value, options = {}) {
    const {
      requiredKeys = [],
      defaultValue = null,
      fieldName = 'value'
    } = options;
    
    if (value === undefined || value === null) {
      if (defaultValue !== null) {
        return defaultValue;
      }
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} is required`
      );
    }
    
    if (!Validators.isObject(value, requiredKeys)) {
      throw new GameError(
        ErrorTypes.INPUT_VALIDATION,
        `${fieldName} must be an object with required keys: ${requiredKeys.join(', ')}`
      );
    }
    
    return value;
  },
  
  /**
   * 驗證遊戲配置
   * @param {Object} config - 遊戲配置物件
   * @returns {Object} 驗證後的配置
   * @throws {GameError} 驗證失敗時拋出錯誤
   */
  validateGameConfig(config) {
    const validatedConfig = {};
    
    // 驗證FPS
    validatedConfig.fps = this.validateNumber(config.fps, {
      min: 1,
      max: 120,
      defaultValue: 60,
      fieldName: 'fps'
    });
    
    // 驗證除錯模式
    validatedConfig.debug = Validators.isBoolean(config.debug) 
      ? config.debug 
      : false;
    
    // 驗證畫布尺寸
    if (config.canvas) {
      validatedConfig.canvas = this.validateObject(config.canvas, {
        requiredKeys: ['width', 'height']
      });
      
      validatedConfig.canvas.width = this.validateNumber(
        validatedConfig.canvas.width,
        { min: 100, max: 4096, fieldName: 'canvas.width' }
      );
      
      validatedConfig.canvas.height = this.validateNumber(
        validatedConfig.canvas.height,
        { min: 100, max: 4096, fieldName: 'canvas.height' }
      );
    }
    
    return validatedConfig;
  }
};

/**
 * 遊戲特定驗證器
 */
export const GameValidators = {
  /**
   * 驗證遊戲分數
   * @param {any} score - 遊戲分數
   * @returns {boolean} 是否為有效遊戲分數
   */
  isValidScore(score) {
    return Validators.isNumber(score, 0, 9999999);
  },
  
  /**
   * 驗證遊戲生命值
   * @param {any} lives - 遊戲生命值
   * @returns {boolean} 是否為有效遊戲生命值
   */
  isValidLives(lives) {
    return Validators.isNumber(lives, 0, 99);
  },
  
  /**
   * 驗證遊戲等級
   * @param {any} level - 遊戲等級
   * @returns {boolean} 是否為有效遊戲等級
   */
  isValidLevel(level) {
    return Validators.isNumber(level, 1, 999);
  },
  
  /**
   * 驗證遊戲難度
   * @param {any} difficulty - 遊戲難度
   * @param {Array<string>} allowedDifficulties - 允許的難度陣列
   * @returns {boolean} 是否為有效遊戲難度
   */
  isValidDifficulty(difficulty, allowedDifficulties = ['easy', 'medium', 'hard']) {
    return Validators.isString(difficulty) && 
           Validators.isInRange(difficulty, allowedDifficulties);
  },
  
  /**
   * 驗證遊戲時間（毫秒）
   * @param {any} time - 遊戲時間
   * @returns {boolean} 是否為有效遊戲時間
   */
  isValidGameTime(time) {
    return Validators.isNumber(time, 0, 3600000); // 最多1小時
  }
};

// 預設導出
export default {
  Validators,
  ValidationHelpers,
  GameValidators
};