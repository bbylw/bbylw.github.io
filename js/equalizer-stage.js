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

    this.sceneDuration = 6600; // ms per scene cycle for richer figure appreciation
    this.currentIndex = 0;
    this.prevIndex = scenes.length - 1;
    this.sceneElapsed = 1750; // start in rich sculptural reveal on initial load
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

    this.gridCols = 96;
    this.gridRows = 148;

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

    const nextCols = this.isMobile ? 58 : 96;
    const nextRows = this.isMobile ? 92 : 148;
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
    const targetW = 960;
    const targetH = Math.round((img.naturalHeight / img.naturalWidth) * targetW);
    const off = document.createElement('canvas');
    off.width = targetW;
    off.height = targetH;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, 0, 0, targetW, targetH);

    const imageData = octx.getImageData(0, 0, targetW, targetH);
    const data = imageData.data;
    const total = targetW * targetH;

    // Sample outer perimeter to determine dark studio floor luminance
    const sampleCoords = [
      [4, 4], [targetW - 5, 4], [4, targetH - 5], [targetW - 5, targetH - 5],
      [Math.floor(targetW * 0.5), 4], [4, Math.floor(targetH * 0.5)],
      [targetW - 5, Math.floor(targetH * 0.5)],
      [4, Math.floor(targetH * 0.25)], [targetW - 5, Math.floor(targetH * 0.25)],
    ];
    let bgSum = 0;
    for (const [sx, sy] of sampleCoords) {
      const idx = (sy * targetW + sx) * 4;
      bgSum += (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
    }
    const bgLum = clamp(bgSum / sampleCoords.length, 0.02, 0.20);

    const rawLumBuf = new Float32Array(total);
    const filmicBuf = new Float32Array(total);

    for (let i = 0; i < total; i += 1) {
      const p = i * 4;
      const rawLum = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
      rawLumBuf[i] = rawLum;

      // Highlight-safe filmic S-curve preserving porcelain, titanium & marble micro-tonality
      const t = clamp((rawLum - bgLum * 0.7) / Math.max(0.25, 1 - bgLum * 0.7), 0, 1);
      filmicBuf[i] = t < 0.5
        ? 0.5 * Math.pow(2 * t, 1.08)
        : 1 - 0.5 * Math.pow(2 * (1 - t), 1.15);
    }

    // Connected-border BFS flood-fill over dark exterior pixels so dark interior crevices stay 100% solid
    const exterior = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;
    const bgCutoff = bgLum + 0.075;

    const trySeed = (idx) => {
      if (!exterior[idx] && rawLumBuf[idx] <= bgCutoff + 0.015) {
        exterior[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < targetW; x += 1) {
      trySeed(x);
      trySeed((targetH - 1) * targetW + x);
    }
    for (let y = 1; y < targetH - 1; y += 1) {
      trySeed(y * targetW);
      trySeed(y * targetW + (targetW - 1));
    }

    while (head < tail) {
      const cur = queue[head++];
      const cx = cur % targetW;
      const cy = (cur - cx) / targetW;

      if (cx > 0) {
        const n = cur - 1;
        if (!exterior[n] && rawLumBuf[n] <= bgCutoff) {
          exterior[n] = 1;
          queue[tail++] = n;
        }
      }
      if (cx + 1 < targetW) {
        const n = cur + 1;
        if (!exterior[n] && rawLumBuf[n] <= bgCutoff) {
          exterior[n] = 1;
          queue[tail++] = n;
        }
      }
      if (cy > 0) {
        const n = cur - targetW;
        if (!exterior[n] && rawLumBuf[n] <= bgCutoff) {
          exterior[n] = 1;
          queue[tail++] = n;
        }
      }
      if (cy + 1 < targetH) {
        const n = cur + targetW;
        if (!exterior[n] && rawLumBuf[n] <= bgCutoff) {
          exterior[n] = 1;
          queue[tail++] = n;
        }
      }
    }

    // 2-pass silhouette alpha feathering purely along exterior boundary
    let alphaA = new Float32Array(total);
    let alphaB = new Float32Array(total);
    for (let i = 0; i < total; i += 1) {
      alphaA[i] = exterior[i] ? 0 : 1;
    }

    for (let pass = 0; pass < 2; pass += 1) {
      for (let y = 1; y < targetH - 1; y += 1) {
        const rowOffset = y * targetW;
        for (let x = 1; x < targetW - 1; x += 1) {
          const i = rowOffset + x;
          const center = alphaA[i];
          const nSum = alphaA[i - 1] + alphaA[i + 1] + alphaA[i - targetW] + alphaA[i + targetW];
          // Keep solid interior pixels crisp; only feather pixels touching exterior
          if (center === 1 && nSum === 4) {
            alphaB[i] = 1;
          } else if (center === 0 && nSum === 0) {
            alphaB[i] = 0;
          } else {
            alphaB[i] = (center * 2 + nSum) / 6;
          }
        }
      }
      const tmp = alphaA;
      alphaA = alphaB;
      alphaB = tmp;
    }

    // Apply subtle 3x3 micro-contrast sharpen + feathered alpha + soft perimeter fade
    for (let y = 0; y < targetH; y += 1) {
      const ny = y / targetH;
      const edgeTop = smoothstep(0.005, 0.07, ny);
      const edgeBottom = 1 - smoothstep(0.86, 0.996, ny);
      const yUp = Math.max(0, y - 1) * targetW;
      const yCur = y * targetW;
      const yDn = Math.min(targetH - 1, y + 1) * targetW;

      for (let x = 0; x < targetW; x += 1) {
        const nx = x / targetW;
        const i = yCur + x;
        const xL = Math.max(0, x - 1);
        const xR = Math.min(targetW - 1, x + 1);

        const center = filmicBuf[i];
        const blur4 = (filmicBuf[yCur + xL] + filmicBuf[yCur + xR] + filmicBuf[yUp + x] + filmicBuf[yDn + x]) * 0.25;
        const sharpened = clamp(center + 0.28 * (center - blur4), 0, 1);
        const gray = Math.round(sharpened * 255);

        const edgeLeft = smoothstep(0.015, 0.10, nx);
        const edgeRight = 1 - smoothstep(0.90, 0.992, nx);
        const edgeMask = edgeTop * edgeBottom * edgeLeft * edgeRight;

        const p = i * 4;
        data[p] = gray;
        data[p + 1] = gray;
        data[p + 2] = gray;
        data[p + 3] = Math.round(clamp(alphaA[i] * edgeMask, 0, 1) * 255);
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
    // Organic multi-sine frontier + per-column comb stagger; full faces reveal cleanly on Scenes 01, 03, 04
    const wave =
      Math.sin(nx * 8.5 + phaseProgress * 4.2) * 0.028 +
      Math.cos(nx * 16.0 - phaseProgress * 2.6) * 0.012;
    const comb =
      Math.sin(col * 1.85 + phaseProgress * 3.2) * 0.032 +
      Math.cos(col * 3.7) * 0.014;

    const strength = smoothstep(0.11, 0.34, phaseProgress) * (1 - smoothstep(0.78, 0.95, phaseProgress));

    if (mode === 'top-down') {
      const splitY = lerp(0.10, 0.74, strength) + wave + comb;
      return { isBottomRevealed: false, splitY, strength };
    }
    if (mode === 'bottom-up') {
      const splitY = lerp(0.94, 0.44, strength) + wave + comb;
      return { isBottomRevealed: true, splitY, strength };
    }
    if (mode === 'top-down-soft') {
      const splitY = lerp(0.10, 0.69, strength) + (0.5 - nx) * 0.14 + wave * 1.05 + comb;
      return { isBottomRevealed: false, splitY, strength };
    }
    // diagonal
    const splitY = lerp(0.08, 0.60, strength) + (nx - 0.5) * 0.24 + wave + comb;
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
    const morphT = this.reducedMotion ? 1 : smoothstep(0.0, 0.20, phase);

    const cols = this.gridCols;
    const rows = this.gridRows;
    const colStep = rect.w / cols;
    const rowStep = rect.h / rows;
    const barW = Math.max(2.0, colStep * 0.52);

    const mode = this.scenes[this.currentIndex].revealMode;

    // 1. Draw high-resolution monochrome sculpture inside a single unified comb-staggered clip region
    let avgRevealStrength = 0;
    for (let c = 0; c < cols; c += 1) {
      const nx = (c + 0.5) / cols;
      avgRevealStrength += this._computeRevealBand(mode, nx, c, phase).strength;
    }
    avgRevealStrength /= cols;

    if (avgRevealStrength > 0.02) {
      ctx.save();
      ctx.globalAlpha = clamp(avgRevealStrength * 1.2, 0, 1);
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

    // 2. Contour-aware vertical equalizer rods
    const currGrid = curr.grid;
    const prevGrid = prev.grid;
    const gapPx = Math.max(2.2, rowStep * 0.62);

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

      let r = -Math.floor(colHash * 5);

      while (r < rows) {
        const rSample = clamp(Math.floor(r + 1), 0, rows - 2);
        const idxA = rSample * cols + c;
        const idxB = (rSample + 1) * cols + c;
        const lumA = lerp(prevGrid[idxA] || 0, currGrid[idxA] || 0, morphT);
        const lumB = lerp(prevGrid[idxB] || 0, currGrid[idxB] || 0, morphT);
        const localGrad = Math.abs(lumA - lumB);

        // High-detail facial/mechanical ridges use tighter shorter rods (2-4 rows); smooth areas use longer rods (4-7 rows)
        const baseLen = localGrad > 0.14
          ? 2 + ((c * 5 + r * 3) & 1)
          : 3 + ((c * 7 + r * 3 + 17) & 3) + Math.round(lumA * 2);
        const segLen = clamp(baseLen, 2, 7);
        const rStart = Math.max(0, r);
        const rEnd = Math.min(rows, r + segLen);
        r += segLen + 1;

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
        if (lum < 0.065) continue;

        const nyMid = ((rStart + rEnd) * 0.5) / rows;
        const segTopY = rect.y + rStart * rowStep;
        const segMidY = rect.y + nyMid * rect.h;
        const segH = Math.max(2.5, (rEnd - rStart) * rowStep - gapPx);

        let pointerDisturb = 0;
        if (this.pointer.strength > 0.02) {
          const dist = Math.hypot(colX - this.pointer.x, segMidY - this.pointer.y);
          if (dist < 140) {
            pointerDisturb = (1 - smoothstep(18, 140, dist)) * this.pointer.strength;
          }
        }

        const distFromSplit = band.isBottomRevealed ? band.splitY - nyMid : nyMid - band.splitY;
        const frontierZone = smoothstep(-0.035, 0.045, distFromSplit);
        const barVisibility = clamp(
          Math.max(1 - band.strength, frontierZone, pointerDisturb),
          0,
          1
        );

        if (barVisibility <= 0.04) continue;

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

    // 3. Soft left & bottom obsidian fade so headline text sits on clean ground without dimming sculpture
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
