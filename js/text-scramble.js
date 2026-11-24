const LATIN_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MIXED_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class TextScramble {
  constructor(lineElements) {
    this.lines = Array.from(lineElements);
    this.rafId = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  setImmediate(linesText) {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lines.forEach((el, idx) => {
      el.textContent = linesText[idx] ?? '';
      el.style.opacity = '1';
    });
  }

  animateTo(linesText, { duration = 900, lang = 'en' } = {}) {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.reducedMotion) {
      this.lines.forEach((el, idx) => {
        el.style.opacity = '0.35';
        requestAnimationFrame(() => {
          el.textContent = linesText[idx] ?? '';
          el.style.opacity = '1';
        });
      });
      return;
    }

    const fromLines = this.lines.map((el) => el.textContent || '');
    const toLines = this.lines.map((_, idx) => linesText[idx] ?? '');

    const items = [];
    let globalCharIndex = 0;

    toLines.forEach((target, lineIdx) => {
      const from = fromLines[lineIdx] || '';
      const maxLen = Math.max(from.length, target.length);
      const lineItems = [];

      for (let i = 0; i < maxLen; i += 1) {
        const fromChar = from[i] || '';
        const toChar = target[i] || '';
        const start = Math.floor((globalCharIndex * 0.55) + Math.random() * 10);
        const end = start + 10 + Math.floor(Math.random() * 14);
        lineItems.push({ fromChar, toChar, start, end, char: fromChar });
        globalCharIndex += 1;
      }

      items.push(lineItems);
    });

    const totalFrames = Math.max(36, Math.round((duration / 1000) * 60));
    const maxEnd = items.reduce(
      (acc, line) => Math.max(acc, ...line.map((q) => q.end)),
      totalFrames
    );

    const startTime = performance.now();
    const glyphSet = lang === 'zh' ? MIXED_GLYPHS : LATIN_GLYPHS;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const frame = progress * maxEnd;
      let completedLines = 0;

      items.forEach((lineItems, lineIdx) => {
        let out = '';
        let doneCount = 0;

        for (let i = 0; i < lineItems.length; i += 1) {
          const item = lineItems[i];
          if (frame >= item.end) {
            doneCount += 1;
            out += item.toChar;
          } else if (frame >= item.start) {
            if (!item.toChar || item.toChar === ' ') {
              out += item.toChar;
            } else if (/[\u4e00-\u9fff]/.test(item.toChar) && Math.random() < 0.35) {
              out += item.toChar;
            } else if (Math.random() < 0.34 || !item.char) {
              item.char = glyphSet[Math.floor(Math.random() * glyphSet.length)];
              out += item.char;
            } else {
              out += item.char;
            }
          } else {
            out += item.fromChar;
          }
        }

        this.lines[lineIdx].textContent = out;
        if (doneCount === lineItems.length) {
          completedLines += 1;
        }
      });

      if (progress < 1 && completedLines < items.length) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.lines.forEach((el, idx) => {
          el.textContent = toLines[idx];
        });
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }
}
