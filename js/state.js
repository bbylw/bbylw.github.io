/* ================================================================
   Shared state & data — chip definitions, sim state, scene refs
================================================================ */



export const COLORS = {
    gold: 0xe8c47c,
    copper: 0xb87333,
    nickel: 0xb9bec4,
    substrate: 0x1a1512,
    socketPl: 0x232127,
    pcbDark: 0x10140f,
    boardBlack: 0x0b0b0e,
    hbm: 0x131316
};

export const MODELS = {
    cpu: {
        key: 'cpu',
        label: 'X1-C',
        brandModel: 'X1-C · CPU Module',
        title: 'Neural Chip<br>X1-C · AI Processor',
        subtitle: 'Socketed neural CPU — 96 AI cores with 192 MB on-die cache, cooled by a 4-pipe tower with 120 mm PWM fan. 5 nm FinFET.',
        specs: [
            ['Process', 'TSMC 5nm FinFET'],
            ['Transistors', '48.6B'],
            ['AI Cores', '96'],
            ['L2 Cache', '192 MB'],
            ['Peak INT8', '512 TOPS'],
            ['TDP', '250 W']
        ],
        teleRows: [
            { name: 'AI Cores',   kind: 'core', fmt: (v) => Math.round(v * 100) + '%' },
            { name: 'Memory Bus', kind: 'mem',  fmt: (v) => Math.round(v * 100) + '%' },
            { name: 'Power',      kind: 'pwr',  fmt: (v, s) => Math.round(v * s.maxW) + ' W' }
        ],
        workloads: [
            { n: 'LLM inference · Qwen2.5-14B',  u: .58, m: .55, d: 10000 },
            { n: 'Batch inference · YOLO v8',    u: .66, m: .48, d: 8000  },
            { n: 'Fine-tune · LoRA step',        u: .9,  m: .72, d: 12000 },
            { n: 'RAG · vector embedding',       u: .5,  m: .7,  d: 7000  },
            { n: 'Idle · low-power state',       u: .05, m: .12, d: 6000  }
        ],
        idleW: 30, maxW: 250, maxTops: 512,
        idleT: 45, loadT: 82, throttleT: 95,
        fanLabel: 'Fan',
        /* lumped thermal network — die / IHS / fin nodes
           k*: conductance W/K · c*: heat capacity J/K · kFan scales with fan 0..1
           pl2: transient power-envelope multiplier (Turbo / power virus) */
        thermal: { kDie: 35, kPlate: 30, kNat: .6, kFan: 5.2, cDie: 35, cPlate: 180, cFin: 700, pl2: 1.38, minFan: .12, amb: 26, turbo: 12, turboRec: 26 },
        explode: { pcb: 0, socket: .7, pkg: 2.3, ihs: 4.2, cooler: 5.8 },
        haloR: 6.7, coreY: 1.6
    },
    accel: {
        key: 'accel',
        label: 'X1-A',
        brandModel: 'X1-A · AI Accelerator',
        title: 'Neural Chip<br>X1-A · AI Accelerator',
        subtitle: '82.3B-transistor compute die flanked by six HBM3e stacks on a 2.5D interposer. Passive cold-plate cooling. 5 nm FinFET.',
        specs: [
            ['Process', 'TSMC 5nm FinFET'],
            ['Transistors', '82.3B'],
            ['Compute Die', '~800 mm²'],
            ['HBM3e', '192 GB · 6 stacks'],
            ['Bandwidth', '7.2 TB/s'],
            ['Peak INT8', '4096 TOPS'],
            ['TDP', '700 W']
        ],
        teleRows: [
            { name: 'Compute Units', kind: 'core', fmt: (v) => Math.round(v * 100) + '%' },
            { name: 'HBM Bandwidth', kind: 'mem',  fmt: (v) => Math.round(v * 100) + '%' },
            { name: 'Power',         kind: 'pwr',  fmt: (v, s) => Math.round(v * s.maxW) + ' W' }
        ],
        workloads: [
            { n: 'LLM serving · 70B · batch 32',  u: .74, m: .8,  d: 11000 },
            { n: 'Distributed train · AllReduce', u: .96, m: .88, d: 14000 },
            { n: 'Embedding · corpus ingest',     u: .55, m: .6,  d: 8000  },
            { n: 'GenAI · diffusion upscale',     u: .82, m: .62, d: 9000  },
            { n: 'Idle · HBM self-refresh',       u: .05, m: .15, d: 7000  }
        ],
        idleW: 110, maxW: 700, maxTops: 4096,
        idleT: 50, loadT: 86, throttleT: 97,
        fanLabel: 'Air',
        thermal: { kDie: 80, kPlate: 60, kNat: 1.0, kFan: 15.5, cDie: 55, cPlate: 320, cFin: 1400, pl2: 1.4, minFan: .15, amb: 26, turbo: 10, turboRec: 30 },
        explode: { carrier: 0, module: 2.4, cooler: 4.8 },
        haloR: 7.4, coreY: 2.6
    }
};
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const state = {
    style: 'cpu',
    autoRotate: !reduceMotion,
    exploded: false,
    showData: true,
    wireframe: false,
    stress: false,
    hovered: null
};

export const models = {};
export const sim = {
    u: 0.0, uTarget: 0.0, power: 0, temp: 30, fan: 0, throttle: false,
    spikeAt: 0, spikeDur: 0, wlIndex: 0, wlUntil: 0, stressT: 0, mem: 0, bw: 0, wl: null,
    turbo: 1      // PL2 turbo budget, 1 = full, drains to 0 and slowly regenerates
};

export let bootDone = false;
export let backend = 'webgl';   // 'webgl' | 'webgpu' — set once the renderer is created

export let scene, camera, renderer, controls, clock;
export let coreLight = null;
export let haloPoints = null, fluxPoints = null;
export let dustPoints = null, airPoints = null, airAnchor = null;
export let bboxLines = null;
export let cameraHome = null, cameraTargetHome = null;

export const tipEl = document.getElementById('hover-tip');
export const tipName = document.getElementById('tip-name');
export const tipSpec = document.getElementById('tip-spec');
export const $ = (id) => document.getElementById(id);

export let introAt = null;   // camera intro ease trigger (set by boot, read by main loop)

export function setClock(v) { clock = v; }
export function setScene(v) { scene = v; }
export function setCamera(v) { camera = v; }
export function setCameraHome(v) { cameraHome = v; }
export function setCameraTargetHome(v) { cameraTargetHome = v; }
export function setRenderer(v) { renderer = v; }
export function setControls(v) { controls = v; }
export function setCoreLight(v) { coreLight = v; }
export function setHaloPoints(v) { haloPoints = v; }
export function setFluxPoints(v) { fluxPoints = v; }
export function setDustPoints(v) { dustPoints = v; }
export function setAirPoints(v) { airPoints = v; }
export function setAirAnchor(v) { airAnchor = v; }
export function setBboxLines(v) { bboxLines = v; }
export function markBootDone() { bootDone = true; }
export function setBackend(v) { backend = v; }
export function setIntroAt(v) { introAt = v; }

