/**
 * Snake Game
 * Extends GameEngine for Snake game mechanics
 */
import { GameEngine } from '../core/GameEngine.js';

const Direction = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
};

export class Snake extends GameEngine {
  constructor(config = {}) {
    const defaultConfig = {
      id: 'snake',
      name: '貪食蛇',
      fps: 10,
      maxFps: 60,
      initialLives: 1,
      maxLives: 1,
      canvas: {
        width: 400,
        height: 400,
        background: '#000000'
      },
      features: {
        sound: true,
        grid: true,
        obstacles: false,
        speedIncrease: true
      }
    };

    super({ ...defaultConfig, ...config });

    // Game state
    this.gameState = {
      score: 0,
      highScore: localStorage.getItem('snakeHighScore') || 0,
      level: 1,
      speed: 10,
      gameOver: false
    };

    // Grid configuration
    this.gridSize = 20;
    this.gridWidth = Math.floor(this.canvas.width / this.gridSize);
    this.gridHeight = Math.floor(this.canvas.height / this.gridSize);

    // Snake
    this.snake = {
      body: [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
      ],
      direction: Direction.RIGHT,
      nextDirection: Direction.RIGHT,
      color: '#00ff00',
      headColor: '#00cc00'
    };

    // Food
    this.food = {
      x: 15,
      y: 10,
      color: '#ff0000',
      radius: this.gridSize / 2 - 2
    };

    // Obstacles (for higher levels)
    this.obstacles = [];
  }

  async loadAssets() {
    // Load game assets
    this.assets = {
      sounds: {
        eat: null,
        gameOver: null
      },
      images: {
        snakeHead: null,
        snakeBody: null,
        food: null
      }
    };

    console.log('Snake assets loaded');
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Button events
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (startBtn) startBtn.addEventListener('click', () => this.startGame());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetGame());
  }

  update(deltaTime) {
    if (!this.state.running || this.state.paused || this.gameState.gameOver) {
      return;
    }

    // Update direction
    this.snake.direction = this.snake.nextDirection;

    // Move snake
    this.moveSnake();

    // Check collisions
    this.checkCollisions();

    // Check food collision
    this.checkFoodCollision();

    // Update speed based on score
    this.updateSpeed();
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    // Draw obstacles
    this.drawObstacles();

    // Draw food
    this.drawFood();

    // Draw snake
    this.drawSnake();

    // Draw UI
    this.renderUI();
  }

  cleanup() {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  // Game-specific methods
  moveSnake() {
    // Create new head based on direction
    const head = { ...this.snake.body[0] };

    switch (this.snake.direction) {
      case Direction.UP:
        head.y -= 1;
        break;
      case Direction.DOWN:
        head.y += 1;
        break;
      case Direction.LEFT:
        head.x -= 1;
        break;
      case Direction.RIGHT:
        head.x += 1;
        break;
    }

    // Add new head to beginning of body
    this.snake.body.unshift(head);

    // Remove tail (unless food was eaten)
    // This is handled in checkFoodCollision
  }

  checkCollisions() {
    const head = this.snake.body[0];

    // Wall collision
    if (head.x < 0 || head.x >= this.gridWidth || 
        head.y < 0 || head.y >= this.gridHeight) {
      this.gameOver();
      return;
    }

    // Self collision
    for (let i = 1; i < this.snake.body.length; i++) {
      if (head.x === this.snake.body[i].x && head.y === this.snake.body[i].y) {
        this.gameOver();
        return;
      }
    }

    // Obstacle collision
    for (const obstacle of this.obstacles) {
      if (head.x === obstacle.x && head.y === obstacle.y) {
        this.gameOver();
        return;
      }
    }
  }

  checkFoodCollision() {
    const head = this.snake.body[0];

    if (head.x === this.food.x && head.y === this.food.y) {
      // Increase score
      this.gameState.score += 10 * this.gameState.level;
      
      // Generate new food
      this.generateFood();
      
      // Update UI
      this.updateUI();
      
      // Don't remove tail when food is eaten (snake grows)
    } else {
      // Remove tail if no food was eaten
      this.snake.body.pop();
    }
  }

  generateFood() {
    let newFood;
    let validPosition = false;
    
    while (!validPosition) {
      newFood = {
        x: Math.floor(Math.random() * this.gridWidth),
        y: Math.floor(Math.random() * this.gridHeight)
      };
      
      // Check if food is on snake
      validPosition = true;
      for (const segment of this.snake.body) {
        if (segment.x === newFood.x && segment.y === newFood.y) {
          validPosition = false;
          break;
        }
      }
      
      // Check if food is on obstacle
      if (validPosition) {
        for (const obstacle of this.obstacles) {
          if (obstacle.x === newFood.x && obstacle.y === newFood.y) {
            validPosition = false;
            break;
          }
        }
      }
    }
    
    this.food.x = newFood.x;
    this.food.y = newFood.y;
  }

  generateObstacles() {
    this.obstacles = [];
    
    // Add obstacles based on level
    const obstacleCount = Math.min(this.gameState.level * 2, 10);
    
    for (let i = 0; i < obstacleCount; i++) {
      let obstacle;
      let validPosition = false;
      
      while (!validPosition) {
        obstacle = {
          x: Math.floor(Math.random() * this.gridWidth),
          y: Math.floor(Math.random() * this.gridHeight),
          color: '#666666'
        };
        
        // Check if obstacle is on snake
        validPosition = true;
        for (const segment of this.snake.body) {
          if (segment.x === obstacle.x && segment.y === obstacle.y) {
            validPosition = false;
            break;
          }
        }
        
        // Check if obstacle is on food
        if (validPosition && obstacle.x === this.food.x && obstacle.y === this.food.y) {
          validPosition = false;
        }
        
        // Check if obstacle is on another obstacle
        if (validPosition) {
          for (const existingObstacle of this.obstacles) {
            if (existingObstacle.x === obstacle.x && existingObstacle.y === obstacle.y) {
              validPosition = false;
              break;
            }
          }
        }
      }
      
      this.obstacles.push(obstacle);
    }
  }

  updateSpeed() {
    // Increase speed every 100 points
    const newSpeed = 10 + Math.floor(this.gameState.score / 100);
    if (newSpeed !== this.gameState.speed) {
      this.gameState.speed = Math.min(newSpeed, 20);
      this.config.fps = this.gameState.speed;
    }
    
    // Increase level every 200 points
    const newLevel = 1 + Math.floor(this.gameState.score / 200);
    if (newLevel !== this.gameState.level) {
      this.gameState.level = newLevel;
      this.generateObstacles();
      this.updateUI();
    }
  }

  drawGrid() {
    if (!this.config.features.grid) return;
    
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 0.5;
    
    // Draw vertical lines
    for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawObstacles() {
    for (const obstacle of this.obstacles) {
      this.ctx.fillStyle = obstacle.color;
      this.ctx.fillRect(
        obstacle.x * this.gridSize,
        obstacle.y * this.gridSize,
        this.gridSize,
        this.gridSize
      );
    }
  }

  drawFood() {
    const centerX = this.food.x * this.gridSize + this.gridSize / 2;
    const centerY = this.food.y * this.gridSize + this.gridSize / 2;
    
    this.ctx.fillStyle = this.food.color;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, this.food.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add shine effect
    this.ctx.fillStyle = '#ff6666';
    this.ctx.beginPath();
    this.ctx.arc(centerX - 2, centerY - 2, this.food.radius / 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawSnake() {
    // Draw body
    for (let i = 0; i < this.snake.body.length; i++) {
      const segment = this.snake.body[i];
      const x = segment.x * this.gridSize;
      const y = segment.y * this.gridSize;
      
      // Use head color for head, body color for rest
      const color = i === 0 ? this.snake.headColor : this.snake.color;
      this.ctx.fillStyle = color;
      
      // Draw rounded rectangle for snake segments
      this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
      
      // Add 3D effect
      this.ctx.fillStyle = i === 0 ? '#00ff00' : '#009900';
      this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, 2);
      this.ctx.fillRect(x + 1, y + 1, 2, this.gridSize - 2);
    }
    
    // Draw eyes on head
    const head = this.snake.body[0];
    const headX = head.x * this.gridSize + this.gridSize / 2;
    const headY = head.y * this.gridSize + this.gridSize / 2;
    
    this.ctx.fillStyle = '#ffffff';
    
    // Position eyes based on direction
    let eye1X, eye1Y, eye2X, eye2Y;
    
    switch (this.snake.direction) {
      case Direction.RIGHT:
        eye1X = headX + 3;
        eye1Y = headY - 3;
        eye2X = headX + 3;
        eye2Y = headY + 3;
        break;
      case Direction.LEFT:
        eye1X = headX - 3;
        eye1Y = headY - 3;
        eye2X = headX - 3;
        eye2Y = headY + 3;
        break;
      case Direction.UP:
        eye1X = headX - 3;
        eye1Y = headY - 3;
        eye2X = headX + 3;
        eye2Y = headY - 3;
        break;
      case Direction.DOWN:
        eye1X = headX - 3;
        eye1Y = headY + 3;
        eye2X = headX + 3;
        eye2Y = headY + 3;
        break;
    }
    
    this.ctx.beginPath();
    this.ctx.arc(eye1X, eye1Y, 2, 0, Math.PI * 2);
    this.ctx.arc(eye2X, eye2Y, 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw pupils
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(eye1X, eye1Y, 1, 0, Math.PI * 2);
    this.ctx.arc(eye2X, eye2Y, 1, 0, Math.PI * 2);
    this.ctx.fill();
  }

  handleKeyDown(e) {
    if (this.gameState.gameOver) return;
    
    switch(e.key) {
      case 'ArrowUp':
        if (this.snake.direction !== Direction.DOWN) {
          this.snake.nextDirection = Direction.UP;
        }
        break;
      case 'ArrowDown':
        if (this.snake.direction !== Direction.UP) {
          this.snake.nextDirection = Direction.DOWN;
        }
        break;
      case 'ArrowLeft':
        if (this.snake.direction !== Direction.RIGHT) {
          this.snake.nextDirection = Direction.LEFT;
        }
        break;
      case 'ArrowRight':
        if (this.snake.direction !== Direction.LEFT) {
          this.snake.nextDirection = Direction.RIGHT;
        }
        break;
      case ' ':
        this.togglePause();
        break;
    }
  }

  gameOver() {
    this.gameState.gameOver = true;
    
    // Save high score
    if (this.gameState.score > this.gameState.highScore) {
      this.gameState.highScore = this.gameState.score;
      localStorage.setItem('snakeHighScore', this.gameState.highScore);
    }
    
    // Show game over screen
    const gameOverScreen = document.getElementById('gameOver');
    const finalScoreElement = document.getElementById('finalScore');
    const finalLevelElement = document.getElementById('finalLevel');
    const highScoreElement = document.getElementById('highScore');
    
    if (gameOverScreen) gameOverScreen.style.display = 'block';
    if (finalScoreElement) finalScoreElement.textContent = this.gameState.score;
    if (finalLevelElement) finalLevelElement.textContent = this.gameState.level;
    if (highScoreElement) highScoreElement.textContent = this.gameState.highScore;
  }

  startGame() {
    if (this.state.running) return;
    
    this.state.running = true;
    this.state.paused = false;
    this.gameState.gameOver = false;
    
    // Reset game state
    this.gameState.score = 0;
    this.gameState.level = 1;
    this.gameState.speed = 10;
    
    // Reset snake
    this.snake.body = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.snake.direction = Direction.RIGHT;
    this.snake.nextDirection = Direction.RIGHT;
    
    // Generate food
    this.generateFood();
    
    // Generate obstacles
    this.generateObstacles();
    
    // Update UI
    this.updateUI();
    
    // Hide game over screen
    const gameOverScreen = document.getElementById('gameOver');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
  }

  togglePause() {
    if (!this.state.running || this.gameState.gameOver) return;
    
    this.state.paused = !this.state.paused;
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (pauseBtn) {
      if (this.state.paused) {
        pauseBtn.textContent = '繼續';
        pauseBtn.classList.add('active');
      } else {
        pauseBtn.textContent = '暫停';
        pauseBtn.classList.remove('active');
      }
    }
  }

  resetGame() {
    this.stop();
    this.startGame();
  }

  updateUI() {
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const speedElement = document.getElementById('speed');
    const lengthElement = document.getElementById('length');
    
    if (scoreElement) scoreElement.textContent = this.gameState.score;
    if (levelElement) levelElement.textContent = this.gameState.level;
    if (speedElement) speedElement.textContent = this.gameState.speed;
    if (lengthElement) lengthElement.textContent = this.snake.body.length;
  }

  renderUI() {
    // Additional UI rendering if needed
  }

  // GameEngine lifecycle methods
  async start() {
    await super.start();
    this.startGame();
  }

  stop() {
    super.stop();
    this.state.running = false;
    this.state.paused = false;
  }

  restart() {
    this.stop();
    this.start();
  }
}