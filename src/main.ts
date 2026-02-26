import './style.css';
import type { Bullet, Enemy, Powerup, Boss, Star, Player } from './types';
import { BASE_WIDTH, BASE_HEIGHT } from './types';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Responsive canvas sizing
function resizeCanvas(): void {
  const container = document.getElementById('gameContainer')!;
  const rect = container.getBoundingClientRect();
  canvas.width = Math.min(rect.width, BASE_WIDTH);
  canvas.height = Math.min(rect.height, BASE_HEIGHT);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function scale(val: number): number {
  return val * (canvas.width / BASE_WIDTH);
}

// Game state
let gameRunning = false;
let score = 0;
let lives = 3;
let wave = 1;
let inBossFight = false;

// High score (localStorage)
let highScore = parseInt(localStorage.getItem('burgerInvadersHighScore') || '0');

// Boss definitions
const bosses: Boss[] = [
  { name: 'MEGA BURGER', health: 30, speed: 2, color: '#8b4513' },
  { name: 'KING DOUBLE', health: 45, speed: 2.5, color: '#d2691e' },
  { name: 'ULTRA STACK', health: 60, speed: 3, color: '#cd853f' },
  { name: 'BOSS BURGER', health: 80, speed: 3.5, color: '#daa520' },
  { name: 'MEGA KING', health: 100, speed: 4, color: '#ff6b35' }
];

let currentBoss: Boss | null = null;
let bossX = 300;
let bossY = 80;
let bossDirection = 1;
let bossHealth = 0;
let bossMaxHealth = 0;
let bossShootTimer = 0;
let bossBullets: Bullet[] = [];

// Player
const player: Player = {
  _x: 275,
  _y: 650,
  width: 50,
  height: 40,
  color: '#00ff88',
  bullets: [],
  shootCooldown: 0,
  powerup: null,
  powerupTimer: 0,
  lastLauncher: undefined
};

// Enemies
let enemies: Enemy[] = [];
let enemyDirection = 1;
let enemySpeed = 1;
let enemyBullets: Bullet[] = [];

// Powerups
let powerups: Powerup[] = [];

// Stars background
const starCount = 80;
const stars: Star[] = Array.from({ length: starCount }, () => ({
  x: Math.random() * BASE_WIDTH,
  y: Math.random() * BASE_HEIGHT,
  size: Math.random() * 2 + 0.5,
  speed: Math.random() * 0.5 + 0.2
}));

// Input
const keys: Record<string, boolean> = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; e.preventDefault(); });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Touch controls
const touchLeft = document.getElementById('touchLeft')!;
const touchRight = document.getElementById('touchRight')!;

function handleTouchStart(side: string) {
  return function(e: TouchEvent) {
    e.preventDefault();
    keys[side] = true;
    keys['TouchShoot'] = true;
  };
}

function handleTouchEnd(side: string) {
  return function(e: TouchEvent) {
    e.preventDefault();
    keys[side] = false;
    keys['TouchShoot'] = false;
  };
}

touchLeft.addEventListener('touchstart', handleTouchStart('ArrowLeft'), { passive: false });
touchLeft.addEventListener('touchend', handleTouchEnd('ArrowLeft'), { passive: false });
touchRight.addEventListener('touchstart', handleTouchStart('ArrowRight'), { passive: false });
touchRight.addEventListener('touchend', handleTouchEnd('ArrowRight'), { passive: false });

document.getElementById('touchLeft')!.style.display = 'none';
document.getElementById('touchRight')!.style.display = 'none';

// Update high score displays on load
function updateHighScoreDisplays(): void {
  document.getElementById('highScoreStart')!.textContent = highScore.toString();
  document.getElementById('highScoreDisplay')!.textContent = highScore.toString();
}
updateHighScoreDisplays();

function drawPlayer(): void {
  const x = player._x;
  const y = player._y;
  
  // Damage level (0 = full health, 1 = no health)
  const damageLevel = (3 - lives) / 3;
  
  // Flicker when critically damaged
  if (lives === 1 && Math.random() > 0.7) {
    return; // Skip drawing every few frames for flicker effect
  }

  // Engine glow - gets weaker with damage
  const engineStrength = 1 - damageLevel * 0.7;
  const glowSize = (8 + Math.random() * 4) * engineStrength;
  const glowColor = damageLevel > 0.5 ? 'rgba(255, 100, 50, 0.8)' : 'rgba(0, 255, 136, 0.8)';
  const gradient = ctx.createRadialGradient(scale(x + 25), scale(y + 45), 0, scale(x + 25), scale(y + 45), scale(glowSize));
  gradient.addColorStop(0, glowColor);
  gradient.addColorStop(0.5, 'rgba(255, 107, 53, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(scale(x + 25), scale(y + 45), scale(glowSize), 0, Math.PI * 2);
  ctx.fill();

  // Main body - changes color based on damage
  const bodyColor = damageLevel > 0.6 ? '#4a2a2a' : damageLevel > 0.3 ? '#2a2a3e' : '#1a1a2e';
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(scale(x + 25), scale(y));
  ctx.lineTo(scale(x + 40), scale(y + 30));
  ctx.lineTo(scale(x + 35), scale(y + 35));
  ctx.lineTo(scale(x + 28), scale(y + 30));
  ctx.lineTo(scale(x + 25), scale(y + 35));
  ctx.lineTo(scale(x + 22), scale(y + 30));
  ctx.lineTo(scale(x + 15), scale(y + 35));
  ctx.lineTo(scale(x + 10), scale(y + 30));
  ctx.closePath();
  ctx.fill();
  
  // Damage cracks/scratches
  if (damageLevel > 0.3) {
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scale(x + 20), scale(y + 10));
    ctx.lineTo(scale(x + 25), scale(y + 20));
    ctx.lineTo(scale(x + 22), scale(y + 28));
    ctx.stroke();
  }
  if (damageLevel > 0.6) {
    ctx.beginPath();
    ctx.moveTo(scale(x + 35), scale(y + 15));
    ctx.lineTo(scale(x + 30), scale(y + 25));
    ctx.stroke();
    // Additional damage
    ctx.beginPath();
    ctx.moveTo(scale(x + 15), scale(y + 20));
    ctx.lineTo(scale(x + 18), scale(y + 30));
    ctx.stroke();
  }

  // Cockpit - turns red when damaged
  const cockpitColor = damageLevel > 0.5 ? '#ff4444' : damageLevel > 0.2 ? '#44ff44' : '#00ff88';
  ctx.fillStyle = cockpitColor;
  ctx.beginPath();
  ctx.ellipse(scale(x + 25), scale(y + 15), scale(6), scale(10), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.ellipse(scale(x + 23), scale(y + 12), scale(2), scale(4), -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Wing accents - turn red when damaged
  const accentColor = damageLevel > 0.4 ? '#ff4444' : '#00ff88';
  ctx.fillStyle = accentColor;
  ctx.fillRect(scale(x + 12), scale(y + 32), scale(4), scale(2));
  ctx.fillRect(scale(x + 34), scale(y + 32), scale(4), scale(2));

  // Missile launchers - damaged look
  ctx.fillStyle = damageLevel > 0.5 ? '#222' : '#333';
  ctx.fillRect(scale(x + 8), scale(y + 25), scale(6), scale(15));
  ctx.fillRect(scale(x + 36), scale(y + 25), scale(6), scale(15));

  // Launcher tips
  ctx.fillStyle = damageLevel > 0.3 ? '#444' : '#555';
  ctx.fillRect(scale(x + 8), scale(y + 23), scale(6), scale(3));
  ctx.fillRect(scale(x + 36), scale(y + 23), scale(6), scale(3));

  // Energy cells - weaker when damaged
  const energyStrength = damageLevel > 0.6 ? 0.3 : damageLevel > 0.3 ? 0.5 : 1;
  const pulse = Math.sin(Date.now() / 100) * 0.3 * energyStrength + energyStrength * 0.7;
  const energyColor = damageLevel > 0.5 ? `rgba(255, 100, 50, ${pulse})` : `rgba(0, 255, 255, ${pulse})`;
  ctx.fillStyle = energyColor;
  ctx.fillRect(scale(x + 9), scale(y + 27), scale(4), scale(10));
  ctx.fillRect(scale(x + 37), scale(y + 27), scale(4), scale(10));
  
  // Smoke particles when damaged
  if (damageLevel > 0.3) {
    for (let i = 0; i < Math.floor(damageLevel * 4); i++) {
      const smokeX = scale(x + 15 + Math.random() * 20);
      const smokeY = scale(y + 10 + Math.random() * 20);
      const smokeSize = scale(2 + Math.random() * 3);
      ctx.fillStyle = `rgba(100, 100, 100, ${0.3 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Sparks when very damaged
  if (damageLevel > 0.6 && Math.random() > 0.8) {
    const sparkX = scale(x + 10 + Math.random() * 30);
    const sparkY = scale(y + 15 + Math.random() * 15);
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, scale(2), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemy(x: number, y: number, type: number): void {
  ctx.save();
  ctx.translate(scale(x), scale(y));
  ctx.scale(canvas.width / BASE_WIDTH, canvas.width / BASE_WIDTH);

  const colors = ['#8b4513', '#d2691e', '#cd853f', '#deb887'];

  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.ellipse(0, 12, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors[type % colors.length];
  ctx.beginPath();
  ctx.ellipse(0, 5, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.lineTo(-10, -2);
  ctx.lineTo(0, -1);
  ctx.lineTo(10, -2);
  ctx.lineTo(14, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#32cd32';
  ctx.beginPath();
  for (let i = -14; i <= 14; i += 4) {
    ctx.quadraticCurveTo(i + 2, -6, i + 4, -3);
  }
  ctx.lineTo(14, -3);
  ctx.lineTo(-14, -3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.ellipse(0, -8, 16, 8, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fffacd';
  const seeds: [number, number][] = [[-8, -14], [0, -15], [8, -14], [-4, -12], [4, -12]];
  seeds.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 2, 1, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-5, -6, 3, 0, Math.PI * 2);
  ctx.arc(5, -6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-5 + enemyDirection * 1, -6, 1.5, 0, Math.PI * 2);
  ctx.arc(5 + enemyDirection * 1, -6, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBoss(): void {
  if (!currentBoss) return;

  ctx.save();
  ctx.translate(scale(bossX), scale(bossY));
  ctx.scale(canvas.width / BASE_WIDTH * 2.5, canvas.width / BASE_WIDTH * 2.5);

  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.ellipse(0, 30, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#8b4513' : '#654321';
    ctx.beginPath();
    ctx.ellipse(0, 18 - i * 8, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(-18, 10);
  ctx.lineTo(-14, 2);
  ctx.lineTo(-10, 10);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-2, 10);
  ctx.lineTo(2, 2);
  ctx.lineTo(6, 10);
  ctx.lineTo(10, 0);
  ctx.lineTo(14, 10);
  ctx.lineTo(18, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#32cd32';
  ctx.beginPath();
  for (let i = -18; i <= 18; i += 6) {
    ctx.quadraticCurveTo(i + 3, -4, i + 6, 0);
  }
  ctx.lineTo(18, 0);
  ctx.lineTo(-18, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#daa520';
  ctx.beginPath();
  ctx.ellipse(0, -12, 20, 10, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(-8, -8, 5, 0, Math.PI * 2);
  ctx.arc(8, -8, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-8 + bossDirection * 2, -8, 2, 0, Math.PI * 2);
  ctx.arc(8 + bossDirection * 2, -8, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-15, -18);
  ctx.lineTo(-5, -14);
  ctx.moveTo(15, -18);
  ctx.lineTo(5, -14);
  ctx.stroke();

  ctx.restore();
}

function drawBullet(b: Bullet): void {
  if (b.isEnemy) {
    const fryColors = ['#ffd700', '#daa520', '#cd853f'];
    const color = fryColors[Math.floor(b.x) % 3];

    ctx.fillStyle = color;
    ctx.fillRect(scale(b.x - 2), scale(b.y), scale(4), scale(12));
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(scale(b.x - 1), scale(b.y + 2), scale(1), scale(8));

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffd700';
    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.fillRect(scale(b.x - 3), scale(b.y - 1), scale(6), scale(14));
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(scale(b.x - 2), scale(b.y), scale(4), scale(10));
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.fillRect(scale(b.x - 1), scale(b.y), scale(2), scale(10));
    ctx.shadowBlur = 0;
  }
}

function drawBossBullet(b: Bullet): void {
  const x = scale(b.x);
  const y = scale(b.y);
  const w = scale(12);
  const h = scale(18);

  ctx.fillStyle = '#cc0000';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 2);
  ctx.fill();

  ctx.fillStyle = '#c0c0c0';
  ctx.beginPath();
  ctx.ellipse(x, y - h / 2, w / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.fillRect(x - w / 2 + 2, y - 4, w - 4, 8);

  ctx.fillStyle = '#cc0000';
  ctx.fillRect(x - w / 2 + 2, y - 2, w - 4, 4);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(x - w / 2 + 1, y - h / 2 + 2, 2, h - 4);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(x + w / 2 - 3, y - h / 2 + 2, 2, h - 4);

  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ff0000';
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 4);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawPowerup(p: Powerup): void {
  ctx.save();
  ctx.translate(scale(p.x), scale(p.y));
  ctx.rotate(p.angle);
  ctx.scale(canvas.width / BASE_WIDTH, canvas.width / BASE_WIDTH);
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 12, -Math.sin((18 + i * 72) * Math.PI / 180) * 12);
    ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 5, -Math.sin((54 + i * 72) * Math.PI / 180) * 5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(p.type === 'spread' ? 'S' : 'M', 0, 3);
  ctx.restore();
}

function drawStars(): void {
  ctx.fillStyle = '#fff';
  stars.forEach(star => {
    ctx.globalAlpha = Math.random() * 0.5 + 0.5;
    ctx.beginPath();
    ctx.arc(scale(star.x), scale(star.y), scale(star.size), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function createEnemies(): void {
  enemies = [];
  const rows = 4 + Math.min(wave - 1, 3);
  const cols = 8;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      enemies.push({
        x: 60 + c * 60,
        y: 50 + r * 50,
        type: r,
        width: 36,
        height: 30
      });
    }
  }
  enemySpeed = 1 + (wave - 1) * 0.3;
}

function startBossFight(): void {
  inBossFight = true;
  const bossIndex = Math.min(Math.floor((wave - 1) / 3), bosses.length - 1);
  currentBoss = bosses[bossIndex];
  bossMaxHealth = currentBoss.health;
  bossHealth = currentBoss.health;
  bossX = 300;
  bossY = 80;
  bossDirection = 1;
  bossBullets = [];
  enemies = [];

  document.getElementById('bossName')!.textContent = currentBoss.name;
  document.getElementById('bossName')!.style.display = 'block';
  document.getElementById('bossHealthBar')!.style.display = 'block';
  document.getElementById('bossHealthFill')!.style.width = '100%';

  showPowerupMsg('BOSS FIGHT!');
}

function endBossFight(): void {
  inBossFight = false;
  currentBoss = null;
  score += 500;

  document.getElementById('bossName')!.style.display = 'none';
  document.getElementById('bossHealthBar')!.style.display = 'none';

  showPowerupMsg('BOSS DEFEATED! +500');

  wave++;
  enemySpeed += 0.3;
  createEnemies();
  showWaveMsg('WAVE ' + wave);
}

function showPowerupMsg(text: string): void {
  const msg = document.getElementById('powerupMsg')!;
  msg.textContent = text;
  msg.style.opacity = '1';
  setTimeout(() => { msg.style.opacity = '0'; }, 1500);
}

function showWaveMsg(text: string): void {
  const msg = document.getElementById('waveMsg')!;
  msg.textContent = text;
  msg.style.opacity = '1';
  setTimeout(() => { msg.style.opacity = '0'; }, 1500);
}

function spawnPowerup(x: number, y: number): void {
  const types: ('spread' | 'multishot')[] = ['spread', 'multishot'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerups.push({ x, y, type, angle: 0 });
}

function update(): void {
  if (!gameRunning) return;

  const playerCenterX = player._x + 25;
  const playerCenterY = player._y + 20;

  // Player movement
  if (keys['ArrowLeft'] && player._x > 20) player._x -= 6;
  if (keys['ArrowRight'] && player._x < 580) player._x += 6;

  // Shooting
  if (player.shootCooldown > 0) player.shootCooldown--;
  if ((keys['Space'] || keys['TouchShoot']) && player.shootCooldown <= 0) {
    const leftLauncher = player._x + 8;
    const rightLauncher = player._x + 36;
    const launcherY = player._y - 5;

    if (player.powerup === 'spread') {
      player.bullets.push({ x: leftLauncher, y: launcherY, vx: -2 });
      player.bullets.push({ x: player._x + 22, y: launcherY, vx: 0 });
      player.bullets.push({ x: rightLauncher, y: launcherY, vx: 2 });
    } else if (player.powerup === 'multishot') {
      player.bullets.push({ x: leftLauncher - 5, y: launcherY, vx: 0 });
      player.bullets.push({ x: player._x + 22, y: launcherY, vx: 0 });
      player.bullets.push({ x: rightLauncher + 5, y: launcherY, vx: 0 });
    } else {
      if (!player.lastLauncher) player.lastLauncher = 'left';
      const fromX = player.lastLauncher === 'left' ? leftLauncher : rightLauncher;
      player.lastLauncher = player.lastLauncher === 'left' ? 'right' : 'left';
      player.bullets.push({ x: fromX, y: launcherY, vx: 0 });
    }
    player.shootCooldown = player.powerup === 'multishot' ? 8 : 15;
  }

  // Powerup timer
  if (player.powerupTimer > 0) {
    player.powerupTimer--;
    if (player.powerupTimer === 0) {
      player.powerup = null;
    }
  }

  // Update player bullets
  player.bullets = player.bullets.filter(b => {
    b.x += b.vx;
    b.y -= 8;
    return b.y > -10;
  });

  if (inBossFight && currentBoss) {
    // Boss movement
    bossX += currentBoss.speed * bossDirection;
    if (bossX < 80 || bossX > 520) {
      bossDirection *= -1;
    }

    // Boss shooting
    bossShootTimer++;
    if (bossShootTimer > 40) {
      bossShootTimer = 0;
      bossBullets.push({ x: bossX, y: bossY + 60, vx: 0, vy: 5 });
      bossBullets.push({ x: bossX, y: bossY + 60, vx: -3, vy: 4 });
      bossBullets.push({ x: bossX, y: bossY + 60, vx: 3, vy: 4 });
    }

    // Update boss bullets
    bossBullets = bossBullets.filter(b => {
      b.x += b.vx;
      b.y += b.vy || 0;
      return b.y < 720 && b.x > 0 && b.x < 600;
    });

    // Collision: player bullets hit boss
    player.bullets = player.bullets.filter(b => {
      if (Math.abs(b.x - bossX) < 50 && Math.abs(b.y - bossY) < 80) {
        bossHealth--;
        const healthPercent = (bossHealth / bossMaxHealth) * 100;
        document.getElementById('bossHealthFill')!.style.width = healthPercent + '%';
        score += 10;
        if (bossHealth <= 0) {
          endBossFight();
        }
        return false;
      }
      return true;
    });

    // Collision: boss bullets hit player
    bossBullets = bossBullets.filter(b => {
      if (Math.abs(b.x - playerCenterX) < 18 && Math.abs(b.y - playerCenterY) < 15) {
        lives--;
        document.getElementById('lives')!.textContent = lives.toString();
        if (lives <= 0) gameOver();
        return false;
      }
      return true;
    });

    // Boss hits player
    if (bossY + 60 > player._y - 20) {
      lives = 0;
      document.getElementById('lives')!.textContent = '0';
      gameOver();
    }
  } else {
    // Regular enemy movement
    let hitEdge = false;
    enemies.forEach(e => {
      e.x += enemySpeed * enemyDirection;
      if (e.x < 30 || e.x > 570) hitEdge = true;
    });

    if (hitEdge) {
      enemyDirection *= -1;
      enemies.forEach(e => e.y += 20);
    }

    // Enemy shooting
    if (Math.random() < 0.02 + wave * 0.005 && enemies.length > 0) {
      const shooter = enemies[Math.floor(Math.random() * enemies.length)];
      enemyBullets.push({ x: shooter.x, y: shooter.y + 15, vx: 0, isEnemy: true });
    }

    // Update enemy bullets
    enemyBullets = enemyBullets.filter(b => {
      b.y += 4;
      return b.y < 720;
    });

    // Collision: player bullets hit enemies
    player.bullets = player.bullets.filter(b => {
      let hit = false;
      enemies = enemies.filter(e => {
        if (Math.abs(b.x - e.x) < 18 && Math.abs(b.y - e.y) < 15) {
          hit = true;
          score += (4 - e.type) * 10 + wave * 5;
          if (Math.random() < 0.15) spawnPowerup(e.x, e.y);
          return false;
        }
        return true;
      });
      return !hit;
    });

    // Collision: enemy bullets hit player
    enemyBullets = enemyBullets.filter(b => {
      if (Math.abs(b.x - playerCenterX) < 18 && Math.abs(b.y - playerCenterY) < 15) {
        lives--;
        document.getElementById('lives')!.textContent = lives.toString();
        if (lives <= 0) gameOver();
        return false;
      }
      return true;
    });

    // Collision: enemies hit player
    enemies.forEach(e => {
      if (e.y > 620) {
        lives = 0;
        document.getElementById('lives')!.textContent = '0';
        gameOver();
      }
    });

    // Next wave or boss
    if (enemies.length === 0) {
      if (wave % 3 === 0) {
        startBossFight();
      } else {
        wave++;
        enemySpeed += 0.3;
        createEnemies();
        showWaveMsg('WAVE ' + wave);
      }
    }
  }

  // Update powerups
  powerups = powerups.filter(p => {
    p.y += 2;
    p.angle += 0.1;
    return p.y < 750;
  });

  // Collision: player hits powerup
  powerups = powerups.filter(p => {
    if (Math.abs(p.x - playerCenterX) < 30 && Math.abs(p.y - playerCenterY) < 25) {
      player.powerup = p.type;
      player.powerupTimer = 600;
      showPowerupMsg(p.type === 'spread' ? 'SPREAD SHOT!' : 'MULTISHOT!');
      return false;
    }
    return true;
  });

  // Update stars
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > 700) { s.y = 0; s.x = Math.random() * 600; }
  });

  document.getElementById('score')!.textContent = score.toString();
}

function draw(): void {
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStars();

  if (gameRunning) {
    drawPlayer();

    if (inBossFight && currentBoss) {
      drawBoss();
      bossBullets.forEach(drawBossBullet);
    } else {
      enemies.forEach(e => drawEnemy(e.x, e.y, e.type));
    }

    player.bullets.forEach(drawBullet);
    enemyBullets.forEach(drawBullet);
    powerups.forEach(drawPowerup);
  }
}

function gameLoop(): void {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function startGame(): void {
  resizeCanvas();

  document.getElementById('startScreen')!.classList.add('hidden');
  document.getElementById('gameOverScreen')!.classList.add('hidden');
  document.getElementById('touchLeft')!.style.display = 'block';
  document.getElementById('touchRight')!.style.display = 'block';
  document.getElementById('bossName')!.style.display = 'none';
  document.getElementById('bossHealthBar')!.style.display = 'none';

  score = 0;
  lives = 3;
  wave = 1;
  inBossFight = false;
  currentBoss = null;
  bossBullets = [];
  player._x = 275;
  player._y = 650;
  player.bullets = [];
  enemyBullets = [];
  powerups = [];
  player.powerup = null;
  player.powerupTimer = 0;
  player.lastLauncher = undefined;

  document.getElementById('score')!.textContent = '0';
  document.getElementById('lives')!.textContent = '3';

  createEnemies();
  gameRunning = true;

  showWaveMsg('WAVE 1');
}

function gameOver(): void {
  gameRunning = false;
  document.getElementById('finalScore')!.textContent = score.toString();

  // Check and save high score
  const newHighScoreMsg = document.getElementById('newHighScoreMsg')!;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('burgerInvadersHighScore', highScore.toString());
    document.getElementById('highScoreDisplay')!.textContent = highScore.toString();
    document.getElementById('highScoreStart')!.textContent = highScore.toString();
    newHighScoreMsg.classList.remove('hidden');
  } else {
    newHighScoreMsg.classList.add('hidden');
  }

  document.getElementById('gameOverScreen')!.classList.remove('hidden');
  document.getElementById('touchLeft')!.style.display = 'none';
  document.getElementById('touchRight')!.style.display = 'none';
  document.getElementById('bossName')!.style.display = 'none';
  document.getElementById('bossHealthBar')!.style.display = 'none';
}

// Handle resize on orientation change
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 100);
});

// Button handlers
document.getElementById('startBtn')!.addEventListener('click', startGame);
document.getElementById('retryBtn')!.addEventListener('click', startGame);

gameLoop();
