const WARM_STOPS = [
  [255, 179, 107], // #FFB36B
  [255, 107, 74],  // #FF6B4A
  [232, 69, 139],  // #E8458B
];

const COOL_STOPS = [
  [168, 85, 247],  // #A855F7
  [99, 102, 241],  // #6366F1
  [59, 102, 255],  // #3B66FF
];

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function samplePalette(stops, t) {
  const scaled = clamp(t, 0, 1) * (stops.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const c0 = stops[idx];
  const c1 = stops[Math.min(stops.length - 1, idx + 1)];
  return [
    Math.round(lerp(c0[0], c1[0], frac)),
    Math.round(lerp(c0[1], c1[1], frac)),
    Math.round(lerp(c0[2], c1[2], frac)),
  ];
}

export class EqualizerStage {
  constructor(canvas, scenes, { onSceneChange, ambientAudio } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scenes = scenes;
    this.onSceneChange = onSceneChange || (() => {});
    this.ambientAudio = ambientAudio || null;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.paused = false;

    this.sceneDuration = 5800; // ms per scene cycle
    this.currentIndex = 0;
    this.prevIndex = scenes.length - 1;
    this.sceneElapsed = 1650; // start partially revealed on initial load for immediate impact
    this.lastTimestamp = 0;
    this.rafId = null;

    this.pointer = { x: -9999, y: -9999, active: false, strength: 0 };

    this.dpr = 1;
    this.width = 0;
    this.height = 0;
    this.isMobile = false;

    this.gridCols = 86;
    this.gridRows = 124;

    this.prepared = new Array(scenes.length).fill(null);
    this.ready = false;

    this._bindEvents();
  }

  async init() {
    this.resize();
    await this._loadAllScenes();
    this.ready = true;
    this.onSceneChange(this.currentIndex, true);
    this.lastTimestamp = performance.now();
    this._loop(this.lastTimestamp);
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
      this.pointer.active = true;
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.pointer.active = false;
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(320, rect.width || window.innerWidth);
    this.height = Math.max(420, rect.height || window.innerHeight);
    this.isMobile = window.innerWidth < 860;

    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const nextCols = this.isMobile ? 54 : 88;
    const nextRows = this.isMobile ? 84 : 126;
    if (nextCols !== this.gridCols || nextRows !== this.gridRows) {
      this.gridCols = nextCols;
      this.gridRows = nextRows;
      if (this.ready) {
        this.prepared.forEach((item) => {
          if (item && item.mattedCanvas) {
            item.grid = this._buildGrid(item.mattedCanvas, this.gridCols, this.gridRows);
          }
        });
      }
    }
  }

  async _loadAllScenes() {
    const loaders = this.scenes.map(async (scene, idx) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = scene.image;
      try {
        await img.decode();
      } catch {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
      if (!img.naturalWidth) return;
      const mattedCanvas = this._createMattedMonochrome(img);
      const grid = this._buildGrid(mattedCanvas, this.gridCols, this.gridRows);
      this.prepared[idx] = { img, mattedCanvas, grid };
    });
    await Promise.all(loaders);
  }

  _createMattedMonochrome(img) {
    const targetW = 540;
    const targetH = Math.round((img.naturalHeight / img.naturalWidth) * targetW);
    const off = document.createElement('canvas');
    off.width = targetW;
    off.height = targetH;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, 0, 0, targetW, targetH);

    const imageData = octx.getImageData(0, 0, targetW, targetH);
    const data = imageData.data;

    // Sample corners and outer border to detect background floor luminance
    const sampleCoords = [
      [4, 4], [targetW - 5, 4], [4, targetH - 5], [targetW - 5, targetH - 5],
      [Math.floor(targetW * 0.5), 4], [4, Math.floor(targetH * 0.5)],
      [targetW - 5, Math.floor(targetH * 0.5)],
    ];
    let bgSum = 0;
    for (const [sx, sy] of sampleCoords) {
      const idx = (sy * targetW + sx) * 4;
      bgSum += (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
    }
    const bgLum = clamp(bgSum / sampleCoords.length, 0.03, 0.22);

    for (let y = 0; y < targetH; y += 1) {
      const ny = y / targetH;
      const edgeTop = smoothstep(0.01, 0.10, ny);
      const edgeBottom = 1 - smoothstep(0.84, 0.995, ny);

      for (let x = 0; x < targetW; x += 1) {
        const nx = x / targetW;
        const idx = (y * targetW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const rawLum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        // Studio high-contrast grayscale curve
        const adjusted = clamp((rawLum - bgLum) / Math.max(0.25, 1 - bgLum), 0, 1);
        const contrasted = clamp(Math.pow(adjusted, 0.92) * 1.08, 0, 1);
        const gray = Math.round(contrasted * 255);

        const edgeLeft = smoothstep(0.02, 0.13, nx);
        const edgeRight = 1 - smoothstep(0.88, 0.99, nx);
        const edgeMask = edgeTop * edgeBottom * edgeLeft * edgeRight;

        const keyAlpha = smoothstep(bgLum + 0.028, bgLum + 0.145, rawLum);
        const alpha = Math.round(clamp(keyAlpha * edgeMask, 0, 1) * 255);

        data[idx] = gray;
        data[idx + 1] = gray;
        data[idx + 2] = gray;
        data[idx + 3] = alpha;
      }
    }

    octx.putImageData(imageData, 0, 0);
    return off;
  }

  _buildGrid(mattedCanvas, cols, rows) {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
    const sctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(mattedCanvas, 0, 0, cols, rows);
    const { data } = sctx.getImageData(0, 0, cols, rows);

    const grid = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i += 1) {
      const idx = i * 4;
      const lum = data[idx] / 255;
      const alpha = data[idx + 3] / 255;
      grid[i] = lum * alpha;
    }
    return grid;
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    if (!this.paused) {
      this.lastTimestamp = performance.now();
    }
  }

  goToScene(index) {
    const safeIdx = ((index % this.scenes.length) + this.scenes.length) % this.scenes.length;
    if (safeIdx === this.currentIndex) return;
    this.prevIndex = this.currentIndex;
    this.currentIndex = safeIdx;
    this.sceneElapsed = 0;
    this.onSceneChange(this.currentIndex, false);
  }

  getProgress() {
    return clamp(this.sceneElapsed / this.sceneDuration, 0, 1);
  }

  _loop = (now) => {
    const dt = Math.min(64, Math.max(0, now - this.lastTimestamp));
    this.lastTimestamp = now;

    if (!this.paused && !this.reducedMotion) {
      this.sceneElapsed += dt;
      if (this.sceneElapsed >= this.sceneDuration) {
        this.sceneElapsed -= this.sceneDuration;
        this.prevIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.scenes.length;
        this.onSceneChange(this.currentIndex, false);
      }
    }

    const targetPointerStrength = this.pointer.active ? 1 : 0;
    this.pointer.strength = lerp(this.pointer.strength, targetPointerStrength, 0.14);

    this._render(now * 0.001);
    this.rafId = requestAnimationFrame(this._loop);
  };

  _getStageRect() {
    // Frame the sculpture gracefully inside the centered editorial grid on desktop, below hero CTAs on mobile
    if (this.isMobile) {
      const stageW = Math.min(this.width * 0.84, 340);
      const stageH = stageW * (4 / 3);
      return {
        x: (this.width - stageW) * 0.5,
        y: Math.max(390, this.height - stageH - 52),
        w: stageW,
        h: stageH,
      };
    }

    const containerW = Math.min(this.width, 1320);
    const containerLeft = (this.width - containerW) * 0.5;
    const padX = Math.min(64, Math.max(20, this.width * 0.045));
    const innerW = containerW - padX * 2;

    let stageH = Math.min(this.height * 0.94, 860);
    let stageW = stageH * 0.75;
    const maxStageW = innerW * 0.56;
    if (stageW > maxStageW) {
      stageW = maxStageW;
      stageH = stageW / 0.75;
    }

    // Center the sculpture at ~69% of the editorial container so it pairs tightly with the left headline
    const desiredCenterX = containerLeft + padX + innerW * 0.69;
    const minX = containerLeft + padX + innerW * 0.40;
    const maxX = containerLeft + containerW - padX - stageW * 0.92;
    const x = clamp(desiredCenterX - stageW * 0.5, minX, maxX);
    const y = Math.max(54, this.height - stageH * 0.95);
    return { x, y, w: stageW, h: stageH };
  }

  _computeRevealBand(mode, nx, phaseProgress) {
    // Returns normalized y threshold where crisp sculpture transitions to bars
    // For top-down: y < split is crisp sculpture, y > split is equalizer bars
    // For bottom-up / bottom-up-soft: y > split is crisp sculpture, y < split is equalizer bars
    // For diagonal: tilted boundary
    const wave =
      Math.sin(nx * 9.0 + phaseProgress * 4.2) * 0.032 +
      Math.cos(nx * 17.0 - phaseProgress * 2.6) * 0.016;

    const strength = smoothstep(0.14, 0.42, phaseProgress) * (1 - smoothstep(0.76, 0.95, phaseProgress));

    if (mode === 'top-down') {
      const splitY = lerp(0.16, 0.46, strength) + wave;
      return { isBottomRevealed: false, splitY, strength };
    }
    if (mode === 'bottom-up') {
      const splitY = lerp(0.92, 0.56, strength) + wave;
      return { isBottomRevealed: true, splitY, strength };
    }
    if (mode === 'bottom-up-soft') {
      const splitY = lerp(0.92, 0.50, strength) + wave * 1.2;
      return { isBottomRevealed: true, splitY, strength };
    }
    // diagonal
    const splitY = lerp(0.06, 0.44, strength) + (nx - 0.5) * 0.34 + wave;
    return { isBottomRevealed: false, splitY, strength };
  }

  _render(timeSec) {
    const { ctx, width, height } = this;
    ctx.fillStyle = '#0F0F13';
    ctx.fillRect(0, 0, width, height);

    const curr = this.prepared[this.currentIndex];
    const prev = this.prepared[this.prevIndex] || curr;
    if (!curr) return;

    const rect = this._getStageRect();
    const phase = this.reducedMotion ? 0.55 : this.getProgress();
    const audioEnergy = this.ambientAudio ? this.ambientAudio.sample() : 0;

    // Cross-morph factor from previous scene to current scene during first 20% of cycle
    const morphT = this.reducedMotion ? 1 : smoothstep(0.0, 0.22, phase);

    const cols = this.gridCols;
    const rows = this.gridRows;
    const colStep = rect.w / cols;
    const rowStep = rect.h / rows;
    const barW = Math.max(2.1, colStep * 0.48);

    const mode = this.scenes[this.currentIndex].revealMode;

    // 1. Draw crisp monochrome sculpture inside a single unified clip region (zero slice seams)
    let avgRevealStrength = 0;
    for (let c = 0; c < cols; c += 1) {
      const nx = (c + 0.5) / cols;
      avgRevealStrength += this._computeRevealBand(mode, nx, phase).strength;
    }
    avgRevealStrength /= cols;

    if (avgRevealStrength > 0.02) {
      ctx.save();
      ctx.globalAlpha = clamp(avgRevealStrength * 1.18, 0, 1);
      ctx.beginPath();
      for (let c = 0; c < cols; c += 1) {
        const nx = (c + 0.5) / cols;
        const band = this._computeRevealBand(mode, nx, phase);
        const splitPxY = rect.y + clamp(band.splitY, 0, 1) * rect.h;
        const colX = rect.x + c * colStep;
        if (band.isBottomRevealed) {
          const clipH = rect.y + rect.h - splitPxY;
          if (clipH > 2) {
            ctx.rect(colX - 0.5, splitPxY, colStep + 1, clipH + 2);
          }
        } else {
          const clipH = splitPxY - rect.y;
          if (clipH > 2) {
            ctx.rect(colX - 0.5, rect.y - 2, colStep + 1, clipH + 2);
          }
        }
      }
      ctx.clip();
      ctx.drawImage(curr.mattedCanvas, rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }

    // 2. Render vertical equalizer bars over unrevealed / frontier / pointer-disturbed zones
    const currGrid = curr.grid;
    const prevGrid = prev.grid;

    for (let c = 0; c < cols; c += 1) {
      const nx = (c + 0.5) / cols;
      const colX = rect.x + c * colStep + (colStep - barW) * 0.5;
      const band = this._computeRevealBand(mode, nx, phase);
      const audioBoost = this.ambientAudio ? this.ambientAudio.getColumnBoost(nx) : 0;

      // Column-specific vertical cascade wave
      const colSpeed = (c % 2 === 0 ? 1 : -0.75) * (0.9 + (c % 5) * 0.14);
      const cascadeShift = Math.sin(timeSec * 2.1 + c * 0.37) * 0.8 + timeSec * colSpeed * 0.85;
      const rowPhase = (c * 0.618) % 1;

      for (let r = 0; r < rows; r += 1) {
        const ny = (r + 0.5) / rows;
        const idx = r * cols + c;

        const lumPrev = prevGrid[idx] || 0;
        const lumCurr = currGrid[idx] || 0;
        let lum = lerp(lumPrev, lumCurr, morphT);

        // During heavy transition, keep gentle vertical motion shimmer
        const transitionPulse = (1 - band.strength) * 0.18;
        lum = clamp(lum * (1 + audioBoost + transitionPulse), 0, 1);

        if (lum < 0.065) continue;

        const cellY = rect.y + r * rowStep;

        // Pointer disturbance locally fractures revealed sculpture into dancing chromatic bars
        let pointerDisturb = 0;
        if (this.pointer.strength > 0.02) {
          const dx = colX - this.pointer.x;
          const dy = cellY - this.pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 135) {
            pointerDisturb = (1 - smoothstep(18, 135, dist)) * this.pointer.strength;
          }
        }

        // Determine if this cell lies in the equalizer zone vs already revealed crisp zone
        const distFromSplit = band.isBottomRevealed ? band.splitY - ny : ny - band.splitY;
        const frontierZone = smoothstep(-0.11, 0.055, distFromSplit);
        const barVisibility = clamp(
          Math.max(1 - band.strength, frontierZone, pointerDisturb),
          0,
          1
        );

        if (barVisibility <= 0.04) continue;

        // Vertical segmented bar rhythm (authentic equalizer dash pattern)
        const dashWave = (ny * 26 + cascadeShift * 0.35 + rowPhase) % 1;
        const dashDuty = lerp(0.56, 0.90, lum);
        if (dashWave > dashDuty && barVisibility < 0.85) continue;

        // Color assignment: white luminous core + warm left/lower flank + cool right/upper flank
        const edgeFactor = clamp(
          (1 - smoothstep(0.32, 0.72, lum)) * 0.85 +
          Math.abs(nx - 0.48) * 1.15 +
          pointerDisturb * 0.65 +
          (1 - band.strength) * 0.25,
          0,
          1
        );

        let rgb;
        if (nx < 0.48) {
          const t = clamp((0.48 - nx) * 2.1 + (1 - lum) * 0.35, 0, 1);
          rgb = samplePalette(WARM_STOPS, t);
        } else {
          const t = clamp((nx - 0.48) * 2.1 + (1 - lum) * 0.35, 0, 1);
          rgb = samplePalette(COOL_STOPS, t);
        }

        const whiteness = clamp(smoothstep(0.45, 0.86, lum) * (1 - edgeFactor * 0.65), 0, 1);
        const rCol = Math.round(lerp(rgb[0], 255, whiteness));
        const gCol = Math.round(lerp(rgb[1], 255, whiteness));
        const bCol = Math.round(lerp(rgb[2], 255, whiteness));

        const alpha = clamp(lum * 1.25 * barVisibility * (0.85 + audioEnergy * 0.3), 0, 1);
        const segH = Math.max(2, rowStep * (0.72 + lum * 0.55));
        const jitterY = this.reducedMotion ? 0 : Math.sin(timeSec * 3.4 + c * 0.7 + r * 0.2) * (1 - band.strength) * 2.2;

        ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha.toFixed(3)})`;
        ctx.fillRect(colX, cellY + jitterY, barW, segH);
      }
    }

    // 3. Soft left & bottom obsidian fade so headline text sits on clean ground without dimming sculpture bars
    const leftFadeEnd = Math.max(0, rect.x + rect.w * 0.08);
    if (leftFadeEnd > 0) {
      const leftGrad = ctx.createLinearGradient(0, 0, leftFadeEnd, 0);
      leftGrad.addColorStop(0, '#0F0F13');
      leftGrad.addColorStop(0.75, 'rgba(15, 15, 19, 0.55)');
      leftGrad.addColorStop(1, 'rgba(15, 15, 19, 0)');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(0, 0, leftFadeEnd, height);
    }

    const bottomGrad = ctx.createLinearGradient(0, height - 96, 0, height);
    bottomGrad.addColorStop(0, 'rgba(15, 15, 19, 0)');
    bottomGrad.addColorStop(1, '#0F0F13');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, height - 96, width, 96);
  }
}
