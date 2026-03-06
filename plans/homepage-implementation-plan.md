# 遊戲館首頁實施計劃

## 項目概述
為 Chloe's Entertainment World 遊戲集合創建一個統一的主頁面（index.html），作為遊戲入口中心，包含明亮/黑暗模式切換功能，並連結到5個指定的遊戲文件。

## 技術規格

### 文件結構
```
index.html (主頁面)
├── design-system/variables.css (設計系統變量)
├── design-system/base.css (基礎樣式)
├── design-system/components.css (組件樣式)
└── 5個遊戲HTML文件
```

### 設計要求
1. **統一設計**：與現有遊戲文件保持一致的設計語言
2. **明亮/黑暗模式**：支援主題切換，使用CSS變量實現
3. **響應式設計**：適配桌面、平板和手機設備
4. **遊戲卡片網格**：展示5個遊戲的卡片式佈局
5. **導航功能**：清晰的遊戲入口和返回鏈接

### 5個目標遊戲文件
1. `snake.html` - 貪食蛇遊戲
2. `spaceshooter.html` - 太空射擊遊戲
3. `sudoku.html` - 數獨挑戰
4. `tetris.html` - 俄羅斯方塊
5. `whackamole.html` - 打地鼠遊戲

## 頁面結構設計

### HTML結構
```html
<!DOCTYPE html>
<html lang="zh-HK" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>遊戲館 - Chloe's Entertainment World</title>
    <link rel="stylesheet" href="./design-system/variables.css">
    <link rel="stylesheet" href="./design-system/base.css">
    <link rel="stylesheet" href="./design-system/components.css">
    <style>
        /* 首頁特定樣式 */
    </style>
</head>
<body>
    <div class="gs-container">
        <div class="gs-game-area">
            <!-- 主題切換按鈕 -->
            <div class="theme-toggle" id="themeToggle">...</div>
            
            <!-- 主標題區域 -->
            <div class="homepage-header">...</div>
            
            <!-- 遊戲網格 (5個遊戲卡片) -->
            <div class="games-grid">
                <!-- 貪食蛇遊戲卡片 -->
                <div class="game-card snake">...</div>
                
                <!-- 太空射擊遊戲卡片 -->
                <div class="game-card spaceshooter">...</div>
                
                <!-- 數獨挑戰卡片 -->
                <div class="game-card sudoku">...</div>
                
                <!-- 俄羅斯方塊卡片 -->
                <div class="game-card tetris">...</div>
                
                <!-- 打地鼠遊戲卡片 -->
                <div class="game-card whackamole">...</div>
            </div>
            
            <!-- 特色區域 -->
            <div class="featured-section">...</div>
            
            <!-- 頁腳 -->
            <div class="homepage-footer">...</div>
        </div>
    </div>
    
    <script>
        // 主題切換功能
        // 遊戲卡片交互
    </script>
</body>
</html>
```

### 遊戲卡片設計
每個遊戲卡片包含：
- 遊戲圖標（emoji）
- 遊戲標題
- 遊戲描述
- 遊戲特性標籤
- 開始遊戲按鈕（連結到對應HTML文件）
- 主題顏色邊框（不同遊戲使用不同顏色）

### 主題切換功能
- 使用 `data-theme` 屬性切換 "light" 和 "dark" 模式
- 主題狀態保存在 localStorage 中
- 切換按鈕顯示當前主題圖標和文字
- 平滑的過渡動畫

### 響應式設計斷點
1. **桌面 (> 1024px)**：3列網格
2. **平板 (768px - 1024px)**：2列網格
3. **手機 (< 768px)**：1列網格，調整字體大小和間距

## 實施步驟

### 步驟1：創建 index.html 文件
- 建立基本的HTML5結構
- 引入設計系統CSS文件
- 設置中文字體和視口meta標籤

### 步驟2：實現主題切換系統
- 創建主題切換按鈕
- 實現JavaScript主題切換邏輯
- 添加localStorage支持
- 設計明亮和黑暗模式樣式

### 步驟3：創建遊戲卡片組件
- 設計5個遊戲卡片的HTML結構
- 添加遊戲特定樣式（顏色、圖標）
- 實現卡片懸停效果
- 添加遊戲描述和特性標籤

### 步驟4：實現遊戲網格佈局
- 使用CSS Grid創建響應式網格
- 添加卡片間距和對齊
- 實現響應式斷點

### 步驟5：添加額外內容區域
- 創建特色區域展示遊戲特性
- 添加頁腳信息
- 確保視覺層次清晰

### 步驟6：測試和優化
- 測試所有5個遊戲鏈接
- 測試主題切換功能
- 測試響應式設計
- 優化性能和加載速度

## 設計系統整合

### 使用的CSS變量
```css
/* 從 variables.css 繼承 */
--ds-color-primary: #3A7EF4;
--ds-color-secondary: #FF6B6B;
--ds-color-success: #00D4AA;
--ds-color-warning: #FFB74D;
--ds-color-danger: #FF4757;
--ds-color-info: #00D4FF;

/* 從 base.css 繼承 */
.gs-container, .gs-game-area, .btn, .info-box 等組件
```

### 自定義首頁樣式
- 遊戲卡片特定樣式
- 主題切換按鈕樣式
- 首頁標題樣式
- 特色區域樣式

## 功能需求清單

### 核心功能
- [ ] 5個遊戲的導航鏈接
- [ ] 明亮/黑暗模式切換
- [ ] 響應式網格佈局
- [ ] 遊戲卡片懸停效果
- [ ] 主題狀態持久化

### 用戶體驗
- [ ] 清晰的視覺層次
- [ ] 直觀的導航
- [ ] 平滑的過渡動畫
- [ ] 適當的反饋（按鈕狀態）

### 技術要求
- [ ] 與現有設計系統兼容
- [ ] 無JavaScript錯誤
- [ ] 跨瀏覽器兼容
- [ ] 移動設備友好

## 測試計劃

### 功能測試
1. 點擊每個遊戲卡片，確認正確跳轉到對應HTML文件
2. 測試主題切換按鈕，確認明亮/黑暗模式正常切換
3. 刷新頁面，確認主題狀態被記住
4. 測試返回鏈接（從遊戲頁面返回首頁）

### 響應式測試
1. 桌面瀏覽器（> 1024px）
2. 平板設備（768px - 1024px）
3. 手機設備（< 768px）
4. 橫向和縱向模式

### 兼容性測試
1. Chrome / Firefox / Safari / Edge
2. 移動端 Safari / Chrome

## 交付物
1. `index.html` - 完整的主頁面文件
2. 更新後的TODO列表
3. 實施完成確認

## 下一步行動
切換到Code模式開始實施此計劃。