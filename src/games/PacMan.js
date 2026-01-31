/**
 * Pac-Man Game
 * Extends GameEngine for Pac-Man mechanics
 */
import { GameEngine } from '../core/GameEngine.js';

const Direction = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
};

const GhostState = {
  CHASE: 'chase',
  SCATTER: 'scatter',
  FRIGHTENED: 'frightened',
  EATEN: 'eaten'
};

export class PacMan extends GameEngine {
  constructor(config = {}) {
    const defaultConfig = {
      id: 'pacman',
      name: '小精靈',
      fps: 60,
      maxFps: 120,
      initialLives: 3,
      maxLives: 3,
      canvas: {
        width: 560,
        height: 620,
        background: '#000000'
      },
      features: {
        sound: true,
        ghosts: true,
        powerPellets: true,
        fruits: true
      }
    };

    super({ ...defaultConfig, ...config });

    // Game state
    this.gameState = {
      score: 0,
      lives: this.config.initialLives,
      level: 1,
      dotsEaten: 0,
      totalDots: 0,
      isPowerMode: false,
      powerModeTimer: 0,
      fruits: [],
      highScore: localStorage.getItem('pacmanHighScore') || 0
    };

    // Maze configuration
    this.maze = this.createMaze();
    this.cellSize = 20;

    // Pac-Man
    this.pacman = {
      x: 14 * this.cellSize,
      y: 23 * this.cellSize,
      radius: this.cellSize / 2 - 2,
      direction: Direction.LEFT,
      nextDirection: Direction.LEFT,
      speed: 2,
      mouthAngle: 0,
      mouthSpeed: 0.2
    };

    // Ghosts
    this.ghosts = [
      {
        name: 'Blinky',
        x: 14 * this.cellSize,
        y: 11 * this.cellSize,
        radius: this.cellSize / 2 - 2,
        color: '#ff0000',
        direction: Direction.LEFT,
        state: GhostState.CHASE,
        speed: 1.75,
        frightenedTimer: 0
      },
      {
        name: 'Pinky',
        x: 14 * this.cellSize,
        y: 14 * this.cellSize,
        radius: this.cellSize / 2 - 2,
        color: '#ffb8de',
        direction: Direction.UP,
        state: GhostState.SCATTER,
        speed: 1.85,
        frightenedTimer: 0
      },
      {
        name: 'Inky',
        x: 12 * this.cellSize,
        y: 14 * this.cellSize,
        radius: this.cellSize / 2 - 2,
        color: '#00ffff',
        direction: Direction.UP,
        state: GhostState.SCATTER,
        speed: 1.65,
        frightenedTimer: 0
      },
      {
        name: 'Clyde',
        x: 16 * this.cellSize,
        y: 14 * this.cellSize,
        radius: this.cellSize / 2 - 2,
        color: '#ffb852',
        direction: Direction.UP,
        state: GhostState.SCATTER,
        speed: 1.45,
        frightenedTimer: 0
      }
    ];

    // Dots and power pellets
    this.dots = [];
    this.powerPellets = [];
    this.initDots();
  }

  async loadAssets() {
    // Load game assets
    this.assets = {
      sounds: {
        chomp: null,
        death: null,
        eatGhost: null,
        powerPellet: null,
        fruit: null
      },
      images: {
        pacman: null,
        ghosts: null,
        maze: null
      }
    };

    console.log('PacMan assets loaded');
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
    if (!this.state.running || this.state.paused) {
      return;
    }

    // Update Pac-Man
    this.updatePacMan();

    // Update ghosts
    this.updateGhosts();

    // Update power mode
    this.updatePowerMode();

    // Check collisions
    this.checkCollisions();

    // Update animations
    this.pacman.mouthAngle += this.pacman.mouthSpeed;
    if (this.pacman.mouthAngle > Math.PI / 4 || this.pacman.mouthAngle < 0) {
      this.pacman.mouthSpeed *= -1;
    }
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw maze
    this.drawMaze();

    // Draw dots
    this.drawDots();

    // Draw power pellets
    this.drawPowerPellets();

    // Draw Pac-Man
    this.drawPacMan();

    // Draw ghosts
    this.drawGhosts();

    // Draw fruits
    this.drawFruits();

    // Draw UI
    this.renderUI();
  }

  cleanup() {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  // Game-specific methods
  createMaze() {
    // Simplified maze layout (1 = wall, 0 = path)
    return [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
      [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
      [0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
      [1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
      [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
      [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
      [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
      [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
  }

  initDots() {
    this.dots = [];
    this.powerPellets = [];
    this.gameState.totalDots = 0;
    this.gameState.dotsEaten = 0;

    for (let row = 0; row < this.maze.length; row++) {
      for (let col = 0; col < this.maze[row].length; col++) {
        if (this.maze[row][col] === 0) {
          // Regular dot
          this.dots.push({
            x: col * this.cellSize + this.cellSize / 2,
            y: row * this.cellSize + this.cellSize / 2,
            radius: 2,
            eaten: false
          });
          this.gameState.totalDots++;

          // Power pellets at corners
          if ((row === 1 || row === 29) && (col === 1 || col === 26)) {
            this.powerPellets.push({
              x: col * this.cellSize + this.cellSize / 2,
              y: row * this.cellSize + this.cellSize / 2,
              radius: 6,
              eaten: false
            });
          }
        }
      }
    }
  }

  updatePacMan() {
    // Try to change direction
    if (this.canMove(this.pacman.nextDirection)) {
      this.pacman.direction = this.pacman.nextDirection;
    }

    // Move Pac-Man
    if (this.canMove(this.pacman.direction)) {
      switch (this.pacman.direction) {
        case Direction.UP:
          this.pacman.y -= this.pacman.speed;
          break;
        case Direction.DOWN:
          this.pacman.y += this.pacman.speed;
          break;
        case Direction.LEFT:
          this.pacman.x -= this.pacman.speed;
          break;
        case Direction.RIGHT:
          this.pacman.x += this.pacman.speed;
          break;
      }
    }

    // Wrap around tunnel
    if (this.pacman.x < -this.cellSize) {
      this.pacman.x = this.canvas.width;
    } else if (this.pacman.x > this.canvas.width) {
      this.pacman.x = -this.cellSize;
    }
  }

  updateGhosts() {
    this.ghosts.forEach(ghost => {
      // Update ghost state
      this.updateGhostState(ghost);

      // Move ghost
      this.moveGhost(ghost);

      // Wrap around tunnel
      if (ghost.x < -this.cellSize) {
        ghost.x = this.canvas.width;
      } else if (ghost.x > this.canvas.width) {
        ghost.x = -this.cellSize;
      }
    });
  }

  updateGhostState(ghost) {
    // Update frightened timer
    if (ghost.state === GhostState.FRIGHTENED) {
      ghost.frightenedTimer--;
      if (ghost.frightenedTimer <= 0) {
        ghost.state = GhostState.CHASE;
        ghost.speed = ghost.speed * 2; // Restore normal speed
      }
    }

    // Simple AI: change direction randomly at intersections
    if (this.isAtIntersection(ghost)) {
      const possibleDirections = this.getPossibleDirections(ghost);
      if (possibleDirections.length > 0) {
        ghost.direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
      }
    }
  }

  moveGhost(ghost) {
    if (this.canMove(ghost.direction, ghost)) {
      switch (ghost.direction) {
        case Direction.UP:
          ghost.y -= ghost.speed;
          break;
        case Direction.DOWN:
          ghost.y += ghost.speed;
          break;
        case Direction.LEFT:
          ghost.x -= ghost.speed;
          break;
        case Direction.RIGHT:
          ghost.x += ghost.speed;
          break;
      }
    } else {
      // Change direction if blocked
      const possibleDirections = this.getPossibleDirections(ghost);
      if (possibleDirections.length > 0) {
        ghost.direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
      }
    }
  }

  updatePowerMode() {
    if (this.gameState.isPowerMode) {
      this.gameState.powerModeTimer--;
      if (this.gameState.powerModeTimer <= 0) {
        this.gameState.isPowerMode = false;
        // Restore ghost speeds
        this.ghosts.forEach(ghost => {
          if (ghost.state === GhostState.FRIGHTENED) {
            ghost.state = GhostState.CHASE;
            ghost.speed = ghost.speed * 2;
          }
        });
      }
    }
  }

  checkCollisions() {
    // Check dot collisions
    this.dots.forEach((dot, index) => {
      if (!dot.eaten) {
        const dx = this.pacman.x - dot.x;
        const dy = this.pacman.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.pacman.radius + dot.radius) {
          dot.eaten = true;
          this.gameState.dotsEaten++;
          this.gameState.score += 10;
          this.updateUI();
        }
      }
    });

    // Check power pellet collisions
    this.powerPellets.forEach((pellet, index) => {
      if (!pellet.eaten) {
        const dx = this.pacman.x - pellet.x;
        const dy = this.pacman.y - pellet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.pacman.radius + pellet.radius) {
          pellet.eaten = true;
          this.gameState.score += 50;
          this.gameState.isPowerMode = true;
          this.gameState.powerModeTimer = 300; // 5 seconds at 60fps
          
          // Make ghosts frightened
          this.ghosts.forEach(ghost => {
            if (ghost.state !== GhostState.EATEN) {
              ghost.state = GhostState.FRIGHTENED;
              ghost.speed = ghost.speed / 2; // Slow down when frightened
              ghost.frightenedTimer = 300;
            }
          });
          
          this.updateUI();
        }
      }
    });

    // Check ghost collisions
    this.ghosts.forEach(ghost => {
      const dx = this.pacman.x - ghost.x;
      const dy = this.pacman.y - ghost.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.pacman.radius + ghost.radius) {
        if (ghost.state === GhostState.FRIGHTENED) {
          // Eat ghost
          ghost.state = GhostState.EATEN;
          this.gameState.score += 200;
          this.updateUI();
        } else if (ghost.state !== GhostState.EATEN) {
          // Lose life
          this.loseLife();
        }
      }
    });

    // Check level completion
    if (this.gameState.dotsEaten >= this.gameState.totalDots) {
      this.levelComplete();
    }
  }

  canMove(direction, entity = this.pacman) {
    const nextX = entity.x;
    const nextY = entity.y;
    const radius = entity.radius || this.pacman.radius;
    
    // Calculate next position
    let testX = nextX;
    let testY = nextY;
    
    switch (direction) {
      case Direction.UP:
        testY -= entity.speed || this.pacman.speed;
        break;
      case Direction.DOWN:
        testY += entity.speed || this.pacman.speed;
        break;
      case Direction.LEFT:
        testX -= entity.speed || this.pacman.speed;
        break;
      case Direction.RIGHT:
        testX += entity.speed || this.pacman.speed;
        break;
    }
    
    // Convert to grid coordinates
    const gridX = Math.floor(testX / this.cellSize);
    const gridY = Math.floor(testY / this.cellSize);
    
    // Check if position is within bounds and not a wall
    if (gridX >= 0 && gridX < this.maze[0].length &&
        gridY >= 0 && gridY < this.maze.length) {
      return this.maze[gridY][gridX] === 0;
    }
    
    return false;
  }

  isAtIntersection(entity) {
    const gridX = Math.floor(entity.x / this.cellSize);
    const gridY = Math.floor(entity.y / this.cellSize);
    
    // Count possible directions
    let count = 0;
    if (this.canMove(Direction.UP, entity)) count++;
    if (this.canMove(Direction.DOWN, entity)) count++;
    if (this.canMove(Direction.LEFT, entity)) count++;
    if (this.canMove(Direction.RIGHT, entity)) count++;
    
    return count > 2;
  }

  getPossibleDirections(entity) {
    const directions = [];
    if (this.canMove(Direction.UP, entity)) directions.push(Direction.UP);
    if (this.canMove(Direction.DOWN, entity)) directions.push(Direction.DOWN);
    if (this.canMove(Direction.LEFT, entity)) directions.push(Direction.LEFT);
    if (this.canMove(Direction.RIGHT, entity)) directions.push(Direction.RIGHT);
    
    // Remove opposite direction to prevent 180-degree turns
    const opposite = {
      [Direction.UP]: Direction.DOWN,
      [Direction.DOWN]: Direction.UP,
      [Direction.LEFT]: Direction.RIGHT,
      [Direction.RIGHT]: Direction.LEFT
    };
    
    return directions.filter(dir => dir !== opposite[entity.direction]);
  }

  drawMaze() {
    for (let row = 0; row < this.maze.length; row++) {
      for (let col = 0; col < this.maze[row].length; col++) {
        if (this.maze[row][col] === 1) {
          this.ctx.fillStyle = '#0000ff';
          this.ctx.fillRect(
            col * this.cellSize,
            row * this.cellSize,
            this.cellSize,
            this.cellSize
          );
        }
      }
    }
  }

  drawDots() {
    this.dots.forEach(dot => {
      if (!dot.eaten) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  drawPowerPellets() {
    this.powerPellets.forEach(pellet => {
      if (!pellet.eaten) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(pellet.x, pellet.y, pellet.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  drawPacMan() {
    this.ctx.fillStyle = '#ffff00';
    this.ctx.beginPath();
    
    const angle = this.pacman.mouthAngle;
    const startAngle = this.getPacManAngle() - angle;
    const endAngle = this.getPacManAngle() + angle;
    
    this.ctx.arc(
      this.pacman.x,
      this.pacman.y,
      this.pacman.radius,
      startAngle,
      endAngle
    );
    
    this.ctx.lineTo(this.pacman.x, this.pacman.y);
    this.ctx.fill();
  }

  getPacManAngle() {
    switch (this.pacman.direction) {
      case Direction.RIGHT: return 0;
      case Direction.DOWN: return Math.PI / 2;
      case Direction.LEFT: return Math.PI;
      case Direction.UP: return -Math.PI / 2;
      default: return 0;
    }
  }

  drawGhosts() {
    this.ghosts.forEach(ghost => {
      let color = ghost.color;
      
      // Change color based on state
      if (ghost.state === GhostState.FRIGHTENED) {
        color = '#0000ff'; // Blue when frightened
      } else if (ghost.state === GhostState.EATEN) {
        color = '#ffffff'; // White when eaten
      }
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      
      // Draw ghost body
      this.ctx.arc(ghost.x, ghost.y, ghost.radius, Math.PI, 0, false);
      
      // Draw ghost bottom
      this.ctx.lineTo(ghost.x + ghost.radius, ghost.y);
      for (let i = 0; i < 3; i++) {
        const x = ghost.x + ghost.radius - (i * ghost.radius / 1.5);
        const y = ghost.y + ghost.radius / 2;
        this.ctx.quadraticCurveTo(x, ghost.y, x - ghost.radius / 3, y);
      }
      
      this.ctx.closePath();
      this.ctx.fill();
      
      // Draw eyes
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(ghost.x - ghost.radius / 3, ghost.y, ghost.radius / 3, 0, Math.PI * 2);
      this.ctx.arc(ghost.x + ghost.radius / 3, ghost.y, ghost.radius / 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw pupils
      this.ctx.fillStyle = '#0000ff';
      const pupilOffset = ghost.radius / 6;
      let pupilX1 = ghost.x - ghost.radius / 3;
      let pupilX2 = ghost.x + ghost.radius / 3;
      
      // Make pupils look in direction
      switch(ghost.direction) {
        case Direction.LEFT:
          pupilX1 -= pupilOffset;
          pupilX2 -= pupilOffset;
          break;
        case Direction.RIGHT:
          pupilX1 += pupilOffset;
          pupilX2 += pupilOffset;
          break;
        case Direction.UP:
          // Pupils move up
          break;
        case Direction.DOWN:
          // Pupils move down
          break;
      }
      
      this.ctx.beginPath();
      this.ctx.arc(pupilX1, ghost.y, ghost.radius / 6, 0, Math.PI * 2);
      this.ctx.arc(pupilX2, ghost.y, ghost.radius / 6, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawFruits() {
    this.gameState.fruits.forEach(fruit => {
      this.ctx.fillStyle = fruit.color;
      this.ctx.beginPath();
      this.ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  handleKeyDown(e) {
    switch(e.key) {
      case 'ArrowUp':
        this.pacman.nextDirection = Direction.UP;
        break;
      case 'ArrowDown':
        this.pacman.nextDirection = Direction.DOWN;
        break;
      case 'ArrowLeft':
        this.pacman.nextDirection = Direction.LEFT;
        break;
      case 'ArrowRight':
        this.pacman.nextDirection = Direction.RIGHT;
        break;
      case ' ':
        this.togglePause();
        break;
    }
  }

  loseLife() {
    this.gameState.lives--;
    
    if (this.gameState.lives <= 0) {
      this.gameOver();
    } else {
      // Reset positions
      this.resetPositions();
    }
    
    this.updateUI();
  }

  resetPositions() {
    // Reset Pac-Man
    this.pacman.x = 14 * this.cellSize;
    this.pacman.y = 23 * this.cellSize;
    this.pacman.direction = Direction.LEFT;
    this.pacman.nextDirection = Direction.LEFT;
    
    // Reset ghosts
    this.ghosts[0].x = 14 * this.cellSize;
    this.ghosts[0].y = 11 * this.cellSize;
    this.ghosts[1].x = 14 * this.cellSize;
    this.ghosts[1].y = 14 * this.cellSize;
    this.ghosts[2].x = 12 * this.cellSize;
    this.ghosts[2].y = 14 * this.cellSize;
    this.ghosts[3].x = 16 * this.cellSize;
    this.ghosts[3].y = 14 * this.cellSize;
    
    // Reset ghost states
    this.ghosts.forEach(ghost => {
      ghost.state = GhostState.CHASE;
      ghost.frightenedTimer = 0;
    });
  }

  levelComplete() {
    this.gameState.level++;
    
    // Reset dots and pellets
    this.initDots();
    
    // Reset positions
    this.resetPositions();
    
    // Increase speed slightly
    this.pacman.speed = Math.min(this.pacman.speed * 1.1, 4);
    this.ghosts.forEach(ghost => {
      ghost.speed = Math.min(ghost.speed * 1.1, 3);
    });
    
    // Update UI
    this.updateUI();
    
    // Show level up message
    alert(`進入第 ${this.gameState.level} 關！`);
  }

  gameOver() {
    this.state.running = false;
    
    // Save high score
    if (this.gameState.score > this.gameState.highScore) {
      this.gameState.highScore = this.gameState.score;
      localStorage.setItem('pacmanHighScore', this.gameState.highScore);
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
    
    // Reset game state
    this.gameState.score = 0;
    this.gameState.lives = this.config.initialLives;
    this.gameState.level = 1;
    this.gameState.dotsEaten = 0;
    this.gameState.isPowerMode = false;
    this.gameState.powerModeTimer = 0;
    
    // Initialize dots
    this.initDots();
    
    // Reset positions
    this.resetPositions();
    
    // Reset speeds
    this.pacman.speed = 2;
    this.ghosts[0].speed = 1.75;
    this.ghosts[1].speed = 1.85;
    this.ghosts[2].speed = 1.65;
    this.ghosts[3].speed = 1.45;
    
    // Update UI
    this.updateUI();
    
    // Hide game over screen
    const gameOverScreen = document.getElementById('gameOver');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
  }

  togglePause() {
    if (!this.state.running) return;
    
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
    const dotsElement = document.getElementById('dots');
    
    if (scoreElement) scoreElement.textContent = this.gameState.score;
    if (livesElement) livesElement.textContent = this.gameState.lives;
    if (levelElement) levelElement.textContent = this.gameState.level;
    if (dotsElement) {
      dotsElement.textContent = `${this.gameState.dotsEaten}/${this.gameState.totalDots}`;
    }
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