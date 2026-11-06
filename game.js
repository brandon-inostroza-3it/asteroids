'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle, options = {}) {
    this.x = x;
    this.y = y;
    const SPEED = options.speed ?? 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = options.ttl ?? 1.1;
    this.radius = options.radius ?? 2;
    this.friend = !!options.friend;
    this.color = options.color ?? '#fff';
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 10;
    this.dead = false;
    this.angle = rand(0, Math.PI * 2);
    this.floatOffset = rand(0, Math.PI * 2);
  }

  update(dt) {
    this.angle += dt * 2.2;
    this.floatOffset += dt * 2.2;
  }

  draw() {
    const bob = Math.sin(this.floatOffset) * 4;
    const x = this.x;
    const y = this.y + bob;
    const color = this.type === 'hyperspace' ? '#ff9f1c' : this.type === 'triple' ? '#8ef0a4' : '#61dafb';
    const label = this.type === 'hyperspace' ? 'H' : this.type === 'triple' ? 'T' : 'V';

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = color;
    ctx.fillStyle = this.type === 'hyperspace'
      ? 'rgba(255, 159, 28, 0.25)'
      : this.type === 'triple'
        ? 'rgba(142, 240, 164, 0.30)'
        : 'rgba(97, 218, 251, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }
}

class FriendDrone {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.radius = 6;
    this.dead = false;
    this.cooldown = 0.3;
    this.shootCooldown = 0.2;
    this.life = 5.5;
    this.mode = 'hunt';
    this.exitVector = { x: 0, y: 0 };
    this.messageShown = false;
  }

  update(dt) {
    if (this.dead) return;
    this.cooldown -= dt;
    this.shootCooldown -= dt;

    if (this.mode === 'leave') {
      this.x += this.exitVector.x * 180 * dt;
      this.y += this.exitVector.y * 180 * dt;
      this.angle = Math.atan2(this.exitVector.y, this.exitVector.x);
      if (this.x < -30 || this.x > W + 30 || this.y < -30 || this.y > H + 30) {
        this.dead = true;
      }
      return;
    }

    this.life -= dt;
    if (this.life <= 0) {
      this.mode = 'leave';
      const dirX = Math.random() < 0.5 ? -1 : 1;
      const dirY = rand(-0.7, 0.7);
      this.exitVector = { x: dirX, y: dirY };
      if (!this.messageShown) {
        terminatorText = "Hasta la próxima";
        terminatorTimer = 1.8;
        this.messageShown = true;
      }
      return;
    }

    let target = null;
    let bestDist = Infinity;
    for (const a of asteroids) {
      if (a.dead) continue;
      const d = dist(this, a);
      if (d < bestDist) {
        bestDist = d;
        target = a;
      }
    }

    if (target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const desiredDistance = 150;
      const dirX = dx / d;
      const dirY = dy / d;

      this.angle = Math.atan2(dy, dx);

      if (d > desiredDistance + 20) {
        this.x += dirX * 110 * dt;
        this.y += dirY * 110 * dt;
      } else if (d < desiredDistance - 20) {
        this.x -= dirX * 90 * dt;
        this.y -= dirY * 90 * dt;
      } else {
        const orbit = 0.9;
        const orbitX = -dirY * orbit;
        const orbitY = dirX * orbit;
        this.x += orbitX * 55 * dt;
        this.y += orbitY * 55 * dt;
      }

      this.x = wrap(this.x, W);
      this.y = wrap(this.y, H);

      if (this.shootCooldown <= 0 && d < 260) {
        const muzzleX = this.x + Math.cos(this.angle) * 10;
        const muzzleY = this.y + Math.sin(this.angle) * 10;
        bullets.push(new Bullet(muzzleX, muzzleY, this.angle, {
          color: '#7ee787',
          friend: true,
          radius: 3,
          speed: 360,
          ttl: 1.2,
        }));
        this.shootCooldown = 0.85;
      }
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.strokeStyle = '#7ee787';
    ctx.fillStyle = 'rgba(126, 231, 135, 0.2)';
    ctx.lineWidth = 1.3;

    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(2, -5);
    ctx.lineTo(-7, -4);
    ctx.lineTo(-9, 0);
    ctx.lineTo(-7, 4);
    ctx.lineTo(2, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.lineTo(0, -11);
    ctx.lineTo(4, -8);
    ctx.moveTo(-2, 8);
    ctx.lineTo(0, 11);
    ctx.lineTo(4, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(9, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(170, 255, 185, 0.75)';
    ctx.fill();

    ctx.restore();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3, special = false) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;
    this.special = special;
    this.ttl = special ? rand(5, 8) : null;
    this.magneticTimer = 0;

    const angle = rand(0, Math.PI * 2);
    const speed = (SPEEDS[size] + rand(-15, 15)) * (special ? 1.8 : 1);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    if (this.special) {
      this.ttl -= dt;
      if (this.ttl <= 0) {
        this.dead = true;
        return;
      }
    }

    if (this.magneticTimer > 0) {
      this.magneticTimer -= dt;
      const dx = ship.x - this.x;
      const dy = ship.y - this.y;
      const distToShip = Math.hypot(dx, dy) || 1;
      const pullForce = Math.min(260 / distToShip, 14);
      this.vx += (dx / distToShip) * pullForce * dt * 60;
      this.vy += (dy / distToShip) * pullForce * dt * 60;
    } else if (Math.random() < 0.006) {
      this.magneticTimer = rand(2.4, 4.6);
    }

    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    if (this.special) {
      ctx.strokeStyle = '#ffd166';
      ctx.fillStyle = 'rgba(255, 209, 102, 0.18)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i / (spikes * 2)) * Math.PI * 2;
        const radius = i % 2 === 0 ? this.radius * 1.15 : this.radius * 0.5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (this.magneticTimer > 0) {
      ctx.strokeStyle = '#7dd3fc';
      ctx.shadowColor = 'rgba(125, 211, 252, 0.8)';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = '#fff';
      ctx.shadowBlur = 0;
    }
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const SHIP_SKINS = {
  classic: {
    stroke: '#fff',
    glow: 'rgba(255,255,255,0.8)',
    engine: 'rgba(255, 130, 0, 0.85)',
    shape: 'triangle'
  },
  neon: {
    stroke: '#6ef3ff',
    glow: 'rgba(110, 243, 255, 0.8)',
    engine: 'rgba(110, 243, 255, 0.9)',
    shape: 'arrow'
  },
  fire: {
    stroke: '#ff8a3d',
    glow: 'rgba(255, 138, 61, 0.85)',
    engine: 'rgba(255, 220, 100, 0.95)',
    shape: 'wide'
  },
  pulse: {
    stroke: '#b38cff',
    glow: 'rgba(179, 140, 255, 0.8)',
    engine: 'rgba(220, 120, 255, 0.95)',
    shape: 'diamond'
  },
  shadow: {
    stroke: '#b5c2d3',
    glow: 'rgba(181, 194, 211, 0.7)',
    engine: 'rgba(255, 255, 255, 0.9)',
    shape: 'hex'
  }
};

class Ship {
  constructor() { this.reset(true); }

  reset(levelStart = false) {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoostTimer = 0;
    this.hyperspaceCharges = 3;
    this.tripleShotTimer = 0;
    this.shieldTimer = 0;
    this.shieldCooldown = 0;
    this.friendCharge = levelStart ? 1 : 0;
    this.friendCooldown = 0;
    this.skin = 'classic';
    this.dead          = false;
  }

  activateTripleShot() {
    this.tripleShotTimer = 5;
  }

  activateShield() {
    if (this.shieldCooldown > 0 || this.dead) return;
    this.shieldTimer = 5;
    this.shieldCooldown = 30;
  }

  triggerFriend() {
    if (this.dead || this.friendCharge <= 0 || this.friendCooldown > 0) return;

    this.friendCharge--;
    this.friendCooldown = 0.8;

    const offsets = [-1.2, 0, 1.2];
    for (const offset of offsets) {
      const angle = this.angle + offset;
      const x = this.x + Math.cos(angle) * 22;
      const y = this.y + Math.sin(angle) * 22;
      allies.push(new FriendDrone(x, y, angle));
    }
    explode(this.x, this.y, 10);
  }

  setSkin(name) {
    if (SHIP_SKINS[name]) this.skin = name;
  }

  triggerHyperspace() {
    if (this.dead || this.hyperspaceCharges <= 0) return;

    this.hyperspaceCharges--;
    let x, y;
    do {
      x = rand(30, W - 30);
      y = rand(30, H - 30);
    } while (Math.hypot(x - this.x, y - this.y) < 120);

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.invincible = 1;
    explode(x, y, 16);
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoostTimer > 0) this.speedBoostTimer -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.shieldCooldown > 0) this.shieldCooldown -= dt;
    if (this.friendCooldown > 0) this.friendCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.speedBoostTimer > 0 ? 2 : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    if (this.tripleShotTimer > 0) {
      const angles = [-0.12, 0, 0.12];
      return angles.map(offset => {
        const angle = this.angle + offset;
        const x = this.x + Math.cos(angle) * NOSE;
        const y = this.y + Math.sin(angle) * NOSE;
        return new Bullet(x, y, angle);
      });
    }

    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SHIP_SKINS[this.skin] || SHIP_SKINS.classic;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.stroke;
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 12;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    const shape = skin.shape || 'triangle';

    if (shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-12, -9);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-12, 9);
      ctx.closePath();
      ctx.stroke();
    } else if (shape === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-8, -11);
      ctx.lineTo(-2, -2);
      ctx.lineTo(-14, -2);
      ctx.lineTo(-14, 2);
      ctx.lineTo(-2, 2);
      ctx.lineTo(-8, 11);
      ctx.closePath();
      ctx.stroke();
    } else if (shape === 'wide') {
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.stroke();
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(0, -14);
      ctx.lineTo(-12, 0);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.stroke();
    } else if (shape === 'hex') {
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(8, -12);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-10, 12);
      ctx.lineTo(8, 12);
      ctx.closePath();
      ctx.stroke();
    }

    if (this.shieldTimer > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.clip();

      const hexRadius = this.radius + 14;
      const hexSize = 7;
      ctx.strokeStyle = 'rgba(80, 255, 140, 0.85)';
      ctx.lineWidth = 1.15;
      for (let y = -hexRadius - hexSize; y <= hexRadius + hexSize; y += hexSize * 1.18) {
        for (let x = -hexRadius - hexSize; x <= hexRadius + hexSize; x += hexSize * 1.72) {
          const offset = (Math.abs(y / (hexSize * 1.18)) % 2 === 0) ? hexSize * 0.86 : 0;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            const px = x + offset + Math.cos(angle) * hexSize;
            const py = y + Math.sin(angle) * hexSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120, 255, 170, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    if (this.shieldTimer > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.clip();

      const hexRadius = this.radius + 14;
      const hexSize = 7;
      ctx.strokeStyle = 'rgba(80, 255, 140, 0.85)';
      ctx.lineWidth = 1.15;
      for (let y = -hexRadius - hexSize; y <= hexRadius + hexSize; y += hexSize * 1.18) {
        for (let x = -hexRadius - hexSize; x <= hexRadius + hexSize; x += hexSize * 1.72) {
          const offset = (Math.abs(y / (hexSize * 1.18)) % 2 === 0) ? hexSize * 0.86 : 0;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            const px = x + offset + Math.cos(angle) * hexSize;
            const py = y + Math.sin(angle) * hexSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(120, 255, 170, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = skin.engine;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, allies;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let terminatorText;
let terminatorTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);

    const special = Math.random() < 0.16 && i > 0;
    asteroids.push(new Asteroid(x, y, 3, special));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  allies    = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  terminatorText = '';
  terminatorTimer = 0;
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [new PowerUp(W * 0.25, H * 0.75, 'triple')];
  allies    = [];
  ship.reset();
  ship.friendCharge = 1;
  terminatorText = '';
  terminatorTimer = 0;
  asteroids = [];
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  allies = [];
  powerUps = [];
  bullets = [];
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (terminatorTimer > 0) terminatorTimer -= dt;
    if (terminatorTimer <= 0) terminatorText = '';
    if (deadTimer <= 0) {
      state = 'playing';
      ship.reset();
      allies = [];
      powerUps = [];
      bullets = [];
    }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  if (pressed('KeyE')) {
    ship.activateShield();
  }

  if (pressed('KeyC')) {
    const order = ['classic', 'neon', 'fire', 'pulse', 'shadow'];
    const currentIndex = order.indexOf(ship.skin);
    const nextSkin = order[(currentIndex + 1) % order.length];
    ship.setSkin(nextSkin);
  }

  if (pressed('KeyQ')) {
    ship.triggerFriend();
  }

  if (pressed('KeyH') && ship.hyperspaceCharges > 0) {
    ship.triggerHyperspace();
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  allies.forEach(a => a.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  if (terminatorTimer > 0) terminatorTimer -= dt;
  if (terminatorTimer <= 0) terminatorText = '';

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);
  allies    = allies.filter(a => !a.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < 0.18) {
          const pickupRoll = Math.random();
          const pickupType = pickupRoll < 0.5 ? 'speed' : pickupRoll < 0.8 ? 'triple' : 'hyperspace';
          powerUps.push(new PowerUp(a.x, a.y, pickupType));
        }
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;

      if (p.type === 'hyperspace') {
        ship.hyperspaceCharges = 3;
        explode(ship.x, ship.y, 10);
      } else if (p.type === 'triple') {
        ship.activateTripleShot();
        explode(ship.x, ship.y, 10);
      } else {
        ship.speedBoostTimer = 5;
        explode(ship.x, ship.y, 8);
      }
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.shieldTimer > 0) {
    for (const a of asteroids) {
      const shieldRadius = ship.radius + 14;
      if (!a.dead && dist(ship, a) < shieldRadius + a.radius * 0.82) {
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
      }
    }
    asteroids = asteroids.filter(a => !a.dead);
  } else if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  // Skin en la parte inferior, no arriba
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d5d5d5';
  ctx.fillText(`SKIN ${ship.skin.toUpperCase()}`, W / 2, H - 16);

  if (ship.speedBoostTimer > 0) {
    ctx.fillStyle = '#61dafb';
    ctx.fillText(`VEL. ${Math.ceil(ship.speedBoostTimer)}s`, W / 2 + 110, 26);
  }

  if (ship.tripleShotTimer > 0) {
    ctx.fillStyle = '#8ef0a4';
    ctx.fillText(`TRIPLE ${Math.ceil(ship.tripleShotTimer)}s`, W / 2 + 110, 26);
  }

  if (ship.shieldTimer > 0) {
    ctx.fillStyle = '#60ceff';
    ctx.fillText(`SHIELD ${Math.ceil(ship.shieldTimer)}s`, W / 2 + 110, 26);
  } else if (ship.shieldCooldown > 0) {
    ctx.fillStyle = '#7d8ea5';
    ctx.fillText(`CD ${Math.ceil(ship.shieldCooldown)}s`, W / 2 + 110, 26);
  }

  if (ship.hyperspaceCharges > 0) {
    ctx.fillStyle = '#ff9f1c';
    ctx.fillText(`HYP ${ship.hyperspaceCharges}`, W / 2 - 110, 26);
  }

  if (ship.friendCharge > 0) {
    ctx.fillStyle = '#7ee787';
    ctx.fillText(`FRIEND ${ship.friendCharge}`, W / 2 - 190, 26);
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  allies.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);

  if (terminatorTimer > 0 && terminatorText) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ee787';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(terminatorText.toUpperCase(), W / 2, H / 2 + 70);
  }
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
