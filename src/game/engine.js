import { drawGame } from './render.js'
import { Sfx } from './sfx.js'
import { VIEW, WEAPONS, WORLD } from './weapons.js'

const { width: W, height: H, ground: GROUND } = WORLD
const { width: VIEW_W, height: VIEW_H } = VIEW
const TAU = Math.PI * 2
const rand = (min, max) => min + Math.random() * (max - min)
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const sign = (value) => (value < 0 ? -1 : 1)

const GRAVITY = 1750
const JET_THRUST = 3400
const JET_DRAIN = 31
const FUEL_REGEN_GROUND = 42
const FUEL_REGEN_AIR = 0
const FUEL_MAX = 100
const MAX_UP_SPEED = 390
const MAX_FALL_SPEED = 950
const AI_MAX_HP = 90
const AI_DAMAGE_SCALE = 0.5
const AI_ERROR_SCALE = 2.1
const AI_SPEED = 200

function segmentHitsRect(x1, y1, x2, y2, rx, ry, rw, rh, pad = 0) {
  const left = rx - pad
  const right = rx + rw + pad
  const top = ry - pad
  const bottom = ry + rh + pad
  const dx = x2 - x1
  const dy = y2 - y1
  let t0 = 0
  let t1 = 1
  const p = [-dx, dx, -dy, dy]
  const q = [x1 - left, right - x1, y1 - top, bottom - y1]
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] < 0) return false
    } else {
      const t = q[i] / p[i]
      if (p[i] < 0) t0 = Math.max(t0, t)
      else t1 = Math.min(t1, t)
      if (t0 > t1) return false
    }
  }
  return true
}

function makeFighter(team, x, facing, weapon) {
  const maxHp = team === 'enemy' ? AI_MAX_HP : 100
  return {
    team,
    x,
    y: GROUND,
    vx: 0,
    vy: 0,
    facing,
    aim: facing > 0 ? 0 : Math.PI,
    hp: maxHp,
    maxHp,
    fuel: FUEL_MAX,
    grounded: true,
    thrusting: false,
    weapon,
    ammo: WEAPONS.map((w) => w.mag),
    reload: WEAPONS.map(() => 0),
    nextFire: 0,
    hitFlash: 0,
    recoil: 0,
    muzzle: 0,
    walkPhase: rand(0, TAU),
    deathTime: 0,
    dustTimer: 0,
    ai: {
      thinkAt: 0,
      moveDir: 0,
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      burstLeft: 0,
      burstAt: 0,
      shotAt: 0,
      weaponSwapAt: 0,
      altitudeAt: 0,
      targetY: GROUND,
      altitudeX: null,
    },
  }
}

export class BotBrawl {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.callbacks = callbacks
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = VIEW_W * this.dpr
    canvas.height = VIEW_H * this.dpr

    this.time = 0
    this.last = 0
    this.state = 'idle'
    this.round = 1
    this.scores = { player: 0, enemy: 0 }
    this.bullets = []
    this.particles = []
    this.floaters = []
    this.explosions = []
    this.pickups = []
    this.pickupTimer = 8
    this.keys = { left: false, right: false, up: false }
    this.pointer = {
      x: W * 0.7,
      y: 420,
      screenX: VIEW_W * 0.7,
      screenY: VIEW_H * 0.6,
      down: false,
      inside: false,
    }
    this.shake = 0
    this.countdown = 0
    this.fightFlash = 0
    this.endTimer = 0
    this.roundWinner = null
    this.hudTimer = 0
    this.muted = false
    this.paused = false
    this.camera = { x: W / 2, y: GROUND - 160, zoom: 0.75 }
    this.sound = new Sfx()

    this.player = makeFighter('player', 260, 1, 0)
    this.enemy = makeFighter('enemy', W - 260, -1, 1)
    this.buildBackdrop()
    this.bindEvents()
    this.loop = this.loop.bind(this)
    this.publishHud()
    this.raf = requestAnimationFrame(this.loop)
  }

  buildBackdrop() {
    // Sorted highest to lowest so falling fighters land on the first platform they cross.
    this.platforms = [
      { x: 840, y: 300, w: 240 },
      { x: 140, y: 450, w: 200 },
      { x: 720, y: 430, w: 260 },
      { x: 1560, y: 450, w: 200 },
      { x: 360, y: 580, w: 220 },
      { x: 900, y: 560, w: 280 },
      { x: 1460, y: 580, w: 220 },
      { x: 120, y: 710, w: 260 },
      { x: 650, y: 710, w: 300 },
      { x: 1480, y: 710, w: 260 },
    ]
    this.platforms.sort((a, b) => a.y - b.y)

    this.clouds = Array.from({ length: 7 }, () => ({
      x: rand(0, W),
      y: rand(50, 250),
      s: rand(0.55, 1.25),
      speed: rand(3, 9),
    }))
    this.skyline = []
    let x = -20
    while (x < W + 40) {
      const w = rand(38, 92)
      this.skyline.push({
        x,
        w,
        h: rand(50, 150),
        color: Math.random() < 0.5 ? '#9fb3d4' : '#aebfdd',
      })
      x += w + rand(4, 20)
    }
    this.tufts = Array.from({ length: 60 }, () => ({
      x: rand(0, W),
      h: rand(4, 11),
      lean: rand(-3, 3),
    }))
    this.bushes = [
      { x: 60, s: 1 },
      { x: 145, s: 0.7, dark: true },
      { x: 420, s: 0.6, dark: true },
      { x: 910, s: 0.7, dark: true },
      { x: 1135, s: 1.05 },
      { x: 1215, s: 0.75, dark: true },
      { x: 1620, s: 0.9 },
      { x: 1815, s: 0.65, dark: true },
    ]
    this.barrels = [
      { x: 45 },
      { x: 1235 },
      { x: 330 },
      { x: 980 },
      { x: 1580 },
      { x: 1860 },
    ]
  }

  startMatch() {
    this.sound.resume()
    this.sound.click()
    this.scores = { player: 0, enemy: 0 }
    this.round = 1
    this.player.weapon = 0
    this.startRound()
  }

  startRound() {
    const p = this.player
    const e = this.enemy

    p.x = rand(190, 285)
    p.y = GROUND
    p.vx = 0
    p.vy = 0
    p.facing = 1
    p.aim = 0
    p.hp = p.maxHp
    p.fuel = FUEL_MAX
    p.grounded = true
    p.thrusting = false
    p.ammo = WEAPONS.map((w) => w.mag)
    p.reload = WEAPONS.map(() => 0)
    p.nextFire = 0
    p.hitFlash = 0
    p.recoil = 0
    p.muzzle = 0

    e.x = W - rand(190, 285)
    e.y = GROUND
    e.vx = 0
    e.vy = 0
    e.facing = -1
    e.aim = Math.PI
    e.hp = e.maxHp
    e.fuel = FUEL_MAX
    e.grounded = true
    e.thrusting = false
    e.weapon = Math.floor(Math.random() * WEAPONS.length)
    e.ammo = WEAPONS.map((w) => w.mag)
    e.reload = WEAPONS.map(() => 0)
    e.nextFire = 0
    e.hitFlash = 0
    e.recoil = 0
    e.muzzle = 0
    e.ai = {
      thinkAt: 0,
      moveDir: 0,
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      burstLeft: 0,
      burstAt: 1.2,
      shotAt: 0,
      weaponSwapAt: this.time + rand(9, 15),
      altitudeAt: this.time + rand(4, 8),
      targetY: GROUND,
      altitudeX: null,
    }

    this.bullets = []
    this.particles = []
    this.floaters = []
    this.explosions = []
    this.pickups = []
    this.pickupTimer = 6
    this.keys.left = false
    this.keys.right = false
    this.keys.up = false
    this.pointer.down = false
    this.shake = 0
    this.fightFlash = 0
    this.countdown = 3
    this.endTimer = 0
    this.roundWinner = null
    this.state = 'countdown'
    this.camera = {
      x: (p.x + e.x) / 2,
      y: Math.min(GROUND - 120, (p.y + e.y) / 2 - 120),
      zoom: 0.72,
    }
    this.publishHud()
  }

  nextRound() {
    if (this.state !== 'roundEnd') return
    this.round += 1
    this.startRound()
  }

  selectWeapon(index) {
    if (index < 0 || index >= WEAPONS.length) return
    if (this.state === 'idle' || this.state === 'roundEnd') return
    if (this.player.weapon === index) return
    this.player.weapon = index
    this.sound.click()
    this.publishHud()
  }

  toggleMute() {
    this.muted = !this.muted
    this.sound.setMuted(this.muted)
    this.publishHud()
    return this.muted
  }

  loop(timestamp) {
    const dt = Math.min(0.04, this.last ? (timestamp - this.last) / 1000 : 0.016)
    this.last = timestamp
    if (!this.paused) this.time += dt
    this.update(dt)
    drawGame(this)
    this.raf = requestAnimationFrame(this.loop)
  }

  update(dt) {
    if (this.paused) return
    this.updateCamera(dt)

    if (this.state === 'countdown') {
      this.countdown -= dt
      this.updatePlayerAim()
      this.updateEffects(dt)
      if (this.countdown <= 0) {
        this.state = 'playing'
        this.fightFlash = 0.9
        this.sound.resume()
        this.publishHud()
      }
      this.syncHud(dt)
      return
    }

    if (this.state === 'playing') {
      this.updatePlayerAim()
      this.updatePlayer(dt)
      this.updateEnemy(dt)
      this.keepApart()
      this.updateBullets(dt)
      this.updatePickups(dt)
      this.updateEffects(dt)
      this.syncHud(dt)
      return
    }

    if (this.state === 'ending') {
      this.endTimer -= dt
      this.updateEffects(dt)
      if (this.endTimer <= 0) this.finishRound()
      this.syncHud(dt)
      return
    }

    this.updateEffects(dt)
    this.syncHud(dt)
  }

  updatePlayerAim() {
    const p = this.player
    if (!this.pointer.inside) return
    const worldX = this.camera.x + (this.pointer.screenX - VIEW_W / 2) / this.camera.zoom
    const worldY = this.camera.y + (this.pointer.screenY - VIEW_H / 2) / this.camera.zoom
    p.aim = Math.atan2(worldY - (p.y - 48), worldX - p.x)
    p.facing = Math.cos(p.aim) >= 0 ? 1 : -1
  }

  updateCamera(dt) {
    const p = this.player
    const e = this.enemy
    const midX = (p.x + e.x) / 2
    const midY = (p.y + e.y) / 2 - 60
    const spanX = Math.abs(p.x - e.x) + 560
    const spanY = Math.abs(p.y - e.y) + 520
    const fit = Math.min(VIEW_W / spanX, VIEW_H / spanY)
    const targetZoom = clamp(fit, 0.6, 1.08)
    const halfW = VIEW_W / (2 * targetZoom)
    const halfH = VIEW_H / (2 * targetZoom)
    const targetX = halfW * 2 >= W ? W / 2 : clamp(midX, halfW, W - halfW)
    const targetY = halfH * 2 >= H ? H / 2 : clamp(midY, halfH, H - halfH)
    const k = Math.min(1, dt * 5)
    this.camera.x += (targetX - this.camera.x) * k
    this.camera.y += (targetY - this.camera.y) * k
    this.camera.zoom += (targetZoom - this.camera.zoom) * k
  }

  setPaused(paused) {
    this.paused = Boolean(paused)
    if (this.paused) {
      this.keys.left = false
      this.keys.right = false
      this.keys.up = false
      this.pointer.down = false
    }
  }

  updatePlayer(dt) {
    const p = this.player
    if (p.hp <= 0) {
      p.vx *= 0.9
      return
    }
    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0)
    this.moveFighter(p, dir, dt, 310, this.keys.up)

    if (this.pointer.down) this.tryShoot(p, 'player')
    if (p.ammo[p.weapon] <= 0) this.startReload(p)
    this.tickReloads()
  }

  updateEnemy(dt) {
    const e = this.enemy
    const p = this.player
    if (e.hp <= 0) return

    const now = this.time
    if (now > e.ai.weaponSwapAt) {
      let next = e.weapon
      while (next === e.weapon) next = Math.floor(Math.random() * WEAPONS.length)
      e.weapon = next
      e.ai.weaponSwapAt = now + rand(9, 15)
      e.ai.burstLeft = 0
      e.ai.burstAt = now + 0.4
    }

    const weapon = WEAPONS[e.weapon]
    const dist = p.x - e.x
    const flight = Math.min(1.4, Math.abs(dist) / weapon.speed)
    const lead = p.x + p.vx * flight * 0.55
    const error = weapon.aimError * AI_ERROR_SCALE * (1 + Math.min(0.6, Math.abs(dist) / 1500))
    const wobble =
      Math.sin(now * 2.1 + e.ai.strafeDir) * error * 0.8 + (Math.random() - 0.5) * error
    e.aim = Math.atan2(p.y - 44 - (e.y - 48), lead - e.x) + wobble
    e.facing = Math.cos(e.aim) >= 0 ? 1 : -1

    const pack = this.pickups.find((pk) => Math.abs(pk.x - e.x) < 700)
    if (now > e.ai.altitudeAt) {
      e.ai.altitudeAt = now + rand(4.5, 8.5)
      e.ai.altitudeX = null
      if (Math.random() < 0.55) {
        if (p.y < GROUND - 80 && Math.random() < 0.6) {
          e.ai.targetY = clamp(p.y + rand(0, 70), 130, GROUND)
          e.ai.altitudeX = p.x
        } else {
          const platform = this.platforms[Math.floor(Math.random() * this.platforms.length)]
          e.ai.targetY = platform.y
          e.ai.altitudeX = platform.x + platform.w / 2
        }
      } else {
        e.ai.targetY = GROUND
      }
    }
    if (pack && e.hp < 65) {
      e.ai.targetY = pack.y
      e.ai.altitudeX = pack.x
    }

    if (now > e.ai.thinkAt) {
      e.ai.thinkAt = now + rand(0.5, 1.1)
      let dir
      if (pack && e.hp < 65) {
        dir = Math.sign(pack.x - e.x)
      } else {
        const gap = Math.abs(dist)
        if (gap > weapon.range + 80) dir = Math.sign(dist)
        else if (gap < weapon.range - 80) dir = -Math.sign(dist)
        else {
          if (Math.random() < 0.35) e.ai.strafeDir *= -1
          dir = e.ai.strafeDir
        }
      }
      if (e.x < 130 && dir < 0) dir = 1
      if (e.x > W - 130 && dir > 0) dir = -1
      e.ai.moveDir = dir
    }

    const wantsUp = e.fuel > 3 && e.y > e.ai.targetY + 24
    let hoverDir = e.ai.moveDir
    if (wantsUp && e.ai.altitudeX != null && Math.abs(e.ai.altitudeX - e.x) > 24) {
      hoverDir = sign(e.ai.altitudeX - e.x)
    }
    this.moveFighter(e, hoverDir, dt, AI_SPEED, wantsUp)

    if (now >= e.ai.burstAt) {
      const burst = ['sniper', 'shotgun', 'rocket'].includes(weapon.id)
        ? 1
        : Math.floor(rand(2, 4))
      e.ai.burstLeft = Math.max(1, burst)
      e.ai.burstAt = now + rand(1.7, 2.9)
    }

    if (e.ai.burstLeft > 0 && now >= e.ai.shotAt) {
      const fired = this.tryShoot(e, 'enemy')
      e.ai.shotAt = now + (fired ? weapon.rate * rand(1.4, 2.4) : 0.35)
      if (fired) e.ai.burstLeft -= 1
    }

    if (e.ammo[e.weapon] <= 0) this.startReload(e)
    this.tickReloads()
  }

  moveFighter(fighter, dir, dt, maxSpeed, thrust = false) {
    const accel = 2300
    const friction = 2800
    if (dir !== 0) {
      fighter.vx += dir * accel * dt
    } else {
      fighter.vx -= sign(fighter.vx) * Math.min(Math.abs(fighter.vx), friction * dt)
    }
    fighter.vx = clamp(fighter.vx, -maxSpeed, maxSpeed)
    fighter.x += fighter.vx * dt
    if (fighter.x < 74) {
      fighter.x = 74
      fighter.vx = Math.max(0, fighter.vx)
    }
    if (fighter.x > W - 74) {
      fighter.x = W - 74
      fighter.vx = Math.min(0, fighter.vx)
    }
    fighter.walkPhase += Math.abs(fighter.vx) * dt * 0.047

    const wasGrounded = fighter.grounded
    const canThrust = thrust && fighter.fuel > 0

    if (canThrust) {
      fighter.vy -= JET_THRUST * dt
      fighter.vy = Math.max(fighter.vy, -MAX_UP_SPEED)
      fighter.fuel = Math.max(0, fighter.fuel - JET_DRAIN * dt)
      fighter.grounded = false
      fighter.thrusting = true
      fighter.dustTimer -= dt
      if (fighter.dustTimer <= 0) {
        fighter.dustTimer = 0.035
        this.spawnJet(fighter.x, fighter.y, fighter.facing)
      }
    } else {
      fighter.thrusting = false
      fighter.vy = Math.min(MAX_FALL_SPEED, fighter.vy + GRAVITY * dt)
      fighter.fuel = Math.min(
        FUEL_MAX,
        fighter.fuel + (wasGrounded ? FUEL_REGEN_GROUND : FUEL_REGEN_AIR) * dt,
      )
    }

    const previousFeet = fighter.y
    fighter.y += fighter.vy * dt

    if (fighter.y < 130) {
      fighter.y = 130
      fighter.vy = Math.max(0, fighter.vy)
    }

    let landed = false
    if (fighter.vy >= 0) {
      for (const platform of this.platforms) {
        if (
          previousFeet <= platform.y + 6 &&
          fighter.y >= platform.y &&
          fighter.x > platform.x - 16 &&
          fighter.x < platform.x + platform.w + 16
        ) {
          fighter.y = platform.y
          fighter.vy = 0
          landed = true
          break
        }
      }
    }

    if (fighter.y >= GROUND) {
      fighter.y = GROUND
      fighter.vy = 0
      landed = true
    }
    fighter.grounded = landed

    if (landed && Math.abs(fighter.vx) > 55) {
      fighter.dustTimer -= dt
      if (fighter.dustTimer <= 0) {
        fighter.dustTimer = 0.09
        this.spawnDust(fighter.x - sign(fighter.vx) * 12, fighter.y, -sign(fighter.vx))
      }
    }
  }

  keepApart() {
    const p = this.player
    const e = this.enemy
    if (p.hp <= 0 || e.hp <= 0) return
    if (Math.abs(p.y - e.y) > 90) return
    const dx = p.x - e.x
    if (Math.abs(dx) < 48) {
      const push = (48 - Math.abs(dx)) / 2
      const dir = sign(dx || 1)
      p.x = clamp(p.x + push * dir, 74, W - 74)
      e.x = clamp(e.x - push * dir, 74, W - 74)
    }
  }

  tryShoot(fighter, owner) {
    const weapon = WEAPONS[fighter.weapon]
    const now = this.time
    if (now < fighter.nextFire) return false
    if (fighter.reload[fighter.weapon] > now) return false
    if (fighter.ammo[fighter.weapon] <= 0) {
      this.startReload(fighter)
      return false
    }

    fighter.ammo[fighter.weapon] -= 1
    fighter.nextFire = now + weapon.rate
    fighter.recoil = 1
    fighter.muzzle = 0.07

    const shoulderX = fighter.x
    const shoulderY = fighter.y - 48
    let muzzleX = shoulderX
    let muzzleY = shoulderY

    for (let i = 0; i < weapon.pellets; i += 1) {
      const angle = fighter.aim + (Math.random() - 0.5) * 2 * weapon.spread
      const speed = weapon.speed * rand(0.96, 1.04)
      muzzleX = shoulderX + Math.cos(angle) * (weapon.gunLength + 16)
      muzzleY = shoulderY + Math.sin(angle) * (weapon.gunLength + 16)
      this.bullets.push({
        x: muzzleX,
        y: muzzleY,
        px: muzzleX,
        py: muzzleY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: weapon.damage,
        owner,
        life: weapon.life,
        weapon: weapon.id,
        color: weapon.color,
        r: weapon.id === 'rocket' ? 8 : 3,
        splash: weapon.splash,
      })
    }

    this.spawnMuzzle(muzzleX, muzzleY, fighter.aim)
    this.spawnShell(shoulderX, shoulderY, fighter.aim)
    this.shake = Math.min(16, Math.max(this.shake, weapon.kick * (owner === 'player' ? 0.8 : 0.5)))
    this.sound.shoot(weapon.id, owner === 'enemy')

    if (fighter.ammo[fighter.weapon] <= 0) this.startReload(fighter)
    return true
  }

  startReload(fighter) {
    const weapon = WEAPONS[fighter.weapon]
    if (fighter.ammo[fighter.weapon] >= weapon.mag) return
    if (fighter.reload[fighter.weapon] > 0) return
    fighter.reload[fighter.weapon] = this.time + weapon.reload
    if (fighter === this.player) this.sound.reload()
  }

  tickReloads() {
    for (const fighter of [this.player, this.enemy]) {
      if (fighter.hp <= 0) continue
      for (let i = 0; i < WEAPONS.length; i += 1) {
        if (fighter.reload[i] > 0 && this.time >= fighter.reload[i]) {
          fighter.ammo[i] = WEAPONS[i].mag
          fighter.reload[i] = 0
        }
      }
    }
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const b = this.bullets[i]
      // A kill can clear the bullet list mid-loop.
      if (!b) continue
      b.px = b.x
      b.py = b.y
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.life -= dt

      if (b.weapon === 'rocket' && Math.random() < 0.7) {
        this.addParticle({
          x: b.x - Math.cos(Math.atan2(b.vy, b.vx)) * 12,
          y: b.y - Math.sin(Math.atan2(b.vy, b.vx)) * 12,
          vx: rand(-20, 20),
          vy: rand(-30, 10),
          life: rand(0.3, 0.6),
          maxLife: 0.6,
          size: rand(4, 9),
          color: 'rgba(210, 210, 210, 0.75)',
          gravity: -20,
          shape: 'circle',
        })
      }

      let remove = false

      if (b.y >= GROUND - 2) {
        if (b.splash) this.explode(b.x, GROUND, b.splash, b.owner)
        else this.spawnDust(b.x, GROUND, 0)
        remove = true
      } else if (b.y < -20 || b.x < -40 || b.x > W + 40 || b.life <= 0) {
        remove = true
      }

      if (!remove) {
        const target = b.owner === 'player' ? this.enemy : this.player
        if (
          target.hp > 0 &&
          segmentHitsRect(
            b.px,
            b.py,
            b.x,
            b.y,
            target.x - 19,
            target.y - 84,
            38,
            84,
            b.r,
          )
        ) {
          if (b.splash) {
            this.explode(b.x, b.y, b.splash, b.owner)
          } else {
            this.damage(target, b.damage, b.owner)
            this.spawnHit(b.x, b.y, b.owner === 'player' ? '#ffd166' : '#ff6b6b')
          }
          remove = true
        }
      }

      if (remove) this.bullets.splice(i, 1)
    }
  }

  updatePickups(dt) {
    this.pickupTimer -= dt
    if (this.pickupTimer <= 0 && this.pickups.length < 2) {
      let x = rand(150, W - 150)
      let y = GROUND
      if (Math.random() < 0.55) {
        const platform = this.platforms[Math.floor(Math.random() * this.platforms.length)]
        x = rand(platform.x + 30, platform.x + platform.w - 30)
        y = platform.y
      }
      this.pickups.push({
        x,
        y,
        type: 'health',
        bob: rand(0, TAU),
      })
      this.pickupTimer = rand(9, 14)
    }

    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pk = this.pickups[i]
      let taken = false
      for (const fighter of [this.player, this.enemy]) {
        if (fighter.hp <= 0 || fighter.hp >= fighter.maxHp) continue
        if (Math.abs(fighter.x - pk.x) < 42 && Math.abs(fighter.y - pk.y) < 56) {
          fighter.hp = Math.min(fighter.maxHp, fighter.hp + 35)
          this.floaters.push({
            x: fighter.x,
            y: fighter.y - 100,
            text: '+35',
            color: '#7dff9b',
            size: 22,
            life: 0.9,
            maxLife: 0.9,
          })
          this.sound.pickup()
          this.pickups.splice(i, 1)
          taken = true
          break
        }
      }
      if (taken) continue
    }
  }

  damage(target, amount, owner) {
    if (this.state !== 'playing' || target.hp <= 0) return
    const scaled = owner === 'enemy' ? amount * AI_DAMAGE_SCALE : amount
    const dmg = Math.max(1, Math.round(scaled))
    target.hp = Math.max(0, target.hp - dmg)
    target.hitFlash = 0.18
    this.floaters.push({
      x: target.x + rand(-12, 12),
      y: target.y - 96,
      text: `-${dmg}`,
      color: owner === 'player' ? '#ffe066' : '#ff7b7b',
      size: dmg >= 40 ? 30 : 22,
      life: 0.85,
      maxLife: 0.85,
    })
    this.spawnHit(target.x, target.y - 50, target.team === 'player' ? '#ff6b6b' : '#ffd166')
    if (owner === 'player') {
      this.sound.hit()
      this.shake = Math.max(this.shake, 3)
    } else {
      this.sound.hurt()
      this.shake = Math.max(this.shake, 10)
    }
    if (target.hp <= 0) this.onDeath(target)
  }

  onDeath(target) {
    if (this.state !== 'playing') return
    target.hp = 0
    target.deathTime = this.time
    target.vx = 0
    target.vy = 0
    target.thrusting = false
    target.muzzle = 0
    this.state = 'ending'
    this.endTimer = 1.7
    this.roundWinner = target.team === 'player' ? 'enemy' : 'player'
    this.bullets = []
    this.pointer.down = false
    this.sound.death()
    this.spawnDeath(target)
    this.publishHud()
  }

  finishRound() {
    if (this.state !== 'ending') return
    this.scores[this.roundWinner] += 1
    const matchOver = this.scores.player >= 3 || this.scores.enemy >= 3
    this.state = 'roundEnd'
    this.publishHud()
    this.callbacks.onRoundEnd?.({
      winner: this.roundWinner,
      playerScore: this.scores.player,
      enemyScore: this.scores.enemy,
      matchOver,
      round: this.round,
    })
  }

  explode(x, y, splash, owner) {
    this.explosions.push({ x, y, maxR: splash.radius, life: 0.4, maxLife: 0.4 })
    this.shake = Math.max(this.shake, 12)
    this.sound.explode()

    for (let i = 0; i < 24; i += 1) {
      const angle = rand(0, TAU)
      const speed = rand(40, 330)
      const smoke = i % 3 === 0
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.25, 0.8),
        maxLife: 0.8,
        size: smoke ? rand(6, 14) : rand(2, 6),
        color: smoke ? 'rgba(90, 85, 85, 0.5)' : i % 2 ? '#ffb347' : '#ff5a3c',
        gravity: smoke ? -50 : 260,
        shape: 'circle',
      })
    }

    const target = owner === 'player' ? this.enemy : this.player
    const distance = Math.hypot(target.x - x, target.y - 42 - y)
    if (target.hp > 0 && distance < splash.radius) {
      const falloff = 1 - distance / splash.radius
      this.damage(target, Math.round(splash.damage * (0.45 + 0.55 * falloff)), owner)
    }
  }

  spawnHit(x, y, color) {
    for (let i = 0; i < 9; i += 1) {
      const angle = rand(0, TAU)
      const speed = rand(30, 220)
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.15, 0.4),
        maxLife: 0.4,
        size: rand(2, 5),
        color: Math.random() < 0.5 ? color : '#fff3c4',
        gravity: 320,
        shape: 'circle',
      })
    }
  }

  spawnMuzzle(x, y, angle) {
    for (let i = 0; i < 4; i += 1) {
      const a = angle + rand(-0.3, 0.3)
      const speed = rand(70, 230)
      this.addParticle({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: rand(0.1, 0.28),
        maxLife: 0.28,
        size: rand(2, 5),
        color: i % 2 ? '#ffd166' : '#fff3c4',
        gravity: -40,
        shape: 'circle',
      })
    }
  }

  spawnShell(x, y, angle) {
    this.addParticle({
      x,
      y: y - 2,
      vx: -Math.cos(angle) * 70 + rand(-60, 60),
      vy: rand(-200, -90),
      life: 0.85,
      maxLife: 0.85,
      size: 4,
      color: '#ffd166',
      gravity: 950,
      shape: 'shell',
      rot: rand(0, TAU),
      vr: rand(-14, 14),
    })
  }

  spawnDust(x, y, direction) {
    this.addParticle({
      x: x + rand(-6, 6),
      y: y - 2,
      vx: direction * rand(20, 70) + rand(-15, 15),
      vy: rand(-60, -15),
      life: rand(0.25, 0.55),
      maxLife: 0.55,
      size: rand(3, 7),
      color: 'rgba(170, 140, 105, 0.55)',
      gravity: -20,
      shape: 'circle',
    })
  }

  spawnJet(x, y, facing) {
    this.addParticle({
      x: x + rand(-7, 7) - facing * 6,
      y: y - rand(2, 10),
      vx: rand(-35, 35),
      vy: rand(70, 180),
      life: rand(0.16, 0.38),
      maxLife: 0.38,
      size: rand(3, 7),
      color: Math.random() < 0.5 ? '#ffd166' : '#ff9a3c',
      gravity: 380,
      shape: 'circle',
    })
  }

  spawnDeath(target) {
    for (let i = 0; i < 26; i += 1) {
      const angle = rand(0, TAU)
      const speed = rand(60, 320)
      this.addParticle({
        x: target.x,
        y: target.y - 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: rand(0.4, 1.1),
        maxLife: 1.1,
        size: rand(3, 7),
        color: i % 3 === 0 ? '#ffe066' : i % 3 === 1 ? '#ff8a5c' : '#ffffff',
        gravity: 520,
        shape: i % 2 ? 'square' : 'circle',
        rot: rand(0, TAU),
        vr: rand(-10, 10),
      })
    }
    this.floaters.push({
      x: target.x,
      y: target.y - 116,
      text: '💀',
      color: '#ffffff',
      size: 34,
      life: 1.2,
      maxLife: 1.2,
    })
  }

  addParticle(particle) {
    if (this.particles.length > 420) this.particles.shift()
    this.particles.push(particle)
  }

  updateEffects(dt) {
    this.shake = Math.max(0, this.shake - dt * 30)
    this.fightFlash = Math.max(0, this.fightFlash - dt)

    for (const fighter of [this.player, this.enemy]) {
      fighter.hitFlash = Math.max(0, fighter.hitFlash - dt)
      fighter.muzzle = Math.max(0, fighter.muzzle - dt)
      fighter.recoil = Math.max(0, fighter.recoil - dt * 8)
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += (p.gravity || 0) * dt
      if (p.vr) p.rot += p.vr * dt
      if (p.y > GROUND - 1) {
        p.y = GROUND - 1
        p.vy *= -0.35
        p.vx *= 0.7
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i -= 1) {
      this.explosions[i].life -= dt
      if (this.explosions[i].life <= 0) this.explosions.splice(i, 1)
    }

    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i]
      f.life -= dt
      f.y -= dt * 34
      if (f.life <= 0) this.floaters.splice(i, 1)
    }
  }

  syncHud(dt) {
    this.hudTimer -= dt
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.08
      this.publishHud()
    }
  }

  publishHud() {
    const p = this.player
    const weapon = WEAPONS[p.weapon]
    const reloadEnd = p.reload[p.weapon]
    const reloading = reloadEnd > this.time
    const reloadProgress = reloading
      ? clamp(1 - (reloadEnd - this.time) / weapon.reload, 0, 1)
      : 1

    this.callbacks.onHud?.({
      playerHP: Math.ceil(p.hp),
      playerMaxHP: p.maxHp,
      enemyHP: Math.ceil(this.enemy.hp),
      enemyMaxHP: this.enemy.maxHp,
      fuel: Math.round(p.fuel),
      maxFuel: FUEL_MAX,
      weapon: p.weapon,
      ammo: p.ammo.slice(),
      reloading,
      reloadProgress,
      scores: { ...this.scores },
      round: this.round,
      state: this.state,
      muted: this.muted,
    })
  }

  bindEvents() {
    this.onKeyDown = (event) => {
      if (this.paused) return
      const code = event.code
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'KeyR', 'Space'].includes(
          code,
        ) ||
        /^Digit[1-6]$/.test(code)
      ) {
        event.preventDefault()
      }
      if (event.repeat && /^Digit/.test(code)) return
      switch (code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true
          break
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true
          break
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
          this.keys.up = true
          break
        case 'KeyR':
          if (this.state === 'playing') this.startReload(this.player)
          break
        default:
          if (/^Digit[1-6]$/.test(code)) {
            this.selectWeapon(Number(code.slice(5)) - 1)
          }
      }
    }

    this.onKeyUp = (event) => {
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') this.keys.left = false
      if (event.code === 'KeyD' || event.code === 'ArrowRight') this.keys.right = false
      if (['KeyW', 'ArrowUp', 'Space'].includes(event.code)) this.keys.up = false
    }

    this.onPointerMove = (event) => {
      this.setPointer(event)
      this.pointer.inside = true
    }

    this.onPointerDown = (event) => {
      if (event.button !== 0 || this.paused) return
      this.sound.resume()
      this.setPointer(event)
      this.pointer.inside = true
      this.pointer.down = true
      if (this.state === 'playing' || this.state === 'countdown') this.updatePlayerAim()
    }

    this.onPointerUp = () => {
      this.pointer.down = false
    }

    this.onPointerLeave = () => {
      this.pointer.inside = false
      this.pointer.down = false
    }

    this.onWheel = (event) => {
      event.preventDefault()
      if (this.paused || this.state === 'idle' || this.state === 'roundEnd') return
      const step = event.deltaY > 0 ? 1 : -1
      this.selectWeapon((this.player.weapon + step + WEAPONS.length) % WEAPONS.length)
    }

    this.onContextMenu = (event) => event.preventDefault()

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('pointerup', this.onPointerUp)
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointerleave', this.onPointerLeave)
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false })
    this.canvas.addEventListener('contextmenu', this.onContextMenu)
  }

  setPointer(event) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.screenX = clamp(((event.clientX - rect.left) / rect.width) * VIEW_W, 0, VIEW_W)
    this.pointer.screenY = clamp(((event.clientY - rect.top) / rect.height) * VIEW_H, 0, VIEW_H)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave)
    this.canvas.removeEventListener('wheel', this.onWheel)
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
    if (this.sound.ctx) this.sound.ctx.close()
  }
}
