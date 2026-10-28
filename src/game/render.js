import { TEAM, VIEW, WEAPONS, WORLD } from './weapons.js'

const { width: W, height: H, ground: GROUND } = WORLD
const { width: VIEW_W, height: VIEW_H } = VIEW
const LEFT = -520
const RIGHT = W + 520
const BOTTOM = H + 300

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function cloud(ctx, x, y, scale) {
  ctx.beginPath()
  ctx.arc(x, y, 26 * scale, 0, Math.PI * 2)
  ctx.arc(x + 28 * scale, y + 7 * scale, 20 * scale, 0, Math.PI * 2)
  ctx.arc(x - 28 * scale, y + 9 * scale, 18 * scale, 0, Math.PI * 2)
  ctx.arc(x + 4 * scale, y - 14 * scale, 19 * scale, 0, Math.PI * 2)
  ctx.fill()
}

function drawBackground(game) {
  const { ctx, time } = game

  const sky = ctx.createLinearGradient(0, -200, 0, GROUND)
  sky.addColorStop(0, '#4aa9f5')
  sky.addColorStop(0.5, '#a9ddff')
  sky.addColorStop(1, '#ffe2b8')
  ctx.fillStyle = sky
  ctx.fillRect(LEFT, -400, RIGHT - LEFT, GROUND + 400)

  // Sun
  const sunGlow = ctx.createRadialGradient(1075, 128, 8, 1075, 128, 160)
  sunGlow.addColorStop(0, 'rgba(255, 244, 180, 0.95)')
  sunGlow.addColorStop(0.35, 'rgba(255, 224, 120, 0.55)')
  sunGlow.addColorStop(1, 'rgba(255, 224, 120, 0)')
  ctx.fillStyle = sunGlow
  ctx.fillRect(895, -60, 360, 360)
  ctx.fillStyle = '#fff4b8'
  ctx.beginPath()
  ctx.arc(1075, 128, 46, 0, Math.PI * 2)
  ctx.fill()

  // Clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
  for (const c of game.clouds) {
    const x = ((c.x + time * c.speed) % (W + 340)) - 170
    cloud(ctx, x, c.y, c.s)
  }

  // Distant hills, extended past the world edges so the camera never sees a gap
  ctx.fillStyle = '#a9c99b'
  ctx.beginPath()
  ctx.moveTo(LEFT, GROUND + 2)
  for (let x = LEFT; x <= RIGHT; x += 24) {
    const y =
      GROUND - 105 - Math.sin(x * 0.0045) * 58 - Math.sin(x * 0.012 + 1.7) * 26
    ctx.lineTo(x, y)
  }
  ctx.lineTo(RIGHT, GROUND + 2)
  ctx.closePath()
  ctx.fill()

  // Foreground hill band
  ctx.fillStyle = '#8fbe83'
  ctx.beginPath()
  ctx.moveTo(LEFT, GROUND + 2)
  for (let x = LEFT; x <= RIGHT; x += 26) {
    const y = GROUND - 48 - Math.sin(x * 0.009 + 0.8) * 22
    ctx.lineTo(x, y)
  }
  ctx.lineTo(RIGHT, GROUND + 2)
  ctx.closePath()
  ctx.fill()

  // City skyline
  for (const b of game.skyline) {
    ctx.fillStyle = b.color
    ctx.fillRect(b.x, GROUND - 92 - b.h, b.w, b.h + 92)
    ctx.fillStyle = 'rgba(255, 243, 190, 0.5)'
    for (let wy = GROUND - 82 - b.h; wy < GROUND - 22; wy += 22) {
      for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 18) {
        if ((wx + wy) % 7 < 4) ctx.fillRect(wx, wy, 6, 8)
      }
    }
  }

  // Fence
  ctx.strokeStyle = 'rgba(86, 102, 94, 0.55)'
  ctx.lineWidth = 3
  for (let x = LEFT; x < RIGHT; x += 34) {
    ctx.beginPath()
    ctx.moveTo(x, GROUND - 26)
    ctx.lineTo(x + 3, GROUND - 4)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(LEFT, GROUND - 20)
  ctx.lineTo(RIGHT, GROUND - 20)
  ctx.stroke()

  // Ground
  const dirt = ctx.createLinearGradient(0, GROUND, 0, BOTTOM)
  dirt.addColorStop(0, '#8a6247')
  dirt.addColorStop(1, '#4b3526')
  ctx.fillStyle = dirt
  ctx.fillRect(LEFT, GROUND, RIGHT - LEFT, BOTTOM - GROUND)
  ctx.fillStyle = '#79c95d'
  ctx.fillRect(LEFT, GROUND - 4, RIGHT - LEFT, 16)
  ctx.fillStyle = '#5cae46'
  ctx.fillRect(LEFT, GROUND + 8, RIGHT - LEFT, 4)

  // Grass tufts
  ctx.strokeStyle = 'rgba(56, 134, 64, 0.65)'
  ctx.lineWidth = 2
  for (const t of game.tufts) {
    ctx.beginPath()
    ctx.moveTo(t.x, GROUND + 4)
    ctx.lineTo(t.x + t.lean, GROUND + 4 - t.h)
    ctx.stroke()
  }

  // Scenery
  for (const b of game.bushes) {
    ctx.fillStyle = b.dark ? '#3f8b4d' : '#57a85e'
    ctx.beginPath()
    ctx.arc(b.x, GROUND - 6, 24 * b.s, Math.PI, 0)
    ctx.arc(b.x + 24 * b.s, GROUND - 6, 17 * b.s, Math.PI, 0)
    ctx.arc(b.x - 24 * b.s, GROUND - 6, 18 * b.s, Math.PI, 0)
    ctx.fill()
  }

  for (const barrel of game.barrels) {
    ctx.fillStyle = '#7f5233'
    roundRect(ctx, barrel.x - 17, GROUND - 56, 34, 56, 5)
    ctx.fill()
    ctx.fillStyle = '#9c6a44'
    roundRect(ctx, barrel.x - 14, GROUND - 53, 28, 8, 4)
    ctx.fill()
    roundRect(ctx, barrel.x - 14, GROUND - 20, 28, 8, 4)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60, 35, 20, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(barrel.x - 17, GROUND - 42)
    ctx.lineTo(barrel.x + 17, GROUND - 42)
    ctx.stroke()
  }

  // Arena sign
  ctx.save()
  ctx.translate(W / 2, GROUND - 155)
  ctx.scale(0.8, 0.8)
  ctx.fillStyle = 'rgba(32, 38, 58, 0.85)'
  roundRect(ctx, -136, -32, 272, 62, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
  ctx.lineWidth = 2
  roundRect(ctx, -130, -26, 260, 50, 9)
  ctx.stroke()
  ctx.fillStyle = '#ffe27a'
  ctx.font = '800 24px "Baloo 2", ui-rounded, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('BOT BRAWL ARENA', 0, 0)
  ctx.restore()
}

function drawPlatforms(game) {
  const { ctx } = game
  for (const p of game.platforms) {
    // dangling support cables
    ctx.strokeStyle = 'rgba(38, 48, 70, 0.2)'
    ctx.lineWidth = 3
    for (const cx of [p.x + 24, p.x + p.w - 24]) {
      ctx.beginPath()
      ctx.moveTo(cx, p.y + 16)
      ctx.lineTo(cx, p.y + 48)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(22, 30, 48, 0.22)'
    roundRect(ctx, p.x + 5, p.y + 8, p.w, 26, 9)
    ctx.fill()

    const slab = ctx.createLinearGradient(0, p.y - 6, 0, p.y + 18)
    slab.addColorStop(0, '#7d8ba6')
    slab.addColorStop(0.55, '#505d75')
    slab.addColorStop(1, '#333d52')
    ctx.fillStyle = slab
    roundRect(ctx, p.x, p.y - 6, p.w, 24, 8)
    ctx.fill()
    ctx.strokeStyle = 'rgba(24, 30, 46, 0.65)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#9fe37d'
    roundRect(ctx, p.x + 2, p.y - 6, p.w - 4, 5, 3)
    ctx.fill()

    // hazard dashes
    ctx.fillStyle = 'rgba(255, 209, 102, 0.55)'
    for (let sx = p.x + 14; sx < p.x + p.w - 16; sx += 34) {
      ctx.fillRect(sx, p.y + 7, 16, 3)
    }

    // rivets + pulsing edge lights
    ctx.fillStyle = 'rgba(230, 240, 255, 0.55)'
    for (const rx of [p.x + 10, p.x + p.w - 10]) {
      ctx.beginPath()
      ctx.arc(rx, p.y + 15, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    const glow = 0.55 + Math.sin(game.time * 3 + p.x) * 0.35
    ctx.fillStyle = `rgba(255, 224, 102, ${glow})`
    ctx.beginPath()
    ctx.arc(p.x + p.w / 2, p.y + 15, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPickups(game) {
  const { ctx } = game
  for (const p of game.pickups) {
    const bob = Math.sin(game.time * 3 + p.bob) * 4
    const y = p.y - 22 + bob

    ctx.save()
    ctx.shadowColor = 'rgba(255, 90, 110, 0.75)'
    ctx.shadowBlur = 22
    ctx.fillStyle = '#fff6f6'
    roundRect(ctx, p.x - 18, y - 16, 36, 30, 8)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = '#ff4d6d'
    roundRect(ctx, p.x - 4, y - 11, 8, 20, 2)
    ctx.fill()
    roundRect(ctx, p.x - 10, y - 5, 20, 8, 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(40, 50, 60, 0.25)'
    ctx.lineWidth = 2
    roundRect(ctx, p.x - 18, y - 16, 36, 30, 8)
    ctx.stroke()

    ctx.fillStyle = 'rgba(70, 45, 35, 0.15)'
    ctx.beginPath()
    ctx.ellipse(p.x, p.y + 4, 22, 6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawFighter(game, f) {
  const { ctx } = game
  const c = TEAM[f.team]
  const weapon = WEAPONS[f.weapon]
  const dead = f.hp <= 0
  const speed = Math.abs(f.vx)
  const swing = Math.sin(f.walkPhase) * Math.min(1, speed / 130) * 10
  const bob = speed > 20 ? Math.abs(Math.cos(f.walkPhase)) * 2.2 : Math.sin(game.time * 2.2) * 0.9
  const deadTilt = dead ? Math.min(1, (game.time - f.deathTime) * 3) : 0

  // shadow
  ctx.fillStyle = 'rgba(30, 42, 28, 0.28)'
  ctx.beginPath()
  ctx.ellipse(f.x, f.y + 3, 27, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(f.x, f.y)

  if (dead) {
    ctx.globalAlpha = 0.8
    ctx.rotate(-f.facing * deadTilt * 1.35)
  }

  ctx.translate(0, -bob)

  const flash = f.hitFlash > 0
  const shirt = flash ? '#ffffff' : c.shirt
  const pants = flash ? '#ffffff' : c.pants

  // legs
  ctx.strokeStyle = pants
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-6, -26)
  ctx.lineTo(-6 + swing, -2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(6, -26)
  ctx.lineTo(6 - swing, -2)
  ctx.stroke()

  // boots
  ctx.strokeStyle = flash ? '#ffffff' : '#2a2a35'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(-6 + swing, -3)
  ctx.lineTo(-6 + swing + 7 * f.facing, -3)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(6 - swing, -3)
  ctx.lineTo(6 - swing + 7 * f.facing, -3)
  ctx.stroke()

  // jetpack (always worn, because safety third)
  const packX = f.facing > 0 ? -24 : 15
  if (f.thrusting) {
    const flicker = Math.sin(game.time * 42) * 3
    ctx.save()
    ctx.shadowColor = 'rgba(255, 154, 60, 0.85)'
    ctx.shadowBlur = 14
    ctx.fillStyle = '#ff9a3c'
    ctx.beginPath()
    ctx.moveTo(packX + 1, -31)
    ctx.lineTo(packX + 9, -31)
    ctx.lineTo(packX + 5 + flicker * 0.4, -9 + flicker)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffe066'
    ctx.beginPath()
    ctx.moveTo(packX + 3, -31)
    ctx.lineTo(packX + 7, -31)
    ctx.lineTo(packX + 5, -20 + flicker * 0.5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = '#3d465e'
  roundRect(ctx, packX, -54, 9, 25, 4)
  ctx.fill()
  ctx.fillStyle = '#65718c'
  roundRect(ctx, packX + 1, -52, 7, 6, 2)
  ctx.fill()

  // torso
  ctx.fillStyle = shirt
  roundRect(ctx, -15, -59, 30, 36, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(22, 24, 38, 0.6)'
  ctx.lineWidth = 2
  ctx.stroke()

  // vest
  ctx.fillStyle = flash ? '#f2f2f2' : c.dark
  roundRect(ctx, -13, -54, 26, 16, 5)
  ctx.fill()
  ctx.fillStyle = flash ? '#ffffff' : '#2b3040'
  ctx.fillRect(-15, -30, 30, 5)

  // head
  const hx = f.facing > 0 ? 2 : -2
  ctx.fillStyle = flash ? '#ffffff' : c.skin
  ctx.beginPath()
  ctx.arc(hx, -71, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(22, 24, 38, 0.45)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // helmet
  ctx.fillStyle = flash ? '#ffffff' : c.helmet
  ctx.beginPath()
  ctx.arc(hx, -73, 14.5, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(hx - 15, -74, 30, 5)
  ctx.strokeStyle = 'rgba(22, 24, 38, 0.6)'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(hx, -73, 14.5, Math.PI, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = flash ? '#ffffff' : c.dark
  ctx.fillRect(hx - 15, -74, 30, 2)

  // face
  if (dead) {
    ctx.strokeStyle = '#3a2b24'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(hx - 7, -70)
    ctx.lineTo(hx - 3, -66)
    ctx.moveTo(hx - 3, -70)
    ctx.lineTo(hx - 7, -66)
    ctx.moveTo(hx + 3, -70)
    ctx.lineTo(hx + 7, -66)
    ctx.moveTo(hx + 7, -70)
    ctx.lineTo(hx + 3, -66)
    ctx.stroke()
  } else {
    ctx.fillStyle = '#33251f'
    ctx.beginPath()
    ctx.arc(hx - 4, -68, 1.8, 0, Math.PI * 2)
    ctx.arc(hx + 4, -68, 1.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#7c4d3d'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(hx, -63, 4, 0.15, Math.PI - 0.15)
    ctx.stroke()
  }

  // gun
  ctx.save()
  ctx.translate(0, -48)
  ctx.rotate(f.aim)
  const recoil = f.recoil * 4

  // back arm
  ctx.strokeStyle = flash ? '#ffffff' : c.skin
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(15 - recoil, 7)
  ctx.stroke()

  if (weapon.id === 'rocket') {
    ctx.fillStyle = '#384052'
    roundRect(ctx, 8 - recoil, -9, weapon.gunLength, 18, 7)
    ctx.fill()
    ctx.fillStyle = '#ff7a59'
    ctx.beginPath()
    ctx.arc(8 + weapon.gunLength - recoil, 0, 8, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = '#2b3040'
    roundRect(ctx, 10 - recoil, -6, weapon.gunLength, 12, 4)
    ctx.fill()
    ctx.fillStyle = '#525b70'
    roundRect(ctx, 14 - recoil, -8, Math.max(8, weapon.gunLength * 0.4), 5, 2)
    ctx.fill()

    if (weapon.id === 'sniper') {
      ctx.fillStyle = '#32394c'
      roundRect(ctx, 20 - recoil, -13, 20, 6, 3)
      ctx.fill()
      ctx.strokeStyle = '#8b94ab'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(22 - recoil, -13)
      ctx.lineTo(22 - recoil, -6)
      ctx.moveTo(38 - recoil, -13)
      ctx.lineTo(38 - recoil, -6)
      ctx.stroke()
    }
    if (weapon.id === 'shotgun') {
      ctx.fillStyle = '#6b4b2a'
      roundRect(ctx, 8 - recoil, 2, 22, 7, 3)
      ctx.fill()
    }
  }

  // hand
  ctx.fillStyle = flash ? '#ffffff' : c.skin
  ctx.beginPath()
  ctx.arc(18 - recoil, 5, 4.5, 0, Math.PI * 2)
  ctx.fill()

  // muzzle flash
  if (f.muzzle > 0) {
    const tipX = 10 + weapon.gunLength - recoil
    const glow = ctx.createRadialGradient(tipX, 0, 1, tipX, 0, 22)
    glow.addColorStop(0, 'rgba(255, 255, 220, 0.95)')
    glow.addColorStop(0.35, 'rgba(255, 198, 76, 0.9)')
    glow.addColorStop(1, 'rgba(255, 120, 30, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(tipX, 0, 22, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
  ctx.restore()

  // overhead nameplate
  if (!dead) {
    const barW = 64
    const barX = f.x - barW / 2
    const barY = f.y - 118
    ctx.fillStyle = 'rgba(18, 24, 34, 0.66)'
    roundRect(ctx, barX - 2, barY - 2, barW + 4, 14, 7)
    ctx.fill()
    ctx.fillStyle = f.team === 'player' ? '#4f8dff' : '#ff5a5f'
    roundRect(ctx, barX, barY, barW * Math.max(0, f.hp) / f.maxHp, 10, 5)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '700 10px ui-rounded, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(c.tag, f.x, barY - 10)
  } else {
    ctx.globalAlpha = 1
    ctx.font = '700 16px ui-rounded, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fillText('💀', f.x, f.y - 92)
  }
}

function drawBullets(game) {
  const { ctx } = game
  for (const b of game.bullets) {
    const angle = Math.atan2(b.vy, b.vx)
    ctx.save()
    ctx.translate(b.x, b.y)

    if (b.weapon === 'rocket') {
      ctx.rotate(angle)
      ctx.shadowColor = '#ff9a3c'
      ctx.shadowBlur = 18
      ctx.fillStyle = '#ff6b6b'
      roundRect(ctx, -10, -6, 22, 12, 6)
      ctx.fill()
      ctx.fillStyle = '#ffe066'
      ctx.beginPath()
      ctx.moveTo(-10, -5)
      ctx.lineTo(-22, 0)
      ctx.lineTo(-10, 5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      continue
    }

    ctx.rotate(angle)
    ctx.shadowColor = b.color
    ctx.shadowBlur = 12
    ctx.strokeStyle = b.color
    ctx.lineWidth = b.weapon === 'sniper' ? 4 : 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-16, 0)
    ctx.lineTo(2, 0)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-9, 0)
    ctx.lineTo(1, 0)
    ctx.stroke()
    ctx.restore()
  }
}

function drawParticles(game) {
  const { ctx } = game
  for (const p of game.particles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    if (p.shape === 'shell' || p.shape === 'square') {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7)
      ctx.restore()
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

function drawExplosions(game) {
  const { ctx } = game
  for (const e of game.explosions) {
    const k = 1 - e.life / e.maxLife
    const r = e.maxR * k
    ctx.globalAlpha = Math.max(0, e.life / e.maxLife) * 0.85
    const glow = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, Math.max(1, r))
    glow.addColorStop(0, 'rgba(255, 250, 200, 0.95)')
    glow.addColorStop(0.4, 'rgba(255, 160, 60, 0.8)')
    glow.addColorStop(0.8, 'rgba(220, 60, 30, 0.35)')
    glow.addColorStop(1, 'rgba(120, 30, 20, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(e.x, e.y, Math.max(1, r), 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 220, 150, 0.8)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(e.x, e.y, Math.max(1, r), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function drawFloaters(game) {
  const { ctx } = game
  for (const f of game.floaters) {
    const alpha = Math.max(0, f.life / f.maxLife)
    ctx.globalAlpha = alpha
    ctx.font = `800 ${f.size}px "Baloo 2", ui-rounded, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(25, 20, 35, 0.6)'
    ctx.strokeText(f.text, f.x, f.y)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.globalAlpha = 1
}

function drawCrosshair(game) {
  if (!game.pointer.inside) return
  if (game.state !== 'playing' && game.state !== 'countdown') return
  const { ctx, pointer } = game
  const x = pointer.screenX
  const y = pointer.screenY
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 4
  ctx.beginPath()
  ctx.arc(x, y, 11, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  for (const [dx, dy] of [
    [0, -18],
    [0, 18],
    [-18, 0],
    [18, 0],
  ]) {
    ctx.moveTo(x + dx * 0.7, y + dy * 0.7)
    ctx.lineTo(x + dx, y + dy)
  }
  ctx.stroke()
  ctx.fillStyle = '#ffe066'
  ctx.beginPath()
  ctx.arc(x, y, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawAnnouncements(game) {
  const { ctx } = game
  if (game.state === 'countdown') {
    const n = Math.max(1, Math.ceil(game.countdown))
    const frac = game.countdown - Math.floor(game.countdown)
    const scale = 1 + Math.max(0, frac - 0.7) * 0.8
    ctx.save()
    ctx.translate(VIEW_W / 2, VIEW_H / 2 - 40)
    ctx.scale(scale, scale)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '800 130px "Baloo 2", ui-rounded, system-ui, sans-serif'
    ctx.lineWidth = 14
    ctx.strokeStyle = 'rgba(28, 32, 52, 0.55)'
    ctx.strokeText(String(n), 0, 0)
    ctx.fillStyle = '#fffdf3'
    ctx.fillText(String(n), 0, 0)
    ctx.restore()

    ctx.fillStyle = 'rgba(30, 35, 52, 0.55)'
    ctx.font = '800 18px "Baloo 2", ui-rounded, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`ROUND ${game.round}`, VIEW_W / 2, VIEW_H / 2 - 150)
  }

  if (game.fightFlash > 0) {
    const k = 1 - game.fightFlash / 0.9
    ctx.save()
    ctx.translate(VIEW_W / 2, VIEW_H / 2 - 40)
    ctx.scale(1 + k * 0.25, 1 + k * 0.25)
    ctx.globalAlpha = Math.min(1, game.fightFlash * 2.4)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '800 96px "Baloo 2", ui-rounded, system-ui, sans-serif'
    ctx.lineWidth = 14
    ctx.strokeStyle = 'rgba(28, 32, 52, 0.55)'
    ctx.strokeText('FIGHT!', 0, 0)
    ctx.fillStyle = '#ffe066'
    ctx.fillText('FIGHT!', 0, 0)
    ctx.restore()
  }
}

export function drawGame(game) {
  const { ctx } = game
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0)
  ctx.clearRect(0, 0, VIEW_W, VIEW_H)

  const { camera } = game
  ctx.save()
  ctx.translate(VIEW_W / 2, VIEW_H / 2)
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)

  drawBackground(game)
  drawPlatforms(game)
  drawPickups(game)

  ctx.save()
  if (game.shake > 0.3) {
    ctx.translate(
      (Math.random() - 0.5) * game.shake,
      (Math.random() - 0.5) * game.shake,
    )
  }
  drawFighter(game, game.enemy)
  drawFighter(game, game.player)
  drawBullets(game)
  drawParticles(game)
  drawExplosions(game)
  drawFloaters(game)
  ctx.restore()
  ctx.restore()

  drawAnnouncements(game)
  drawCrosshair(game)
}
