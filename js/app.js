import { SCENES, FEATURED_WORKS, DOCS_ECOSYSTEM, PILLARS, I18N } from './data.js';
import { TextScramble } from './text-scramble.js';
import { AmbientPulse } from './ambient-audio.js';
import { EqualizerStage } from './equalizer-stage.js';

const state = {
  lang: localStorage.getItem('bbylw_lang') || 'en',
  activeFilter: 'all',
  searchQuery: '',
  paused: false,
  currentScene: 0,
};

const els = {
  header: document.getElementById('site-header'),
  headlineLines: document.querySelectorAll('.headline-line'),
  heroSub: document.getElementById('hero-sub'),
  ctaWorks: document.getElementById('cta-works'),
  ctaDocs: document.getElementById('cta-docs'),
  navLinks: document.querySelectorAll('[data-i18n]'),
  langToggle: document.getElementById('lang-toggle'),
  sceneDots: document.querySelectorAll('.scene-dot'),
  sceneProgress: document.querySelectorAll('.scene-dot-fill'),
  pauseBtn: document.getElementById('pause-btn'),
  audioBtn: document.getElementById('audio-btn'),
  worksList: document.getElementById('works-list'),
  docsList: document.getElementById('docs-list'),
  docsFilters: document.getElementById('docs-filters'),
  docsSearch: document.getElementById('docs-search'),
  docsEmpty: document.getElementById('docs-empty'),
  pillarsGrid: document.getElementById('pillars-grid'),
  aboutStats: document.getElementById('about-stats'),
  stageCanvas: document.getElementById('stage-canvas'),
};

const scrambler = new TextScramble(els.headlineLines);
const ambientAudio = new AmbientPulse();

const stage = new EqualizerStage(els.stageCanvas, SCENES, {
  ambientAudio,
  onSceneChange: (index, immediate) => {
    state.currentScene = index;
    updateSceneHUD(index);
    const lines = SCENES[index].lines[state.lang] || SCENES[index].lines.en;
    if (immediate) {
      scrambler.setImmediate(lines);
    } else {
      scrambler.animateTo(lines, { duration: 900, lang: state.lang });
    }
  },
});

function getNestedI18n(obj, path) {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

function updateSceneHUD(activeIndex) {
  els.sceneDots.forEach((btn, idx) => {
    const active = idx === activeIndex;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function renderI18n() {
  const dict = I18N[state.lang];
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  document.body.dataset.lang = state.lang;

  els.navLinks.forEach((node) => {
    const key = node.dataset.i18n;
    const val = getNestedI18n(dict, key);
    if (typeof val === 'string') {
      node.textContent = val;
    }
  });

  els.docsSearch.placeholder = dict.docs.searchPlaceholder;
  els.langToggle.textContent = state.lang === 'en' ? '中' : 'EN';
  els.langToggle.setAttribute(
    'aria-label',
    state.lang === 'en' ? 'Switch language to Chinese' : 'Switch language to English'
  );

  els.pauseBtn.setAttribute(
    'aria-label',
    state.paused ? dict.hero.playLabel : dict.hero.pauseLabel
  );
  els.audioBtn.setAttribute(
    'aria-label',
    ambientAudio.isActive() ? dict.hero.audioOn : dict.hero.audioOff
  );

  // Update active headline smoothly on language change
  const lines = SCENES[state.currentScene].lines[state.lang];
  scrambler.animateTo(lines, { duration: 700, lang: state.lang });

  renderWorks();
  renderDocsFilters();
  renderDocs();
  renderPillars();
  renderAboutStats();
}

function renderWorks() {
  const dict = I18N[state.lang];
  els.worksList.innerHTML = FEATURED_WORKS.map(
    (item) => `
    <article class="work-row">
      <div class="work-index">${item.index}</div>
      <div class="work-main">
        <div class="work-head">
          <h3 class="work-name">${item.name}</h3>
          <span class="work-badge">${item.badge}</span>
        </div>
        <p class="work-desc">${item.description[state.lang]}</p>
      </div>
      <div class="work-meta">
        <span class="work-stack">${item.stack}</span>
        <div class="work-links">
          <a class="work-link" href="${item.liveUrl}" target="_blank" rel="noopener noreferrer">${dict.works.visit}</a>
          <a class="work-link work-link--muted" href="${item.repoUrl}" target="_blank" rel="noopener noreferrer">${dict.works.source}</a>
        </div>
      </div>
    </article>
  `
  ).join('');
}

function renderDocsFilters() {
  const filters = I18N[state.lang].docs.filters;
  const keys = ['all', 'frameworks', 'ai', 'tooling', 'ui'];
  els.docsFilters.innerHTML = keys
    .map(
      (key) => `
      <button
        type="button"
        class="filter-tab ${state.activeFilter === key ? 'is-active' : ''}"
        data-filter="${key}"
      >${filters[key]}</button>
    `
    )
    .join('');

  els.docsFilters.querySelectorAll('.filter-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeFilter = btn.dataset.filter;
      renderDocsFilters();
      renderDocs();
    });
  });
}

function renderDocs() {
  const q = state.searchQuery.trim().toLowerCase();
  const filtered = DOCS_ECOSYSTEM.filter((doc) => {
    const matchCategory = state.activeFilter === 'all' || doc.category === state.activeFilter;
    if (!matchCategory) return false;
    if (!q) return true;
    const hay = `${doc.name} ${doc.domain} ${doc.description.en} ${doc.description.zh}`.toLowerCase();
    return hay.includes(q);
  });

  if (filtered.length === 0) {
    els.docsList.innerHTML = '';
    els.docsEmpty.hidden = false;
    return;
  }

  els.docsEmpty.hidden = true;
  const catLabels = I18N[state.lang].docs.filters;

  els.docsList.innerHTML = filtered
    .map(
      (doc) => `
    <a class="doc-item" href="${doc.url}" target="_blank" rel="noopener noreferrer">
      <div class="doc-top">
        <span class="doc-name">${doc.name}</span>
        <span class="doc-cat">${catLabels[doc.category] || doc.category}</span>
      </div>
      <div class="doc-domain">${doc.domain}</div>
      <p class="doc-desc">${doc.description[state.lang]}</p>
    </a>
  `
    )
    .join('');
}

function renderPillars() {
  els.pillarsGrid.innerHTML = PILLARS.map(
    (p) => `
    <div class="pillar">
      <div class="pillar-index">${p.index}</div>
      <h3 class="pillar-title">${p.title[state.lang]}</h3>
      <p class="pillar-body">${p.body[state.lang]}</p>
    </div>
  `
  ).join('');
}

function renderAboutStats() {
  const stats = I18N[state.lang].about.stats;
  els.aboutStats.innerHTML = stats
    .map(
      (s) => `
    <div class="stat-cell">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `
    )
    .join('');
}

function bindUIEvents() {
  window.addEventListener(
    'scroll',
    () => {
      els.header.classList.toggle('is-scrolled', window.scrollY > 28);
    },
    { passive: true }
  );

  els.langToggle.addEventListener('click', () => {
    state.lang = state.lang === 'en' ? 'zh' : 'en';
    localStorage.setItem('bbylw_lang', state.lang);
    renderI18n();
  });

  els.sceneDots.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      stage.goToScene(idx);
    });
  });

  els.pauseBtn.addEventListener('click', () => {
    state.paused = !state.paused;
    stage.setPaused(state.paused);
    els.pauseBtn.classList.toggle('is-paused', state.paused);
    const dict = I18N[state.lang];
    els.pauseBtn.setAttribute(
      'aria-label',
      state.paused ? dict.hero.playLabel : dict.hero.pauseLabel
    );
  });

  els.audioBtn.addEventListener('click', async () => {
    const active = await ambientAudio.toggle();
    els.audioBtn.classList.toggle('is-active', active);
    const dict = I18N[state.lang];
    els.audioBtn.setAttribute(
      'aria-label',
      active ? dict.hero.audioOn : dict.hero.audioOff
    );
  });

  els.docsSearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderDocs();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== els.docsSearch) {
      const targetTag = document.activeElement?.tagName;
      if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA') {
        e.preventDefault();
        els.docsSearch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => els.docsSearch.focus(), 220);
      }
    }
  });

  // Update active scene underline fill smoothly
  const updateProgressBar = () => {
    const p = stage.getProgress();
    els.sceneProgress.forEach((bar, idx) => {
      bar.style.transform = idx === state.currentScene ? `scaleX(${p.toFixed(3)})` : 'scaleX(0)';
    });
    requestAnimationFrame(updateProgressBar);
  };
  requestAnimationFrame(updateProgressBar);
}

renderI18n();
bindUIEvents();
stage.init();
