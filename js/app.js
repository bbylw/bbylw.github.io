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
  heroInView: true,
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const els = {
  header: document.getElementById('site-header'),
  hero: document.querySelector('.hero'),
  headlineLines: document.querySelectorAll('.headline-line'),
  headlineBars: document.querySelectorAll('.hero-headline .eq-bars span'),
  navLinks: document.querySelectorAll('.nav-capsule .nav-link'),
  i18nNodes: document.querySelectorAll('[data-i18n]'),
  langToggle: document.getElementById('lang-toggle'),
  sceneDots: document.querySelectorAll('.scene-dot'),
  sceneProgress: document.querySelectorAll('.scene-dot-fill'),
  pauseBtn: document.getElementById('pause-btn'),
  audioBtn: document.getElementById('audio-btn'),
  worksList: document.getElementById('works-list'),
  docsList: document.getElementById('docs-list'),
  docsFilters: document.getElementById('docs-filters'),
  docsCount: document.getElementById('docs-count'),
  searchBox: document.querySelector('.search-box'),
  docsSearch: document.getElementById('docs-search'),
  searchClear: document.getElementById('search-clear'),
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
  onFrame: ({ progress, energy, transitionIntensity, timeSec }) => {
    els.sceneProgress.forEach((bar, idx) => {
      bar.style.transform = idx === state.currentScene ? `scaleX(${progress.toFixed(3)})` : 'scaleX(0)';
    });

    if (reducedMotion) return;

    const activity = Math.max(transitionIntensity * 0.55, energy * 1.4);
    els.headlineBars.forEach((bar, idx) => {
      if (activity <= 0.03) {
        bar.style.transform = 'scaleY(1)';
      } else {
        const wave = 0.72 + Math.abs(Math.sin(timeSec * 6.4 + idx * 0.9)) * 0.52 * Math.min(1, activity);
        bar.style.transform = `scaleY(${wave.toFixed(3)})`;
      }
    });
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

function updateSearchUI() {
  const hasVal = state.searchQuery.length > 0;
  els.searchBox.classList.toggle('has-value', hasVal);
  els.searchClear.hidden = !hasVal;
}

function renderI18n() {
  const dict = I18N[state.lang];
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  document.body.dataset.lang = state.lang;

  els.i18nNodes.forEach((node) => {
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

  els.docsCount.textContent = `${filtered.length} / ${DOCS_ECOSYSTEM.length}`;

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
        <span class="doc-top-right">
          <span class="doc-cat">${catLabels[doc.category] || doc.category}</span>
          <span class="doc-arrow" aria-hidden="true">&#8599;</span>
        </span>
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

function setActiveNav(id) {
  els.navLinks.forEach((link) => {
    const match = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', match);
  });
}

function initObservers() {
  if (!('IntersectionObserver' in window)) return;

  const heroObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      state.heroInView = entry.isIntersecting;
      stage.setVisible(entry.isIntersecting);
      if (entry.isIntersecting && window.scrollY < 260) {
        setActiveNav('');
      }
    },
    { threshold: 0.05 }
  );
  heroObserver.observe(els.hero);

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      if (window.scrollY < 260) {
        setActiveNav('');
        return;
      }
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveNav(entry.target.id);
        }
      });
    },
    { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
  );

  ['works', 'docs', 'labs', 'about'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
}

function bindUIEvents() {
  window.addEventListener(
    'scroll',
    () => {
      els.header.classList.toggle('is-scrolled', window.scrollY > 28);
      if (window.scrollY < 260) {
        setActiveNav('');
      }
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
    updateSearchUI();
    renderDocs();
  });

  els.searchClear.addEventListener('click', () => {
    state.searchQuery = '';
    els.docsSearch.value = '';
    updateSearchUI();
    renderDocs();
    els.docsSearch.focus();
  });

  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (e.key === 'Escape' && activeEl === els.docsSearch) {
      if (state.searchQuery) {
        state.searchQuery = '';
        els.docsSearch.value = '';
        updateSearchUI();
        renderDocs();
      } else {
        els.docsSearch.blur();
      }
      return;
    }

    if (isEditing) return;

    if (e.key === '/') {
      e.preventDefault();
      els.docsSearch.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => els.docsSearch.focus(), reducedMotion ? 0 : 220);
      return;
    }

    if (state.heroInView && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      stage.goToScene(state.currentScene + delta);
    }
  });
}

renderI18n();
updateSearchUI();
bindUIEvents();
initObservers();
stage.init();
