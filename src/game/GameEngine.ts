import { GameSettings, WeaponType } from './types';
import { sounds } from './SoundController';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number, hiScore: number) => void;
  onLivesUpdate: (lives: number) => void;
  onBombsUpdate: (bombs: number) => void;
  onWeaponUpdate: (weapon: WeaponType, power: number) => void;
  onGameOver: (finalScore: number, stage: number) => void;
  onVictory: (finalScore: number) => void;
  onStageChange: (stage: number, stageName: string) => void;
  onBossWarning: () => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;
  private settings: GameSettings;

  // Virtual Dimensions (Classic arcade 3:4 aspect ratio)
  public readonly W = 480;
  public readonly H = 640;

  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Game state
  public score: number = 0;
  public hiScore: number = 100000;
  public currentStage: number = 1;
  private frameCount: number = 0;
  private shakeAmount: number = 0;
  private bossWarningTimer: number = 0;

  // Input states
  public keys: Record<string, boolean> = {};
  public touchStick: { x: number; y: number; active: boolean } = { x: 0, y: 0, active: false };
  public touchButtons: { fire: boolean; bomb: boolean } = { fire: false, bomb: false };

  // Entities
  private player: PlayerCraft;
  private bullets: Bullet[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private lasers: ProtonLaserSegment[] = [];
  private missiles: HomingMissile[] = [];
  private bombs: BomberBlast[] = [];
  private items: DropItem[] = [];
  private enemies: EnemyCraft[] = [];
  private groundDecals: GroundDecal[] = [];
  private particles: GameParticle[] = [];
  private boss: BossEntity | null = null;
  private bossSpawned: boolean = false;

  // Terrain scroll
  private bgY: number = 0;

  constructor(canvas: HTMLCanvasElement, settings: GameSettings, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.settings = settings;
    this.callbacks = callbacks;

    // Load saved high score
    const savedHi = localStorage.getItem('raiden_hiscore');
    if (savedHi) {
      this.hiScore = Math.max(100000, parseInt(savedHi, 10) || 100000);
    }

    this.player = new PlayerCraft(this);
    this.initCanvasSize();
    this.bindEvents();
  }

  public updateSettings(newSettings: GameSettings): void {
    this.settings = newSettings;
    sounds.setVolumes(newSettings.sfxVolume, newSettings.musicVolume);
    sounds.setMusicEnabled(newSettings.musicEnabled);
  }

  private initCanvasSize(): void {
    // High DPI Canvas Scaling
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', () => this.initCanvasSize());
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    sounds.stopBgm();
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      this.togglePause();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  public start(): void {
    sounds.init();
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    sounds.startBgm(false);
    this.callbacks.onStageChange(this.currentStage, this.currentStage === 1 ? 'STAGE 1: 基地突擊 (Airbase Assault)' : 'STAGE 2: 鋼鐵要塞 (Steel Fortress)');
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    sounds.stopBgm();
  }

  public togglePause(): void {
    if (!this.isRunning) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      sounds.setMuted(true);
    } else {
      sounds.setMuted(false);
      this.lastTime = performance.now();
      this.loop();
    }
  }

  public reset(): void {
    this.score = 0;
    this.frameCount = 0;
    this.currentStage = 1;
    this.bossWarningTimer = 0;
    this.bullets = [];
    this.enemyBullets = [];
    this.lasers = [];
    this.missiles = [];
    this.bombs = [];
    this.items = [];
    this.enemies = [];
    this.groundDecals = [];
    this.particles = [];
    this.boss = null;
    this.bossSpawned = false;
    this.player.reset();
    this.updateHUD();
  }

  private updateHUD(): void {
    this.callbacks.onScoreUpdate(this.score, this.hiScore);
    this.callbacks.onLivesUpdate(this.player.lives);
    this.callbacks.onBombsUpdate(this.player.bombs);
    this.callbacks.onWeaponUpdate(this.player.weapon, this.player.power);
  }

  private lastTime = 0;
  private loop = (): void => {
    if (!this.isRunning || this.isPaused) return;

    this.update();
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  // --- Game Loop Update ---
  private update(): void {
    this.frameCount++;

    // Poll Gamepad API if available
    this.pollGamepad();

    // Check boss warning sequence
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer--;
    }

    // Player update
    this.player.update();

    // Enemy spawn script based on stage and score
    this.spawnEnemies();

    // Weapons update
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update();
      if (b.y < -20 || b.y > this.H + 20 || b.x < -20 || b.x > this.W + 20) {
        this.bullets.splice(i, 1);
        continue;
      }
      // Check collision with enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
          e.takeDamage(b.damage);
          this.createHitSparks(b.x, b.y, '#ffffaa');
          this.bullets.splice(i, 1);
          if (e.hp <= 0) {
            this.destroyEnemy(e);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
      // Check collision with boss
      if (this.boss && this.boss.isActive) {
        if (Math.hypot(this.boss.x - b.x, this.boss.y - b.y) < this.boss.hitRadius) {
          this.boss.takeDamage(b.damage);
          this.createHitSparks(b.x, b.y, '#ffffaa');
          this.bullets.splice(i, 1);
          if (this.boss.hp <= 0) {
            this.defeatBoss();
          }
        }
      }
    }

    // Update proton lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.update();
      if (l.life <= 0) {
        this.lasers.splice(i, 1);
      }
    }

    // Update homing missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.update(this.enemies, this.boss);
      // Collision with enemies
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.hypot(e.x - m.x, e.y - m.y) < e.radius + 12) {
          e.takeDamage(m.damage);
          sounds.playExplosion('small');
          this.createExplosion(m.x, m.y, 8, '#ff9900');
          this.missiles.splice(i, 1);
          hit = true;
          if (e.hp <= 0) {
            this.destroyEnemy(e);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
      if (hit) continue;

      if (this.boss && this.boss.isActive && Math.hypot(this.boss.x - m.x, this.boss.y - m.y) < this.boss.hitRadius) {
        this.boss.takeDamage(m.damage);
        sounds.playExplosion('small');
        this.createExplosion(m.x, m.y, 10, '#ff9900');
        this.missiles.splice(i, 1);
        if (this.boss.hp <= 0) {
          this.defeatBoss();
        }
        continue;
      }

      if (m.y < -30 || m.y > this.H + 30 || m.x < -30 || m.x > this.W + 30) {
        this.missiles.splice(i, 1);
      }
    }

    // Update bombs
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.update();

      // Clear all enemy bullets within blast radius
      for (let j = this.enemyBullets.length - 1; j >= 0; j--) {
        const eb = this.enemyBullets[j];
        if (Math.hypot(eb.x - bomb.x, eb.y - bomb.y) < bomb.radius + 40) {
          this.createHitSparks(eb.x, eb.y, '#00ffff');
          this.enemyBullets.splice(j, 1);
        }
      }

      // Damage enemies
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.hypot(e.x - bomb.x, e.y - bomb.y) < bomb.radius + e.radius) {
          e.takeDamage(3.0);
          if (e.hp <= 0) {
            this.destroyEnemy(e);
            this.enemies.splice(j, 1);
          }
        }
      }

      if (this.boss && this.boss.isActive && Math.hypot(this.boss.x - bomb.x, this.boss.y - bomb.y) < bomb.radius + 80) {
        this.boss.takeDamage(2.2);
        if (this.boss.hp <= 0) {
          this.defeatBoss();
        }
      }

      if (bomb.radius > bomb.maxRadius) {
        this.bombs.splice(i, 1);
      }
    }

    // Update enemy crafts
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this.player);

      // Check player collision
      if (this.player.invincible === 0 && Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.radius + 12) {
        this.killPlayer();
      }

      if (e.y > this.H + 60 || e.x < -60 || e.x > this.W + 60) {
        this.enemies.splice(i, 1);
      }
    }

    // Update boss
    if (this.boss) {
      this.boss.update(this.player);
      if (this.boss.isDefeated && this.boss.deathTimer <= 0) {
        this.boss = null;
      }
    }

    // Update enemy bullets
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.update();

      // Check player hit
      if (this.player.invincible === 0 && Math.hypot(eb.x - this.player.x, eb.y - this.player.y) < eb.radius + 4) {
        this.enemyBullets.splice(i, 1);
        this.killPlayer();
        continue;
      }

      if (eb.y > this.H + 30 || eb.y < -30 || eb.x < -30 || eb.x > this.W + 30) {
        this.enemyBullets.splice(i, 1);
      }
    }

    // Update items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update();

      // Pickup by player
      if (Math.hypot(item.x - this.player.x, item.y - this.player.y) < 28) {
        this.collectItem(item);
        this.items.splice(i, 1);
        continue;
      }

      if (item.y > this.H + 40) {
        this.items.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update ground decals (smoke, scorched earth)
    for (let i = this.groundDecals.length - 1; i >= 0; i--) {
      const d = this.groundDecals[i];
      d.y += 1.4; // scrolls with terrain
      d.life--;
      if (d.life <= 0 || d.y > this.H + 40) {
        this.groundDecals.splice(i, 1);
      }
    }
  }

  private pollGamepad(): void {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    if (!gamepads || !gamepads[0]) return;
    const gp = gamepads[0];
    if (!gp) return;

    // Left stick / D-pad
    const deadzone = 0.25;
    const axisX = gp.axes[0] || 0;
    const axisY = gp.axes[1] || 0;
    const dpadLeft = gp.buttons[14]?.pressed;
    const dpadRight = gp.buttons[15]?.pressed;
    const dpadUp = gp.buttons[12]?.pressed;
    const dpadDown = gp.buttons[13]?.pressed;

    this.keys['ArrowLeft'] = axisX < -deadzone || dpadLeft;
    this.keys['ArrowRight'] = axisX > deadzone || dpadRight;
    this.keys['ArrowUp'] = axisY < -deadzone || dpadUp;
    this.keys['ArrowDown'] = axisY > deadzone || dpadDown;

    // A/X (Button 0) for Shoot
    if (gp.buttons[0]?.pressed || gp.buttons[2]?.pressed) {
      this.keys['Space'] = true;
    }
    // B/Y (Button 1/3) for Bomb
    if (gp.buttons[1]?.pressed || gp.buttons[3]?.pressed) {
      this.player.tryDropBomb();
    }
  }

  private spawnEnemies(): void {
    // If boss is active, do not spawn regular formations
    if (this.boss) return;

    // Check boss trigger
    const bossScoreThreshold = this.currentStage === 1 ? 5000 : 16000;
    if (this.score >= bossScoreThreshold && !this.bossSpawned) {
      this.triggerBossEncounter();
      return;
    }

    const interval = this.settings.difficulty === 'HARD' ? 45 : (this.settings.difficulty === 'EASY' ? 80 : 60);

    if (this.frameCount % interval === 0) {
      const roll = Math.random();
      if (roll < 0.45) {
        // Formation of fast scout jets
        const startX = Math.random() * (this.W - 140) + 70;
        const count = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          setTimeout(() => {
            if (!this.isRunning || this.boss) return;
            this.enemies.push(new ScoutEnemy(startX + (i % 2 === 0 ? -15 : 15), -25, this));
          }, i * 180);
        }
      } else if (roll < 0.75) {
        // Ground Tank / Gun Turret
        const x = Math.random() * (this.W - 80) + 40;
        this.enemies.push(new TankEnemy(x, -35, this));
      } else if (roll < 0.92) {
        // Twin-Rotor Gunship Chopper
        const x = Math.random() * (this.W - 100) + 50;
        this.enemies.push(new ChopperEnemy(x, -40, this));
      } else {
        // Heavy Stealth Bomber
        this.enemies.push(new HeavyBomberEnemy(this.W / 2 + (Math.random() - 0.5) * 120, -50, this));
      }
    }
  }

  private triggerBossEncounter(): void {
    this.bossSpawned = true;
    this.bossWarningTimer = 180; // 3 seconds warning
    sounds.playWarning();
    this.callbacks.onBossWarning();

    setTimeout(() => {
      if (!this.isRunning) return;
      sounds.toggleBossBgm(true);
      if (this.currentStage === 1) {
        this.boss = new Stage1Boss(this);
      } else {
        this.boss = new Stage2Boss(this);
      }
    }, 2400);
  }

  private defeatBoss(): void {
    if (!this.boss || this.boss.isDefeated) return;
    this.boss.isDefeated = true;
    sounds.playExplosion('boss');
    this.shakeAmount = 30;
    this.addScore(15000);

    // Drop guaranteed power items & medals
    for (let i = 0; i < 4; i++) {
      this.items.push(new DropItem(this.boss.x + (i - 1.5) * 30, this.boss.y + 10, i % 2 === 0 ? 'BLUE' : 'RED'));
    }
    this.items.push(new DropItem(this.boss.x, this.boss.y - 20, 'BOMB'));

    setTimeout(() => {
      if (!this.isRunning) return;
      sounds.toggleBossBgm(false);

      if (this.currentStage === 1) {
        // Advance to Stage 2!
        this.currentStage = 2;
        this.boss = null;
        this.bossSpawned = false;
        this.callbacks.onStageChange(2, 'STAGE 2: 鋼鐵要塞 (Steel Fortress)');
      } else {
        // Game Cleared / Victory!
        this.isRunning = false;
        sounds.stopBgm();
        this.callbacks.onVictory(this.score);
      }
    }, 3800);
  }

  public killPlayer(): void {
    sounds.playExplosion('medium');
    this.shakeAmount = 20;
    this.createExplosion(this.player.x, this.player.y, 25, '#ff3300');

    this.player.lives--;
    this.updateHUD();

    if (this.player.lives < 0) {
      this.gameOver();
    } else {
      // Respawn with invulnerability & reduce power slightly
      this.player.x = this.W / 2;
      this.player.y = this.H - 80;
      this.player.power = Math.max(1, this.player.power - 1);
      this.player.invincible = 150;
      this.updateHUD();
    }
  }

  private gameOver(): void {
    this.isRunning = false;
    sounds.stopBgm();
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem('raiden_hiscore', this.hiScore.toString());
    }
    this.callbacks.onGameOver(this.score, this.currentStage);
  }

  public addScore(pts: number): void {
    this.score += pts;
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem('raiden_hiscore', this.hiScore.toString());
    }
    this.callbacks.onScoreUpdate(this.score, this.hiScore);
  }

  public destroyEnemy(e: EnemyCraft): void {
    sounds.playExplosion(e.type === 'heavy' ? 'medium' : 'small');
    this.addScore(e.scoreValue);

    // Create explosion & ground scorch
    this.createExplosion(e.x, e.y, e.type === 'tank' ? 14 : 18, '#ff6600');
    if (e.isGround) {
      this.groundDecals.push(new GroundDecal(e.x, e.y, 20, 300));
    }

    // Drop item rolls
    const dropRate = this.settings.difficulty === 'EASY' ? 0.42 : 0.28;
    if (Math.random() < dropRate) {
      const typeRoll = Math.random();
      let type: 'RED' | 'BLUE' | 'BOMB' | 'MEDAL' = 'RED';
      if (typeRoll < 0.4) type = 'RED';
      else if (typeRoll < 0.8) type = 'BLUE';
      else if (typeRoll < 0.92) type = 'MEDAL';
      else type = 'BOMB';

      this.items.push(new DropItem(e.x, e.y, type));
    }
  }

  public collectItem(item: DropItem): void {
    if (item.type === 'RED') {
      sounds.playItem();
      if (this.player.weapon === 'VULCAN') {
        this.player.power = Math.min(5, this.player.power + 1);
      } else {
        this.player.weapon = 'VULCAN';
      }
      this.addScore(1000);
    } else if (item.type === 'BLUE') {
      sounds.playItem();
      if (this.player.weapon === 'LASER') {
        this.player.power = Math.min(5, this.player.power + 1);
      } else {
        this.player.weapon = 'LASER';
      }
      this.addScore(1000);
    } else if (item.type === 'BOMB') {
      sounds.playItem();
      this.player.bombs = Math.min(7, this.player.bombs + 1);
      this.addScore(2000);
    } else if (item.type === 'MEDAL') {
      sounds.playMedal();
      this.addScore(3000);
    }
    this.updateHUD();
  }

  public fireVulcanBullet(x: number, y: number, vx: number, vy: number): void {
    this.bullets.push(new Bullet(x, y, vx, vy, 1.9));
  }

  public spawnLaserSegment(x: number, y: number, target: EnemyCraft | BossEntity | null, power: number): void {
    this.lasers.push(new ProtonLaserSegment(x, y, target, power, this));
  }

  public fireMissile(x: number, y: number): void {
    this.missiles.push(new HomingMissile(x, y));
  }

  public triggerBomb(x: number, y: number): void {
    this.bombs.push(new BomberBlast(x, y));
    this.shakeAmount = 28;
    sounds.playBombWhistle();
    setTimeout(() => {
      sounds.playExplosion('bomb');
    }, 220);
  }

  public spawnEnemyBullet(x: number, y: number, vx: number, vy: number, speedMultiplier: number = 1.0): void {
    const diffMod = this.settings.difficulty === 'HARD' ? 1.25 : (this.settings.difficulty === 'EASY' ? 0.8 : 1.0);
    this.enemyBullets.push(new EnemyBullet(x, y, vx * diffMod * speedMultiplier, vy * diffMod * speedMultiplier));
  }

  public createHitSparks(x: number, y: number, color: string): void {
    for (let i = 0; i < 4; i++) {
      this.particles.push(new GameParticle(x, y, color, 1.8, 12, 4));
    }
  }

  public createExplosion(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      this.particles.push(new GameParticle(x, y, color, 2.5 + Math.random() * 2, 20 + Math.random() * 10, 6));
      this.particles.push(new GameParticle(x, y, '#ffff00', 1.8, 14, 4));
    }
  }

  // --- Rendering ---
  private render(): void {
    const ctx = this.ctx;

    // Apply Screen Shake
    ctx.save();
    if (this.shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * this.shakeAmount;
      const sy = (Math.random() - 0.5) * this.shakeAmount;
      ctx.translate(sx, sy);
      this.shakeAmount *= 0.88;
      if (this.shakeAmount < 0.5) this.shakeAmount = 0;
    }

    // Draw multi-layer background
    this.drawBackground(ctx);

    // Draw Ground Decals (craters, scorch marks)
    for (const d of this.groundDecals) {
      d.draw(ctx);
    }

    // Draw Ground Enemies first (below player and lasers)
    for (const e of this.enemies) {
      if (e.isGround) e.draw(ctx);
    }

    // Draw Boss (if ground or hybrid)
    if (this.boss && this.boss.isGround) {
      this.boss.draw(ctx);
    }

    // Draw Pickups / Items
    for (const item of this.items) {
      item.draw(ctx, this.frameCount);
    }

    // Draw Flying Enemies
    for (const e of this.enemies) {
      if (!e.isGround) e.draw(ctx);
    }

    // Draw Aerial Boss
    if (this.boss && !this.boss.isGround) {
      this.boss.draw(ctx);
    }

    // Draw Missiles
    for (const m of this.missiles) {
      m.draw(ctx);
    }

    // Draw Player Vulcan Bullets
    for (const b of this.bullets) {
      b.draw(ctx);
    }

    // Draw Proton Lasers (Rendered on top of player and enemies with high glow)
    for (const l of this.lasers) {
      l.draw(ctx, this.frameCount);
    }

    // Draw Player Craft
    this.player.draw(ctx, this.frameCount);

    // Draw Enemy Bullets
    for (const eb of this.enemyBullets) {
      eb.draw(ctx, this.frameCount);
    }

    // Draw Bomb Shockwaves
    for (const bomb of this.bombs) {
      bomb.draw(ctx);
    }

    // Draw Particles
    for (const p of this.particles) {
      p.draw(ctx);
    }

    // Draw Boss Warning Overlay if active
    if (this.bossWarningTimer > 0) {
      this.drawBossWarning(ctx);
    }

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    this.bgY = (this.bgY + 1.4) % this.H;

    if (this.currentStage === 1) {
      // Stage 1: Verdant Countryside, Military Airfield & River
      ctx.fillStyle = '#172814'; // Lush military green base
      ctx.fillRect(0, 0, this.W, this.H);

      // River layer
      ctx.fillStyle = '#143c4f';
      ctx.beginPath();
      ctx.moveTo(90, 0);
      ctx.bezierCurveTo(150, this.H * 0.3 + this.bgY, 50, this.H * 0.7 + this.bgY, 120, this.H);
      ctx.lineTo(190, this.H);
      ctx.bezierCurveTo(110, this.H * 0.7 + this.bgY, 210, this.H * 0.3 + this.bgY, 150, 0);
      ctx.fill();

      // Highway / Airbase runway stripes
      ctx.fillStyle = '#2d332c';
      ctx.fillRect(290, 0, 90, this.H);

      // Runway markings
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -this.bgY * 1.5;
      ctx.beginPath();
      ctx.moveTo(335, 0);
      ctx.lineTo(335, this.H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Forest canopy clumps
      ctx.fillStyle = '#11200e';
      for (let y = (this.bgY % 80) - 80; y < this.H + 80; y += 80) {
        ctx.beginPath();
        ctx.arc(40, y + 20, 24, 0, Math.PI * 2);
        ctx.arc(60, y + 35, 20, 0, Math.PI * 2);
        ctx.arc(430, y + 40, 28, 0, Math.PI * 2);
        ctx.arc(450, y + 15, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Stage 2: Heavy Industrial Steel Base / Molten Silos
      ctx.fillStyle = '#1c1f24';
      ctx.fillRect(0, 0, this.W, this.H);

      // Iron floor grids
      ctx.strokeStyle = '#2b323d';
      ctx.lineWidth = 1;
      for (let x = 0; x < this.W; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.H);
        ctx.stroke();
      }
      for (let y = (this.bgY % 48); y < this.H; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.W, y);
        ctx.stroke();
      }

      // Molten conduit pipes
      ctx.fillStyle = '#4a2c14';
      ctx.fillRect(110, 0, 36, this.H);
      ctx.fillStyle = '#ff5500';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 10;
      ctx.fillRect(124, 0, 8, this.H);
      ctx.shadowBlur = 0;
    }
  }

  private drawBossWarning(ctx: CanvasRenderingContext2D): void {
    const isFlashing = Math.floor(this.frameCount / 8) % 2 === 0;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, this.H * 0.38, this.W, 110);

    ctx.fillStyle = isFlashing ? '#ff0033' : '#ffcc00';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ WARNING ⚠', this.W / 2, this.H * 0.44);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('MASSIVE ENEMY BATTLESHIP APPROACHING', this.W / 2, this.H * 0.49);
    ctx.fillText('PREPARE FOR ENGAGEMENT', this.W / 2, this.H * 0.53);
    ctx.restore();
  }
}

// --- Player Fighter Craft (Raiden Mk-II Fighting Thunder) ---
class PlayerCraft {
  private engine: GameEngine;
  public x: number;
  public y: number;
  public readonly w: number = 36;
  public readonly h: number = 38;
  public speed: number = 4.8;
  public lives: number = 3;
  public bombs: number = 3;
  public weapon: WeaponType = 'LASER';
  public power: number = 1;
  public invincible: number = 120;
  private shootTimer: number = 0;
  private tilt: number = 0; // -1 (left), 0 (center), +1 (right)

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.x = engine.W / 2;
    this.y = engine.H - 80;
  }

  public reset(): void {
    this.x = this.engine.W / 2;
    this.y = this.engine.H - 80;
    this.lives = 3;
    this.bombs = 3;
    this.weapon = 'LASER';
    this.power = 1;
    this.invincible = 120;
    this.shootTimer = 0;
    this.tilt = 0;
  }

  public update(): void {
    if (this.invincible > 0) this.invincible--;

    let dx = 0;
    let dy = 0;

    // Keyboard Input
    if (this.engine.keys['ArrowLeft'] || this.engine.keys['KeyA']) dx -= 1;
    if (this.engine.keys['ArrowRight'] || this.engine.keys['KeyD']) dx += 1;
    if (this.engine.keys['ArrowUp'] || this.engine.keys['KeyW']) dy -= 1;
    if (this.engine.keys['ArrowDown'] || this.engine.keys['KeyS']) dy += 1;

    // Mobile Virtual Touch Joystick
    if (this.engine.touchStick.active) {
      dx += this.engine.touchStick.x;
      dy += this.engine.touchStick.y;
    }

    // Normalize diagonal speed
    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx = (dx / len);
      dy = (dy / len);
    }

    this.x += dx * this.speed;
    this.y += dy * this.speed;

    // Keep inside bounds
    this.x = Math.max(this.w / 2, Math.min(this.engine.W - this.w / 2, this.x));
    this.y = Math.max(this.h / 2, Math.min(this.engine.H - this.h / 2, this.y));

    // Banking tilt animation
    if (dx < -0.2) this.tilt = Math.max(-1, this.tilt - 0.25);
    else if (dx > 0.2) this.tilt = Math.min(1, this.tilt + 0.25);
    else this.tilt *= 0.65;

    // Shooting
    this.shootTimer++;
    const isAutoFire = true; // Auto-fire enabled by default for authentic responsiveness
    const isShootingKey = this.engine.keys['KeyJ'] || this.engine.keys['KeyZ'] || this.engine.keys['Space'] || this.engine.touchButtons.fire || isAutoFire;

    const rate = this.weapon === 'VULCAN' ? 5 : 6;
    if (isShootingKey && this.shootTimer >= rate) {
      this.shoot();
      this.shootTimer = 0;
    }

    // Bomb key
    if (this.engine.keys['KeyK'] || this.engine.keys['KeyX'] || this.engine.touchButtons.bomb) {
      this.engine.keys['KeyK'] = false;
      this.engine.keys['KeyX'] = false;
      this.engine.touchButtons.bomb = false;
      this.tryDropBomb();
    }
  }

  public tryDropBomb(): void {
    if (this.bombs > 0) {
      this.bombs--;
      this.engine.triggerBomb(this.x, this.y - 40);
      this.engine.addScore(100);
    }
  }

  private shoot(): void {
    if (this.weapon === 'VULCAN') {
      sounds.playVulcanShoot();
      // Vulcan Spread
      const streams = this.power * 2 + 1;
      const spreadStep = 0.08 + this.power * 0.02;
      const startAngle = -Math.PI / 2 - ((streams - 1) * spreadStep) / 2;

      for (let i = 0; i < streams; i++) {
        const angle = startAngle + i * spreadStep;
        const speed = 12;
        this.engine.fireVulcanBullet(
          this.x,
          this.y - 14,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        );
      }
    } else {
      // Proton Laser
      sounds.playLaserHum();
      // Find nearest aerial or ground target in front of player
      let target: EnemyCraft | BossEntity | null = null;
      let minDistance = 420;

      const candidates: (EnemyCraft | BossEntity)[] = [...(this.engine as any).enemies];
      if ((this.engine as any).boss && (this.engine as any).boss.isActive) {
        candidates.push((this.engine as any).boss);
      }

      for (const e of candidates) {
        if (e.y < this.y) {
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d < minDistance) {
            minDistance = d;
            target = e;
          }
        }
      }

      this.engine.spawnLaserSegment(this.x, this.y - 12, target, this.power);
    }

    // Secondary sub-missiles from wings at power >= 2
    if (this.power >= 2 && Math.floor(this.engine['frameCount']) % 14 === 0) {
      sounds.playMissileLaunch();
      this.engine.fireMissile(this.x - 14, this.y);
      this.engine.fireMissile(this.x + 14, this.y);
    }
  }

  public draw(ctx: CanvasRenderingContext2D, frame: number): void {
    if (this.invincible > 0 && Math.floor(frame / 4) % 2 === 0) return; // Invulnerability blink

    ctx.save();
    ctx.translate(this.x, this.y);

    // Afterburners jet flame
    const flameH = 14 + Math.random() * 10;
    ctx.fillStyle = frame % 2 === 0 ? '#ffaa00' : '#ff3300';
    ctx.beginPath();
    ctx.moveTo(-7, 16);
    ctx.lineTo(-4, 16 + flameH);
    ctx.lineTo(-1, 16);
    ctx.moveTo(1, 16);
    ctx.lineTo(4, 16 + flameH);
    ctx.lineTo(7, 16);
    ctx.fill();

    // Red Fighter Fuselage (with banking tilt matrix)
    const tiltScaleX = 1 - Math.abs(this.tilt) * 0.28;
    ctx.scale(tiltScaleX, 1);

    // Main Crimson Body
    ctx.fillStyle = '#d31027';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(7, -4);
    ctx.lineTo(17, 8);
    ctx.lineTo(17, 16);
    ctx.lineTo(6, 14);
    ctx.lineTo(0, 17);
    ctx.lineTo(-6, 14);
    ctx.lineTo(-17, 16);
    ctx.lineTo(-17, 8);
    ctx.lineTo(-7, -4);
    ctx.closePath();
    ctx.fill();

    // Gold Wing Accents
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(-16, 10, 4, 4);
    ctx.fillRect(12, 10, 4, 4);

    // Canards & Intakes
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(-6, 0, 3, 10);
    ctx.fillRect(3, 0, 3, 10);

    // Cockpit Glass
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(0, -4, 3.2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}

// --- Iconic Raiden Curved Proton Laser (質子雷射) ---
class ProtonLaserSegment {
  public life: number = 7;
  private power: number;
  private nodes: { x: number; y: number }[] = [];
  private engine: GameEngine;

  constructor(
    startX: number,
    startY: number,
    target: EnemyCraft | BossEntity | null,
    power: number,
    engine: GameEngine
  ) {
    this.engine = engine;
    this.power = power;
    const damage = 1.8 + power * 1.0;

    // Build curved whip path with physics wave
    const steps = 16;
    let currX = startX;
    let currY = startY;

    // Target tracking or upward beam
    const targetX = target ? target.x : startX + Math.sin(engine['frameCount'] * 0.25) * 28;
    const targetY = target ? target.y : 0;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Signature Raiden bendy wave formula
      const wave = Math.sin(engine['frameCount'] * 0.45 + i * 0.6) * (1 - t) * 12;
      const nx = (1 - t) * currX + t * targetX + wave;
      const ny = (1 - t) * currY + t * targetY;
      this.nodes.push({ x: nx, y: ny });
    }

    // Direct damage & electric arc sparks on target
    if (target && target.hp > 0) {
      target.takeDamage(damage);
      engine.createHitSparks(target.x + (Math.random() - 0.5) * 16, target.y + (Math.random() - 0.5) * 16, '#00ffff');
      if (target.hp <= 0) {
        if ('isBoss' in target) {
          (engine as any).defeatBoss();
        } else {
          engine.destroyEnemy(target as EnemyCraft);
          const idx = (engine as any).enemies.indexOf(target);
          if (idx !== -1) (engine as any).enemies.splice(idx, 1);
        }
      }
    }
  }

  public update(): void {
    this.life--;
  }

  public draw(ctx: CanvasRenderingContext2D, _frame: number): void {
    if (this.nodes.length < 2) return;

    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14 + this.power * 3;

    // Outer Neon Cyan Plasma Glow
    ctx.strokeStyle = `rgba(0, 210, 255, ${0.75 + Math.random() * 0.25})`;
    ctx.lineWidth = 4 + this.power * 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
    for (let i = 1; i < this.nodes.length; i++) {
      ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
    }
    ctx.stroke();

    // High Energy White Core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8 + this.power * 0.9;
    ctx.beginPath();
    ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
    for (let i = 1; i < this.nodes.length; i++) {
      ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
    }
    ctx.stroke();

    ctx.restore();
  }
}

// --- Player Vulcan Bullet ---
class Bullet {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number = 3.5;
  public damage: number;

  constructor(x: number, y: number, vx: number, vy: number, damage: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
  }

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = '#ffdf00';
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Homing Wing Missile ---
class HomingMissile {
  public x: number;
  public y: number;
  private vx: number = 0;
  private vy: number = -4;
  private speed: number = 7.5;
  public damage: number = 4.5;
  private target: EnemyCraft | BossEntity | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(enemies: EnemyCraft[], boss: BossEntity | null): void {
    if (!this.target || this.target.hp <= 0) {
      let minDist = 600;
      const list: (EnemyCraft | BossEntity)[] = [...enemies];
      if (boss && boss.isActive) list.push(boss);

      for (const e of list) {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < minDist) {
          minDist = d;
          this.target = e;
        }
      }
    }

    if (this.target) {
      const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
    } else {
      this.vy = -this.speed;
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = '#ff9900';
    ctx.fillRect(this.x - 2, this.y - 5, 4, 10);
    // Smoke trail dot
    ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 7, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Screen Clearing Bomber Blast ---
class BomberBlast {
  public x: number;
  public y: number;
  public radius: number = 10;
  public readonly maxRadius: number = 280;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(): void {
    this.radius += 7.5;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const grad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.15, this.x, this.y, this.radius);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.3, 'rgba(255, 220, 50, 0.85)');
    grad.addColorStop(0.65, 'rgba(255, 60, 0, 0.55)');
    grad.addColorStop(1, 'rgba(120, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Enemy Bullet ---
class EnemyBullet {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number = 4;

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
  }

  public draw(ctx: CanvasRenderingContext2D, _frame: number): void {
    ctx.save();
    // Glowing red orb with white hot center
    ctx.fillStyle = '#ff1100';
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Drop Items (Red P, Blue L, Gold Medal, Bomb B) ---
class DropItem {
  public x: number;
  public y: number;
  private vx: number;
  private vy: number = 1.3;
  public type: 'RED' | 'BLUE' | 'BOMB' | 'MEDAL';
  private timer: number = 0;

  constructor(x: number, y: number, type: 'RED' | 'BLUE' | 'BOMB' | 'MEDAL') {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1.8;
    this.type = type;
  }

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 25 || this.x > 455) this.vx *= -1;

    this.timer++;
    // Classic Raiden item flip between Red and Blue every 3.5 seconds
    if (this.timer % 210 === 0 && (this.type === 'RED' || this.type === 'BLUE')) {
      this.type = this.type === 'RED' ? 'BLUE' : 'RED';
    }
  }

  public draw(ctx: CanvasRenderingContext2D, frame: number): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.type === 'RED') {
      ctx.fillStyle = '#ff1e1e';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 8;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('P', 0, 4);
    } else if (this.type === 'BLUE') {
      ctx.fillStyle = '#00c3ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('L', 0, 4);
    } else if (this.type === 'BOMB') {
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ffbb00';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('B', 0, 4);
    } else if (this.type === 'MEDAL') {
      // Golden star medal
      ctx.fillStyle = frame % 10 < 5 ? '#ffd700' : '#ffea00';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#996515';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★', 0, 3.5);
    }
    ctx.restore();
  }
}

// --- Enemy Base Class ---
abstract class EnemyCraft {
  public x: number;
  public y: number;
  public hp: number;
  public radius: number;
  public scoreValue: number;
  public isGround: boolean;
  public type: 'scout' | 'tank' | 'chopper' | 'heavy';
  protected engine: GameEngine;

  constructor(x: number, y: number, hp: number, radius: number, score: number, isGround: boolean, type: 'scout' | 'tank' | 'chopper' | 'heavy', engine: GameEngine) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.radius = radius;
    this.scoreValue = score;
    this.isGround = isGround;
    this.type = type;
    this.engine = engine;
  }

  public takeDamage(dmg: number): void {
    this.hp -= dmg;
  }

  abstract update(player: PlayerCraft): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;
}

// Scout Interceptor Jet
class ScoutEnemy extends EnemyCraft {
  private vy: number = 3.6;
  private vx: number = 0;
  private shootTimer: number = 0;

  constructor(x: number, y: number, engine: GameEngine) {
    super(x, y, 2.5, 14, 250, false, 'scout', engine);
    this.vx = (Math.random() - 0.5) * 1.5;
  }

  public update(player: PlayerCraft): void {
    this.y += this.vy;
    this.x += this.vx;

    this.shootTimer++;
    if (this.shootTimer >= 55 && this.y > 40 && this.y < this.engine.H - 120) {
      this.shootTimer = 0;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      this.engine.spawnEnemyBullet(this.x, this.y, Math.cos(angle) * 3.8, Math.sin(angle) * 3.8);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(12, -10);
    ctx.lineTo(0, -6);
    ctx.lineTo(-12, -10);
    ctx.closePath();
    ctx.fill();

    // Red wing markings
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-10, -5, 4, 3);
    ctx.fillRect(6, -5, 4, 3);
    ctx.restore();
  }
}

// Heavy Ground Tank
class TankEnemy extends EnemyCraft {
  private turretAngle: number = 0;
  private shootTimer: number = 0;

  constructor(x: number, y: number, engine: GameEngine) {
    super(x, y, 9, 18, 600, true, 'tank', engine);
  }

  public update(player: PlayerCraft): void {
    this.y += 1.4; // Moves forward along ground
    this.turretAngle = Math.atan2(player.y - this.y, player.x - this.x);

    this.shootTimer++;
    if (this.shootTimer >= 75 && this.y > 60 && this.y < this.engine.H - 140) {
      this.shootTimer = 0;
      this.engine.spawnEnemyBullet(
        this.x + Math.cos(this.turretAngle) * 16,
        this.y + Math.sin(this.turretAngle) * 16,
        Math.cos(this.turretAngle) * 4.2,
        Math.sin(this.turretAngle) * 4.2
      );
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Tread Base
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(-16, -14, 32, 28);

    // Armor Hull
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(-12, -10, 24, 20);

    // Rotating Turret
    ctx.save();
    ctx.rotate(this.turretAngle);
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, -2.5, 18, 5);
    ctx.fillStyle = '#718096';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}

// Gunship Helicopter
class ChopperEnemy extends EnemyCraft {
  private rotorAngle: number = 0;
  private shootTimer: number = 0;

  constructor(x: number, y: number, engine: GameEngine) {
    super(x, y, 16, 20, 900, false, 'chopper', engine);
  }

  public update(player: PlayerCraft): void {
    this.y += 1.8;
    this.rotorAngle += 0.8;

    this.shootTimer++;
    if (this.shootTimer >= 80 && this.y > 50 && this.y < this.engine.H - 150) {
      this.shootTimer = 0;
      // Twin shot
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      this.engine.spawnEnemyBullet(this.x - 8, this.y, Math.cos(angle - 0.1) * 4.0, Math.sin(angle - 0.1) * 4.0);
      this.engine.spawnEnemyBullet(this.x + 8, this.y, Math.cos(angle + 0.1) * 4.0, Math.sin(angle + 0.1) * 4.0);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rotor blades blur
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-24 * Math.cos(this.rotorAngle), -24 * Math.sin(this.rotorAngle));
    ctx.lineTo(24 * Math.cos(this.rotorAngle), 24 * Math.sin(this.rotorAngle));
    ctx.stroke();

    // Fuselage
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail boom
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-3, -20, 6, 14);

    // Cockpit
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(0, 4, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Heavy Stealth Bomber
class HeavyBomberEnemy extends EnemyCraft {
  private shootTimer: number = 0;

  constructor(x: number, y: number, engine: GameEngine) {
    super(x, y, 32, 28, 1800, false, 'heavy', engine);
  }

  public update(player: PlayerCraft): void {
    this.y += 1.2;
    this.shootTimer++;

    if (this.shootTimer >= 95 && this.y > 40 && this.y < this.engine.H - 120) {
      this.shootTimer = 0;
      // 5-way spread fan
      const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
      for (let i = -2; i <= 2; i++) {
        const a = baseAngle + i * 0.22;
        this.engine.spawnEnemyBullet(this.x, this.y + 10, Math.cos(a) * 3.6, Math.sin(a) * 3.6);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(34, -14);
    ctx.lineTo(14, -8);
    ctx.lineTo(0, -18);
    ctx.lineTo(-14, -8);
    ctx.lineTo(-34, -14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
}

// --- Boss Entities ---
abstract class BossEntity {
  public x: number;
  public y: number;
  public hp: number;
  public maxHp: number;
  public hitRadius: number;
  public isGround: boolean;
  public isActive: boolean = true;
  public isDefeated: boolean = false;
  public deathTimer: number = 100;
  protected engine: GameEngine;

  constructor(x: number, y: number, hp: number, hitRadius: number, isGround: boolean, engine: GameEngine) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
    this.hitRadius = hitRadius;
    this.isGround = isGround;
    this.engine = engine;
  }

  public takeDamage(dmg: number): void {
    if (this.isDefeated) return;
    this.hp -= dmg;
  }

  abstract update(player: PlayerCraft): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;
}

// Stage 1 Boss: Goliath Tank Fortress
class Stage1Boss extends BossEntity {
  private targetY: number = 120;
  private vx: number = 1.8;
  private timer: number = 0;

  constructor(engine: GameEngine) {
    super(engine.W / 2, -90, 220, 65, true, engine);
  }

  public update(player: PlayerCraft): void {
    if (this.isDefeated) {
      this.deathTimer--;
      if (Math.random() < 0.4) {
        this.engine.createExplosion(
          this.x + (Math.random() - 0.5) * 90,
          this.y + (Math.random() - 0.5) * 60,
          8,
          '#ff6600'
        );
      }
      return;
    }

    if (this.y < this.targetY) {
      this.y += 1.2;
    } else {
      this.x += this.vx;
      if (this.x < 100 || this.x > this.engine.W - 100) this.vx *= -1;
    }

    this.timer++;

    // Attack 1: Circular Bullet Spray
    if (this.timer % 65 === 0) {
      for (let i = -3; i <= 3; i++) {
        const angle = Math.PI / 2 + i * 0.22;
        this.engine.spawnEnemyBullet(this.x, this.y + 24, Math.cos(angle) * 4.2, Math.sin(angle) * 4.2);
      }
    }

    // Attack 2: Dual Turret Direct Aim
    if (this.timer % 90 === 0) {
      const a1 = Math.atan2(player.y - this.y, player.x - (this.x - 38));
      const a2 = Math.atan2(player.y - this.y, player.x - (this.x + 38));
      this.engine.spawnEnemyBullet(this.x - 38, this.y + 20, Math.cos(a1) * 4.8, Math.sin(a1) * 4.8);
      this.engine.spawnEnemyBullet(this.x + 38, this.y + 20, Math.cos(a2) * 4.8, Math.sin(a2) * 4.8);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Fortress Hull
    ctx.fillStyle = '#334155';
    ctx.fillRect(-65, -40, 130, 80);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-55, -30, 110, 60);

    // Glowing Core
    const isRed = Math.floor(this.timer / 6) % 2 === 0;
    ctx.fillStyle = isRed ? '#ef4444' : '#f97316';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dual Heavy Cannons
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-45, 25, 12, 22);
    ctx.fillRect(33, 25, 12, 22);
    ctx.fillRect(-10, 30, 20, 25);

    ctx.restore();

    // Boss Health Bar at top of canvas
    this.drawHealthBar(ctx, 'GOLIATH DREADNOUGHT');
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D, name: string): void {
    ctx.save();
    const barW = this.engine.W - 120;
    const barX = 60;
    const barY = 24;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, 18);

    const ratio = Math.max(0, this.hp) / this.maxHp;
    ctx.fillStyle = ratio > 0.3 ? '#ef4444' : '#ff0055';
    ctx.fillRect(barX, barY, barW * ratio, 14);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${name} [BOSS]`, this.engine.W / 2, barY + 11);
    ctx.restore();
  }
}

// Stage 2 Boss: Aero-Fortress Behemoth
class Stage2Boss extends BossEntity {
  private targetY: number = 130;
  private vx: number = 2.2;
  private timer: number = 0;

  constructor(engine: GameEngine) {
    super(engine.W / 2, -100, 340, 75, false, engine);
  }

  public update(player: PlayerCraft): void {
    if (this.isDefeated) {
      this.deathTimer--;
      if (Math.random() < 0.5) {
        this.engine.createExplosion(
          this.x + (Math.random() - 0.5) * 110,
          this.y + (Math.random() - 0.5) * 80,
          10,
          '#ff3300'
        );
      }
      return;
    }

    if (this.y < this.targetY) {
      this.y += 1.0;
    } else {
      this.x += this.vx;
      if (this.x < 110 || this.x > this.engine.W - 110) this.vx *= -1;
    }

    this.timer++;

    // Pattern 1: Spiral Wave
    if (this.timer % 50 === 0) {
      const count = 10;
      for (let i = 0; i < count; i++) {
        const angle = (this.timer * 0.1) + (i * (Math.PI * 2)) / count;
        this.engine.spawnEnemyBullet(this.x, this.y + 15, Math.cos(angle) * 3.8, Math.sin(angle) * 3.8);
      }
    }

    // Pattern 2: Triple High-Speed Streams to Player
    if (this.timer % 80 === 0) {
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      this.engine.spawnEnemyBullet(this.x, this.y + 25, Math.cos(a) * 5.5, Math.sin(a) * 5.5);
      this.engine.spawnEnemyBullet(this.x - 30, this.y + 25, Math.cos(a - 0.15) * 5.5, Math.sin(a - 0.15) * 5.5);
      this.engine.spawnEnemyBullet(this.x + 30, this.y + 25, Math.cos(a + 0.15) * 5.5, Math.sin(a + 0.15) * 5.5);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Flying Wing Armor
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(0, 45);
    ctx.lineTo(85, -25);
    ctx.lineTo(60, -45);
    ctx.lineTo(0, -30);
    ctx.lineTo(-60, -45);
    ctx.lineTo(-85, -25);
    ctx.closePath();
    ctx.fill();

    // Shield Generator Core
    ctx.fillStyle = '#8b5cf6';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Wingtip Jet Burners
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(-70, -48, 8, 12);
    ctx.fillRect(62, -48, 8, 12);

    ctx.restore();

    this.drawHealthBar(ctx, 'AERO-FORTRESS BEHEMOTH');
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D, name: string): void {
    ctx.save();
    const barW = this.engine.W - 120;
    const barX = 60;
    const barY = 24;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, 18);

    const ratio = Math.max(0, this.hp) / this.maxHp;
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(barX, barY, barW * ratio, 14);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${name} [FINAL BOSS]`, this.engine.W / 2, barY + 11);
    ctx.restore();
  }
}

// Ground Decal (Craters / Scorch)
class GroundDecal {
  public x: number;
  public y: number;
  private radius: number;
  public life: number;

  constructor(x: number, y: number, radius: number, life: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.life = life;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 20, 15, 0.45)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Particle
class GameParticle {
  public x: number;
  public y: number;
  private vx: number;
  private vy: number;
  private color: string;
  private size: number;
  public life: number;
  private maxLife: number;

  constructor(x: number, y: number, color: string, size: number, maxLife: number, speed: number) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.life = maxLife;
    this.maxLife = maxLife;
    const angle = Math.random() * Math.PI * 2;
    const spd = (Math.random() * 0.8 + 0.2) * speed;
    this.vx = Math.cos(angle) * spd;
    this.vy = Math.sin(angle) * spd;
  }

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
