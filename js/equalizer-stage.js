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
  constructor(canvas, scenes, { onSceneChange, onFrame, ambientAudio } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scenes = scenes;
    this.onSceneChange = onSceneChange || (() => {});
    this.onFrame = onFrame || (() => {});
    this.ambientAudio = ambientAudio || null;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.paused = false;
    this.visible = true;

    this.sceneDuration = 5800; // ms per scene cycle
    this.currentIndex = 0;
    this.prevIndex = scenes.length - 1;
    this.sceneElapsed = 1650; // start partially revealed on initial load for immediate impact
    this.lastTimestamp = 0;
    this.rafId = null;

    this.pointer = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      vx: 0,
      vy: 0,
      active: false,
      strength: 0,
    };

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
    this._startLoop();
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.resize());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._stopLoop();
      } else if (this.ready && this.visible) {
        this._startLoop();
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (!this.pointer.active && this.pointer.strength < 0.05) {
        this.pointer.x = px;
        this.pointer.y = py;
        this.pointer.vx = 0;
        this.pointer.vy = 0;
      }
      this.pointer.targetX = px;
      this.pointer.targetY = py;
      this.pointer.active = true;
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.pointer.active = false;
    });
  }

  setVisible(isVisible) {
    this.visible = Boolean(isVisible);
    if (!this.ready) return;
    if (this.visible && !document.hidden) {
      this._startLoop();
    } else {
      this._stopLoop();
    }
  }

  _startLoop() {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this._loop);
  }

  _stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
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

    const nextCols = this.isMobile ? 52 : 84;
    const nextRows = this.isMobile ? 84 : 124;
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
    const dt = Math.min(50, Math.max(0, now - this.lastTimestamp));
    this.lastTimestamp = now;
    const dtSec = dt * 0.001;

    if (!this.paused && !this.reducedMotion) {
      this.sceneElapsed += dt;
      if (this.sceneElapsed >= this.sceneDuration) {
        this.sceneElapsed -= this.sceneDuration;
        this.prevIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.scenes.length;
        this.onSceneChange(this.currentIndex, false);
      }
    }

    // Spring-damped pointer wake tracking
    if (this.pointer.active) {
      const stiffness = 190;
      const damping = 22;
      const ax = (this.pointer.targetX - this.pointer.x) * stiffness - this.pointer.vx * damping;
      const ay = (this.pointer.targetY - this.pointer.y) * stiffness - this.pointer.vy * damping;
      this.pointer.vx += ax * dtSec;
      this.pointer.vy += ay * dtSec;
      this.pointer.x += this.pointer.vx * dtSec;
      this.pointer.y += this.pointer.vy * dtSec;
    }

    const targetPointerStrength = this.pointer.active ? 1 : 0;
    this.pointer.strength = lerp(this.pointer.strength, targetPointerStrength, 1 - Math.exp(-dtSec * 10));

    this._render(now * 0.001);

    if (this.visible && !document.hidden) {
      this.rafId = requestAnimationFrame(this._loop);
    } else {
      this.rafId = null;
    }
  };

  _getStageRect() {
    // Fit cleanly inside single mobile screen between CTA buttons and bottom HUD
    if (this.isMobile) {
      const stageW = Math.min(this.width * 0.76, 296);
      const stageH = stageW * (4 / 3);
      return {
        x: (this.width - stageW) * 0.5,
        y: Math.max(368, this.height - stageH - 58),
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

  _computeRevealBand(mode, nx, col, phaseProgress) {
    // Organic multi-sine frontier + per-column comb stagger matching io.mp4's interlocking bars
    const wave =
      Math.sin(nx * 8.5 + phaseProgress * 4.2) * 0.032 +
      Math.cos(nx * 16.0 - phaseProgress * 2.6) * 0.014;
    const comb =
      Math.sin(col * 1.85 + phaseProgress * 3.2) * 0.036 +
      Math.cos(col * 3.7) * 0.016;

    const strength = smoothstep(0.14, 0.42, phaseProgress) * (1 - smoothstep(0.76, 0.95, phaseProgress));

    if (mode === 'top-down') {
      const splitY = lerp(0.15, 0.45, strength) + wave + comb;
      return { isBottomRevealed: false, splitY, strength };
    }
    if (mode === 'bottom-up') {
      const splitY = lerp(0.92, 0.56, strength) + wave + comb;
      return { isBottomRevealed: true, splitY, strength };
    }
    if (mode === 'bottom-up-soft') {
      const splitY = lerp(0.92, 0.50, strength) + wave * 1.15 + comb;
      return { isBottomRevealed: true, splitY, strength };
    }
    // diagonal
    const splitY = lerp(0.06, 0.44, strength) + (nx - 0.5) * 0.34 + wave + comb;
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

    // Cross-morph factor from previous scene to current scene during first 22% of cycle
    const morphT = this.reducedMotion ? 1 : smoothstep(0.0, 0.22, phase);

    const cols = this.gridCols;
    const rows = this.gridRows;
    const colStep = rect.w / cols;
    const rowStep = rect.h / rows;
    const barW = Math.max(2.2, colStep * 0.50);

    const mode = this.scenes[this.currentIndex].revealMode;

    // 1. Draw crisp monochrome sculpture inside a single unified comb-staggered clip region
    let avgRevealStrength = 0;
    for (let c = 0; c < cols; c += 1) {
      const nx = (c + 0.5) / cols;
      avgRevealStrength += this._computeRevealBand(mode, nx, c, phase).strength;
    }
    avgRevealStrength /= cols;

    if (avgRevealStrength > 0.02) {
      ctx.save();
      ctx.globalAlpha = clamp(avgRevealStrength * 1.18, 0, 1);
      ctx.beginPath();
      for (let c = 0; c < cols; c += 1) {
        const nx = (c + 0.5) / cols;
        const band = this._computeRevealBand(mode, nx, c, phase);
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

    // 2. Column-walked elongated vertical equalizer rods
    const currGrid = curr.grid;
    const prevGrid = prev.grid;
    const gapPx = Math.max(2.6, rowStep * 0.65);

    for (let c = 0; c < cols; c += 1) {
      const nx = (c + 0.5) / cols;
      const colX = rect.x + c * colStep + (colStep - barW) * 0.5;
      const band = this._computeRevealBand(mode, nx, c, phase);
      const audioBoost = this.ambientAudio ? this.ambientAudio.getColumnBoost(nx) : 0;

      const colDir = c % 2 === 0 ? 1 : -1;
      const colHash = ((c * 37 + 13) % 13) / 13;
      const cascadePx = this.reducedMotion
        ? 0
        : (1 - band.strength) * colDir * Math.sin(timeSec * 2.1 + c * 0.45) * 14;

      // Stagger vertical segment grid per column so breaks never form horizontal stripes
      let r = -Math.floor(colHash * 5);

      while (r < rows) {
        const rMid = clamp(Math.floor(r + 2), 0, rows - 1);
        const midIdx = rMid * cols + c;
        const midLum = lerp(prevGrid[midIdx] || 0, currGrid[midIdx] || 0, morphT);

        // Brighter areas produce longer continuous vertical rods; edges produce crisp shorter bars
        const baseLen = 3 + ((c * 7 + r * 3 + 17) & 3) + Math.round(midLum * 3);
        const segLen = clamp(baseLen, 3, 8);
        const rStart = Math.max(0, r);
        const rEnd = Math.min(rows, r + segLen);
        r += segLen + 1; // 1-row dark break between elongated rods

        if (rEnd <= rStart) continue;

        let sumLum = 0;
        let peakLum = 0;
        const count = rEnd - rStart;
        for (let k = rStart; k < rEnd; k += 1) {
          const idx = k * cols + c;
          const v = lerp(prevGrid[idx] || 0, currGrid[idx] || 0, morphT);
          sumLum += v;
          if (v > peakLum) peakLum = v;
        }

        const transitionPulse = (1 - band.strength) * 0.16;
        const lum = clamp(((sumLum / count) * 0.65 + peakLum * 0.35) * (1 + audioBoost + transitionPulse), 0, 1);
        if (lum < 0.068) continue;

        const nyMid = ((rStart + rEnd) * 0.5) / rows;
        const segTopY = rect.y + rStart * rowStep;
        const segMidY = rect.y + nyMid * rect.h;
        const segH = Math.max(3, (rEnd - rStart) * rowStep - gapPx);

        // Spring-damped pointer wake locally fractures revealed sculpture into dancing rods
        let pointerDisturb = 0;
        if (this.pointer.strength > 0.02) {
          const dist = Math.hypot(colX - this.pointer.x, segMidY - this.pointer.y);
          if (dist < 140) {
            pointerDisturb = (1 - smoothstep(18, 140, dist)) * this.pointer.strength;
          }
        }

        const distFromSplit = band.isBottomRevealed ? band.splitY - nyMid : nyMid - band.splitY;
        const frontierZone = smoothstep(-0.10, 0.055, distFromSplit);
        const barVisibility = clamp(
          Math.max(1 - band.strength, frontierZone, pointerDisturb),
          0,
          1
        );

        if (barVisibility <= 0.04) continue;

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

        const whiteness = clamp(smoothstep(0.44, 0.85, lum) * (1 - edgeFactor * 0.65), 0, 1);
        const rCol = Math.round(lerp(rgb[0], 255, whiteness));
        const gCol = Math.round(lerp(rgb[1], 255, whiteness));
        const bCol = Math.round(lerp(rgb[2], 255, whiteness));

        const alpha = clamp(lum * 1.24 * barVisibility * (0.88 + audioEnergy * 0.28), 0, 1);
        ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha.toFixed(3)})`;
        ctx.fillRect(colX, segTopY + cascadePx, barW, segH);
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

    this.onFrame({
      progress: this.getProgress(),
      energy: audioEnergy,
      transitionIntensity: clamp(1 - avgRevealStrength, 0, 1),
      timeSec,
    });
  }
}
