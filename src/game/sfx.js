// Tiny synthesized sound effects. No audio files, no downloads.
export class Sfx {
  constructor() {
    this.ctx = null
    this.master = null
    this.noiseBuffer = null
    this.muted = false
  }

  init() {
    if (this.ctx) return
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return

    this.ctx = new AudioCtx()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.16
    this.master.connect(this.ctx.destination)

    const length = Math.floor(this.ctx.sampleRate * 0.6)
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  }

  resume() {
    this.init()
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
  }

  setMuted(muted) {
    this.muted = muted
    if (this.master) this.master.gain.value = muted ? 0 : 0.16
  }

  noise(duration, frequency, volume, type = 'lowpass', slideTo = null) {
    if (!this.ctx || !this.noiseBuffer || this.muted) return
    const t = this.ctx.currentTime
    const source = this.ctx.createBufferSource()
    source.buffer = this.noiseBuffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(frequency, t)
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t + duration)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    source.start(t)
    source.stop(t + duration)
  }

  tone(frequency, duration, type, volume, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return
    const t = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, t)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration)
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(t)
    osc.stop(t + duration)
  }

  shoot(id, quiet = false) {
    const volume = quiet ? 0.35 : 0.7
    const config = {
      pistol: [0.09, 2200, 'square', 260, 0.16],
      smg: [0.05, 3000, 'square', 340, 0.1],
      shotgun: [0.2, 1400, 'sawtooth', 90, 0.3],
      rifle: [0.07, 2400, 'square', 200, 0.14],
      sniper: [0.26, 1000, 'sawtooth', 70, 0.34],
      rocket: [0.28, 700, 'sawtooth', 60, 0.38],
    }[id] || [0.1, 1800, 'square', 200, 0.15]

    this.noise(config[0], config[1], volume, config[2], config[3])
    this.tone(id === 'sniper' || id === 'rocket' ? 110 : 180, config[0], 'triangle', volume * 0.5, 55)
  }

  hit() {
    this.noise(0.06, 1800, 0.45, 'bandpass')
    this.tone(520, 0.07, 'square', 0.16, 240)
  }

  hurt() {
    this.tone(180, 0.24, 'sawtooth', 0.28, 80)
    this.noise(0.14, 900, 0.4, 'lowpass')
  }

  explode() {
    this.noise(0.55, 800, 0.95, 'lowpass', 90)
    this.tone(90, 0.5, 'sawtooth', 0.35, 30)
  }

  reload() {
    this.tone(360, 0.05, 'square', 0.12, 300)
    this.tone(280, 0.06, 'square', 0.12, 240, 0.12)
  }

  pickup() {
    this.tone(620, 0.08, 'sine', 0.22, 720)
    this.tone(920, 0.1, 'sine', 0.2, 1100, 0.08)
  }

  death() {
    this.tone(300, 0.15, 'sawtooth', 0.25, 180)
    this.tone(160, 0.4, 'sawtooth', 0.25, 50, 0.13)
  }

  click() {
    this.tone(480, 0.04, 'square', 0.08, 420)
  }
}
