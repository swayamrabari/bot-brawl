import { useEffect, useRef, useState } from 'react'
import { BotBrawl } from './game/engine.js'
import { WEAPONS } from './game/weapons.js'

const START_HUD = {
  playerHP: 100,
  playerMaxHP: 100,
  enemyHP: 90,
  enemyMaxHP: 90,
  fuel: 100,
  maxFuel: 100,
  weapon: 0,
  ammo: WEAPONS.map((w) => w.mag),
  reloading: false,
  reloadProgress: 0,
  scores: { player: 0, enemy: 0 },
  round: 1,
  state: 'idle',
  muted: false,
}

const WIN_LINES = [
  'Bot Brad has been sent to the shadow realm. 🫡',
  'That was personal. Bot Brad is calling his mom. 📞',
  'Certified arena menace behavior. 😤',
  'Somewhere, a robot repair shop just got a big order. 🔧',
]

const LOSE_LINES = [
  'Bot Brad is doing a little victory dance. Rude. 🕺',
  'You were out-walked. Out-shot. Out-goofed. 😵',
  'The bot has 2 brain cells and used both. 🧠',
  'Please do not tell anyone about this. 🤫',
]

export default function App() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [hud, setHud] = useState(START_HUD)
  const [screen, setScreen] = useState('start')
  const [result, setResult] = useState(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const game = new BotBrawl(canvasRef.current, {
      onHud: setHud,
      onRoundEnd: (roundResult) => {
        setResult(roundResult)
        setScreen(roundResult.matchOver ? 'matchEnd' : 'roundEnd')
      },
    })
    gameRef.current = game
    return () => game.destroy()
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.code !== 'Escape' && event.code !== 'KeyP') return
      if (screen !== 'playing') return
      event.preventDefault()
      setPaused((prev) => {
        const next = !prev
        gameRef.current?.setPaused(next)
        return next
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen])

  function play() {
    gameRef.current?.setPaused(false)
    gameRef.current?.startMatch()
    setPaused(false)
    setResult(null)
    setScreen('playing')
  }

  function nextRound() {
    gameRef.current?.setPaused(false)
    gameRef.current?.nextRound()
    setPaused(false)
    setScreen('playing')
  }

  function rematch() {
    gameRef.current?.setPaused(false)
    gameRef.current?.startMatch()
    setPaused(false)
    setResult(null)
    setScreen('playing')
  }

  function togglePause() {
    setPaused((prev) => {
      const next = !prev
      gameRef.current?.setPaused(next)
      return next
    })
  }

  function toggleMute() {
    gameRef.current?.toggleMute()
  }

  const started = screen !== 'start'
  const win = result?.winner === 'player'
  const playerWonMatch = result && result.playerScore > result.enemyScore
  const percent = (value, max) =>
    `${Math.max(0, Math.min(100, (value / max) * 100))}%`

  return (
    <div className="page">
      <div className="page-head">
        <span className="page-logo">🎯 BOT BRAWL</span>
        <span className="page-badge">single player · 1v1 · jetpacks on</span>
      </div>

      <div className="stage-wrap">
        <canvas ref={canvasRef} className="game-canvas" aria-label="Bot Brawl arena" />

        {started && (
          <div className="hud">
            <div className="top-hud">
              <div className="score-pill">
                <span className="score-side you-side">YOU</span>
                <strong>{hud.scores.player}</strong>
                <span className="score-dash">:</span>
                <strong>{hud.scores.enemy}</strong>
                <span className="score-side bot-side">BRAD</span>
              </div>
              <div className="round-chip">ROUND {hud.round} · FIRST TO 3</div>
              <div className="top-actions">
                {screen === 'playing' && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={togglePause}
                    aria-label={paused ? 'Resume game' : 'Pause game'}
                    title={paused ? 'Resume (Esc)' : 'Pause (Esc)'}
                  >
                    {paused ? '▶️' : '⏸️'}
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={toggleMute}
                  aria-label={hud.muted ? 'Unmute sound' : 'Mute sound'}
                >
                  {hud.muted ? '🔇' : '🔊'}
                </button>
              </div>
            </div>

            <div className="bottom-hud">
              <div className="health-card player-card">
                <div className="health-top">
                  <span className="health-name">
                    <span className="dot player-dot" /> YOU
                  </span>
                  <span className="health-number">{hud.playerHP}</span>
                </div>
                <div className="health-track">
                  <div
                    className="health-fill player-fill"
                    style={{ width: percent(hud.playerHP, hud.playerMaxHP) }}
                  />
                </div>
                <div className="fuel-row">
                  <span className="fuel-label">JET</span>
                  <div className="fuel-track">
                    <div
                      className="fuel-fill"
                      style={{ width: percent(hud.fuel, hud.maxFuel) }}
                    />
                  </div>
                </div>
              </div>

              <div className="weapon-panel">
                {hud.reloading && (
                  <div className="reload-chip">
                    <span>RELOADING</span>
                    <div className="reload-track">
                      <div style={{ width: `${hud.reloadProgress * 100}%` }} />
                    </div>
                  </div>
                )}
                <div className="weapon-rack">
                  {WEAPONS.map((weapon, index) => (
                    <button
                      key={weapon.id}
                      type="button"
                      className={`weapon-btn ${hud.weapon === index ? 'active' : ''}`}
                      onClick={() => gameRef.current?.selectWeapon(index)}
                      title={`${weapon.name} — press ${index + 1}`}
                    >
                      <span className="weapon-key">{index + 1}</span>
                      <span className="weapon-icon">{weapon.icon}</span>
                      <span className="weapon-name">{weapon.name}</span>
                      <span className="weapon-ammo">
                        {hud.ammo[index]}
                        <small>/{weapon.mag}</small>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="hud-hint">W / SPACE fly · R reload · 1–6 swap · ESC pause</div>
              </div>

              <div className="health-card enemy-card">
                <div className="health-top">
                  <span className="health-name">
                    BOT BRAD <span className="dot bot-dot" />
                  </span>
                  <span className="health-number">{hud.enemyHP}</span>
                </div>
                <div className="health-track">
                  <div
                    className="health-fill bot-fill"
                    style={{ width: percent(hud.enemyHP, hud.enemyMaxHP) }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {paused && screen === 'playing' && (
          <div className="screen pause-screen">
            <div className="result-card pause-card">
              <span className="round-label">GAME PAUSED</span>
              <div className="result-emoji">⏸️</div>
              <h2>TAKE A BREATHER</h2>
              <p className="result-line">
                Bot Brad is frozen mid-thought. Probably about toast.
              </p>
              <div className="pause-keys">
                <span>
                  <kbd>W</kbd>/<kbd>SPACE</kbd> fly
                </span>
                <span>
                  <kbd>ESC</kbd> resume
                </span>
              </div>
              <button type="button" className="cta" onClick={togglePause}>
                RESUME FIGHT <span aria-hidden="true">▶️</span>
              </button>
            </div>
          </div>
        )}

        {screen === 'start' && (
          <div className="screen start-screen">
            <div className="start-card">
              <div className="no-fly-badge">🚀 JETPACKS ENABLED · ALTITUDE ARENA</div>
              <h1 className="game-title">
                <span className="title-bot">BOT</span>
                <span className="title-brawl">BRAWL</span>
              </h1>
              <p className="tagline">
                Mini Militia energy, now with jetpacks and a ten-platform arena.
                The camera pulls back when you two get too far apart.
              </p>

              <div className="controls-grid">
                <div className="control">
                  <span className="keys">
                    <kbd>A</kbd>
                    <kbd>D</kbd>
                    <span className="or">/</span>
                    <kbd>←</kbd>
                    <kbd>→</kbd>
                  </span>
                  <span>Walk</span>
                </div>
                <div className="control">
                  <span className="keys">
                    <kbd>W</kbd>
                    <span className="or">/</span>
                    <kbd>SPACE</kbd>
                  </span>
                  <span>Fly</span>
                </div>
                <div className="control">
                  <span className="keys">
                    <kbd>🖱️</kbd>
                  </span>
                  <span>Aim</span>
                </div>
                <div className="control">
                  <span className="keys">
                    <kbd>CLICK</kbd>
                  </span>
                  <span>Hold to shoot</span>
                </div>
                <div className="control">
                  <span className="keys">
                    <kbd>1</kbd>
                    <span className="or">–</span>
                    <kbd>6</kbd>
                  </span>
                  <span>Swap weapons</span>
                </div>
                <div className="control">
                  <span className="keys">
                    <kbd>R</kbd>
                  </span>
                  <span>Reload</span>
                </div>
                <div className="control">
                  <span className="keys">
                    <kbd>ESC</kbd>
                    <span className="or">/</span>
                    <kbd>P</kbd>
                  </span>
                  <span>Pause</span>
                </div>
              </div>

              <button type="button" className="cta" onClick={play}>
                ENTER THE ARENA <span aria-hidden="true">🚀</span>
              </button>
              <p className="fineprint">
                First to 3 rounds. Bot Brad has 90 HP, half your damage output, and
                zero flight-school hours.
              </p>
            </div>
          </div>
        )}

        {screen === 'roundEnd' && result && (
          <div className="screen">
            <div className={`result-card ${win ? 'win' : 'lose'}`}>
              <span className="round-label">ROUND {result.round} OVER</span>
              <div className="result-emoji">{win ? '🏆' : '💀'}</div>
              <h2>{win ? 'ROUND WON!' : 'YOU GOT COOKED'}</h2>
              <p className="result-line">
                {(win ? WIN_LINES : LOSE_LINES)[result.round % WIN_LINES.length]}
              </p>
              <div className="score-strip">
                <span>YOU</span>
                <strong>{result.playerScore}</strong>
                <em>—</em>
                <strong>{result.enemyScore}</strong>
                <span>BRAD</span>
              </div>
              <button type="button" className="cta" onClick={nextRound}>
                NEXT ROUND <span aria-hidden="true">⏭️</span>
              </button>
            </div>
          </div>
        )}

        {screen === 'matchEnd' && result && (
          <div className="screen">
            <div className={`result-card ${playerWonMatch ? 'win' : 'lose'}`}>
              <span className="round-label">MATCH OVER</span>
              <div className="result-emoji">{playerWonMatch ? '👑' : '🤖'}</div>
              <h2>
                {playerWonMatch
                  ? 'BACKYARD CHAMPION!'
                  : 'BOT BRAD WINS. OOF.'}
              </h2>
              <p className="result-line">
                {playerWonMatch
                  ? 'Bot Brad is filing a complaint with the manager. There is no manager.'
                  : 'The robot did a Fortnite dance on your grave. You have 99 problems and one is a bot.'}
              </p>
              <div className="score-strip">
                <span>YOU</span>
                <strong>{result.playerScore}</strong>
                <em>—</em>
                <strong>{result.enemyScore}</strong>
                <span>BRAD</span>
              </div>
              <button type="button" className="cta" onClick={rematch}>
                RUN IT BACK <span aria-hidden="true">🔁</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="page-note">
        walk · fly · aim · shoot · reload · bot gently nerfed 🚀
      </p>
    </div>
  )
}
