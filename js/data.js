export const SCENES = [
  {
    id: '01',
    image: './assets/scenes/scene-1.png',
    revealMode: 'top-down',
    lines: {
      en: ['BUILD THE', 'FUTURE IN', 'EVERY PULSE'],
      zh: ['构建未来', '跃动于每一帧', '代码脉搏'],
    },
    caption: {
      en: 'Signal & Interface',
      zh: '信号与交互界面',
    },
  },
  {
    id: '02',
    image: './assets/scenes/scene-2.png',
    revealMode: 'bottom-up',
    lines: {
      en: ['BEFORE CODE', 'THERE WAS', 'RHYTHM'],
      zh: ['代码之前', '先有秩序与', '结构律动'],
    },
    caption: {
      en: 'Architecture & Motion',
      zh: '架构与动态韵律',
    },
  },
  {
    id: '03',
    image: './assets/scenes/scene-3.png',
    revealMode: 'bottom-up-soft',
    lines: {
      en: ['OPEN DOCS', 'BUILT FOR', 'EVERY MIND'],
      zh: ['开源文档', '连接每一位', '中文开发者'],
    },
    caption: {
      en: 'Open Knowledge',
      zh: '开源中文生态',
    },
  },
  {
    id: '04',
    image: './assets/scenes/scene-4.png',
    revealMode: 'diagonal',
    lines: {
      en: ['WHERE WEB', 'TURNS INTO', 'HARMONY'],
      zh: ['当现代网络', '化作秩序与', '视觉和声'],
    },
    caption: {
      en: 'Craft & Systems',
      zh: '工程与系统美学',
    },
  },
];

export const FEATURED_WORKS = [
  {
    index: '01',
    name: 'hyperframes-cn',
    badge: '31 ★',
    stack: 'TypeScript · Video Engine',
    liveUrl: 'https://hyperframes.ndjp.net/',
    repoUrl: 'https://github.com/bbylw/hyperframes-cn',
    description: {
      en: 'Chinese documentation & ecosystem portal for HyperFrames — turning HTML, CSS, and seekable motion into deterministic MP4 video.',
      zh: 'HyperFrames 中文文档与生态门户：将 HTML、CSS、媒体与可定位动画转化为确定性 MP4 视频的开源框架。',
    },
  },
  {
    index: '02',
    name: 'kvp',
    badge: '14 ★',
    stack: 'Cloudflare · JavaScript',
    liveUrl: 'https://github.com/bbylw/kvp',
    repoUrl: 'https://github.com/bbylw/kvp',
    description: {
      en: 'Ultra-fast personal navigation hub backed by Cloudflare KV storage with zero cold-start latency at the edge.',
      zh: '基于 Cloudflare KV 边缘存储构建的高速个人导航主页，零冷启动延迟，轻量可靠。',
    },
  },
  {
    index: '03',
    name: 'psvelte',
    badge: 'Svelte 5',
    stack: 'SvelteKit 2 · Dark UI',
    liveUrl: 'https://psvelte.ndjp.net/',
    repoUrl: 'https://github.com/bbylw/psvelte',
    description: {
      en: 'Modernized dark-accent WebNav Hub rebuilt with Svelte 5 and SvelteKit 2 featuring instantaneous client-side search filtering.',
      zh: '采用 Svelte 5 与 SvelteKit 2 现代化重构的暗黑风格书签导航站，支持毫秒级实时搜索过滤。',
    },
  },
  {
    index: '04',
    name: 'portless-cn',
    badge: 'Local Dev',
    stack: 'TypeScript · TLS Proxy',
    liveUrl: 'https://portless.ndjp.net/',
    repoUrl: 'https://github.com/bbylw/portless-cn',
    description: {
      en: 'Chinese guide for Portless — replacing fragile raw port numbers with stable, named HTTPS .localhost domains for humans and agents.',
      zh: 'Portless 中文文档：用稳定、具名的 HTTPS .localhost 域名取代零散端口号，为人与智能体协作而生。',
    },
  },
  {
    index: '05',
    name: 'astryx-cn',
    badge: 'Design System',
    stack: 'TypeScript · Tokens',
    liveUrl: 'https://astryx.ndjp.net/',
    repoUrl: 'https://github.com/bbylw/astryx-cn',
    description: {
      en: 'Chinese documentation for Astryx, a customizable open-source design system built for humans and coding agents working side by side.',
      zh: 'Astryx 开源设计系统中文站：完全可定制，面向人类与编程智能体协同构建的现代界面规范。',
    },
  },
  {
    index: '06',
    name: 'a2ui-cn',
    badge: 'Agent UI',
    stack: 'TypeScript · Protocol',
    liveUrl: 'https://a2ui.ndjp.net/',
    repoUrl: 'https://github.com/bbylw/a2ui-cn',
    description: {
      en: 'Chinese portal for Agent-to-User Interface (A2UI) — low-latency streaming protocol enabling agents to speak in native interactive UI.',
      zh: 'A2UI（Agent-to-User Interface）中文文档：低延迟流式动态界面协议，让智能体以原生组件与用户交互。',
    },
  },
];

export const DOCS_ECOSYSTEM = [
  {
    domain: 'tsrs.ndjp.net',
    url: 'https://tsrs.ndjp.net/',
    name: 'TSRS',
    category: 'tooling',
    description: {
      en: 'Rust-written drop-in replacement for the TypeScript 7 compiler and language service.',
      zh: 'Rust 编写的 TypeScript 7 编译器与语言服务替代实现，极速且低内存。',
    },
  },
  {
    domain: 'viteplus.ndjp.net',
    url: 'https://viteplus.ndjp.net/',
    name: 'Vite+',
    category: 'tooling',
    description: {
      en: 'Unified web toolchain integrating runtime, package management, build, test, and monorepo cache.',
      zh: '面向 Web 的统一工具链，集运行时、包管理、检查、测试与构建缓存于一体。',
    },
  },
  {
    domain: 'hyperframes.ndjp.net',
    url: 'https://hyperframes.ndjp.net/',
    name: 'HyperFrames',
    category: 'ui',
    description: {
      en: 'Open-source framework compiling HTML, CSS, and seekable animations into deterministic MP4 video.',
      zh: '将 HTML、CSS 与可定位动画渲染为确定性 MP4 视频的开源创作框架。',
    },
  },
  {
    domain: 'sveltekit.ndjp.net',
    url: 'https://sveltekit.ndjp.net/',
    name: 'SvelteKit',
    category: 'frameworks',
    description: {
      en: 'High-performance full-stack web application framework built on Svelte.',
      zh: '基于 Svelte 构建的健壮、高性能全栈 Web 应用开发框架。',
    },
  },
  {
    domain: 'nuxt.ndjp.net',
    url: 'https://nuxt.ndjp.net/',
    name: 'Nuxt',
    category: 'frameworks',
    description: {
      en: 'Intuitive, extensible Vue.js framework for type-safe production full-stack applications.',
      zh: '借助 Vue.js 以直观且可扩展的方式打造类型安全的生产级全栈应用。',
    },
  },
  {
    domain: 'drizzle.ndjp.net',
    url: 'https://drizzle.ndjp.net/',
    name: 'Drizzle ORM',
    category: 'tooling',
    description: {
      en: 'Zero-dependency, tree-shakeable TypeScript ORM weighing ~7.4kb minified and gzipped.',
      zh: '轻量级现代 TypeScript ORM，零依赖、支持 Tree Shaking。',
    },
  },
  {
    domain: 'heroui.ndjp.net',
    url: 'https://heroui.ndjp.net/',
    name: 'HeroUI',
    category: 'ui',
    description: {
      en: 'Production-ready React component library combining React Aria accessibility with Tailwind CSS v4.',
      zh: '结合 React Aria 无障碍严谨性与 Tailwind CSS v4 的复合组件库。',
    },
  },
  {
    domain: 'a2ui.ndjp.net',
    url: 'https://a2ui.ndjp.net/',
    name: 'A2UI',
    category: 'ai',
    description: {
      en: 'Generative UI protocol and native renderers optimized for low-latency agentic streaming.',
      zh: '面向低延迟流式传输动态界面的开源生成式 UI 协议与渲染器。',
    },
  },
  {
    domain: 'ui-sdk.ndjp.net',
    url: 'https://ui-sdk.ndjp.net/',
    name: 'Vercel UI SDK',
    category: 'ai',
    description: {
      en: 'Agent-ready behavioral primitives for keyboard navigation, focus, overlays, and WebMCP.',
      zh: '面向智能体的交互行为库，封装键盘导航、焦点管理与跨框架适配器。',
    },
  },
  {
    domain: 'astryx.ndjp.net',
    url: 'https://astryx.ndjp.net/',
    name: 'Astryx',
    category: 'ui',
    description: {
      en: 'Open-source customizable design system crafted for human and agent co-authoring.',
      zh: '完全可定制的开源设计系统，为人与智能体并肩构建界面而生。',
    },
  },
  {
    domain: 'portless.ndjp.net',
    url: 'https://portless.ndjp.net/',
    name: 'Portless',
    category: 'tooling',
    description: {
      en: 'Named HTTPS .localhost routing replacing ephemeral local port numbers.',
      zh: '以稳定具名的 .localhost HTTPS 域名取代传统本地端口号。',
    },
  },
  {
    domain: 'pixi3d.ndjp.net',
    url: 'https://pixi3d.ndjp.net/',
    name: 'PixiJS 3D',
    category: 'ui',
    description: {
      en: 'Seamless 2D and 3D rendering unified inside the PixiJS WebGL ecosystem.',
      zh: '以 PixiJS 的优雅方式在同一画布中无缝融合 2D 与 3D 渲染。',
    },
  },
  {
    domain: 'puppeteer.ndjp.net',
    url: 'https://puppeteer.ndjp.net/',
    name: 'Puppeteer',
    category: 'tooling',
    description: {
      en: 'High-level browser automation API over DevTools Protocol and WebDriver BiDi.',
      zh: '基于 DevTools Protocol 与 WebDriver BiDi 的高级无头浏览器控制库。',
    },
  },
  {
    domain: 'docling.ndjp.net',
    url: 'https://docling.ndjp.net/',
    name: 'Docling',
    category: 'ai',
    description: {
      en: 'Deep document parsing across PDF and rich formats built for generative AI pipelines.',
      zh: '深度解析 PDF 与多格式文档，无缝接入生成式 AI 数据流水线。',
    },
  },
  {
    domain: 'astrowind.ndjp.net',
    url: 'https://astrowind.ndjp.net/',
    name: 'AstroWind',
    category: 'frameworks',
    description: {
      en: 'Modern web starter built with Astro v7 and Tailwind CSS v4 following web best practices.',
      zh: '基于 Astro v7 与 Tailwind CSS v4 构建的现代化高性能网站模板。',
    },
  },
  {
    domain: 'w404.nyc.mn/playwright-cli-cn/',
    url: 'https://w404.nyc.mn/playwright-cli-cn/',
    name: 'Playwright CLI',
    category: 'ai',
    description: {
      en: 'Skill-enabled Playwright CLI for deterministic agentic browser workflows.',
      zh: '具备 Agent Skills 扩展能力的 Playwright 命令行自动化工具中文版。',
    },
  },
];

export const PILLARS = [
  {
    index: '01',
    title: {
      en: 'Open-Source Localization',
      zh: '前沿开源技术中文化',
    },
    body: {
      en: 'Translating fast-moving compilers, frameworks, and runtime docs into crisp, readable Chinese mirrors so developers adopt new tools without friction.',
      zh: '持续将前沿编译器、全栈框架与开发工具链翻译并维护为结构清晰的中文文档站，消除语言与信息同步门槛。',
    },
  },
  {
    index: '02',
    title: {
      en: 'Agentic & Generative UI',
      zh: '智能体与生成式界面',
    },
    body: {
      en: 'Exploring interfaces where AI models and deterministic web runtimes meet — from A2UI streaming protocols and WebMCP behaviors to programmatic video.',
      zh: '聚焦智能体驱动的下一代界面范式，涵盖 A2UI 流式协议、无障碍行为原语与 HTML 确定性视频渲染。',
    },
  },
  {
    index: '03',
    title: {
      en: 'Edge & Tooling Craft',
      zh: '边缘计算与工程工具',
    },
    body: {
      en: 'Building lightweight navigation hubs, Cloudflare KV micro-apps, and zero-bloat static deployments with obsessive attention to speed and clarity.',
      zh: '打磨基于 Cloudflare KV、SvelteKit 与极简静态架构的轻量工具，追求零冗余的加载速度与秩序感。',
    },
  },
];

export const I18N = {
  en: {
    nav: {
      works: 'Works',
      docs: 'Docs',
      labs: 'Focus',
      about: 'About',
      cta: 'GitHub',
    },
    hero: {
      sub: 'Independent builder & open-source curator crafting modern web interfaces, agentic UI docs, and developer tools at w404.nyc.mn.',
      ctaPrimary: 'Explore Works',
      ctaSecondary: 'Docs Hub',
      pauseLabel: 'Pause motion',
      playLabel: 'Resume motion',
      audioOn: 'Mute ambient pulse',
      audioOff: 'Enable ambient pulse',
    },
    works: {
      eyebrow: 'Selected Repositories',
      title: 'Open-source projects & edge tools.',
      lead: 'Curated repositories maintained under @bbylw — spanning deterministic video engines, Cloudflare KV utilities, and modern UI kits.',
      visit: 'Live Site',
      source: 'Source',
    },
    docs: {
      eyebrow: 'Chinese Documentation Network',
      title: '16 live portals for modern web & AI stacks.',
      lead: 'Continuously synced Chinese documentation sites hosted across ndjp.net and w404.nyc.mn.',
      searchPlaceholder: 'Filter portals...',
      empty: 'No documentation portals matched your filter.',
      filters: {
        all: 'All (16)',
        frameworks: 'Frameworks',
        ai: 'AI & Agents',
        tooling: 'Tooling',
        ui: 'UI & Motion',
      },
    },
    labs: {
      eyebrow: 'Engineering Focus',
      title: 'Signal over noise.',
    },
    about: {
      eyebrow: 'Profile · @bbylw',
      title: 'Building at the intersection of web craft, Chinese developer docs, and AI interfaces.',
      bio: 'Active on GitHub since 2017 as "free" (@bbylw). Maintaining 445+ public repositories, 16+ live Chinese technical documentation portals, and lightweight edge deployments under w404.nyc.mn.',
      stats: [
        { value: '2017', label: 'GitHub Member Since' },
        { value: '445+', label: 'Public Repositories' },
        { value: '16+', label: 'Live CN Docs Portals' },
        { value: 'w404.nyc.mn', label: 'Primary Domain' },
      ],
      githubBtn: 'View @bbylw on GitHub',
      wnBtn: 'Open WebNav',
    },
    footer: {
      tagline: 'w404.nyc.mn · GitHub Pages',
      top: 'Back to top',
    },
  },
  zh: {
    nav: {
      works: '精选项目',
      docs: '文档矩阵',
      labs: '关注方向',
      about: '关于我',
      cta: 'GitHub',
    },
    hero: {
      sub: '独立构建者与开源文档维护者，专注于现代 Web 交互界面、智能体生成式 UI 与开发者工具生态 · w404.nyc.mn。',
      ctaPrimary: '浏览作品',
      ctaSecondary: '中文文档站',
      pauseLabel: '暂停动画',
      playLabel: '恢复动画',
      audioOn: '关闭律动声效',
      audioOff: '开启律动声效',
    },
    works: {
      eyebrow: '精选开源仓库',
      title: '开源项目与边缘轻量工具。',
      lead: '由 @bbylw 维护的代表性项目，覆盖确定性视频渲染引擎、Cloudflare KV 边缘工具与现代前端生态。',
      visit: '访问站点',
      source: '源码仓库',
    },
    docs: {
      eyebrow: '中文文档镜像矩阵',
      title: '16 个持续同步的现代 Web 与 AI 文档站。',
      lead: '部署于 ndjp.net 与 w404.nyc.mn 的精选技术文档中文站，助力一线开发者高效检索与实践。',
      searchPlaceholder: '搜索文档站...',
      empty: '没有找到匹配的文档站点。',
      filters: {
        all: '全部 (16)',
        frameworks: '全栈框架',
        ai: 'AI 与智能体',
        tooling: '工具链',
        ui: 'UI 与动效',
      },
    },
    labs: {
      eyebrow: '技术探索方向',
      title: '让复杂系统回归清晰律动。',
    },
    about: {
      eyebrow: '个人档案 · @bbylw',
      title: '在 Web 工程美学、中文技术文档与智能体交互之间持续构建。',
      bio: '自 2017 年起活跃于 GitHub（昵称 free / @bbylw），累计维护 445+ 开源仓库与 16+ 前沿技术中文文档门户，并持续运营 w404.nyc.mn 个人站点与导航实验项目。',
      stats: [
        { value: '2017', label: '加入 GitHub' },
        { value: '445+', label: '公开开源仓库' },
        { value: '16+', label: '在线中文文档站' },
        { value: 'w404.nyc.mn', label: '个人主域名' },
      ],
      githubBtn: '前往 GitHub 主页',
      wnBtn: '访问 WebNav',
    },
    footer: {
      tagline: 'w404.nyc.mn · 由 GitHub Pages 驱动',
      top: '返回顶部',
    },
  },
};
