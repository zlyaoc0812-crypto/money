/**
 * Brick Breaker Game
 * Extends GameEngine for brick breaker mechanics
 */
import { GameEngine } from '../core/GameEngine.js';

const BrickType = {
  NORMAL: 'normal',
  STRONG: 'strong',
  UNBREAKABLE: 'unbreakable',
  POWERUP: 'powerup'
};

const PowerUpType = {
  EXTRA_LIFE: 'extraLife',
  LONG_PADDLE: 'longPaddle',
  FAST_BALL: 'fastBall',
  SLOW_BALL: 'slowBall',
  MULTI_BALL: 'multiBall'
};

export class BrickBreaker extends GameEngine {
  constructor(config = {}) {
    const defaultConfig = {
      id: 'brick-breaker',
      name: '打磚塊',
      fps: 60,
      maxFps: 120,
      initialLives: 3,
      maxLives: 5,
      canvas: {
        width: 800,
        height: 600,
        background: '#000000'
      },
      features: {
        sound: true,
        powerUps: true,
        multipleBalls: true,
        levels: true
      }
    };

    super({ ...defaultConfig, ...config });

    // Game state
    this.gameState = {
      score: 0,
      lives: this.config.initialLives,
      level: 1,
      highScore: localStorage.getItem('brickBreakerHighScore') || 0,
      isGameOver: false
    };

    // Paddle
    this.paddle = {
      x: this.canvas.width / 2 - 75,
      y: this.canvas.height - 30,
      width: 150,
      height: 20,
      speed: 8,
      color: '#4d79ff',
      isSticky: false
    };

    // Ball
    this.balls = [
      {
        x: this.canvas.width / 2,
        y: this.canvas.height - 50,
        radius: 10,
        speedX: 5,
        speedY: -5,
        color: '#ffffff',
        isStuck: false
      }
    ];

    // Bricks
    this.bricks = [];
    this.initBricks();

    // Power-ups
    this.powerUps = [];

    // Keys
    this.keys = {
      left: false,
      right: false
    };
  }

  async loadAssets() {
    // Load game assets
    this.assets = {
      sounds: {
        bounce: null,
        brickBreak: null,
        powerUp: null,
        lifeLost: null
      },
      images: {
        paddle: null,
        ball: null,
        bricks: null,
        powerUps: null
      }
    };

    console.log('BrickBreaker assets loaded');
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Button events
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (startBtn) startBtn.addEventListener('click', () => this.startGame());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetGame());
  }

  update(deltaTime) {
    if (!this.state.running || this.state.paused || this.gameState.isGameOver) {
      return;
    }

    // Move paddle
    this.movePaddle();

    // Move balls
    this.moveBalls();

    // Move power-ups
    this.movePowerUps();

    // Check collisions
    this.checkCollisions();

    // Check level completion
    if (this.checkLevelComplete()) {
      this.levelComplete();
    }
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.drawBackground();

    // Draw bricks
    this.drawBricks();

    // Draw paddle
    this.drawPaddle();

    // Draw balls
    this.drawBalls();

    // Draw power-ups
    this.drawPowerUps();

    // Draw UI
    this.renderUI();
  }

  cleanup() {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  // Game-specific methods
  initBricks() {
    this.bricks = [];
    
    const brickRows = 6;
    const brickCols = 10;
    const brickWidth = this.canvas.width / brickCols - 10;
    const brickHeight = 30;
    const brickPadding = 5;
    const offsetTop = 60;
    const offsetLeft = 5;

    for (let row = 0; row < brickRows; row++) {
      for (let col = 0; col < brickCols; col++) {
        // Determine brick type based on row
        let type = BrickType.NORMAL;
        let health = 1;
        let color = '#ff5555';
        
        if (row === 0 || row === 1) {
          type = BrickType.STRONG;
          health = 2;
          color = '#ffaa00';
        } else if (row === 2 || row === 3) {
          type = BrickType.NORMAL;
          health = 1;
          color = '#55ff55';
        } else {
          // Chance for power-up brick
          if (Math.random() < 0.2) {
            type = BrickType.POWERUP;
            color = '#aa55ff';
          } else {
            type = BrickType.NORMAL;
            color = '#5555ff';
          }
        }

        this.bricks.push({
          x: col * (brickWidth + brickPadding) + offsetLeft,
          y: row * (brickHeight + brickPadding) + offsetTop,
          width: brickWidth,
          height: brickHeight,
          type: type,
          health: health,
          maxHealth: health,
          color: color,
          broken: false
        });
      }
    }
  }

  movePaddle() {
    if (this.keys.left && this.paddle.x > 0) {
      this.paddle.x -= this.paddle.speed;
    }
    
    if (this.keys.right && this.paddle.x + this.paddle.width < this.canvas.width) {
      this.paddle.x += this.paddle.speed;
    }
  }

  moveBalls() {
    this.balls.forEach((ball, index) => {
      if (ball.isStuck && this.paddle.isSticky) {
        // Ball is stuck to paddle
        ball.x = this.paddle.x + this.paddle.width / 2;
        ball.y = this.paddle.y - ball.radius;
      } else {
        // Move ball
        ball.x += ball.speedX;
        ball.y += ball.speedY;

        // Wall collisions
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > this.canvas.width) {
          ball.speedX = -ball.speedX;
        }
        
        if (ball.y - ball.radius < 0) {
          ball.speedY = -ball.speedY;
        }
        
        // Bottom wall (lose life)
        if (ball.y + ball.radius > this.canvas.height) {
          this.loseBall(index);
        }
      }
    });
  }

  movePowerUps() {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      powerUp.y += powerUp.speed;

      // Check collision with paddle
      if (powerUp.y + powerUp.radius > this.paddle.y &&
          powerUp.x > this.paddle.x &&
          powerUp.x < this.paddle.x + this.paddle.width &&
          powerUp.y - powerUp.radius < this.paddle.y + this.paddle.height) {
        
        this.applyPowerUp(powerUp);
        this.powerUps.splice(i, 1);
        continue;
      }

      // Remove if out of bounds
      if (powerUp.y > this.canvas.height) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  checkCollisions() {
    // Check ball collisions with bricks
    this.balls.forEach(ball => {
      for (let i = this.bricks.length - 1; i >= 0; i--) {
        const brick = this.bricks[i];
        
        if (!brick.broken && this.checkBallBrickCollision(ball, brick)) {
          this.handleBrickCollision(ball, brick, i);
          break; // Only handle one collision per ball per frame
        }
      }

      // Check ball collision with paddle
      if (this.checkBallPaddleCollision(ball)) {
        this.handlePaddleCollision(ball);
      }
    });
  }

  checkBallBrickCollision(ball, brick) {
    // Find closest point on brick to ball
    const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
    const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));

    // Calculate distance from closest point to ball center
    const distanceX = ball.x - closestX;
    const distanceY = ball.y - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    return distance < ball.radius;
  }

  checkBallPaddleCollision(ball) {
    return ball.x > this.paddle.x &&
           ball.x < this.paddle.x + this.paddle.width &&
           ball.y + ball.radius > this.paddle.y &&
           ball.y - ball.radius < this.paddle.y + this.paddle.height;
  }

  handleBrickCollision(ball, brick, index) {
    // Determine collision side
    const ballLeft = ball.x - ball.radius;
    const ballRight = ball.x + ball.radius;
    const ballTop = ball.y - ball.radius;
    const ballBottom = ball.y + ball.radius;
    
    const brickLeft = brick.x;
    const brickRight = brick.x + brick.width;
    const brickTop = brick.y;
    const brickBottom = brick.y + brick.height;

    // Calculate overlap on each side
    const overlapLeft = ballRight - brickLeft;
    const overlapRight = brickRight - ballLeft;
    const overlapTop = ballBottom - brickTop;
    const overlapBottom = brickBottom - ballTop;

    // Find smallest overlap
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    // Bounce based on collision side
    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
      ball.speedX = -ball.speedX;
    } else {
      ball.speedY = -ball.speedY;
    }

    // Damage brick
    brick.health--;
    
    if (brick.health <= 0) {
      brick.broken = true;
      
      // Add score
      let points = 10;
      if (brick.type === BrickType.STRONG) points = 20;
      if (brick.type === BrickType.POWERUP) points = 30;
      
      this.gameState.score += points;
      
      // Spawn power-up from power-up bricks
      if (brick.type === BrickType.POWERUP && Math.random() < 0.5) {
        this.spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
      }
      
      // Remove brick
      this.bricks.splice(index, 1);
    }
    
    this.updateUI();
  }

  handlePaddleCollision(ball) {
    // Calculate hit position relative to paddle center
    const hitPosition = (ball.x - this.paddle.x) / this.paddle.width;
    
    // Calculate bounce angle (-0.5 to 0.5 radians)
    const maxBounceAngle = Math.PI / 3; // 60 degrees
    const bounceAngle = (hitPosition - 0.5) * maxBounceAngle * 2;
    
    // Calculate new speed
    const speed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
    ball.speedX = speed * Math.sin(bounceAngle);
    ball.speedY = -speed * Math.cos(bounceAngle);
    
    // Prevent ball from getting stuck
    ball.y = this.paddle.y - ball.radius;
    
    // Handle sticky paddle
    if (this.paddle.isSticky) {
      ball.isStuck = true;
    }
  }

  spawnPowerUp(x, y) {
    const powerUpTypes = Object.values(PowerUpType);
    const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    
    let color = '#ffffff';
    switch(randomType) {
      case PowerUpType.EXTRA_LIFE: color = '#ff5555'; break;
      case PowerUpType.LONG_PADDLE: color = '#55ff55'; break;
      case PowerUpType.FAST_BALL: color = '#5555ff'; break;
      case PowerUpType.SLOW_BALL: color = '#ffff55'; break;
      case PowerUpType.MULTI_BALL: color = '#ff55ff'; break;
    }
    
    this.powerUps.push({
      x: x,
      y: y,
      radius: 8,
      speed: 2,
      type: randomType,
      color: color
    });
  }

  applyPowerUp(powerUp) {
    switch(powerUp.type) {
      case PowerUpType.EXTRA_LIFE:
        this.gameState.lives = Math.min(this.gameState.lives + 1, this.config.maxLives);
        break;
        
      case PowerUpType.LONG_PADDLE:
        this.paddle.width = 200;
        setTimeout(() => {
          this.paddle.width = 150;
        }, 10000); // 10 seconds
        break;
        
      case PowerUpType.FAST_BALL:
        this.balls.forEach(ball => {
          ball.speedX *= 1.5;
          ball.speedY *= 1.5;
        });
        setTimeout(() => {
          this.balls.forEach(ball => {
            ball.speedX /= 1.5;
            ball.speedY /= 1.5;
          });
        }, 5000); // 5 seconds
        break;
        
      case PowerUpType.SLOW_BALL:
        this.balls.forEach(ball => {
          ball.speedX *= 0.7;
          ball.speedY *= 0.7;
        });
        setTimeout(() => {
          this.balls.forEach(ball => {
            ball.speedX /= 0.7;
            ball.speedY /= 0.7;
          });
        }, 5000); // 5 seconds
        break;
        
      case PowerUpType.MULTI_BALL:
        if (this.balls.length < 5) {
          for (let i = 0; i < 2; i++) {
            this.balls.push({
              x: this.paddle.x + this.paddle.width / 2,
              y: this.paddle.y - 10,
              radius: 10,
              speedX: (Math.random() - 0.5) * 8,
              speedY: -5,
              color: '#ffffff',
              isStuck: false
            });
          }
        }
        break;
    }
    
    this.updateUI();
  }

  loseBall(index) {
    this.balls.splice(index, 1);
    
    if (this.balls.length === 0) {
      this.gameState.lives--;
      
      if (this.gameState.lives <= 0) {
        this.gameOver();
      } else {
        // Reset ball
        this.balls.push({
          x: this.paddle.x + this.paddle.width / 2,
          y: this.paddle.y - 10,
          radius: 10,
          speedX: 5,
          speedY: -5,
          color: '#ffffff',
          isStuck: false
        });
      }
      
      this.updateUI();
    }
  }

  checkLevelComplete() {
    return this.bricks.every(brick => brick.broken || brick.type === BrickType.UNBREAKABLE);
  }

  levelComplete() {
    this.gameState.level++;
    
    // Increase score for level completion
    this.gameState.score += 100 * this.gameState.level;
    
    // Reset bricks for next level
    this.initBricks();
    
    // Reset balls
    this.balls = [{
      x: this.paddle.x + this.paddle.width / 2,
      y: this.paddle.y - 10,
      radius: 10,
      speedX: 5 + this.gameState.level * 0.5,
      speedY: -5 - this.gameState.level * 0.5,
      color: '#ffffff',
      isStuck: false
    }];
    
    // Clear power-ups
    this.powerUps = [];
    
    // Reset paddle
    this.paddle.width = 150;
    this.paddle.isSticky = false;
    
    // Update UI
    this.updateUI();
    
    // Show level complete message
    alert(`第 ${this.gameState.level - 1} 關完成！進入第 ${this.gameState.level} 關！`);
  }

  drawBackground() {
    // Draw gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0a0a2a');
    gradient.addColorStop(1, '#1a1a40');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBricks() {
    this.bricks.forEach(brick => {
      if (!brick.broken) {
        // Draw brick
        this.ctx.fillStyle = brick.color;
        this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        
        // Draw brick border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        
        // Draw health for strong bricks
        if (brick.type === BrickType.STRONG) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = '12px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(
            brick.health.toString(),
            brick.x + brick.width / 2,
            brick.y + brick.height / 2 + 4
          );
        }
      }
    });
  }

  drawPaddle() {
    // Draw paddle
    this.ctx.fillStyle = this.paddle.color;
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    
    // Draw paddle border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    
    // Draw sticky indicator
    if (this.paddle.isSticky) {
      this.ctx.fillStyle = '#ffff00';
      this.ctx.fillRect(this.paddle.x + 5, this.paddle.y - 5, 10, 5);
      this.ctx.fillRect(this.paddle.x + this.paddle.width - 15, this.paddle.y - 5, 10, 5);
    }
  }

  drawBalls() {
    this.balls.forEach(ball => {
      // Draw ball
      this.ctx.fillStyle = ball.color;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw ball shine
      this.ctx.fillStyle = '#cccccc';
      this.ctx.beginPath();
      this.ctx.arc(ball.x - ball.radius / 3, ball.y - ball.radius / 3, ball.radius / 3, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawPowerUps() {
    this.powerUps.forEach(powerUp => {
      // Draw power-up
      this.ctx.fillStyle = powerUp.color;
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw power-up symbol
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      let symbol = '?';
      switch(powerUp.type) {
        case PowerUpType.EXTRA_LIFE: symbol = '❤'; break;
        case PowerUpType.LONG_PADDLE: symbol = '↔'; break;
        case PowerUpType.FAST_BALL: symbol = '⚡'; break;
        case PowerUpType.SLOW_BALL: symbol = '🐌'; break;
        case PowerUpType.MULTI_BALL: symbol = '✶'; break;
      }
      
      this.ctx.fillText(symbol, powerUp.x, powerUp.y);
    });
  }

  handleKeyDown(e) {
    switch(e.key) {
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case ' ':
        // Launch stuck balls
        this.balls.forEach(ball => {
          if (ball.isStuck) {
            ball.isStuck = false;
            ball.speedY = -5;
          }
        });
        break;
      case 'p':
      case 'P':
        this.togglePause();
        break;
    }
  }

  handleKeyUp(e) {
    switch(e.key) {
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'ArrowRight':
        this.keys.right = false;
        break;
    }
  }

  gameOver() {
    this.gameState.isGameOver = true;
    
    // Save high score
    if (this.gameState.score > this.gameState.highScore) {
      this.gameState.highScore = this.gameState.score;
      localStorage.setItem('brickBreakerHighScore', this.gameState.highScore);
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
    this.gameState.isGameOver = false;
    
    // Reset game state
    this.gameState.score = 0;
    this.gameState.lives = this.config.initialLives;
    this.gameState.level = 1;
    
    // Reset paddle
    this.paddle.x = this.canvas.width / 2 - 75;
    this.paddle.width = 150;
    this.paddle.isSticky = false;
    
    // Reset balls
    this.balls = [{
      x: this.paddle.x + this.paddle.width / 2,
      y: this.paddle.y - 10,
      radius: 10,
      speedX: 5,
      speedY: -5,
      color: '#ffffff',
      isStuck: false
    }];
    
    // Reset bricks
    this.initBricks();
    
    // Clear power-ups
    this.powerUps = [];
    
    // Reset keys
    this.keys.left = false;
    this.keys.right = false;
    
    // Update UI
    this.updateUI();
    
    // Hide game over screen
    const gameOverScreen = document.getElementById('gameOver');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
  }

  togglePause() {
    if (!this.state.running || this.gameState.isGameOver) return;
    
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
    const livesElement = document.getElementById('lives');
    const levelElement = document.getElementById('level');
    const ballsElement = document.getElementById('balls');
    
    if (scoreElement) scoreElement.textContent = this.gameState.score;
    if (livesElement) livesElement.textContent = this.gameState.lives;
    if (levelElement) levelElement.textContent = this.gameState.level;
    if (ballsElement) ballsElement.textContent = this.balls.length;
  }

  renderUI() {
    // Draw lives indicator
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`生命: ${this.gameState.lives}`, 10, 30);
    
    // Draw score
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`分數: ${this.gameState.score}`, this.canvas.width / 2, 30);
    
    // Draw level
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`關卡: ${this.gameState.level}`, this.canvas.width - 10, 30);
    
    // Draw balls count
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`球數: ${this.balls.length}`, 10, 50);
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