/**
 * INDIAN SUBWAY SURF — Complete 3D Endless Runner Engine
 * Targeted Upgrades:
 * 1. Doubled Physical Jump Height (Apex ~4.59m above rails) + Full Train-Roof Landing & Running Physics
 * 2. Continuous Original Synthesized Background Music Loop (Web Audio API) with Independent Controls
 * 3. Animated RPF Inspector Chase-to-Capture Apprehension Sequence on Valid Collisions
 * 4. Detailed Recycled 3D Indian Urban Side Buildings, Shopfronts, Water Tanks & Station Canopies
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  /* ============================================================================
   * 1. WORLD-SCALE COORDINATE SYSTEM & CONSTANTS
   * ============================================================================
   * - Ballast ground plane:        Y = 0.00m
   * - Concrete sleeper top:        Y = 0.06m
   * - Steel rail head top:         Y = 0.18m  (All train wheels & runner feet contact Y = 0.18m)
   * - Rail gauge spacing:          1.24m      (Left rail: laneX - 0.62m, Right rail: laneX + 0.62m)
   * - Runner standing height:      1.72m      (Top of head at Y = 1.90m when on rails)
   * - Runner sliding height:       0.78m      (Top of head at Y = 0.96m when on rails)
   * - Runner DOUBLED jump apex:    +4.59m     (v0 = 20.1 m/s, g = -44 m/s^2 -> apex = 20.1^2 / 88 = 4.59m;
   *                                            World foot height reaches Y = 4.77m, clearing 2.82m trains!)
   * - Train total height:          2.82m      (Roof surface at Y = 2.82m, which is +2.64m above rail top)
   * - Low jump barrier top:        Y = 1.02m
   * - Overhead slide barrier beam: Y = 1.22m to 2.38m
   * ============================================================================ */
  const SCALE = {
    RAIL_TOP_Y: 0.18,
    RAIL_HALF_GAUGE: 0.62,
    RUNNER_STAND_H: 1.72,
    RUNNER_SLIDE_H: 0.78,
    TRAIN_WIDTH: 2.28,
    TRAIN_TOP_Y: 2.82,
    TRAIN_ROOF_OFFSET_Y: 2.64, // SCALE.TRAIN_TOP_Y (2.82) - SCALE.RAIL_TOP_Y (0.18)
    LOW_BARRIER_TOP_Y: 1.02,
    HIGH_BARRIER_BOTTOM_Y: 1.22,
    HIGH_BARRIER_TOP_Y: 2.38
  };

  const LANES = [-3.0, 0.0, 3.0];
  const TRACK_SEGMENT_LENGTH = 36;
  const TRACK_SEGMENT_COUNT = 8;

  const STATES = {
    BOOT: 'BOOT',
    LOADING: 'LOADING',
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    CAPTURING: 'CAPTURING',
    GAME_OVER: 'GAME_OVER'
  };

  const SKINS = [
    { name: 'Mumbai Street', jacket: 0xff5722, hoodie: 0xf8fafc, pants: 0x1e293b, shoes: 0x00e5ff, cap: 0xdc2626 },
    { name: 'Deccan Cruiser', jacket: 0x0284c7, hoodie: 0xfacc15, pants: 0x0f172a, shoes: 0xf97316, cap: 0x2563eb },
    { name: 'Rajdhani Gold', jacket: 0xd97706, hoodie: 0x111827, pants: 0x1f2937, shoes: 0xfbbf24, cap: 0xb45309 }
  ];

  const ENVIRONMENTS = [
    { name: 'Daylight Clear', sky: 0x5da9e9, fog: 0x9bd1f9, ambient: 0xffffff, ambInt: 0.72, dirColor: 0xfff8e7, dirInt: 0.98, rain: false },
    { name: 'Golden Sunset', sky: 0xd96b43, fog: 0xf29f67, ambient: 0xffd8be, ambInt: 0.65, dirColor: 0xff9e44, dirInt: 0.92, rain: false },
    { name: 'Night Junction', sky: 0x081021, fog: 0x111c35, ambient: 0x7c93b8, ambInt: 0.56, dirColor: 0x93c5fd, dirInt: 0.78, rain: false },
    { name: 'Monsoon Express', sky: 0x3b4d63, fog: 0x52667d, ambient: 0xaec2d6, ambInt: 0.62, dirColor: 0xe2e8f0, dirInt: 0.72, rain: true }
  ];

  const MISSIONS = [
    { id: 0, type: 'coins_run', target: 30, reward: 60, desc: 'Collect 30 Coins in a single run' },
    { id: 1, type: 'dist_run', target: 500, reward: 80, desc: 'Travel 500m in a single run' },
    { id: 2, type: 'powerups', target: 2, reward: 100, desc: 'Activate 2 Power-Ups in a single run' },
    { id: 3, type: 'coins_run', target: 75, reward: 150, desc: 'Collect 75 Coins in a single run' },
    { id: 4, type: 'dist_run', target: 1200, reward: 220, desc: 'Travel 1,200m in a single run' }
  ];

  /* ============================================================================
   * 2. PROCEDURAL CANVAS TEXTURE FACTORY (WITH BUILDING FACADES)
   * ============================================================================ */
  class ProceduralTextures {
    static createIndianFlagTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 340;
      const ctx = canvas.getContext('2d');

      const bandH = canvas.height / 3;
      ctx.fillStyle = '#FF9933';
      ctx.fillRect(0, 0, canvas.width, bandH);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, bandH, canvas.width, bandH);
      ctx.fillStyle = '#138808';
      ctx.fillRect(0, bandH * 2, canvas.width, bandH);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = bandH * 0.42;

      ctx.strokeStyle = '#000080';
      ctx.fillStyle = '#000080';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 2.2;
      for (let i = 0; i < 24; i++) {
        const angle = (i * Math.PI * 2) / 24;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    }

    static createStationBoardTexture(hindiText, englishText) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#facc15';
      ctx.fillRect(0, 0, 512, 160);
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 10;
      ctx.strokeRect(8, 8, 496, 144);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hindiText, 256, 66);
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText(englishText, 256, 120);

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    }

    static createHazardStripeTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#facc15';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#111827';
      for (let x = -64; x < 320; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 24, 0);
        ctx.lineTo(x + 48, 64);
        ctx.lineTo(x + 24, 64);
        ctx.closePath();
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    static createBallastTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#443f3b';
      ctx.fillRect(0, 0, 256, 256);

      const tones = ['#2e2a27', '#57514c', '#635c56', '#24211e', '#736b65'];
      for (let i = 0; i < 1200; i++) {
        ctx.fillStyle = tones[i % tones.length];
        const x = (i * 79) % 256;
        const y = (i * 149) % 256;
        ctx.fillRect(x, y, 3 + (i % 3), 3 + ((i + 1) % 3));
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 9);
      return tex;
    }

    static createCoachSideTexture(bgColorHex, stripeColorHex, labelText) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = bgColorHex;
      ctx.fillRect(0, 0, 512, 256);

      ctx.fillStyle = stripeColorHex;
      ctx.fillRect(0, 32, 512, 14);
      ctx.fillRect(0, 186, 512, 18);

      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 208; y < 248; y += 8) {
        ctx.fillRect(0, y, 512, 3);
      }

      const winCount = 5;
      const winW = 64;
      const winH = 62;
      const spacing = 512 / winCount;
      for (let i = 0; i < winCount; i++) {
        const wx = i * spacing + (spacing - winW) / 2;
        const wy = 74;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(wx - 4, wy - 4, winW + 8, winH + 8);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wx, wy, winW, winH);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.beginPath();
        ctx.moveTo(wx + 6, wy + winH - 6);
        ctx.lineTo(wx + 24, wy + 6);
        ctx.lineTo(wx + 38, wy + 6);
        ctx.lineTo(wx + 20, wy + winH - 6);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labelText, 256, 62);

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    }

    /**
     * Generates detailed Indian Urban & Railway Building Facade Textures
     * with recessed balconies, AC units, arched windows, and ground-floor shop shutters.
     */
    static createBuildingFacadeTexture(wallHex, trimHex, signText) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Base Plaster Wall
      ctx.fillStyle = wallHex;
      ctx.fillRect(0, 0, 256, 512);

      // Horizontal floor slab bands
      ctx.fillStyle = trimHex;
      for (let y = 40; y < 430; y += 88) {
        ctx.fillRect(0, y, 256, 8);
      }

      // 4 Stories of Windows & Balconies
      for (let row = 0; row < 4; row++) {
        const wy = 56 + row * 88;
        for (let col = 0; col < 3; col++) {
          const wx = 20 + col * 78;
          // Window Frame & Awning Chhajja
          ctx.fillStyle = trimHex;
          ctx.fillRect(wx - 6, wy - 8, 60, 8);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(wx, wy, 48, 54);

          // Warm lit apartment window panes vs cool glass reflection
          const isLit = (row + col) % 2 === 0;
          ctx.fillStyle = isLit ? '#fde68a' : '#334155';
          ctx.fillRect(wx + 4, wy + 4, 18, 44);
          ctx.fillRect(wx + 26, wy + 4, 18, 44);

          // Balcony grille bars
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(wx - 2, wy + 38, 52, 4);
        }
      }

      // Ground Floor Commercial Archways & Signage
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 416, 256, 96);

      ctx.fillStyle = '#f97316';
      ctx.fillRect(14, 422, 228, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(signText, 128, 439);

      // Shop doors / shutters
      ctx.fillStyle = '#475569';
      ctx.fillRect(22, 452, 92, 56);
      ctx.fillRect(142, 452, 92, 56);

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    }
  }

  /* ============================================================================
   * 3. PERSISTENCE & SETTINGS MANAGER
   * ============================================================================ */
  class SaveSystem {
    constructor() {
      this.storageKey = 'indian_subway_surf_v3_save';
      this.data = this.getDefaultData();
      this.load();
    }

    getDefaultData() {
      return {
        bestScore: 0,
        bankedCoins: 0,
        missionIndex: 0,
        skinIndex: 0,
        envIndex: 0,
        settings: {
          masterVolume: 80,
          musicVolume: 75,
          sfxVolume: 85,
          musicEnabled: true,
          muted: false,
          quality: 'MEDIUM',
          cameraShake: true,
          showDpad: true,
          sensitivity: 'NORMAL'
        }
      };
    }

    load() {
      try {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.data = Object.assign(this.getDefaultData(), parsed);
          this.data.settings = Object.assign(this.getDefaultData().settings, parsed.settings || {});
        }
      } catch (e) {
        this.data = this.getDefaultData();
      }
    }

    save() {
      try {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      } catch (e) {
        // Ignore storage errors safely
      }
    }

    reset() {
      this.data = this.getDefaultData();
      this.save();
    }
  }

  /* ============================================================================
   * 4. WEB AUDIO ENGINE (SFX + CONTINUOUS SYNTHESIZED RUNNER SOUNDTRACK)
   * ============================================================================ */
  class AudioManager {
    constructor(saveSystem) {
      this.saveSystem = saveSystem;
      this.ctx = null;
      this.lastStepTime = 0;

      // Continuous Background Music Scheduler State
      this.isMusicPlaying = false;
      this.isMusicPaused = false;
      this.musicSchedulerId = null;
      this.currentStep = 0;
      this.nextNoteTime = 0;
      this.tempoBpm = 134; // Upbeat endless runner tempo
    }

    initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    getEffectiveSfxGain(base = 1.0) {
      const s = this.saveSystem.data.settings;
      if (s.muted) return 0;
      return base * (s.masterVolume / 100) * (s.sfxVolume / 100);
    }

    getEffectiveMusicGain(base = 1.0) {
      const s = this.saveSystem.data.settings;
      if (s.muted || !s.musicEnabled) return 0;
      const mVol = typeof s.musicVolume === 'number' ? s.musicVolume : 75;
      return base * (s.masterVolume / 100) * (mVol / 100);
    }

    /* --- Continuous Original Endless-Runner Soundtrack --- */
    startMusic() {
      this.initContext();
      if (!this.ctx) return;

      this.isMusicPaused = false;
      if (this.isMusicPlaying) {
        return; // Already running; prevent duplicate loops
      }

      this.isMusicPlaying = true;
      this.currentStep = 0;
      this.nextNoteTime = this.ctx.currentTime + 0.05;

      if (this.musicSchedulerId) {
        clearInterval(this.musicSchedulerId);
      }
      this.musicSchedulerId = setInterval(() => this.scheduleMusicLoop(), 50);
    }

    pauseMusic() {
      this.isMusicPaused = true;
    }

    resumeMusic() {
      this.initContext();
      if (!this.ctx) return;
      this.isMusicPaused = false;
      if (!this.isMusicPlaying) {
        this.startMusic();
      } else {
        this.nextNoteTime = Math.max(this.ctx.currentTime + 0.04, this.nextNoteTime);
      }
    }

    stopMusic() {
      this.isMusicPlaying = false;
      this.isMusicPaused = false;
      if (this.musicSchedulerId) {
        clearInterval(this.musicSchedulerId);
        this.musicSchedulerId = null;
      }
    }

    scheduleMusicLoop() {
      if (!this.ctx || !this.isMusicPlaying || this.isMusicPaused) return;
      const stepDuration = 60 / this.tempoBpm / 4; // 16th note duration (~0.112s)

      while (this.nextNoteTime < this.ctx.currentTime + 0.14) {
        this.triggerMusicStep(this.currentStep, this.nextNoteTime, stepDuration);
        this.nextNoteTime += stepDuration;
        this.currentStep = (this.currentStep + 1) % 32; // 2-bar 32-step energetic pattern
      }
    }

    triggerMusicStep(step, time, stepDur) {
      const musicGain = this.getEffectiveMusicGain(1.0);
      if (musicGain <= 0.001) return;

      // 1. Driving Synth Bassline (D Minor Pentatonic / Bhairavi-inflected runner groove)
      const bassPattern = [
        146.83, 0, 146.83, 146.83, 174.61, 0, 146.83, 130.81,
        146.83, 0, 146.83, 196.00, 174.61, 164.81, 146.83, 130.81,
        146.83, 0, 146.83, 146.83, 220.00, 0, 196.00, 174.61,
        164.81, 0, 146.83, 130.81, 146.83, 174.61, 196.00, 220.00
      ];
      const bassFreq = bassPattern[step];
      if (bassFreq > 0) {
        this.scheduleNote(bassFreq, time, stepDur * 0.85, 'sawtooth', 0.10 * musicGain);
      }

      // 2. Upbeat Lead Pluck Melody (Original energetic railway runner motif)
      const leadPattern = [
        587.33, 0, 698.46, 0, 880.00, 0, 783.99, 698.46,
        659.25, 0, 587.33, 0, 523.25, 587.33, 698.46, 0,
        587.33, 0, 698.46, 0, 880.00, 987.77, 880.00, 698.46,
        783.99, 0, 698.46, 659.25, 587.33, 0, 0, 0
      ];
      const leadFreq = leadPattern[step];
      if (leadFreq > 0) {
        this.scheduleNote(leadFreq, time, stepDur * 1.15, 'triangle', 0.12 * musicGain);
      }

      // 3. Rhythmic Electronic Kick & Crisp Hi-Hat Chug (Evoking express train rhythm)
      if (step % 4 === 0) {
        // Punchy Kick Drum
        this.schedulePitchDrop(135, 36, time, 0.09, 'sine', 0.18 * musicGain);
      } else if (step % 4 === 2) {
        // Off-beat Snare/Rim pulse
        this.schedulePitchDrop(320, 110, time, 0.06, 'triangle', 0.10 * musicGain);
      } else {
        // 16th-note shaker chug
        this.schedulePitchDrop(1800, 900, time, 0.025, 'sine', 0.035 * musicGain);
      }
    }

    scheduleNote(freq, startTime, duration, type, peakGain) {
      if (!this.ctx || peakGain <= 0.0005) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    }

    schedulePitchDrop(freqStart, freqEnd, startTime, duration, type, peakGain) {
      if (!this.ctx || peakGain <= 0.0005) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, startTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), startTime + duration);
      gain.gain.setValueAtTime(peakGain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    }

    /* --- Sound Effects --- */
    playTone(freqStart, freqEnd, duration, type = 'sine', volume = 0.24) {
      const gainVal = this.getEffectiveSfxGain(volume);
      if (!this.ctx || gainVal <= 0.001) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(25, freqEnd), now + duration);
      }
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    }

    playUiClick() {
      this.initContext();
      this.playTone(540, 720, 0.06, 'triangle', 0.18);
    }

    playStartRun() {
      this.initContext();
      this.playPoliceWhistle();
      setTimeout(() => {
        this.playTone(370, 370, 0.32, 'sawtooth', 0.14);
        this.playTone(440, 440, 0.38, 'sawtooth', 0.14);
      }, 180);
    }

    playPoliceWhistle() {
      this.initContext();
      this.playTone(2650, 2950, 0.12, 'sine', 0.22);
      setTimeout(() => this.playTone(2800, 3100, 0.16, 'sine', 0.24), 110);
    }

    playLaneSwitch() {
      this.playTone(300, 460, 0.08, 'sine', 0.16);
    }

    playJump() {
      this.playTone(240, 720, 0.19, 'triangle', 0.25);
    }

    playLand() {
      this.playTone(135, 55, 0.09, 'sine', 0.2);
    }

    playSlide() {
      this.playTone(360, 140, 0.14, 'sawtooth', 0.15);
    }

    playStep() {
      if (!this.ctx) return;
      const now = performance.now();
      if (now - this.lastStepTime < 210) return;
      this.lastStepTime = now;
      this.playTone(105, 62, 0.04, 'triangle', 0.07);
    }

    playCoin() {
      this.playTone(920, 1380, 0.09, 'sine', 0.2);
    }

    playPowerup() {
      this.playTone(440, 880, 0.2, 'triangle', 0.24);
      setTimeout(() => this.playTone(660, 1180, 0.22, 'sine', 0.22), 85);
    }

    playHornNearMiss() {
      this.playTone(410, 340, 0.26, 'sawtooth', 0.16);
    }

    playStumble() {
      this.playTone(170, 75, 0.22, 'sawtooth', 0.28);
      setTimeout(() => this.playPoliceWhistle(), 120);
    }

    playCrash() {
      this.playTone(130, 38, 0.42, 'sawtooth', 0.36);
      setTimeout(() => this.playPoliceWhistle(), 140);
    }
  }

  /* ============================================================================
   * 5. STYLIZED ROUNDED 3D HUMAN CHARACTER (RUNNER & RPF INSPECTOR)
   * ============================================================================ */
  class StylizedRunnerCharacter {
    constructor(config, flagTexture) {
      this.config = config;
      this.isOfficer = Boolean(config.isOfficer);
      this.root = new THREE.Group();
      this.animTime = 0;
      this.turnLean = 0;

      const skinMat = new THREE.MeshStandardMaterial({ color: 0xe29e75, roughness: 0.48, metalness: 0.05 });
      this.jacketMat = new THREE.MeshStandardMaterial({ color: config.jacket, roughness: 0.42, metalness: 0.08 });
      this.hoodieMat = new THREE.MeshStandardMaterial({ color: config.hoodie || 0xffffff, roughness: 0.55 });
      this.pantsMat = new THREE.MeshStandardMaterial({ color: config.pants, roughness: 0.62 });
      this.shoeMat = new THREE.MeshStandardMaterial({ color: config.shoes, roughness: 0.35, metalness: 0.15 });
      this.capMat = new THREE.MeshStandardMaterial({ color: config.cap || config.jacket, roughness: 0.45 });
      const soleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });

      this.hipGroup = new THREE.Group();
      this.hipGroup.position.y = 0.78;
      this.root.add(this.hipGroup);

      const pelvisGeo = new THREE.SphereGeometry(0.19, 16, 12);
      pelvisGeo.scale(1.12, 0.68, 0.88);
      const pelvisMesh = new THREE.Mesh(pelvisGeo, this.pantsMat);
      pelvisMesh.castShadow = true;
      this.hipGroup.add(pelvisMesh);

      this.spinePivot = new THREE.Group();
      this.spinePivot.position.y = 0.06;
      this.hipGroup.add(this.spinePivot);

      const torsoCore = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.44, 18), this.jacketMat);
      torsoCore.position.y = 0.24;
      torsoCore.scale.set(1.08, 1, 0.78);
      torsoCore.castShadow = true;
      this.spinePivot.add(torsoCore);

      const innerFront = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.43, 14), this.hoodieMat);
      innerFront.position.set(0, 0.24, -0.06);
      innerFront.scale.set(0.95, 1, 0.75);
      this.spinePivot.add(innerFront);

      const shoulderGeo = new THREE.SphereGeometry(0.115, 14, 12);
      const leftShoulderCap = new THREE.Mesh(shoulderGeo, this.jacketMat);
      leftShoulderCap.position.set(-0.23, 0.42, 0);
      const rightShoulderCap = new THREE.Mesh(shoulderGeo, this.jacketMat);
      rightShoulderCap.position.set(0.23, 0.42, 0);
      this.spinePivot.add(leftShoulderCap, rightShoulderCap);

      if (!this.isOfficer) {
        const hoodRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 10, 18), this.hoodieMat);
        hoodRing.rotation.x = Math.PI / 2 + 0.2;
        hoodRing.position.set(0, 0.46, 0.03);
        this.spinePivot.add(hoodRing);

        const packGroup = new THREE.Group();
        packGroup.position.set(0, 0.25, 0.16);
        const packBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.32, 16), this.capMat);
        packBody.scale.set(1.05, 1, 0.65);
        const packTop = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), this.capMat);
        packTop.position.y = 0.15;
        packTop.scale.set(1.05, 0.6, 0.65);
        packGroup.add(packBody, packTop);
        this.spinePivot.add(packGroup);
      } else {
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.06, 16), darkMat);
        belt.position.y = 0.06;
        belt.scale.set(1.08, 1, 0.8);
        const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8), goldMat);
        badge.rotation.x = Math.PI / 2;
        badge.position.set(-0.1, 0.34, -0.18);
        this.spinePivot.add(belt, badge);
      }

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 12), skinMat);
      neck.position.y = 0.50;
      this.spinePivot.add(neck);

      this.headGroup = new THREE.Group();
      this.headGroup.position.y = 0.69;
      this.spinePivot.add(this.headGroup);

      const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.205, 20, 18), skinMat);
      cranium.scale.set(0.96, 1.06, 0.98);
      cranium.castShadow = true;
      this.headGroup.add(cranium);

      const earGeo = new THREE.SphereGeometry(0.045, 10, 10);
      const earL = new THREE.Mesh(earGeo, skinMat);
      earL.position.set(-0.195, -0.01, 0);
      const earR = earL.clone();
      earR.position.x = 0.195;
      this.headGroup.add(earL, earR);

      const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const eyeGeo = new THREE.SphereGeometry(0.034, 12, 10);
      const eyeL = new THREE.Mesh(eyeGeo, scleraMat);
      eyeL.position.set(-0.07, 0.025, -0.182);
      eyeL.scale.set(1, 1.15, 0.5);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.07;

      const pupilGeo = new THREE.SphereGeometry(0.018, 10, 8);
      const pupilL = new THREE.Mesh(pupilGeo, darkMat);
      pupilL.position.set(-0.07, 0.025, -0.198);
      const pupilR = pupilL.clone();
      pupilR.position.x = 0.07;

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), skinMat);
      nose.position.set(0, -0.015, -0.205);
      this.headGroup.add(eyeL, eyeR, pupilL, pupilR, nose);

      if (this.isOfficer) {
        const mustache = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.12, 10), darkMat);
        mustache.rotation.z = Math.PI / 2;
        mustache.position.set(0, -0.065, -0.192);
        this.headGroup.add(mustache);

        const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.195, 0.13, 18), this.jacketMat);
        capCrown.position.y = 0.15;
        const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.035, 18), darkMat);
        capBand.position.y = 0.10;
        const capVisor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16, 1, false, Math.PI * 0.65, Math.PI * 0.7), darkMat);
        capVisor.position.set(0, 0.09, -0.09);
        const capBadge = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), goldMat);
        capBadge.position.set(0, 0.15, -0.21);
        this.headGroup.add(capCrown, capBand, capVisor, capBadge);
      } else {
        const domeGeo = new THREE.SphereGeometry(0.212, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
        const capDome = new THREE.Mesh(domeGeo, this.capMat);
        capDome.position.y = 0.02;
        capDome.rotation.x = -0.15;
        this.headGroup.add(capDome);

        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.022, 14), this.capMat);
        brim.scale.set(1.0, 1, 1.35);
        brim.position.set(0, 0.07, 0.14);
        brim.rotation.x = -0.25;
        this.headGroup.add(brim);

        const hairTuft = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.14, 10), darkMat);
        hairTuft.rotation.x = -Math.PI / 2.6;
        hairTuft.position.set(0, 0.11, -0.19);
        this.headGroup.add(hairTuft);

        const band = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.018, 8, 20, Math.PI), this.shoeMat);
        band.position.y = 0.01;
        const cupGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12);
        cupGeo.rotateZ(Math.PI / 2);
        const cupL = new THREE.Mesh(cupGeo, this.shoeMat);
        cupL.position.set(-0.21, 0.0, 0);
        const cupR = cupL.clone();
        cupR.position.x = 0.21;
        this.headGroup.add(band, cupL, cupR);
      }

      this.jetpackGroup = new THREE.Group();
      this.jetpackGroup.position.set(0, 0.26, 0.22);
      this.jetpackGroup.visible = false;
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.75, roughness: 0.2 });
      const nozzleMat = new THREE.MeshBasicMaterial({ color: 0xff6b1a });
      [-0.12, 0.12].forEach((tx) => {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.42, 14), tankMat);
        cyl.position.x = tx;
        const topCone = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), tankMat);
        topCone.position.set(tx, 0.21, 0);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 10), nozzleMat);
        flame.rotation.x = Math.PI;
        flame.position.set(tx, -0.28, 0);
        this.jetpackGroup.add(cyl, topCone, flame);
      });
      if (flagTexture) {
        const flagPlate = new THREE.Mesh(
          new THREE.PlaneGeometry(0.22, 0.14),
          new THREE.MeshBasicMaterial({ map: flagTexture, side: THREE.DoubleSide })
        );
        flagPlate.position.set(0, 0.04, 0.08);
        this.jetpackGroup.add(flagPlate);
      }
      this.spinePivot.add(this.jetpackGroup);

      this.shieldMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 18, 14),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.38 })
      );
      this.shieldMesh.position.y = 0.92;
      this.shieldMesh.visible = false;
      this.root.add(this.shieldMesh);

      this.leftArm = this.createArticulatedArm(skinMat, false);
      this.leftArm.shoulder.position.set(-0.25, 0.42, 0);
      this.rightArm = this.createArticulatedArm(skinMat, this.isOfficer);
      this.rightArm.shoulder.position.set(0.25, 0.42, 0);
      this.spinePivot.add(this.leftArm.shoulder, this.rightArm.shoulder);

      this.leftLeg = this.createArticulatedLeg(soleMat);
      this.leftLeg.hip.position.set(-0.115, 0, 0);
      this.rightLeg = this.createArticulatedLeg(soleMat);
      this.rightLeg.hip.position.set(0.115, 0, 0);
      this.hipGroup.add(this.leftLeg.hip, this.rightLeg.hip);
    }

    createArticulatedArm(skinMat, attachBaton) {
      const shoulder = new THREE.Group();
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.25, 12), this.jacketMat);
      upperArm.position.y = -0.125;
      upperArm.castShadow = true;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.y = -0.25;
      shoulder.add(elbow);

      const elbowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 10), skinMat);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.044, 0.23, 12), skinMat);
      forearm.position.y = -0.115;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), skinMat);
      hand.position.y = -0.24;
      elbow.add(elbowSphere, forearm, hand);

      if (attachBaton) {
        const batonMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.6 });
        const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.52, 10), batonMat);
        baton.rotation.x = Math.PI / 2.2;
        baton.position.set(0, -0.25, -0.18);
        elbow.add(baton);
      }

      return { shoulder, elbow };
    }

    createArticulatedLeg(soleMat) {
      const hip = new THREE.Group();
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.076, 0.36, 14), this.pantsMat);
      thigh.position.y = -0.18;
      thigh.castShadow = true;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.y = -0.36;
      hip.add(knee);

      const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), this.pantsMat);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.056, 0.34, 14), this.pantsMat);
      shin.position.y = -0.17;
      shin.castShadow = true;

      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.35, -0.04);

      const shoeUpper = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), this.shoeMat);
      shoeUpper.scale.set(0.95, 0.72, 1.55);
      shoeUpper.position.y = 0.02;

      const shoeSole = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.094, 0.045, 14), soleMat);
      shoeSole.scale.set(1.0, 1.0, 1.62);
      shoeSole.position.y = -0.03;

      shoeGroup.add(shoeUpper, shoeSole);
      knee.add(kneeJoint, shin, shoeGroup);

      return { hip, knee, shoeGroup };
    }

    applySkin(skin) {
      this.jacketMat.color.setHex(skin.jacket);
      this.hoodieMat.color.setHex(skin.hoodie);
      this.pantsMat.color.setHex(skin.pants);
      this.shoeMat.color.setHex(skin.shoes);
      this.capMat.color.setHex(skin.cap);
    }

    updateAnimation(dt, speed, mode, lateralVel = 0) {
      this.animTime += dt * (speed * 0.76);
      this.turnLean += (THREE.MathUtils.clamp(-lateralVel * 0.045, -0.28, 0.28) - this.turnLean) * Math.min(1, dt * 12);
      this.root.rotation.z = this.turnLean;

      if (mode === 'IDLE') {
        const breath = Math.sin(this.animTime * 0.35);
        this.hipGroup.position.y = 0.78 + breath * 0.02;
        this.spinePivot.rotation.set(0, Math.sin(this.animTime * 0.2) * 0.08, 0);
        this.leftLeg.hip.rotation.x = 0;
        this.rightLeg.hip.rotation.x = 0;
        this.leftLeg.knee.rotation.x = 0;
        this.rightLeg.knee.rotation.x = 0;
        this.leftArm.shoulder.rotation.x = 0.08;
        this.rightArm.shoulder.rotation.x = -0.08;
        this.leftArm.elbow.rotation.x = 0.35;
        this.rightArm.elbow.rotation.x = 0.35;
      } else if (mode === 'RUN') {
        const phase = this.animTime;
        const sinP = Math.sin(phase);
        const cosP = Math.cos(phase);

        this.hipGroup.position.y = 0.77 + Math.abs(cosP) * 0.075;
        this.spinePivot.rotation.x = -0.18;
        this.spinePivot.rotation.y = -sinP * 0.16;

        this.leftLeg.hip.rotation.x = sinP * 0.92;
        this.rightLeg.hip.rotation.x = -sinP * 0.92;
        this.leftLeg.knee.rotation.x = -Math.max(0, -cosP) * 1.15 - 0.15;
        this.rightLeg.knee.rotation.x = -Math.max(0, cosP) * 1.15 - 0.15;

        this.leftArm.shoulder.rotation.x = -sinP * 0.85;
        this.rightArm.shoulder.rotation.x = sinP * 0.85;
        this.leftArm.elbow.rotation.x = 0.85 + Math.max(0, -sinP) * 0.45;
        this.rightArm.elbow.rotation.x = 0.85 + Math.max(0, sinP) * 0.45;
      } else if (mode === 'JUMP') {
        this.hipGroup.position.y = 0.82;
        this.spinePivot.rotation.set(-0.12, 0, 0);
        this.leftLeg.hip.rotation.x = 0.72;
        this.leftLeg.knee.rotation.x = -1.05;
        this.rightLeg.hip.rotation.x = -0.28;
        this.rightLeg.knee.rotation.x = -0.68;
        this.leftArm.shoulder.rotation.x = 2.15;
        this.rightArm.shoulder.rotation.x = 2.15;
        this.leftArm.elbow.rotation.x = 0.4;
        this.rightArm.elbow.rotation.x = 0.4;
      } else if (mode === 'SLIDE') {
        this.hipGroup.position.y = 0.34;
        this.spinePivot.rotation.set(-0.95, 0, 0);
        this.leftLeg.hip.rotation.x = 1.25;
        this.leftLeg.knee.rotation.x = -0.25;
        this.rightLeg.hip.rotation.x = 0.95;
        this.rightLeg.knee.rotation.x = -1.1;
        this.leftArm.shoulder.rotation.x = -0.7;
        this.rightArm.shoulder.rotation.x = -0.7;
        this.leftArm.elbow.rotation.x = 0.5;
        this.rightArm.elbow.rotation.x = 0.5;
      } else if (mode === 'JETPACK') {
        this.hipGroup.position.y = 0.78;
        this.spinePivot.rotation.set(-0.68, 0, 0);
        this.leftLeg.hip.rotation.x = -0.25 + Math.sin(this.animTime * 0.5) * 0.08;
        this.rightLeg.hip.rotation.x = -0.25 - Math.sin(this.animTime * 0.5) * 0.08;
        this.leftLeg.knee.rotation.x = -0.25;
        this.rightLeg.knee.rotation.x = -0.25;
        this.leftArm.shoulder.rotation.x = 2.45;
        this.rightArm.shoulder.rotation.x = 2.45;
        this.leftArm.elbow.rotation.x = 0.2;
        this.rightArm.elbow.rotation.x = 0.2;
      } else if (mode === 'STUMBLE_KNEEL') {
        // Non-graphic game-like stumbled/kneeling hands-up posture when caught by RPF Inspector
        this.hipGroup.position.y = 0.48;
        this.spinePivot.rotation.set(0.28, 0, 0);
        this.leftLeg.hip.rotation.x = 0.95;
        this.leftLeg.knee.rotation.x = -1.35;
        this.rightLeg.hip.rotation.x = -0.35;
        this.rightLeg.knee.rotation.x = -1.25;
        this.leftArm.shoulder.rotation.x = 1.85;
        this.rightArm.shoulder.rotation.x = 1.85;
        this.leftArm.elbow.rotation.x = 0.65;
        this.rightArm.elbow.rotation.x = 0.65;
      } else if (mode === 'APPREHEND') {
        // RPF Inspector authoritative halt & baton-wave apprehension animation
        const wave = Math.sin(this.animTime * 1.4);
        this.hipGroup.position.y = 0.78;
        this.spinePivot.rotation.set(-0.08, wave * 0.12, 0);
        this.leftLeg.hip.rotation.x = 0.22;
        this.rightLeg.hip.rotation.x = -0.22;
        this.leftLeg.knee.rotation.x = -0.15;
        this.rightLeg.knee.rotation.x = -0.15;
        this.leftArm.shoulder.rotation.x = 0.95;
        this.leftArm.elbow.rotation.x = 0.55;
        this.rightArm.shoulder.rotation.x = 1.55 + wave * 0.32;
        this.rightArm.elbow.rotation.x = 0.45;
      } else if (mode === 'CRASH') {
        this.hipGroup.position.y = 0.32;
        this.spinePivot.rotation.set(1.15, 0, 0);
        this.leftLeg.hip.rotation.x = -0.4;
        this.rightLeg.hip.rotation.x = 0.3;
        this.leftArm.shoulder.rotation.x = 1.2;
        this.rightArm.shoulder.rotation.x = 1.0;
      }
    }
  }

  /* ============================================================================
   * 6. PROPORTIONAL INDIAN RAILWAYS ROLLING STOCK & GROUNDED BOGIE WHEELS
   * ============================================================================ */
  class IndianRollingStockBuilder {
    constructor(flagTexture) {
      this.flagTexture = flagTexture;
      this.flagsToWave = [];

      this.wheelGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.11, 16);
      this.wheelGeo.rotateZ(Math.PI / 2);
      this.axleGeo = new THREE.CylinderGeometry(0.045, 0.045, SCALE.RAIL_HALF_GAUGE * 2.1, 10);
      this.axleGeo.rotateZ(Math.PI / 2);

      this.steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.22 });
      this.bogieMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.55, roughness: 0.65 });
      this.wapBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.22, roughness: 0.32 });
      this.wapRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.25, roughness: 0.36 });
      this.roofMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.45 });
      this.windowMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.12 });
      this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      this.markerRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      this.wapSideTex = ProceduralTextures.createCoachSideTexture('#f8fafc', '#dc2626', 'भारतीय रेल • WAP-7 EXPRESS');
      this.lhbSideTex = ProceduralTextures.createCoachSideTexture('#1d4ed8', '#facc15', 'INDIAN RAILWAYS • LHB AC');
      this.freightSideTex = ProceduralTextures.createCoachSideTexture('#9a3412', '#facc15', 'BOXN FREIGHT • WR');

      this.wapSideMat = new THREE.MeshStandardMaterial({ map: this.wapSideTex, roughness: 0.35, metalness: 0.2 });
      this.lhbSideMat = new THREE.MeshStandardMaterial({ map: this.lhbSideTex, roughness: 0.38, metalness: 0.25 });
      this.freightSideMat = new THREE.MeshStandardMaterial({ map: this.freightSideTex, roughness: 0.6, metalness: 0.3 });
    }

    createFlagWithPole() {
      const group = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 8), this.steelMat);
      pole.position.y = 0.52;
      group.add(pole);

      const flagGeo = new THREE.PlaneGeometry(0.96, 0.64, 8, 4);
      const flagMat = new THREE.MeshBasicMaterial({ map: this.flagTexture, side: THREE.DoubleSide });
      const flagMesh = new THREE.Mesh(flagGeo, flagMat);
      flagMesh.position.set(0.49, 0.82, 0);
      group.add(flagMesh);

      this.flagsToWave.push(flagMesh);
      return group;
    }

    updateFlags(time) {
      for (let i = 0; i < this.flagsToWave.length; i++) {
        const mesh = this.flagsToWave[i];
        const pos = mesh.geometry.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const x = pos.getX(v);
          const factor = (x + 0.48) / 0.96;
          pos.setZ(v, Math.sin(time * 8.5 + x * 5.0) * 0.10 * factor);
        }
        pos.needsUpdate = true;
      }
    }

    createBogieAssembly(zOffset) {
      const bogie = new THREE.Group();
      const wheelCenterY = SCALE.RAIL_TOP_Y + 0.20;
      bogie.position.set(0, wheelCenterY, zOffset);

      const frameGeo = new THREE.BoxGeometry(0.12, 0.22, 1.85);
      const frameL = new THREE.Mesh(frameGeo, this.bogieMat);
      frameL.position.x = -SCALE.RAIL_HALF_GAUGE - 0.08;
      const frameR = frameL.clone();
      frameR.position.x = SCALE.RAIL_HALF_GAUGE + 0.08;
      bogie.add(frameL, frameR);

      [-0.58, 0.58].forEach((az) => {
        const axle = new THREE.Mesh(this.axleGeo, this.bogieMat);
        axle.position.z = az;
        const wheelL = new THREE.Mesh(this.wheelGeo, this.steelMat);
        wheelL.position.set(-SCALE.RAIL_HALF_GAUGE, 0, az);
        const wheelR = new THREE.Mesh(this.wheelGeo, this.steelMat);
        wheelR.position.set(SCALE.RAIL_HALF_GAUGE, 0, az);
        bogie.add(axle, wheelL, wheelR);
      });

      return bogie;
    }

    buildTrainMesh(type, lengthZ) {
      const group = new THREE.Group();
      const bodyW = SCALE.TRAIN_WIDTH;
      const bodyH = 2.12;
      const bodyCenterY = 0.54 + bodyH / 2;

      const bogieFront = this.createBogieAssembly(lengthZ / 2 - 1.8);
      const bogieRear = this.createBogieAssembly(-lengthZ / 2 + 1.8);
      group.add(bogieFront, bogieRear);

      const underBox = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.72, 0.28, lengthZ * 0.45), this.bogieMat);
      underBox.position.y = 0.44;
      group.add(underBox);

      let sideMat = this.wapSideMat;
      let endMat = this.wapBodyMat;
      if (type === 'LHB_COACH') {
        sideMat = this.lhbSideMat;
        endMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4, metalness: 0.25 });
      } else if (type === 'FREIGHT') {
        sideMat = this.freightSideMat;
        endMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.65, metalness: 0.3 });
      }

      const bodyMaterials = [
        sideMat,
        sideMat,
        this.roofMat,
        this.bogieMat,
        endMat,
        endMat
      ];

      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, lengthZ), bodyMaterials);
      bodyMesh.position.y = bodyCenterY;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      const roofArch = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyW * 0.48, bodyW * 0.5, lengthZ - 0.1, 14, 1, false, -Math.PI / 2, Math.PI),
        this.roofMat
      );
      roofArch.rotation.x = Math.PI / 2;
      roofArch.scale.set(1.0, 0.16, 1.0);
      roofArch.position.y = 2.66;
      roofArch.receiveShadow = true;
      group.add(roofArch);

      const frontZ = lengthZ / 2;

      if (type === 'WAP7_LOCO') {
        const noseBand = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.03, 0.48, 0.28), this.wapRedMat);
        noseBand.position.set(0, 1.15, frontZ + 0.08);
        group.add(noseBand);

        const winGeo = new THREE.BoxGeometry(0.76, 0.48, 0.05);
        const winL = new THREE.Mesh(winGeo, this.windowMat);
        winL.position.set(-0.48, 2.12, frontZ + 0.02);
        const winR = winL.clone();
        winR.position.x = 0.48;
        group.add(winL, winR);

        const hlPod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.10, 14), this.headlightMat);
        hlPod.rotation.x = Math.PI / 2;
        hlPod.position.set(0, 1.62, frontZ + 0.05);

        const mkrL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 10), this.markerRedMat);
        mkrL.rotation.x = Math.PI / 2;
        mkrL.position.set(-0.78, 1.15, frontZ + 0.22);
        const mkrR = mkrL.clone();
        mkrR.position.x = 0.78;
        group.add(hlPod, mkrL, mkrR);

        const cowcatcher = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.9, 0.30, 0.36), this.bogieMat);
        cowcatcher.position.set(0, 0.38, frontZ + 0.16);
        const buffersL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.25, 10), this.steelMat);
        buffersL.rotation.x = Math.PI / 2;
        buffersL.position.set(-0.72, 0.62, frontZ + 0.15);
        const buffersR = buffersL.clone();
        buffersR.position.x = 0.72;
        group.add(cowcatcher, buffersL, buffersR);

        const pantoFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.32, 1.4), this.steelMat);
        pantoFrame.position.set(0, SCALE.TRAIN_TOP_Y + 0.14, -lengthZ * 0.22);
        group.add(pantoFrame);

        const flag = this.createFlagWithPole();
        flag.position.set(0, SCALE.TRAIN_TOP_Y - 0.04, frontZ - 0.75);
        group.add(flag);
      } else {
        const vestibule = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.75, 0.16), this.bogieMat);
        vestibule.position.set(0, 1.52, frontZ + 0.06);
        group.add(vestibule);
      }

      return group;
    }
  }

  /* ============================================================================
   * 7. MAIN GAME ENGINE & STATE MACHINE
   * ============================================================================ */
  class IndianSubwaySurfGame {
    constructor() {
      this.state = STATES.BOOT;
      this.saveSystem = new SaveSystem();
      this.audio = new AudioManager(this.saveSystem);

      this.score = 0;
      this.distance = 0;
      this.runCoins = 0;
      this.powerupsUsedThisRun = 0;
      this.speed = 0;
      this.baseSpeed = 19.5;
      this.maxSpeed = 40;

      // Player Physics State (playerY is height above SCALE.RAIL_TOP_Y = 0.18m)
      this.currentLane = 1;
      this.playerX = 0;
      this.playerY = 0;
      this.velocityY = 0;
      this.gravity = -44;
      // DOUBLED JUMP HEIGHT:
      // Previous jumpForce = 14.2 -> apex = 14.2^2 / (2 * 44) = 2.29m.
      // New jumpForce = 20.1 -> apex = 20.1^2 / (2 * 44) = 4.59m (exactly 2.0x previous height!).
      // This allows the player to clear full-size trains (2.64m above rails) and land on train roofs!
      this.jumpForce = 20.1;
      this.isGrounded = true;
      this.slideTimer = 0;

      this.powerups = {
        jetpack: 0,
        magnet: 0,
        overdrive: 0,
        shield: 0
      };

      // RPF Inspector Pursuit & Capture State
      this.inspectorZOffset = 2.8;
      this.inspectorX = 0;
      this.inspectorY = 0;
      this.captureTimer = 0;
      this.pendingGameOverReason = '';

      this.trackSegments = [];
      this.obstacles = [];
      this.coins = [];
      this.pickups = [];
      this.spawnCursorZ = -44;
      this.shakeTimer = 0;
      this.toastTimer = 0;

      this.bindDOM();
      this.initEngine();
    }

    bindDOM() {
      this.ui = {
        canvasContainer: document.getElementById('canvas-container'),
        fxOverlay: document.getElementById('fx-overlay'),
        screens: {
          loading: document.getElementById('screen-loading'),
          menu: document.getElementById('screen-menu'),
          hud: document.getElementById('screen-hud'),
          pause: document.getElementById('screen-pause'),
          gameover: document.getElementById('screen-gameover'),
          settings: document.getElementById('screen-settings'),
          tutorial: document.getElementById('screen-tutorial')
        },
        loadingBar: document.getElementById('loading-bar-fill'),
        diagBox: document.getElementById('diagnostic-box'),
        diagMsg: document.getElementById('diagnostic-message'),

        menuBest: document.getElementById('menu-best-score'),
        menuCoins: document.getElementById('menu-banked-coins'),
        menuMissionDesc: document.getElementById('menu-mission-desc'),
        menuMissionReward: document.getElementById('menu-mission-reward'),
        menuMissionFill: document.getElementById('menu-mission-fill'),
        menuMissionStatus: document.getElementById('menu-mission-status'),
        labelSkin: document.getElementById('label-skin-name'),
        labelEnv: document.getElementById('label-env-name'),

        hudScore: document.getElementById('hud-score'),
        hudMultiplier: document.getElementById('hud-multiplier'),
        hudDistance: document.getElementById('hud-distance'),
        hudCoins: document.getElementById('hud-coins'),
        hudPursuitFill: document.getElementById('hud-pursuit-fill'),
        hudPursuitState: document.getElementById('hud-pursuit-state'),
        hudPowerups: document.getElementById('hud-powerups'),
        hudToast: document.getElementById('hud-toast'),
        touchControls: document.getElementById('touch-controls'),
        btnHudMusic: document.getElementById('btn-hud-music'),

        pauseScore: document.getElementById('pause-score'),
        pauseDistance: document.getElementById('pause-distance'),
        pauseCoins: document.getElementById('pause-coins'),
        goReason: document.getElementById('gameover-reason'),
        goScore: document.getElementById('go-score'),
        goBest: document.getElementById('go-best'),
        goDistance: document.getElementById('go-distance'),
        goCoins: document.getElementById('go-coins'),
        goMissionDesc: document.getElementById('go-mission-desc'),
        goMissionStatus: document.getElementById('go-mission-status'),

        inputMasterVol: document.getElementById('input-master-vol'),
        inputMusicVol: document.getElementById('input-music-vol'),
        inputSfxVol: document.getElementById('input-sfx-vol'),
        btnToggleMusic: document.getElementById('btn-toggle-music'),
        btnToggleMute: document.getElementById('btn-toggle-mute'),
        selectQuality: document.getElementById('select-quality'),
        btnToggleShake: document.getElementById('btn-toggle-shake'),
        btnToggleDpad: document.getElementById('btn-toggle-dpad'),
        selectSensitivity: document.getElementById('select-sensitivity')
      };
    }

    showDiagnosticError(msg) {
      this.ui.diagBox.classList.remove('hidden');
      this.ui.diagMsg.textContent = msg;
    }

    initEngine() {
      this.state = STATES.LOADING;
      this.ui.loadingBar.style.width = '35%';

      if (typeof THREE === 'undefined') {
        this.showDiagnosticError('Three.js failed to load from CDN. Check internet connection and tap Retry.');
        document.getElementById('btn-retry-load').onclick = () => window.location.reload();
        return;
      }

      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.ui.canvasContainer.innerHTML = '';
        this.ui.canvasContainer.appendChild(this.renderer.domElement);
      } catch (err) {
        this.showDiagnosticError('WebGL initialization failed on this mobile browser.');
        return;
      }

      this.ui.loadingBar.style.width = '70%';

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.4, 180);
      this.camera.position.set(0, 4.3, 7.4);

      this.ambientLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.72);
      this.scene.add(this.ambientLight);

      this.dirLight = new THREE.DirectionalLight(0xfff8e7, 0.98);
      this.dirLight.position.set(16, 32, 20);
      this.dirLight.castShadow = true;
      this.dirLight.shadow.camera.left = -16;
      this.dirLight.shadow.camera.right = 16;
      this.dirLight.shadow.camera.top = 26;
      this.dirLight.shadow.camera.bottom = -26;
      this.dirLight.shadow.mapSize.set(1024, 1024);
      this.scene.add(this.dirLight);

      this.flagTexture = ProceduralTextures.createIndianFlagTexture();
      this.stripeTexture = ProceduralTextures.createHazardStripeTexture();
      this.ballastTexture = ProceduralTextures.createBallastTexture();
      this.stationTexture = ProceduralTextures.createStationBoardTexture('छत्रपति शिवाजी टर्मिनस', 'MUMBAI CENTRAL JN');

      // Procedural Building Facade Textures for Side Scenery
      this.buildingTextures = [
        ProceduralTextures.createBuildingFacadeTexture('#d97706', '#fef3c7', 'CHAI & SNACKS STALL'),
        ProceduralTextures.createBuildingFacadeTexture('#0284c7', '#e0f2fe', 'WESTERN RAILWAY CO-OP'),
        ProceduralTextures.createBuildingFacadeTexture('#b45309', '#fde68a', 'MUMBAI EXPRESS CARGO'),
        ProceduralTextures.createBuildingFacadeTexture('#4f46e5', '#e0e7ff', 'METRO BOOK DEPOT')
      ];

      this.trainBuilder = new IndianRollingStockBuilder(this.flagTexture);

      this.buildTrackCorridor();
      this.buildCharacters();
      this.buildRainParticles();

      this.applySettingsToEngine();
      this.applyEnvironmentPreset();
      this.setupEventListeners();

      this.ui.loadingBar.style.width = '100%';
      setTimeout(() => {
        this.transitionToState(STATES.MENU);
      }, 200);

      this.lastFrameTime = performance.now();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    /* ==========================================================================
     * 8. DETAILED RAILWAY CORRIDOR & URBAN SIDE BUILDINGS BUILDER
     * ========================================================================== */
    buildSideBuildingCluster(sideSign, segIndex) {
      const cluster = new THREE.Group();
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.5 });

      // 3 distinct buildings per segment per side, safely outside playable lanes (X = ±11.6m to ±15.2m)
      for (let b = 0; b < 3; b++) {
        const texIdx = (segIndex + b + (sideSign > 0 ? 1 : 0)) % this.buildingTextures.length;
        const facadeMat = new THREE.MeshStandardMaterial({
          map: this.buildingTextures[texIdx],
          roughness: 0.72
        });
        const sideWallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });

        const bWidth = 4.6;
        const bDepth = 9.8;
        const bHeight = 8.5 + ((segIndex * 3 + b * 5) % 4) * 2.4; // Varied silhouettes (8.5m to 15.7m tall)
        const bX = sideSign * (11.8 + (b % 2) * 0.9);
        const bZ = -12 + b * 12;

        // Multi-material so the track-facing facade shows detailed windows/balconies/shopfronts
        const mats = [
          sideWallMat,
          sideWallMat,
          roofMat,
          roofMat,
          facadeMat,
          facadeMat
        ];
        // Rotate building so textured faces point toward the railway tracks
        const body = new THREE.Mesh(new THREE.BoxGeometry(bDepth, bHeight, bWidth), mats);
        body.rotation.y = Math.PI / 2;
        body.position.set(bX, bHeight / 2, bZ);
        body.castShadow = true;
        body.receiveShadow = true;
        cluster.add(body);

        // Rooftop Parapet Ledge
        const parapet = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.3, 0.45, bDepth + 0.3), roofMat);
        parapet.position.set(bX, bHeight + 0.22, bZ);
        cluster.add(parapet);

        // Rooftop Cylindrical Overhead Water Tank or Stairwell Cabin
        if ((b + segIndex) % 2 === 0) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.35, 10), tankMat);
          tank.position.set(bX, bHeight + 0.9, bZ + 1.5);
          cluster.add(tank);
        } else {
          const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.7, 2.2), sideWallMat);
          cabin.position.set(bX, bHeight + 0.85, bZ - 1.2);
          cluster.add(cabin);
        }
      }

      // Corrugated Railway Platform Shelter Canopy on even segments
      if (segIndex % 2 === 0) {
        const canopyX = sideSign * 7.2;
        const canopyRoof = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 0.14, 16),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4, roughness: 0.5 })
        );
        canopyRoof.position.set(canopyX, 3.65, 0);
        canopyRoof.rotation.z = sideSign * 0.12;
        cluster.add(canopyRoof);

        [-6, 0, 6].forEach((pz) => {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.9, 8), pillarMat);
          col.position.set(canopyX, 2.2, pz);
          cluster.add(col);
        });
      }

      return cluster;
    }

    buildTrackCorridor() {
      const railMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.20 });
      const railWebMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.45 });
      const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
      const clipMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
      const ballastMat = new THREE.MeshStandardMaterial({ map: this.ballastTexture, roughness: 0.95 });
      const platformMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
      const safetyLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const oheMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.4 });
      const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
      const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });

      for (let i = 0; i < TRACK_SEGMENT_COUNT; i++) {
        const seg = new THREE.Group();
        seg.position.z = -i * TRACK_SEGMENT_LENGTH;

        const bed = new THREE.Mesh(new THREE.PlaneGeometry(15.5, TRACK_SEGMENT_LENGTH), ballastMat);
        bed.rotation.x = -Math.PI / 2;
        bed.receiveShadow = true;
        seg.add(bed);

        const platGeo = new THREE.BoxGeometry(3.2, 0.76, TRACK_SEGMENT_LENGTH);
        const platL = new THREE.Mesh(platGeo, platformMat);
        platL.position.set(-7.1, 0.38, 0);
        platL.receiveShadow = true;
        const platR = platL.clone();
        platR.position.x = 7.1;

        const stripeGeo = new THREE.PlaneGeometry(0.18, TRACK_SEGMENT_LENGTH);
        stripeGeo.rotateX(-Math.PI / 2);
        const stripeL = new THREE.Mesh(stripeGeo, safetyLineMat);
        stripeL.position.set(-5.7, 0.765, 0);
        const stripeR = stripeL.clone();
        stripeR.position.x = 5.7;
        seg.add(platL, platR, stripeL, stripeR);

        LANES.forEach((laneX) => {
          [-SCALE.RAIL_HALF_GAUGE, SCALE.RAIL_HALF_GAUGE].forEach((offset) => {
            const rx = laneX + offset;
            const web = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, TRACK_SEGMENT_LENGTH), railWebMat);
            web.position.set(rx, 0.10, 0);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, TRACK_SEGMENT_LENGTH), railMat);
            head.position.set(rx, 0.16, 0);
            seg.add(web, head);
          });

          for (let z = -TRACK_SEGMENT_LENGTH / 2 + 1.2; z < TRACK_SEGMENT_LENGTH / 2; z += 1.8) {
            const sleeper = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.06, 0.24), sleeperMat);
            sleeper.position.set(laneX, 0.03, z);
            sleeper.receiveShadow = true;
            seg.add(sleeper);

            const clipL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.12), clipMat);
            clipL.position.set(laneX - SCALE.RAIL_HALF_GAUGE, 0.065, z);
            const clipR = clipL.clone();
            clipR.position.x = laneX + SCALE.RAIL_HALF_GAUGE;
            seg.add(clipL, clipR);
          }
        });

        const mastL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.8, 0.24), oheMat);
        mastL.position.set(-5.3, 2.9, 0);
        const mastR = mastL.clone();
        mastR.position.x = 5.3;
        const portalBeam = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.20, 0.20), oheMat);
        portalBeam.position.set(0, 5.65, 0);
        seg.add(mastL, mastR, portalBeam);

        // Add Recycled Side Buildings & Station Canopies on both sides
        seg.add(this.buildSideBuildingCluster(-1, i));
        seg.add(this.buildSideBuildingCluster(1, i));

        if (i % 2 === 0) {
          const board = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.88, 0.10),
            new THREE.MeshBasicMaterial({ map: this.stationTexture })
          );
          board.position.set(-6.6, 1.9, -6);
          board.rotation.y = Math.PI / 6;
          seg.add(board);

          const stnFlag = this.trainBuilder.createFlagWithPole();
          stnFlag.position.set(6.5, 0.76, 5);
          seg.add(stnFlag);
        } else {
          const sigPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), oheMat);
          sigPost.position.set(-5.1, 1.6, -8);
          const sigHousing = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.82, 0.22),
            new THREE.MeshStandardMaterial({ color: 0x111827 })
          );
          sigHousing.position.set(-5.1, 3.0, -8);
          const greenAspect = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x22c55e })
          );
          greenAspect.position.set(-5.1, 3.2, -7.88);
          seg.add(sigPost, sigHousing, greenAspect);

          [-9.2, 9.2].forEach((tx) => {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.8, 8), treeTrunkMat);
            trunk.position.set(tx, 0.9, -4);
            const crown = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 10), treeFoliageMat);
            crown.position.set(tx, 2.5, -4);
            crown.scale.set(1, 1.2, 1);
            seg.add(trunk, crown);
          });
        }

        this.scene.add(seg);
        this.trackSegments.push(seg);
      }
    }

    buildCharacters() {
      const currentSkin = SKINS[this.saveSystem.data.skinIndex] || SKINS[0];
      this.playerChar = new StylizedRunnerCharacter(currentSkin, this.flagTexture);
      this.playerChar.root.position.set(0, SCALE.RAIL_TOP_Y, 0);
      this.scene.add(this.playerChar.root);

      this.pursuerChar = new StylizedRunnerCharacter(
        {
          jacket: 0xb47b38,
          hoodie: 0xd99b52,
          pants: 0x784f22,
          shoes: 0x111827,
          cap: 0xb47b38,
          isOfficer: true
        },
        null
      );
      this.pursuerChar.root.position.set(0, SCALE.RAIL_TOP_Y, 3.2);
      this.scene.add(this.pursuerChar.root);
    }

    buildRainParticles() {
      const count = 320;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 1] = Math.random() * 12;
        positions[i * 3 + 2] = -Math.random() * 42;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.13, transparent: true, opacity: 0.65 });
      this.rainSystem = new THREE.Points(geo, mat);
      this.rainSystem.visible = false;
      this.scene.add(this.rainSystem);
    }

    /* ==========================================================================
     * 9. PROCEDURAL FAIR OBSTACLE, TRAIN, COIN & POWER-UP SPAWNER
     * ========================================================================== */
    clearDynamicWorld() {
      this.obstacles.forEach((o) => this.scene.remove(o.mesh));
      this.coins.forEach((c) => this.scene.remove(c.mesh));
      this.pickups.forEach((p) => this.scene.remove(p.mesh));
      this.obstacles = [];
      this.coins = [];
      this.pickups = [];
      this.spawnCursorZ = -48;
    }

    spawnNextWave() {
      const safeLane = Math.floor(Math.random() * 3);
      const rowZ = this.spawnCursorZ;

      for (let lane = 0; lane < 3; lane++) {
        if (lane === safeLane) {
          if (Math.random() < 0.52) {
            const bType = Math.random() < 0.5 ? 'LOW_JUMP' : 'HIGH_SLIDE';
            this.spawnBarrier(lane, rowZ, bType);
            this.spawnCoinArc(lane, rowZ, bType === 'LOW_JUMP', 0);
          } else {
            this.spawnCoinArc(lane, rowZ, false, 0);
          }

          if (Math.random() < 0.25) {
            this.spawnPowerUpPickup(lane, rowZ - 11);
          }
          continue;
        }

        const roll = Math.random();
        if (roll < 0.50) {
          const isMoving = Math.random() < 0.38;
          const trainTypes = ['WAP7_LOCO', 'LHB_COACH', 'FREIGHT'];
          const tType = isMoving ? 'WAP7_LOCO' : trainTypes[Math.floor(Math.random() * trainTypes.length)];
          const trainLen = tType === 'FREIGHT' ? 12.5 : 15.5;
          const mesh = this.trainBuilder.buildTrainMesh(tType, trainLen);
          mesh.position.set(LANES[lane], 0, rowZ - trainLen / 2);
          this.scene.add(mesh);

          // Spawn roof-top bonus coins on stationary trains so players can jump onto them!
          if (!isMoving && Math.random() < 0.65) {
            this.spawnCoinArc(lane, rowZ - trainLen / 2, false, SCALE.TRAIN_ROOF_OFFSET_Y);
          }

          this.obstacles.push({
            kind: 'TRAIN',
            lane,
            mesh,
            lengthZ: trainLen,
            minY: SCALE.RAIL_TOP_Y,
            maxY: SCALE.TRAIN_TOP_Y,
            speedZ: isMoving ? 12.5 : 0,
            triggered: false,
            nearMissAwarded: false
          });
        } else if (roll < 0.78) {
          const bType = Math.random() < 0.5 ? 'LOW_JUMP' : 'HIGH_SLIDE';
          this.spawnBarrier(lane, rowZ, bType);
        }
      }

      this.spawnCursorZ -= 34;
    }

    spawnBarrier(lane, z, subtype) {
      const group = new THREE.Group();
      const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.35 });
      const stripeMat = new THREE.MeshStandardMaterial({ map: this.stripeTexture, roughness: 0.4 });
      const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      if (subtype === 'LOW_JUMP') {
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.82, 10), postMat);
        legL.position.set(-0.82, SCALE.RAIL_TOP_Y + 0.41, 0);
        const legR = legL.clone();
        legR.position.x = 0.82;

        const plank = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.42, 0.20), stripeMat);
        plank.position.set(0, SCALE.RAIL_TOP_Y + 0.60, 0);
        plank.castShadow = true;

        const lampL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), redLightMat);
        lampL.position.set(-0.82, SCALE.LOW_BARRIER_TOP_Y + 0.04, 0);
        const lampR = lampL.clone();
        lampR.position.x = 0.82;

        group.add(legL, legR, plank, lampL, lampR);
        group.position.set(LANES[lane], 0, z);
        this.scene.add(group);

        this.obstacles.push({
          kind: 'LOW_JUMP',
          lane,
          mesh: group,
          lengthZ: 0.55,
          minY: SCALE.RAIL_TOP_Y,
          maxY: SCALE.LOW_BARRIER_TOP_Y,
          speedZ: 0,
          triggered: false
        });
      } else {
        const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.25, 10), postMat);
        postL.position.set(-0.98, SCALE.RAIL_TOP_Y + 1.12, 0);
        const postR = postL.clone();
        postR.position.x = 0.98;

        const upperBeam = new THREE.Mesh(
          new THREE.BoxGeometry(2.12, SCALE.HIGH_BARRIER_TOP_Y - SCALE.HIGH_BARRIER_BOTTOM_Y, 0.24),
          stripeMat
        );
        upperBeam.position.set(0, (SCALE.HIGH_BARRIER_BOTTOM_Y + SCALE.HIGH_BARRIER_TOP_Y) / 2, 0);
        upperBeam.castShadow = true;

        group.add(postL, postR, upperBeam);
        group.position.set(LANES[lane], 0, z);
        this.scene.add(group);

        this.obstacles.push({
          kind: 'HIGH_SLIDE',
          lane,
          mesh: group,
          lengthZ: 0.55,
          minY: SCALE.HIGH_BARRIER_BOTTOM_Y,
          maxY: SCALE.HIGH_BARRIER_TOP_Y,
          speedZ: 0,
          triggered: false
        });
      }
    }

    spawnCoinArc(lane, startZ, isJumpArc, baseOffsetY = 0) {
      const coinGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.10, 16);
      const coinMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.88,
        roughness: 0.18,
        emissive: 0x92400e,
        emissiveIntensity: 0.28
      });

      for (let i = 0; i < 5; i++) {
        const mesh = new THREE.Mesh(coinGeo, coinMat);
        mesh.rotation.z = Math.PI / 2;
        const zPos = startZ - (i - 2) * 2.2;
        const yArc = isJumpArc
          ? SCALE.RAIL_TOP_Y + baseOffsetY + 0.75 + Math.sin((i / 4) * Math.PI) * 2.65
          : SCALE.RAIL_TOP_Y + baseOffsetY + 0.75;
        mesh.position.set(LANES[lane], yArc, zPos);
        this.scene.add(mesh);
        this.coins.push({ mesh, collected: false });
      }
    }

    spawnPowerUpPickup(lane, z) {
      const types = ['JETPACK', 'MAGNET', 'OVERDRIVE', 'SHIELD'];
      const pType = types[Math.floor(Math.random() * types.length)];
      const colorMap = {
        JETPACK: 0xff6b1a,
        MAGNET: 0xef4444,
        OVERDRIVE: 0x22c55e,
        SHIELD: 0x00e5ff
      };

      const group = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.44, 1),
        new THREE.MeshStandardMaterial({
          color: colorMap[pType],
          emissive: colorMap[pType],
          emissiveIntensity: 0.45,
          metalness: 0.7,
          roughness: 0.2
        })
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.05, 8, 20),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      group.add(core, ring);
      group.position.set(LANES[lane], SCALE.RAIL_TOP_Y + 0.95, z);
      this.scene.add(group);
      this.pickups.push({ type: pType, mesh: group, collected: false });
    }

    /* ==========================================================================
     * 10. PLAYER ACTIONS, TRAIN-ROOF SUPPORT & POWER-UP LOGIC
     * ========================================================================== */
    /**
     * Returns the highest supporting surface offset (above SCALE.RAIL_TOP_Y)
     * directly beneath the player's current X/Z position.
     * If a train is underneath and the player is at or above roof level, returns SCALE.TRAIN_ROOF_OFFSET_Y (2.64m).
     */
    getSupportSurfaceOffset() {
      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        if (obs.kind !== 'TRAIN') continue;
        const halfLen = obs.lengthZ / 2;
        const zFront = obs.mesh.position.z + halfLen;
        const zBack = obs.mesh.position.z - halfLen;

        if (zFront >= -0.35 && zBack <= 0.35) {
          const dx = Math.abs(this.playerX - LANES[obs.lane]);
          if (dx < 0.92 && this.playerY >= SCALE.TRAIN_ROOF_OFFSET_Y - 0.38) {
            return SCALE.TRAIN_ROOF_OFFSET_Y;
          }
        }
      }
      return 0;
    }

    changeLane(dir) {
      if (this.state !== STATES.PLAYING) return;
      const target = this.currentLane + dir;
      if (target < 0 || target > 2) {
        this.triggerStumble('Struck platform edge — RPF Inspector closing in!');
        return;
      }
      this.currentLane = target;
      this.audio.playLaneSwitch();
    }

    jump() {
      if (this.state !== STATES.PLAYING || this.powerups.jetpack > 0) return;
      if (this.isGrounded) {
        this.isGrounded = false;
        this.slideTimer = 0;
        this.velocityY = this.jumpForce; // 20.1 m/s -> +4.59m apex above current surface!
        this.audio.playJump();
      }
    }

    slide() {
      if (this.state !== STATES.PLAYING || this.powerups.jetpack > 0) return;
      this.slideTimer = 0.72;
      if (!this.isGrounded) {
        this.velocityY = -28;
      }
      this.audio.playSlide();
    }

    activatePowerUp(type) {
      this.audio.playPowerup();
      this.powerupsUsedThisRun++;

      if (type === 'JETPACK') {
        this.powerups.jetpack = 8.0;
        this.slideTimer = 0;
        this.isGrounded = false;
        this.velocityY = 0;
        this.playerChar.jetpackGroup.visible = true;
        for (let i = 1; i <= 14; i++) {
          const laneIdx = i % 3;
          const coinMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.36, 0.36, 0.10, 14),
            new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.2 })
          );
          coinMesh.rotation.z = Math.PI / 2;
          coinMesh.position.set(LANES[laneIdx], SCALE.RAIL_TOP_Y + 6.2, -i * 5.2);
          this.scene.add(coinMesh);
          this.coins.push({ mesh: coinMesh, collected: false });
        }
        this.showToast('AERO THRUSTER ENGAGED!');
      } else if (type === 'MAGNET') {
        this.powerups.magnet = 10.0;
        this.showToast('FLUX MAGNET ONLINE!');
      } else if (type === 'OVERDRIVE') {
        this.powerups.overdrive = 8.0;
        this.showToast('OVERDRIVE 2X SCORE SURGE!');
      } else if (type === 'SHIELD') {
        this.powerups.shield = 12.0;
        this.playerChar.shieldMesh.visible = true;
        this.showToast('KAVACH SHIELD ACTIVE!');
      }
      this.checkMissionProgress();
    }

    triggerStumble(msg) {
      this.audio.playStumble();
      this.shakeTimer = 0.35;
      if (this.inspectorZOffset < 2.35) {
        this.triggerCaptureSequence('Apprehended by RPF Inspector after stumbling!');
        return;
      }
      this.inspectorZOffset = 1.85;
      this.showToast(msg);
    }

    /* ==========================================================================
     * 11. CORE SIMULATION LOOP & ANIMATED APPREHENSION SEQUENCE
     * ========================================================================== */
    updateSimulation(dt) {
      // 1. Speed & Score Progression (Preserved unchanged)
      this.baseSpeed = Math.min(this.maxSpeed, this.baseSpeed + dt * 0.28);
      const overdriveBoost = this.powerups.overdrive > 0 ? 1.28 : 1.0;
      const jetpackBoost = this.powerups.jetpack > 0 ? 1.40 : 1.0;
      this.speed = this.baseSpeed * overdriveBoost * jetpackBoost;

      const stepZ = this.speed * dt;
      this.distance += stepZ * 0.36;
      const mult = this.powerups.overdrive > 0 ? 2 : 1;
      this.score += Math.floor(stepZ * 2.5 * mult);

      // 2. Power-Up Countdown Timers
      ['jetpack', 'magnet', 'overdrive', 'shield'].forEach((key) => {
        if (this.powerups[key] > 0) {
          this.powerups[key] = Math.max(0, this.powerups[key] - dt);
          if (this.powerups[key] === 0) {
            if (key === 'jetpack') this.playerChar.jetpackGroup.visible = false;
            if (key === 'shield') this.playerChar.shieldMesh.visible = false;
          }
        }
      });

      this.ui.fxOverlay.classList.toggle('hidden', this.powerups.jetpack <= 0 && this.powerups.overdrive <= 0);

      // 3. Smooth Lane Switching & Vertical Jump / Train-Roof Landing Physics
      const targetX = LANES[this.currentLane];
      const prevX = this.playerX;
      this.playerX += (targetX - this.playerX) * Math.min(1, dt * 15);
      const lateralVelocity = (this.playerX - prevX) / Math.max(0.001, dt);

      // Scroll obstacles first so support surface check uses current frame positions
      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        obs.mesh.position.z += (this.speed + obs.speedZ) * dt;
      }

      const supportY = this.getSupportSurfaceOffset();

      if (this.powerups.jetpack > 0) {
        this.playerY += (5.8 - this.playerY) * Math.min(1, dt * 6.5);
        this.isGrounded = false;
      } else {
        // If standing on a train roof that just ended beneath us, begin falling smoothly
        if (this.isGrounded && this.playerY > supportY + 0.05) {
          this.isGrounded = false;
          this.velocityY = 0;
        }

        if (!this.isGrounded) {
          this.playerY += this.velocityY * dt;
          this.velocityY += this.gravity * dt;

          const updatedSupportY = this.getSupportSurfaceOffset();
          if (this.velocityY <= 0 && this.playerY <= updatedSupportY) {
            this.playerY = updatedSupportY;
            this.velocityY = 0;
            this.isGrounded = true;
            this.audio.playLand();
          }
        } else {
          this.playerY = supportY;
          this.audio.playStep();
        }
      }

      if (this.slideTimer > 0) {
        this.slideTimer = Math.max(0, this.slideTimer - dt);
      }

      const worldFootY = SCALE.RAIL_TOP_Y + this.playerY;
      this.playerChar.root.position.set(this.playerX, worldFootY, 0);

      let animMode = 'RUN';
      if (this.powerups.jetpack > 0) animMode = 'JETPACK';
      else if (!this.isGrounded) animMode = 'JUMP';
      else if (this.slideTimer > 0) animMode = 'SLIDE';
      this.playerChar.updateAnimation(dt, this.speed, animMode, lateralVelocity);

      // 4. Visible 3D RPF Inspector Chase AI
      this.inspectorZOffset = Math.min(4.9, this.inspectorZOffset + dt * 0.24);
      const prevInspX = this.inspectorX;
      this.inspectorX += (this.playerX - this.inspectorX) * Math.min(1, dt * 7.5);
      const inspLatVel = (this.inspectorX - prevInspX) / Math.max(0.001, dt);

      const targetInspY = !this.isGrounded && this.powerups.jetpack <= 0 ? Math.min(1.1, this.playerY * 0.35) : 0;
      this.inspectorY += (targetInspY - this.inspectorY) * Math.min(1, dt * 9);

      this.pursuerChar.root.position.set(this.inspectorX, SCALE.RAIL_TOP_Y + this.inspectorY, this.inspectorZOffset);
      this.pursuerChar.updateAnimation(dt, this.speed * 1.05, this.inspectorY > 0.25 ? 'JUMP' : 'RUN', inspLatVel);

      // 5. Recycle Track Segments
      this.trackSegments.forEach((seg) => {
        seg.position.z += stepZ;
        if (seg.position.z > TRACK_SEGMENT_LENGTH) {
          seg.position.z -= TRACK_SEGMENT_LENGTH * TRACK_SEGMENT_COUNT;
        }
      });

      this.spawnCursorZ += stepZ;
      while (this.spawnCursorZ > -150) {
        this.spawnNextWave();
      }

      // 6. Accurate State-Driven Obstacle Collisions
      const activeCharHeight = this.slideTimer > 0 ? SCALE.RUNNER_SLIDE_H : SCALE.RUNNER_STAND_H;
      const playerBottomY = worldFootY;
      const playerTopY = worldFootY + activeCharHeight;

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        const halfLen = obs.lengthZ / 2;
        const zFront = obs.mesh.position.z + halfLen;
        const zBack = obs.mesh.position.z - halfLen;

        if (!obs.triggered && zFront > -0.32 && zBack < 0.32 && this.powerups.jetpack <= 0) {
          const dx = Math.abs(this.playerX - LANES[obs.lane]);

          if (dx < 0.88) {
            // If the player jumped high enough to reach or clear the train roof (playerBottomY >= 2.48m),
            // do NOT trigger a frontal collision—let the player land on or vault over the train!
            const isSafelyOnOrAboveTrain =
              obs.kind === 'TRAIN' && playerBottomY >= SCALE.TRAIN_TOP_Y - 0.36;

            const verticalHit =
              !isSafelyOnOrAboveTrain &&
              playerTopY > obs.minY + 0.08 &&
              playerBottomY < obs.maxY - 0.10;

            if (verticalHit) {
              obs.triggered = true;

              if (this.powerups.shield > 0) {
                this.powerups.shield = 0;
                this.playerChar.shieldMesh.visible = false;
                this.audio.playStumble();
                this.shakeTimer = 0.35;
                this.scene.remove(obs.mesh);
                this.obstacles.splice(i, 1);
                this.showToast('KAVACH SHIELD ABSORBED IMPACT!');
                continue;
              }

              if (obs.kind === 'TRAIN' && dx > 0.54) {
                this.currentLane = this.playerX < LANES[obs.lane] ? Math.max(0, obs.lane - 1) : Math.min(2, obs.lane + 1);
                this.triggerStumble('Sideswiped Express Coach — Inspector right behind you!');
                continue;
              }

              const reasonMap = {
                TRAIN: 'Collided with Indian Railways rolling stock — Apprehended by RPF Inspector!',
                LOW_JUMP: 'Tripped over track barricade — Apprehended by RPF Inspector!',
                HIGH_SLIDE: 'Struck overhead signal gantry — Apprehended by RPF Inspector!'
              };
              this.triggerCaptureSequence(reasonMap[obs.kind] || 'Apprehended on tracks!');
              return;
            }
          } else if (obs.kind === 'TRAIN' && !obs.nearMissAwarded && dx < 3.2) {
            obs.nearMissAwarded = true;
            this.score += 25;
            this.audio.playHornNearMiss();
          }
        }

        if (obs.mesh.position.z > 24) {
          this.scene.remove(obs.mesh);
          this.obstacles.splice(i, 1);
        }
      }

      // 7. Coin Collection & Flux Magnet Attraction
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const c = this.coins[i];
        c.mesh.position.z += stepZ;
        c.mesh.rotation.y += dt * 3.8;

        if (this.powerups.magnet > 0 && c.mesh.position.z > -18 && c.mesh.position.z < 3.5) {
          c.mesh.position.x += (this.playerX - c.mesh.position.x) * Math.min(1, dt * 12);
          c.mesh.position.y += (worldFootY + 0.85 - c.mesh.position.y) * Math.min(1, dt * 12);
        }

        const distSq =
          Math.pow(c.mesh.position.x - this.playerX, 2) +
          Math.pow(c.mesh.position.y - (worldFootY + 0.82), 2) +
          Math.pow(c.mesh.position.z, 2);

        if (!c.collected && distSq < 1.45) {
          c.collected = true;
          this.runCoins++;
          this.score += 10 * mult;
          this.audio.playCoin();
          this.scene.remove(c.mesh);
          this.coins.splice(i, 1);
          this.checkMissionProgress();
          continue;
        }

        if (c.mesh.position.z > 12) {
          this.scene.remove(c.mesh);
          this.coins.splice(i, 1);
        }
      }

      // 8. Power-Up Pickups
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const p = this.pickups[i];
        p.mesh.position.z += stepZ;
        p.mesh.rotation.y += dt * 3.0;

        const distSq =
          Math.pow(p.mesh.position.x - this.playerX, 2) +
          Math.pow(p.mesh.position.y - (worldFootY + 0.85), 2) +
          Math.pow(p.mesh.position.z, 2);

        if (!p.collected && distSq < 1.65) {
          p.collected = true;
          this.activatePowerUp(p.type);
          this.scene.remove(p.mesh);
          this.pickups.splice(i, 1);
          continue;
        }

        if (p.mesh.position.z > 12) {
          this.scene.remove(p.mesh);
          this.pickups.splice(i, 1);
        }
      }

      // 9. Third-Person Chase Camera Framing
      const camTargetX = this.playerX * 0.62;
      const camTargetY = 4.35 + this.playerY * 0.62;
      this.camera.position.x += (camTargetX - this.camera.position.x) * Math.min(1, dt * 8.5);
      this.camera.position.y += (camTargetY - this.camera.position.y) * Math.min(1, dt * 6.5);
      this.camera.position.z = 7.4;

      if (this.shakeTimer > 0 && this.saveSystem.data.settings.cameraShake) {
        this.shakeTimer = Math.max(0, this.shakeTimer - dt);
        this.camera.position.x += (Math.random() - 0.5) * 0.30;
        this.camera.position.y += (Math.random() - 0.5) * 0.22;
      }

      this.camera.lookAt(this.playerX * 0.32, 1.35 + this.playerY * 0.45, -11);

      this.checkMissionProgress();
      this.updateHUD(dt);
    }

    /**
     * Initiates the non-graphic RPF Inspector Chase-to-Capture Animation Sequence
     */
    triggerCaptureSequence(reasonText) {
      if (this.state === STATES.CAPTURING || this.state === STATES.GAME_OVER) return;

      this.audio.playCrash();
      this.audio.stopMusic();
      this.state = STATES.CAPTURING;
      this.pendingGameOverReason = reasonText;
      this.captureTimer = 1.35; // 1.35s animated apprehension sequence
      this.shakeTimer = 0.4;
      this.ui.fxOverlay.classList.add('hidden');

      // Show toast and update HUD pursuit state to APPREHENDING
      this.ui.hudPursuitFill.style.width = '100%';
      this.ui.hudPursuitFill.style.backgroundColor = '#ef4444';
      this.ui.hudPursuitState.textContent = 'BUSTED!';
      this.ui.hudPursuitState.style.color = '#ef4444';
      this.showToast('RPF INSPECTOR APPREHENDING!');
    }

    /**
     * Animates the RPF Inspector sprinting up to the stumbled runner and restraining him
     * without intersecting the player model, then transitions to Game Over.
     */
    updateCaptureSequence(dt) {
      this.captureTimer -= dt;

      // Settle player smoothly onto track surface in stumbled/kneeling posture
      this.playerY = Math.max(0, this.playerY - dt * 14);
      const footY = SCALE.RAIL_TOP_Y + this.playerY;
      this.playerChar.root.position.set(this.playerX, footY, 0);
      this.playerChar.updateAnimation(dt, 6, 'STUMBLE_KNEEL', 0);

      // Inspector sprints forward from his current Z offset to Z = +0.92m and X = playerX + 0.36m
      // (Maintaining a clean 0.98m separation so the two 3D models never merge or clip)
      const targetStopZ = 0.92;
      const targetStopX = this.playerX + (this.playerX > 0 ? -0.38 : 0.38);

      this.inspectorX += (targetStopX - this.inspectorX) * Math.min(1, dt * 9);
      this.inspectorY = Math.max(0, this.inspectorY - dt * 12);

      if (this.inspectorZOffset > targetStopZ + 0.06) {
        const sprintSpeed = Math.max(4.5, (this.inspectorZOffset - targetStopZ) * 6.5);
        this.inspectorZOffset = Math.max(targetStopZ, this.inspectorZOffset - sprintSpeed * dt);
        this.pursuerChar.root.position.set(this.inspectorX, SCALE.RAIL_TOP_Y + this.inspectorY, this.inspectorZOffset);
        this.pursuerChar.root.rotation.y = 0;
        this.pursuerChar.updateAnimation(dt, 24, 'RUN', 0);
      } else {
        // Reached the player: face slightly toward the runner and perform baton apprehension pose
        this.inspectorZOffset = targetStopZ;
        this.pursuerChar.root.position.set(this.inspectorX, SCALE.RAIL_TOP_Y, this.inspectorZOffset);
        this.pursuerChar.root.rotation.y = this.playerX > 0 ? -0.35 : 0.35;
        this.pursuerChar.updateAnimation(dt, 10, 'APPREHEND', 0);
      }

      // Cinematic close-up camera framing both the stumbled runner and the RPF Inspector
      const camTargetX = this.playerX * 0.75 + (this.playerX > 0 ? -1.1 : 1.1);
      const camTargetY = 2.85 + this.playerY * 0.4;
      const camTargetZ = 4.35;
      this.camera.position.x += (camTargetX - this.camera.position.x) * Math.min(1, dt * 6);
      this.camera.position.y += (camTargetY - this.camera.position.y) * Math.min(1, dt * 6);
      this.camera.position.z += (camTargetZ - this.camera.position.z) * Math.min(1, dt * 6);

      if (this.shakeTimer > 0 && this.saveSystem.data.settings.cameraShake) {
        this.shakeTimer = Math.max(0, this.shakeTimer - dt);
        this.camera.position.x += (Math.random() - 0.5) * 0.25;
        this.camera.position.y += (Math.random() - 0.5) * 0.18;
      }

      this.camera.lookAt(this.playerX, SCALE.RAIL_TOP_Y + 0.95, 0.35);

      if (this.captureTimer <= 0) {
        this.finalizeGameOver(this.pendingGameOverReason);
      }
    }

    /* ==========================================================================
     * 12. MISSIONS, REAL-TIME PURSUIT HUD & STATE TRANSITIONS
     * ========================================================================== */
    getCurrentMission() {
      const idx = this.saveSystem.data.missionIndex % MISSIONS.length;
      return MISSIONS[idx];
    }

    getMissionProgressValue(mission) {
      if (mission.type === 'coins_run') return this.runCoins;
      if (mission.type === 'dist_run') return Math.floor(this.distance);
      if (mission.type === 'powerups') return this.powerupsUsedThisRun;
      return 0;
    }

    checkMissionProgress() {
      const m = this.getCurrentMission();
      const val = this.getMissionProgressValue(m);
      if (val >= m.target) {
        this.saveSystem.data.bankedCoins += m.reward;
        this.saveSystem.data.missionIndex = (this.saveSystem.data.missionIndex + 1) % MISSIONS.length;
        this.saveSystem.save();
        this.showToast(`DIRECTIVE COMPLETE! +${m.reward} BANKED COINS`);
      }
    }

    showToast(text) {
      this.ui.hudToast.textContent = text;
      this.ui.hudToast.classList.remove('hidden');
      this.toastTimer = 2.2;
    }

    updateHUD(dt) {
      this.ui.hudScore.textContent = this.score.toLocaleString();
      this.ui.hudMultiplier.textContent = this.powerups.overdrive > 0 ? 'x2' : 'x1';
      this.ui.hudDistance.textContent = `${Math.floor(this.distance)}m`;
      this.ui.hudCoins.textContent = this.runCoins;

      const proximityRatio = THREE.MathUtils.clamp((5.3 - this.inspectorZOffset) / 3.8, 0.15, 1.0);
      this.ui.hudPursuitFill.style.width = `${Math.round(proximityRatio * 100)}%`;

      const distMeters = this.inspectorZOffset.toFixed(1);
      if (this.inspectorZOffset < 2.35) {
        this.ui.hudPursuitFill.style.backgroundColor = '#ef4444';
        this.ui.hudPursuitState.textContent = `ON HEELS (${distMeters}m)`;
        this.ui.hudPursuitState.style.color = '#ef4444';
      } else if (this.inspectorZOffset < 3.6) {
        this.ui.hudPursuitFill.style.backgroundColor = '#f59e0b';
        this.ui.hudPursuitState.textContent = `HOT PURSUIT (${distMeters}m)`;
        this.ui.hudPursuitState.style.color = '#f59e0b';
      } else {
        this.ui.hudPursuitFill.style.backgroundColor = '#38bdf8';
        this.ui.hudPursuitState.textContent = `CHASING (${distMeters}m)`;
        this.ui.hudPursuitState.style.color = '#38bdf8';
      }

      const labels = {
        jetpack: ['AERO THRUSTER', 8.0],
        magnet: ['FLUX MAGNET', 10.0],
        overdrive: ['OVERDRIVE 2X', 8.0],
        shield: ['KAVACH SHIELD', 12.0]
      };
      let html = '';
      Object.keys(labels).forEach((k) => {
        if (this.powerups[k] > 0) {
          const [title, maxT] = labels[k];
          const w = Math.min(100, Math.round((this.powerups[k] / maxT) * 100));
          html += `<div class="powerup-pill">
            <div class="powerup-pill-header"><span>${title}</span><span>${this.powerups[k].toFixed(1)}s</span></div>
            <div class="powerup-bar-bg"><div class="powerup-bar-fill" style="width:${w}%"></div></div>
          </div>`;
        }
      });
      this.ui.hudPowerups.innerHTML = html;

      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) {
          this.ui.hudToast.classList.add('hidden');
        }
      }
    }

    refreshMenuUI() {
      const d = this.saveSystem.data;
      this.ui.menuBest.textContent = d.bestScore.toLocaleString();
      this.ui.menuCoins.textContent = d.bankedCoins.toLocaleString();
      this.ui.labelSkin.textContent = SKINS[d.skinIndex].name;
      this.ui.labelEnv.textContent = ENVIRONMENTS[d.envIndex].name;

      const m = this.getCurrentMission();
      this.ui.menuMissionDesc.textContent = m.desc;
      this.ui.menuMissionReward.textContent = `+${m.reward} COINS`;
      this.ui.menuMissionFill.style.width = '0%';
      this.ui.menuMissionStatus.textContent = `0 / ${m.target}`;
    }

    startNewRun() {
      this.audio.playStartRun();
      this.audio.startMusic();
      this.clearDynamicWorld();

      this.score = 0;
      this.distance = 0;
      this.runCoins = 0;
      this.powerupsUsedThisRun = 0;
      this.baseSpeed = 19.5;
      this.speed = 19.5;

      this.currentLane = 1;
      this.playerX = 0;
      this.playerY = 0;
      this.velocityY = 0;
      this.isGrounded = true;
      this.slideTimer = 0;
      this.captureTimer = 0;

      this.inspectorZOffset = 2.6;
      this.inspectorX = 0;
      this.inspectorY = 0;

      this.powerups = { jetpack: 0, magnet: 0, overdrive: 0, shield: 0 };
      this.playerChar.jetpackGroup.visible = false;
      this.playerChar.shieldMesh.visible = false;
      this.playerChar.root.position.set(0, SCALE.RAIL_TOP_Y, 0);
      this.playerChar.root.rotation.set(0, 0, 0);
      this.pursuerChar.root.position.set(0, SCALE.RAIL_TOP_Y, this.inspectorZOffset);
      this.pursuerChar.root.rotation.set(0, 0, 0);

      for (let i = 0; i < 4; i++) {
        this.spawnNextWave();
      }

      this.transitionToState(STATES.PLAYING);
    }

    finalizeGameOver(reasonText) {
      this.state = STATES.GAME_OVER;

      this.saveSystem.data.bankedCoins += this.runCoins;
      if (this.score > this.saveSystem.data.bestScore) {
        this.saveSystem.data.bestScore = this.score;
      }
      this.saveSystem.save();

      this.ui.goReason.textContent = reasonText;
      this.ui.goScore.textContent = this.score.toLocaleString();
      this.ui.goBest.textContent = this.saveSystem.data.bestScore.toLocaleString();
      this.ui.goDistance.textContent = `${Math.floor(this.distance)}m`;
      this.ui.goCoins.textContent = `${this.runCoins} (Bank: ${this.saveSystem.data.bankedCoins})`;

      const m = this.getCurrentMission();
      const val = Math.min(m.target, this.getMissionProgressValue(m));
      this.ui.goMissionDesc.textContent = m.desc;
      this.ui.goMissionStatus.textContent = `${val} / ${m.target}`;

      this.transitionToState(STATES.GAME_OVER);
    }

    transitionToState(nextState) {
      this.state = nextState;
      Object.values(this.ui.screens).forEach((el) => el.classList.add('hidden'));

      if (nextState === STATES.MENU) {
        this.audio.stopMusic();
        this.refreshMenuUI();
        this.ui.screens.menu.classList.remove('hidden');
      } else if (nextState === STATES.PLAYING) {
        this.audio.resumeMusic();
        this.ui.screens.hud.classList.remove('hidden');
      } else if (nextState === STATES.PAUSED) {
        this.audio.pauseMusic();
        this.ui.pauseScore.textContent = this.score.toLocaleString();
        this.ui.pauseDistance.textContent = `${Math.floor(this.distance)}m`;
        this.ui.pauseCoins.textContent = this.runCoins;
        this.ui.screens.hud.classList.remove('hidden');
        this.ui.screens.pause.classList.remove('hidden');
      } else if (nextState === STATES.GAME_OVER) {
        this.audio.stopMusic();
        this.ui.screens.gameover.classList.remove('hidden');
      }
    }

    /* ==========================================================================
     * 13. ENVIRONMENT & SETTINGS
     * ========================================================================== */
    applyEnvironmentPreset() {
      const env = ENVIRONMENTS[this.saveSystem.data.envIndex] || ENVIRONMENTS[0];
      this.scene.background = new THREE.Color(env.sky);
      this.scene.fog = new THREE.FogExp2(env.fog, 0.0115);
      this.ambientLight.color.setHex(env.ambient);
      this.ambientLight.intensity = env.ambInt;
      this.dirLight.color.setHex(env.dirColor);
      this.dirLight.intensity = env.dirInt;
      if (this.rainSystem) {
        this.rainSystem.visible = Boolean(env.rain);
      }
    }

    applySettingsToEngine() {
      const s = this.saveSystem.data.settings;
      this.ui.inputMasterVol.value = s.masterVolume;
      if (this.ui.inputMusicVol) {
        this.ui.inputMusicVol.value = typeof s.musicVolume === 'number' ? s.musicVolume : 75;
      }
      this.ui.inputSfxVol.value = s.sfxVolume;
      this.ui.btnToggleMusic.textContent = s.musicEnabled ? 'ON' : 'OFF';
      this.ui.btnToggleMute.textContent = s.muted ? 'MUTED' : 'UNMUTED';
      this.ui.selectQuality.value = s.quality;
      this.ui.btnToggleShake.textContent = s.cameraShake ? 'ON' : 'OFF';
      this.ui.btnToggleDpad.textContent = s.showDpad ? 'SHOW' : 'HIDE';
      this.ui.selectSensitivity.value = s.sensitivity;

      if (this.ui.btnHudMusic) {
        const musicActive = s.musicEnabled && !s.muted;
        this.ui.btnHudMusic.style.opacity = musicActive ? '1' : '0.45';
        this.ui.btnHudMusic.textContent = musicActive ? '♫' : '✕';
      }

      this.ui.touchControls.classList.toggle('hidden', !s.showDpad);

      if (this.renderer) {
        if (s.quality === 'LOW') {
          this.renderer.setPixelRatio(1.0);
          this.renderer.shadowMap.enabled = false;
        } else if (s.quality === 'MEDIUM') {
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
          this.renderer.shadowMap.enabled = true;
        } else {
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
          this.renderer.shadowMap.enabled = true;
        }
      }
    }

    /* ==========================================================================
     * 14. INPUT & UI EVENT HANDLERS
     * ========================================================================== */
    setupEventListeners() {
      document.getElementById('btn-launch-run').addEventListener('click', () => {
        this.audio.playUiClick();
        this.startNewRun();
      });

      document.getElementById('btn-skin-cycle').addEventListener('click', () => {
        this.audio.playUiClick();
        this.saveSystem.data.skinIndex = (this.saveSystem.data.skinIndex + 1) % SKINS.length;
        this.playerChar.applySkin(SKINS[this.saveSystem.data.skinIndex]);
        this.saveSystem.save();
        this.refreshMenuUI();
      });

      document.getElementById('btn-env-cycle').addEventListener('click', () => {
        this.audio.playUiClick();
        this.saveSystem.data.envIndex = (this.saveSystem.data.envIndex + 1) % ENVIRONMENTS.length;
        this.applyEnvironmentPreset();
        this.saveSystem.save();
        this.refreshMenuUI();
      });

      document.getElementById('btn-open-tutorial').addEventListener('click', () => {
        this.audio.playUiClick();
        this.ui.screens.tutorial.classList.remove('hidden');
      });

      document.getElementById('btn-close-tutorial').addEventListener('click', () => {
        this.audio.playUiClick();
        this.ui.screens.tutorial.classList.add('hidden');
      });

      const openSettings = () => {
        this.audio.playUiClick();
        this.ui.screens.settings.classList.remove('hidden');
      };
      document.getElementById('btn-open-settings').addEventListener('click', openSettings);
      document.getElementById('btn-pause-settings').addEventListener('click', openSettings);

      document.getElementById('btn-close-settings').addEventListener('click', () => {
        this.audio.playUiClick();
        this.saveSystem.save();
        this.ui.screens.settings.classList.add('hidden');
      });

      this.ui.inputMasterVol.addEventListener('input', (e) => {
        this.saveSystem.data.settings.masterVolume = Number(e.target.value);
      });
      if (this.ui.inputMusicVol) {
        this.ui.inputMusicVol.addEventListener('input', (e) => {
          this.saveSystem.data.settings.musicVolume = Number(e.target.value);
        });
      }
      this.ui.inputSfxVol.addEventListener('input', (e) => {
        this.saveSystem.data.settings.sfxVolume = Number(e.target.value);
      });
      this.ui.btnToggleMusic.addEventListener('click', () => {
        this.saveSystem.data.settings.musicEnabled = !this.saveSystem.data.settings.musicEnabled;
        this.applySettingsToEngine();
        this.saveSystem.save();
      });
      if (this.ui.btnHudMusic) {
        this.ui.btnHudMusic.addEventListener('click', () => {
          this.audio.initContext();
          this.saveSystem.data.settings.musicEnabled = !this.saveSystem.data.settings.musicEnabled;
          this.applySettingsToEngine();
          this.saveSystem.save();
          this.showToast(this.saveSystem.data.settings.musicEnabled ? 'MUSIC ON' : 'MUSIC OFF');
        });
      }
      this.ui.btnToggleMute.addEventListener('click', () => {
        this.saveSystem.data.settings.muted = !this.saveSystem.data.settings.muted;
        this.applySettingsToEngine();
        this.saveSystem.save();
      });
      this.ui.selectQuality.addEventListener('change', (e) => {
        this.saveSystem.data.settings.quality = e.target.value;
        this.applySettingsToEngine();
      });
      this.ui.btnToggleShake.addEventListener('click', () => {
        this.saveSystem.data.settings.cameraShake = !this.saveSystem.data.settings.cameraShake;
        this.applySettingsToEngine();
      });
      this.ui.btnToggleDpad.addEventListener('click', () => {
        this.saveSystem.data.settings.showDpad = !this.saveSystem.data.settings.showDpad;
        this.applySettingsToEngine();
      });
      this.ui.selectSensitivity.addEventListener('change', (e) => {
        this.saveSystem.data.settings.sensitivity = e.target.value;
      });
      document.getElementById('btn-reset-save').addEventListener('click', () => {
        this.saveSystem.reset();
        this.applySettingsToEngine();
        this.refreshMenuUI();
      });

      document.getElementById('btn-pause').addEventListener('click', () => {
        if (this.state === STATES.PLAYING) {
          this.audio.playUiClick();
          this.transitionToState(STATES.PAUSED);
        }
      });
      document.getElementById('btn-resume').addEventListener('click', () => {
        this.audio.playUiClick();
        this.lastFrameTime = performance.now();
        this.transitionToState(STATES.PLAYING);
      });
      document.getElementById('btn-pause-restart').addEventListener('click', () => this.startNewRun());
      document.getElementById('btn-go-restart').addEventListener('click', () => this.startNewRun());

      const backToMenu = () => {
        this.audio.playUiClick();
        this.clearDynamicWorld();
        this.playerChar.root.position.set(0, SCALE.RAIL_TOP_Y, 0);
        this.playerChar.root.rotation.set(0, 0, 0);
        this.pursuerChar.root.position.set(-1.1, SCALE.RAIL_TOP_Y, 2.2);
        this.pursuerChar.root.rotation.set(0, 0, 0);
        this.transitionToState(STATES.MENU);
      };
      document.getElementById('btn-pause-menu').addEventListener('click', backToMenu);
      document.getElementById('btn-go-menu').addEventListener('click', backToMenu);

      // On-Screen Touch D-Pad
      document.getElementById('btn-move-left').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.changeLane(-1);
      });
      document.getElementById('btn-move-right').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.changeLane(1);
      });
      document.getElementById('btn-move-jump').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.jump();
      });
      document.getElementById('btn-move-slide').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.slide();
      });

      // Swipe Gestures
      let touchStartX = 0;
      let touchStartY = 0;
      let isSwiping = false;

      window.addEventListener('pointerdown', (e) => {
        if (this.state !== STATES.PLAYING) return;
        if (e.target.closest('button')) return;
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        isSwiping = true;
      });

      window.addEventListener('pointerup', (e) => {
        if (!isSwiping || this.state !== STATES.PLAYING) return;
        isSwiping = false;
        const dx = e.clientX - touchStartX;
        const dy = e.clientY - touchStartY;

        const sens = this.saveSystem.data.settings.sensitivity;
        const threshold = sens === 'HIGH' ? 18 : sens === 'LOW' ? 48 : 28;

        if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.changeLane(dx > 0 ? 1 : -1);
        } else {
          if (dy < 0) this.jump();
          else this.slide();
        }
      });

      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        if (this.state !== STATES.PLAYING) return;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.changeLane(-1);
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.changeLane(1);
        else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') this.jump();
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.slide();
        else if (e.key === 'Escape') this.transitionToState(STATES.PAUSED);
      });

      window.addEventListener('resize', () => {
        if (!this.renderer || !this.camera) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === STATES.PLAYING) {
          this.transitionToState(STATES.PAUSED);
        }
      });
    }

    /* ==========================================================================
     * 15. MAIN RENDER LOOP
     * ========================================================================== */
    animate(now) {
      requestAnimationFrame(this.animate);

      const rawDt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      this.trainBuilder.updateFlags(now * 0.001);

      if (this.rainSystem && this.rainSystem.visible) {
        const pos = this.rainSystem.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - dt * 24;
          if (y < 0) y = 12;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      if (this.state === STATES.MENU) {
        this.playerChar.root.position.set(0, SCALE.RAIL_TOP_Y, 0);
        this.playerChar.updateAnimation(dt, 6, 'IDLE', 0);
        this.pursuerChar.root.position.set(-1.25, SCALE.RAIL_TOP_Y, 2.2);
        this.pursuerChar.updateAnimation(dt, 6, 'IDLE', 0);
        this.camera.position.set(Math.sin(now * 0.0005) * 1.2, 2.9, 5.2);
        this.camera.lookAt(0, 1.25, -2);
      } else if (this.state === STATES.PLAYING) {
        this.updateSimulation(dt);
      } else if (this.state === STATES.CAPTURING) {
        this.updateCaptureSequence(dt);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new IndianSubwaySurfGame());
  } else {
    new IndianSubwaySurfGame();
  }
})();
