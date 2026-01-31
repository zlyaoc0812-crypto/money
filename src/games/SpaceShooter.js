/**
 * Space Shooter Game
 * Extends GameEngine for space shooter mechanics
 */
import { GameEngine } from '../core/GameEngine.js';

const EnemyType = {
  BASIC: 'basic',
  ADVANCED: 'advanced'
};

const PowerUpType = {
  LIFE: 'life',
  INVINCIBILITY: 'invincibility'
};

export class SpaceShooter extends GameEngine {
  constructor(config = {}) {
    const defaultConfig = {
      id: 'space-shooter',
      name: '太空射擊遊戲',
      fps: 60,
      maxFps: 120,
      initialLives: 5,
      maxLives: 8,
      canvas: {
        width: 800,
        height: 500,
        background: '#000000'
      },
      features: {
        sound: true,
        particles: true,
        powerUps: true,
        comboSystem: true
      }
    };

    super({ ...defaultConfig, ...config });

    // Game state
    this.gameState = {
      score: 0,
      lives: this.config.initialLives,
      level: 1,
      combo: 0,
      isLevelTransition: false,
      highScore: localStorage.getItem('spaceShooterHighScoreFixed') || 0
    };

    // Game objects
    this.player = {
      x: this.canvas.width / 2 - 25,
      y: this.canvas.height - 60,
      width: 50,
      height: 50,
      speed: 8,
      bullets: [],
      lastShot: 0,
      shootDelay: 250,
      color: '#00ff88',
      isInvincible: false,
      invincibleTimer: 0
    };

    this.enemies = [];
    this.powerUps = [];
    this.particles = [];
    this.keys = {};
    this.comboTimeout = null;
  }

  async loadAssets() {
    // Load game assets
    this.assets = {
      sounds: {
        shoot: null,
        explosion: null,
        powerUp: null
      },
      images: {
        player: null,
        enemyBasic: null,
        enemyAdvanced: null,
        bullet: null,
        powerUpLife: null,
        powerUpInvincibility: null
      }
    };

    // In a real implementation, you would load actual assets here
    console.log('SpaceShooter assets loaded');
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      
      // P key pause
      if (e.key.toLowerCase() === 'p' && this.state.running) {
        this.togglePause();
      }
      
      // Prevent spacebar from scrolling
      if (e.key === ' ') {
        e.preventDefault();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });

    // Button events
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.startGame());
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.togglePause());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetGame());
    }
  }

  update(deltaTime) {
    if (!this.state.running || this.state.paused || this.gameState.isLevelTransition) {
      return;
    }

    // Player controls
    if (this.keys['ArrowLeft'] && this.player.x > 0) {
      this.player.x -= this.player.speed;
    }
    if (this.keys['ArrowRight'] && this.player.x + this.player.width < this.canvas.width) {
      this.player.x += this.player.speed;
    }
    if (this.keys[' ']) {
      this.shoot();
    }

    // Update game objects
    this.updateEnemies();
    this.updateBullets();
    this.updatePowerUps();
    this.updateInvincibility();
    this.updateParticles();

    // Check collisions
    this.checkCollisions();

    // Check level completion
    if (this.enemies.length === 0 && !this.gameState.isLevelTransition) {
      this.levelComplete();
    }
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.drawStars();

    // Draw game objects
    this.drawPlayer();
    this.drawEnemies();
    this.drawBullets();
    this.drawPowerUps();
    this.drawParticles();

    // Draw UI
    this.renderUI();
  }

  cleanup() {
    // Clear timeouts
    if (this.comboTimeout) {
      clearTimeout(this.comboTimeout);
    }

    // Remove event listeners
    document.removeEventListener('keydown', this.keydownHandler);
    document.removeEventListener('keyup', this.keyupHandler);
  }

  // Game-specific methods
  startGame() {
    if (this.state.running) return;
    
    this.state.running = true;
    this.state.paused = false;
    this.gameState.isLevelTransition = false;
    
    this.initGame();
    
    // Update UI button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.classList.remove('active');
      pauseBtn.textContent = '暫停';
    }
  }

  togglePause() {
    if (!this.state.running) return;
    
    this.state.paused = !this.state.paused;
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (pauseBtn) {
      if (this.state.paused) {
        pauseBtn.textContent = '繼續';
        pauseBtn.classList.add('active');
        this.createFloatingText(this.canvas.width / 2, this.canvas.height / 2, '遊戲暫停', '#00d4ff');
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

  initGame() {
    // Reset player
    this.player.x = this.canvas.width / 2 - 25;
    this.player.y = this.canvas.height - 60;
    this.player.bullets = [];
    this.player.isInvincible = false;
    this.player.invincibleTimer = 0;

    // Reset game state
    this.gameState.score = 0;
    this.gameState.lives = this.config.initialLives;
    this.gameState.level = 1;
    this.gameState.combo = 0;
    this.gameState.isLevelTransition = false;

    // Clear game objects
    this.enemies = [];
    this.powerUps = [];
    this.particles = [];

    // Create initial enemies
    this.createEnemies();

    // Update UI
    this.updateUI();

    // Hide game over/level up screens
    const gameOverScreen = document.getElementById('gameOver');
    const levelUpScreen = document.getElementById('levelUpScreen');
    
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (levelUpScreen) levelUpScreen.style.display = 'none';
  }

  createEnemies() {
    this.enemies = [];
    const enemyCount = Math.min(3 + Math.floor(this.gameState.level * 1.5), 15);
    const columns = Math.min(6, Math.max(3, Math.ceil(enemyCount / 3)));

    for (let i = 0; i < enemyCount; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      const xSpacing = 110;
      const ySpacing = 85;

      // Determine enemy type
      let isAdvanced = false;
      if (this.gameState.level >= 4) {
        isAdvanced = Math.random() > 0.7;
      } else if (this.gameState.level >= 2) {
        isAdvanced = Math.random() > 0.85;
      }

      // Calculate speed
      const baseSpeed = 0.7;
      const levelSpeedBonus = Math.min(this.gameState.level * 0.15, 1.5);
      const enemySpeed = baseSpeed + levelSpeedBonus;

      this.enemies.push({
        x: 60 + col * xSpacing,
        y: 60 + row * ySpacing,
        width: 40,
        height: 40,
        speed: enemySpeed,
        direction: 1,
        health: isAdvanced ? 2 : 1,
        maxHealth: isAdvanced ? 2 : 1,
        color: isAdvanced ? '#ff5500' : '#ff0066',
        shootTimer: 0,
        canShoot: isAdvanced && this.gameState.level >= 3,
        shootDelay: 200 + Math.random() * 100,
        isAdvanced: isAdvanced,
        id: Date.now() + i
      });
    }

    // Update enemies count in UI
    this.updateEnemiesCount();
  }

  updateEnemies() {
    this.enemies.forEach((enemy) => {
      enemy.x += enemy.speed * enemy.direction;

      // Boundary check
      if (enemy.x <= 0 || enemy.x + enemy.width >= this.canvas.width) {
        enemy.direction *= -1;
        enemy.y += 25;
      }

      // Enemy shooting
      if (enemy.canShoot && enemy.isAdvanced) {
        enemy.shootTimer++;
        if (enemy.shootTimer > enemy.shootDelay) {
          enemy.shootTimer = 0;
          if (Math.random() > 0.9) {
            this.createEnemyBullet(enemy);
          }
        }
      }

      // Enemy escape
      if (enemy.y + enemy.height > this.canvas.height) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
          this.enemies.splice(index, 1);
          this.createFloatingText(enemy.x, enemy.y, '逃脫', '#ff9900');
        }
      }
    });

    this.updateEnemiesCount();
  }

  createEnemyBullet(enemy) {
    this.player.bullets.push({
      x: enemy.x + enemy.width / 2 - 2.5,
      y: enemy.y + enemy.height,
      width: 5,
      height: 15,
      speed: -4,
      color: '#ff9900',
      isEnemy: true,
      id: 'enemy_' + Date.now() + Math.random()
    });
  }

  shoot() {
    const now = Date.now();
    if (now - this.player.lastShot > this.player.shootDelay) {
      // Basic bullet
      this.player.bullets.push({
        x: this.player.x + this.player.width / 2 - 2.5,
        y: this.player.y,
        width: 7,
        height: 15,
        speed: 12,
        color: '#ffff00',
        damage: 1,
        id: 'player_' + Date.now()
      });

      // Double shot from level 2
      if (this.gameState.level >= 2) {
        this.player.bullets.push({
          x: this.player.x + this.player.width / 2 - 10,
          y: this.player.y + 10,
          width: 5,
          height: 15,
          speed: 12,
          color: '#ffff00',
          damage: 1,
          id: 'player_left_' + Date.now()
        });
        this.player.bullets.push({
          x: this.player.x + this.player.width / 2 + 5,
          y: this.player.y + 10,
          width: 5,
          height: 15,
          speed: 12,
          color: '#ffff00',
          damage: 1,
          id: 'player_right_' + Date.now()
        });
      }

      this.player.lastShot = now;
    }
  }

  updateBullets() {
    // Filter out-of-bounds bullets
    this.player.bullets = this.player.bullets.filter(bullet => {
      bullet.y -= bullet.speed;
      return bullet.y > -50 && bullet.y < this.canvas.height + 50;
    });

    // Check collisions
    for (let i = this.player.bullets.length - 1; i >= 0; i--) {
      const bullet = this.player.bullets[i];

      // Enemy bullets hitting player
      if (bullet.isEnemy) {
        if (this.checkCollision(bullet, this.player) && !this.player.isInvincible) {
          this.player.bullets.splice(i, 1);
          this.createParticles(bullet.x, bullet.y, '#ff0000', 10);
          this.loseLife();
          continue;
        }
      }

      // Player bullets hitting enemies
      let bulletHit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];

        if (this.checkCollision(bullet, enemy) && !bullet.isEnemy) {
          enemy.health -= bullet.damage || 1;

          if (enemy.health <= 0) {
            this.handleEnemyDeath(enemy, j);
          } else {
            this.createParticles(bullet.x, bullet.y, enemy.color, 3);
          }

          bulletHit = true;
          this.player.bullets.splice(i, 1);
          break;
        }
      }

      if (bulletHit) continue;
    }

    // Update combo timer
    if (this.gameState.combo > 0) {
      clearTimeout(this.comboTimeout);
      this.comboTimeout = setTimeout(() => {
        if (this.gameState.combo >= 5) {
          this.createFloatingText(
            this.canvas.width / 2,
            100,
            `完美連擊 ${this.gameState.combo}！`,
            '#ffff00'
          );
          this.gameState.score += this.gameState.combo * 50;
          this.updateUI();
        }
        this.gameState.combo = 0;
        this.updateComboDisplay();
      }, 4000);
    }
  }

  handleEnemyDeath(enemy, index) {
    // Calculate points
    const points = enemy.isAdvanced ? 150 : 120;
    const levelBonus = Math.floor(this.gameState.level * 1.2);
    const totalPoints = points * levelBonus;

    this.gameState.score += totalPoints;
    this.gameState.combo++;
    this.updateComboDisplay();

    // Combo bonus
    if (this.gameState.combo >= 3) {
      const comboBonus = 30 * this.gameState.combo;
      this.gameState.score += comboBonus;
      this.createFloatingText(enemy.x, enemy.y, `連擊 x${this.gameState.combo}! +${comboBonus}`, '#ffff00');
    }

    // Power-up drop
    if (Math.random() > 0.4) {
      this.powerUps.push({
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
        radius: 10,
        type: Math.random() > 0.6 ? PowerUpType.LIFE : PowerUpType.INVINCIBILITY,
        speed: 1.5,
        id: 'powerup_' + Date.now()
      });
    }

    // Effects
    this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    this.enemies.splice(index, 1);
    this.createFloatingText(enemy.x, enemy.y, `+${totalPoints}`, '#00ff88');

    // Update UI
    this.updateUI();
  }

  updatePowerUps() {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      powerUp.y += powerUp.speed;

      // Check collision with player
      const dx = this.player.x + this.player.width / 2 - powerUp.x;
      const dy = this.player.y + this.player.height / 2 - powerUp.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.player.width / 2 + powerUp.radius) {
        if (powerUp.type === PowerUpType.LIFE) {
          this.gameState.lives = Math.min(this.gameState.lives + 1, 8);
          this.createFloatingText(this.player.x, this.player.y, '生命+1', '#00ff88');
        } else {
          this.player.isInvincible = true;
          this.player.invincibleTimer = 400;
          this.createFloatingText(this.player.x, this.player.y, '無敵!', '#00d4ff');
        }
        this.powerUps.splice(i, 1);
        this.createParticles(powerUp.x, powerUp.y, '#ffff00', 15);
        this.updateUI();
      }

      // Remove out-of-bounds power-ups
      if (powerUp.y > this.canvas.height) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  updateInvincibility() {
    if (this.player.isInvincible) {
      this.player.invincibleTimer--;
      if (this.player.invincibleTimer <= 0) {
        this.player.isInvincible = false;
      }
    }
  }

  checkCollisions() {
    if (this.player.isInvincible) return;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (this.checkCollision(this.player, enemy)) {
        this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        this.enemies.splice(i, 1);
        this.loseLife();
        break;
      }
    }
  }

  checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
  }

  levelComplete() {
    this.gameState.isLevelTransition = true;

    // Calculate level bonus
    const levelBonus = 500 * this.gameState.level;
    this.gameState.score += levelBonus;

    // Show level up screen
    const nextLevelElement = document.getElementById('nextLevel');
    const levelBonusElement = document.getElementById('levelBonus');
    const levelMessageElement = document.getElementById('levelMessage');
    const levelUpScreen = document.getElementById('levelUpScreen');

    if (nextLevelElement) nextLevelElement.textContent = this.gameState.level + 1;
    if (levelBonusElement) levelBonusElement.textContent = levelBonus;

    // Set level message
    const messages = [
      "做得很好！繼續保持！",
      "越來越順手了！",
      "你真是射擊高手！",
      "太厲害了！繼續挑戰！",
      "無人能擋！"
    ];
    if (levelMessageElement) {
      levelMessageElement.textContent = messages[Math.min(this.gameState.level - 1, messages.length - 1)];
    }

    if (levelUpScreen) levelUpScreen.style.display = 'block';

    // Update UI
    this.updateUI();

    // Transition to next level after 3 seconds
    setTimeout(() => {
      if (levelUpScreen) levelUpScreen.style.display = 'none';
      this.gameState.level++;
      
      // Clear bullets and power-ups
      this.player.bullets = [];
      this.powerUps = [];
      
      // Create new enemies
      this.createEnemies();
      
      // Reset transition state
      this.gameState.isLevelTransition = false;
      
      // Show new level message
      this.createFloatingText(
        this.canvas.width / 2,
        this.canvas.height / 2,
        `第 ${this.gameState.level} 關`,
        '#00d4ff'
      );
    }, 3000);
  }

  loseLife() {
    if (this.player.isInvincible) return;

    this.gameState.lives--;
    this.player.isInvincible = true;
    this.player.invincibleTimer = 150;

    // Hit effect
    this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);

    // Reset combo
    if (this.gameState.combo > 0) {
      this.createFloatingText(this.player.x, this.player.y, `連擊中斷`, '#ff0000');
      this.gameState.combo = 0;
      this.updateComboDisplay();
    }

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }

    this.updateUI();
  }

  gameOver() {
    this.state.running = false;
    this.gameState.isLevelTransition = false;

    // Save high score
    if (this.gameState.score > this.gameState.highScore) {
      this.gameState.highScore = this.gameState.score;
      localStorage.setItem('spaceShooterHighScoreFixed', this.gameState.highScore);
    }

    // Evaluate performance
    let performance = '';
    if (this.gameState.score > 10000) {
      performance = '超凡大師！';
    } else if (this.gameState.score > 5000) {
      performance = '超級高手！';
    } else if (this.gameState.score > 2000) {
      performance = '非常出色！';
    } else if (this.gameState.score > 1000) {
      performance = '表現不錯！';
    } else {
      performance = '繼續加油！';
    }

    // Show game over screen
    const finalScoreElement = document.getElementById('finalScore');
    const finalLevelElement = document.getElementById('finalLevel');
    const performanceElement = document.getElementById('performance');
    const gameOverScreen = document.getElementById('gameOver');

    if (finalScoreElement) finalScoreElement.textContent = this.gameState.score;
    if (finalLevelElement) finalLevelElement.textContent = this.gameState.level;
    if (performanceElement) performanceElement.textContent = performance;
    if (gameOverScreen) gameOverScreen.style.display = 'block';

    // Game over effect
    this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
  }

  // Drawing methods
  drawStars() {
    for (let i = 0; i < 80; i++) {
      const x = (i * 17) % this.canvas.width;
      const y = (i * 11) % this.canvas.height;
      const size = (i % 3) + 1;
      const brightness = 150 + Math.sin(Date.now() / 2000 + i) * 50;
      this.ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      this.ctx.fillRect(x, y, size, size);
    }
  }

  drawPlayer() {
    // Invincibility blink effect
    if (this.player.isInvincible && Math.floor(Date.now() / 200) % 2 === 0) {
      this.ctx.globalAlpha = 0.5;
    }

    // Spaceship body
    this.ctx.fillStyle = this.player.color;
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x + this.player.width / 2, this.player.y);
    this.ctx.lineTo(this.player.x, this.player.y + this.player.height);
    this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height);
    this.ctx.closePath();
    this.ctx.fill();

    // Engine flame
    const flameSize = this.keys['ArrowLeft'] || this.keys['ArrowRight'] ? 25 : 15;
    this.ctx.fillStyle = this.keys[' '] ? '#ff0000' : '#ff5500';
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x + this.player.width / 2 - 10, this.player.y + this.player.height);
    this.ctx.lineTo(this.player.x + this.player.width / 2, this.player.y + this.player.height + flameSize);
    this.ctx.lineTo(this.player.x + this.player.width / 2 + 10, this.player.y + this.player.height);
    this.ctx.closePath();
    this.ctx.fill();

    // Spaceship details
    this.ctx.fillStyle = '#00d4ff';
    this.ctx.fillRect(this.player.x + this.player.width / 2 - 5, this.player.y + 10, 10, 10);

    this.ctx.globalAlpha = 1;

    // Draw shield
    if (this.player.isInvincible) {
      this.ctx.strokeStyle = '#00d4ff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        this.player.width / 2 + 10,
        0,
        Math.PI * 2
      );
      this.ctx.stroke();
    }
  }

  drawEnemies() {
    this.enemies.forEach(enemy => {
      // Enemy body
      this.ctx.fillStyle = enemy.color;
      this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

      // Enemy details
      this.ctx.fillStyle = enemy.isAdvanced ? '#ffff00' : '#ff9900';
      this.ctx.fillRect(enemy.x + 10, enemy.y + 10, 20, 20);

      // Health bar
      if (enemy.maxHealth > 1) {
        const healthWidth = (enemy.health / enemy.maxHealth) * enemy.width;
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(enemy.x, enemy.y - 10, healthWidth, 5);
      }

      // Draw eyes
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(enemy.x + 8, enemy.y + 15, 5, 5);
      this.ctx.fillRect(enemy.x + 27, enemy.y + 15, 5, 5);
    });
  }

  drawBullets() {
    this.player.bullets.forEach(bullet => {
      this.ctx.fillStyle = bullet.color;
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
  }

  drawPowerUps() {
    this.powerUps.forEach(powerUp => {
      this.ctx.fillStyle = powerUp.type === PowerUpType.LIFE ? '#ff0000' : '#ffff00';
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  // Particle system
  createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        radius: Math.random() * 2 + 1,
        color: color,
        life: 25
      });
    }
  }

  createExplosion(x, y) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        radius: Math.random() * 3 + 1,
        color: ['#ff0000', '#ff5500', '#ffff00'][Math.floor(Math.random() * 3)],
        life: 30
      });
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawParticles() {
    this.particles.forEach(p => {
      if (p.isText) {
        this.drawTextParticle(p);
      } else {
        this.ctx.globalAlpha = p.life / 30;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    this.ctx.globalAlpha = 1;
  }

  createFloatingText(x, y, text, color) {
    this.particles.push({
      x: x,
      y: y,
      text: text,
      color: color,
      vy: -1.5,
      life: 80,
      fontSize: 16,
      isText: true
    });
  }

  drawTextParticle(p) {
    this.ctx.globalAlpha = p.life / 80;
    this.ctx.fillStyle = p.color;
    this.ctx.font = `${p.fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(p.text, p.x, p.y);
    this.ctx.textAlign = 'left';
  }

  // UI methods
  updateUI() {
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    const levelElement = document.getElementById('level');

    if (scoreElement) scoreElement.textContent = this.gameState.score;
    if (livesElement) livesElement.textContent = this.gameState.lives;
    if (levelElement) levelElement.textContent = this.gameState.level;

    // Life color indicator
    if (livesElement) {
      if (this.gameState.lives <= 2) {
        livesElement.style.color = '#ff0000';
      } else if (this.gameState.lives <= 4) {
        livesElement.style.color = '#ff9900';
      } else {
        livesElement.style.color = '#00ff88';
      }
    }
  }

  updateEnemiesCount() {
    const enemiesElement = document.getElementById('enemies');
    if (enemiesElement) {
      enemiesElement.textContent = this.enemies.length;
    }
  }

  updateComboDisplay() {
    const comboElement = document.getElementById('combo');
    if (comboElement) {
      comboElement.textContent = this.gameState.combo;
    }
  }

  renderUI() {
    // Additional UI rendering if needed
  }
}