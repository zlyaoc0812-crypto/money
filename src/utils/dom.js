/**
 * DOM操作工具函數
 * 提供統一的DOM操作和元素創建功能
 */

import { GameError, ErrorTypes } from '../core/GameError.js';
import { Validators } from './validation.js';

/**
 * DOM工具函數
 */
export const DOM = {
  /**
   * 安全獲取元素
   * @param {string|HTMLElement} selector - CSS選擇器或元素
   * @param {HTMLElement} parent - 父元素（可選）
   * @returns {HTMLElement|null} 找到的元素或null
   */
  getElement(selector, parent = document) {
    try {
      if (selector instanceof HTMLElement) {
        return selector;
      }
      
      if (!Validators.isString(selector, 1)) {
        throw new GameError(
          ErrorTypes.INPUT_VALIDATION,
          'Selector must be a non-empty string or HTMLElement'
        );
      }
      
      const element = parent.querySelector(selector);
      
      if (!element) {
        console.warn(`Element not found: ${selector}`);
        return null;
      }
      
      return element;
    } catch (error) {
      console.error('Error getting element:', error);
      return null;
    }
  },
  
  /**
   * 安全獲取多個元素
   * @param {string} selector - CSS選擇器
   * @param {HTMLElement} parent - 父元素（可選）
   * @returns {NodeList} 找到的元素列表
   */
  getElements(selector, parent = document) {
    try {
      if (!Validators.isString(selector, 1)) {
        throw new GameError(
          ErrorTypes.INPUT_VALIDATION,
          'Selector must be a non-empty string'
        );
      }
      
      return parent.querySelectorAll(selector);
    } catch (error) {
      console.error('Error getting elements:', error);
      return document.querySelectorAll(':not(*)'); // 空NodeList
    }
  },
  
  /**
   * 創建元素
   * @param {string} tag - 標籤名
   * @param {Object} options - 元素選項
   * @returns {HTMLElement} 創建的元素
   */
  createElement(tag = 'div', options = {}) {
    try {
      if (!Validators.isString(tag, 1)) {
        throw new GameError(
          ErrorTypes.INPUT_VALIDATION,
          'Tag must be a non-empty string'
        );
      }
      
      const element = document.createElement(tag);
      
      // 設置屬性
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          element.setAttribute(key, value);
        });
      }
      
      // 設置類名
      if (options.className) {
        const classNames = Array.isArray(options.className) 
          ? options.className 
          : [options.className];
        
        classNames.forEach(className => {
          if (Validators.isString(className, 1)) {
            element.classList.add(className);
          }
        });
      }
      
      // 設置ID
      if (options.id && Validators.isString(options.id, 1)) {
        element.id = options.id;
      }
      
      // 設置文字內容
      if (options.text !== undefined) {
        element.textContent = String(options.text);
      }
      
      // 設置HTML內容
      if (options.html !== undefined) {
        element.innerHTML = options.html;
      }
      
      // 設置樣式
      if (options.style) {
        Object.assign(element.style, options.style);
      }
      
      // 設置資料屬性
      if (options.dataset) {
        Object.entries(options.dataset).forEach(([key, value]) => {
          element.dataset[key] = value;
        });
      }
      
      // 設置事件監聽器
      if (options.events) {
        Object.entries(options.events).forEach(([event, handler]) => {
          if (typeof handler === 'function') {
            element.addEventListener(event, handler);
          }
        });
      }
      
      return element;
    } catch (error) {
      console.error('Error creating element:', error);
      return document.createElement('div');
    }
  },
  
  /**
   * 添加元素到容器
   * @param {HTMLElement} element - 要添加的元素
   * @param {HTMLElement|string} container - 容器元素或選擇器
   * @param {string} position - 添加位置（'append', 'prepend', 'before', 'after'）
   * @returns {boolean} 是否添加成功
   */
  addToContainer(element, container, position = 'append') {
    try {
      if (!(element instanceof HTMLElement)) {
        throw new GameError(
          ErrorTypes.INPUT_VALIDATION,
          'Element must be an HTMLElement'
        );
      }
      
      const containerElement = container instanceof HTMLElement 
        ? container 
        : this.getElement(container);
      
      if (!containerElement) {
        console.warn('Container not found');
        return false;
      }
      
      switch (position.toLowerCase()) {
        case 'append':
          containerElement.appendChild(element);
          break;
        case 'prepend':
          containerElement.insertBefore(element, containerElement.firstChild);
          break;
        case 'before':
          if (containerElement.parentNode) {
            containerElement.parentNode.insertBefore(element, containerElement);
          }
          break;
        case 'after':
          if (containerElement.parentNode) {
            containerElement.parentNode.insertBefore(
              element, 
              containerElement.nextSibling
            );
          }
          break;
        default:
          containerElement.appendChild(element);
      }
      
      return true;
    } catch (error) {
      console.error('Error adding element to container:', error);
      return false;
    }
  },
  
  /**
   * 移除元素
   * @param {HTMLElement|string} element - 要移除的元素或選擇器
   * @returns {boolean} 是否移除成功
   */
  removeElement(element) {
    try {
      const elementToRemove = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToRemove || !elementToRemove.parentNode) {
        return false;
      }
      
      elementToRemove.parentNode.removeChild(elementToRemove);
      return true;
    } catch (error) {
      console.error('Error removing element:', error);
      return false;
    }
  },
  
  /**
   * 顯示元素
   * @param {HTMLElement|string} element - 要顯示的元素或選擇器
   * @param {string} display - 顯示模式（'block', 'flex', 'grid'等）
   * @returns {boolean} 是否顯示成功
   */
  showElement(element, display = 'block') {
    try {
      const elementToShow = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToShow) {
        return false;
      }
      
      elementToShow.style.display = display;
      return true;
    } catch (error) {
      console.error('Error showing element:', error);
      return false;
    }
  },
  
  /**
   * 隱藏元素
   * @param {HTMLElement|string} element - 要隱藏的元素或選擇器
   * @returns {boolean} 是否隱藏成功
   */
  hideElement(element) {
    try {
      const elementToHide = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToHide) {
        return false;
      }
      
      elementToHide.style.display = 'none';
      return true;
    } catch (error) {
      console.error('Error hiding element:', error);
      return false;
    }
  },
  
  /**
   * 切換元素可見性
   * @param {HTMLElement|string} element - 要切換的元素或選擇器
   * @param {string} display - 顯示時的顯示模式
   * @returns {boolean} 元素當前是否可見
   */
  toggleElement(element, display = 'block') {
    try {
      const elementToToggle = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToToggle) {
        return false;
      }
      
      const isVisible = elementToToggle.style.display !== 'none';
      
      if (isVisible) {
        elementToToggle.style.display = 'none';
      } else {
        elementToToggle.style.display = display;
      }
      
      return !isVisible;
    } catch (error) {
      console.error('Error toggling element:', error);
      return false;
    }
  },
  
  /**
   * 設置元素文字
   * @param {HTMLElement|string} element - 要設置的元素或選擇器
   * @param {string} text - 要設置的文字
   * @returns {boolean} 是否設置成功
   */
  setText(element, text) {
    try {
      const elementToSet = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToSet) {
        return false;
      }
      
      elementToSet.textContent = String(text);
      return true;
    } catch (error) {
      console.error('Error setting text:', error);
      return false;
    }
  },
  
  /**
   * 設置元素HTML
   * @param {HTMLElement|string} element - 要設置的元素或選擇器
   * @param {string} html - 要設置的HTML
   * @returns {boolean} 是否設置成功
   */
  setHTML(element, html) {
    try {
      const elementToSet = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToSet) {
        return false;
      }
      
      elementToSet.innerHTML = html;
      return true;
    } catch (error) {
      console.error('Error setting HTML:', error);
      return false;
    }
  },
  
  /**
   * 添加類名
   * @param {HTMLElement|string} element - 要添加類名的元素或選擇器
   * @param {string|string[]} className - 要添加的類名
   * @returns {boolean} 是否添加成功
   */
  addClass(element, className) {
    try {
      const elementToModify = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToModify) {
        return false;
      }
      
      const classNames = Array.isArray(className) ? className : [className];
      
      classNames.forEach(name => {
        if (Validators.isString(name, 1)) {
          elementToModify.classList.add(name);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error adding class:', error);
      return false;
    }
  },
  
  /**
   * 移除類名
   * @param {HTMLElement|string} element - 要移除類名的元素或選擇器
   * @param {string|string[]} className - 要移除的類名
   * @returns {boolean} 是否移除成功
   */
  removeClass(element, className) {
    try {
      const elementToModify = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToModify) {
        return false;
      }
      
      const classNames = Array.isArray(className) ? className : [className];
      
      classNames.forEach(name => {
        if (Validators.isString(name, 1)) {
          elementToModify.classList.remove(name);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error removing class:', error);
      return false;
    }
  },
  
  /**
   * 切換類名
   * @param {HTMLElement|string} element - 要切換類名的元素或選擇器
   * @param {string} className - 要切換的類名
   * @returns {boolean} 類名是否存在
   */
  toggleClass(element, className) {
    try {
      const elementToModify = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToModify || !Validators.isString(className, 1)) {
        return false;
      }
      
      return elementToModify.classList.toggle(className);
    } catch (error) {
      console.error('Error toggling class:', error);
      return false;
    }
  },
  
  /**
   * 檢查是否包含類名
   * @param {HTMLElement|string} element - 要檢查的元素或選擇器
   * @param {string} className - 要檢查的類名
   * @returns {boolean} 是否包含類名
   */
  hasClass(element, className) {
    try {
      const elementToCheck = element instanceof HTMLElement 
        ? element 
        : this.getElement(element);
      
      if (!elementToCheck || !Validators.isString(className, 1)) {
        return false;
      }
      
      return elementToCheck.classList.contains(className);
    } catch (error) {
      console.error('Error checking class:', error);
      return false;
    }
  },
  
  /**
   * 創建遊戲按鈕
   * @param {Object} options - 按鈕選項
   * @returns {HTMLButtonElement} 創建的按鈕
   */
  createGameButton(options = {}) {
    const buttonOptions = {
      tag: 'button',
      className: ['game-button', options.type ? `game-button-${options.type}` : ''],
      attributes: {
        type: 'button'
      },
      text: options.text || 'Button',
      style: {
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: '#3b82f6',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        ...options.style
      },
      events: {
        click: options.onClick || (() => {}),
        mouseenter: (e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        },
        mouseleave: (e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        },
        ...options.events
      }
    };
    
    const button = this.createElement('button', buttonOptions);
    
    // 添加禁用狀態
    if (options.disabled) {
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    }
    
    return button;
  },
  
  /**
   * 創建遊戲容器
   * @param {Object} options - 容器選項
   * @returns {HTMLElement} 創建的容器
   */
  createGameContainer(options = {}) {
    const containerOptions = {
      className: ['game-container', options.className || ''],
      style: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        ...options.style
      }
    };
    
    return this.createElement('div', containerOptions);
  },
  
  /**
   * 創建遊戲標題
   * @param {Object} options - 標題選項
   * @returns {HTMLHeadingElement} 創建的標題
   */
  createGameTitle(options = {}) {
    const titleOptions = {
      tag: 'h1',
      className: ['game-title', options.className || ''],
      text: options.text || 'Game Title',
      style: {
        fontSize: '2.5rem',
        color: '#f8fafc',
        textAlign: 'center',
        marginBottom: '20px',
        textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
        ...options.style
      }
    };
    
    return this.createElement('h1', titleOptions);
  },
  
  /**
   * 創建遊戲分數顯示
   * @param {Object} options - 分數顯示選項
   * @returns {HTMLElement} 創建的分數顯示
   */
  createScoreDisplay(options = {}) {
    const scoreOptions = {
      className: ['score-display', options.className || ''],
      html: `
        <div class="score-label">${options.label || '分數'}</div>
        <div class="score-value" id="${options.id || 'score'}">0</div>
      `,
      style: {
        display: 'inline-block',
        padding: '10px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '10px',
        textAlign: 'center',
        minWidth: '100px',
        ...options.style
      }
    };
    
    const scoreElement = this.createElement('div', scoreOptions);
    
    // 添加樣式到子元素
    const style = document.createElement('style');
    style.textContent = `
      .score-display .score-label {
        font-size: 0.9rem;
        color: #94a3b8;
        margin-bottom: 5px;
      }
      
      .score-display .score-value {
        font-size: 1.8rem;
        font-weight: bold;
        color: #ffd700;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
      }
    `;
    
    // 將樣式添加到文檔頭部
    if (!document.querySelector('#score-display-styles')) {
      style.id = 'score-display-styles';
      document.head.appendChild(style);
    }
    
    return scoreElement;
  }
};
