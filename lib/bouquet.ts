// Port of the terminal ASCII bouquet. Pure functions: buildScene() once, render() per frame -> HTML string.

export const SPIN_SPEED = 0.6;
export const TILT = 0.5;
export const CAM_DIST = 4.0;
export const MESSAGE = "Advent Calendar Day 18 ♥";
export const HINT = ""; // set to "" to remove
export const NUM_HEARTS = 18;

type Pal = number[];
const WHITE = [244, 248, 251, 254, 255, 231];
const PINK = [125, 162, 168, 205, 211, 218, 225];
const RED = [52, 88, 124, 160, 196, 203];
const PURPLE = [54, 91, 97, 134, 140, 183];
const YELLOW = [136, 178, 214, 220, 226, 229];
const ORANGE = [130, 166, 202, 208, 214, 216];
const GOLD_CENTER = [94, 136, 178, 214, 220];
const DARK_CENTER = [52, 58, 94, 130, 136];
const GREENS = [22, 28, 28, 34, 35, 71, 77, 114];
const PAPER = [101, 144, 187, 223, 230, 231];
const RIBBON = [88, 125, 161, 197, 204, 211];
const HEART_COLORS = [161, 197, 204, 205, 211, 218];
const MSG_COLORS = [161, 168, 205, 211, 218, 225, 218, 211, 205, 168];
const SHADE = ".:-=+*%@";
const PETAL_SHADE = "+*#%";
const PIVOT_Y = 0.2;

const _n = Math.hypot(-0.45, 0.6, 0.66);
const [LX, LY, LZ] = [-0.45 / _n, 0.6 / _n, 0.66 / _n];

const DISC_TYPES: [Pal, Pal, number][] = [
  [WHITE, GOLD_CENTER, 13], [PINK, GOLD_CENTER, 8], [RED, DARK_CENTER, 6],
  [PURPLE, GOLD_CENTER, 7], [YELLOW, DARK_CENTER, 12], [ORANGE, DARK_CENTER, 9],
];
const TULIP_COLORS = [RED, PINK, YELLOW, ORANGE, WHITE, PURPLE];

type V3 = [number, number, number];
// x,y,z, nx,ny,nz, palette, tone, twoSided, override char
export type Pt = [number, number, number, number, number, number, Pal, number, boolean, string | null];
export type Flower = { pos: V3; kind: "disc" | "tulip"; pal: Pal; cpal: Pal | null; nPet: number; R: number; seed: number };
export type Scene = {
  pts: Pt[]; flowers: Flower[];
  babies: [number, number, number, number][];
  sparkles: [number, number, number, number, number][];
};
export type Heart = [number, number, number, number, number]; // x, y, speed, phase, color

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const norm = (v: V3): V3 => { const m = Math.hypot(...v) || 1; return [v[0] / m, v[1] / m, v[2] / m]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (p: V3, d: V3, k: number): V3 => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];

export function buildScene(): Scene {
  const rand = mulberry32(21);
  const uni = (a: number, b: number) => a + (b - a) * rand();
  const pts: Pt[] = [];
  const P = (x: number, y: number, z: number, nx: number, ny: number, nz: number, pal: Pal, tone: number, two: boolean, ov: string | null = null) =>
    pts.push([x, y, z, nx, ny, nz, pal, tone, two, ov]);

  const neck: V3 = [0, -0.12, 0];
  const C: V3 = [0, 0.12, 0], D = 0.64, N = 10;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const heads: [V3, V3][] = [];
  for (let i = 0; i < N; i++) {
    const el = ((88 - 60 * Math.sqrt(i / (N - 1))) * Math.PI) / 180;
    const az = i * golden;
    const d: V3 = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
    heads.push([add(C, d, D * uni(0.92, 1.05)), norm(d)]);
  }

  const tulipSlots = Array.from({ length: N }, (_, i) => i);
  const flowers: Flower[] = [];
  let discI = 0;
  heads.forEach(([pos, axis], idx) => {
    const base = add(pos, axis, -0.03);
    for (let j = 0; j < 70; j++) {
      const t = j / 69;
      P(base[0] + (neck[0] - base[0]) * t, base[1] + (neck[1] - base[1]) * t, base[2] + (neck[2] - base[2]) * t,
        axis[0], 0, axis[2], GREENS, -0.15, true);
    }
    if (tulipSlots.includes(idx)) {
      const nT = tulipSlots.filter((k) => k < idx).length;
      flowers.push({ pos, kind: "tulip", pal: TULIP_COLORS[nT % TULIP_COLORS.length], cpal: null, nPet: 0, R: 0.11, seed: uni(0, 6.28) });
    } else {
      const [pal, cpal, nPet] = DISC_TYPES[discI++ % DISC_TYPES.length];
      flowers.push({ pos, kind: "disc", pal, cpal, nPet, R: uni(0.12, 0.14), seed: uni(0, 6.28) });
    }
  });

  // leaves
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.4) / 8) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a);
    const base: V3 = [0.26 * c, 0.3, 0.26 * s];
    const d = norm([c, 0.15, s]);
    const side: V3 = [-s, 0, c];
    const n = norm(cross(side, d));
    const L = 0.3, W = 0.07;
    for (let ti = 0; ti < 32; ti++) {
      const t = ti / 31;
      for (let wi = -5; wi <= 5; wi++) {
        const w = wi / 5, curl = 0.025 * w * w, sw = W * Math.sin(Math.PI * t) * w;
        P(base[0] + d[0] * L * t + side[0] * sw + n[0] * curl,
          base[1] + d[1] * L * t - 0.1 * t * t + n[1] * curl,
          base[2] + d[2] * L * t + side[2] * sw + n[2] * curl,
          n[0], n[1], n[2], GREENS, wi === 0 ? -0.25 : 0, true);
      }
    }
  }

  // paper cone
  const y0 = -0.2, y1 = 0.3, r0 = 0.06, r1 = 0.36, k = (r1 - r0) / (y1 - y0), rings = 50;
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1), r = r0 + (r1 - r0) * t, count = Math.max(8, Math.trunc(170 * r));
    for (let j = 0; j < count; j++) {
      const ph = ((j + rand()) / count) * 2 * Math.PI, c = Math.cos(ph), s = Math.sin(ph);
      let y = y0 + (y1 - y0) * t;
      if (t > 0.9) y += 0.03 * Math.sin(9 * ph);
      const fold = 0.3 * (Math.abs(Math.sin(5 * ph)) - 0.6);
      const nn = norm([c, -k, s]);
      P(r * c, y, r * s, nn[0], nn[1], nn[2], PAPER, fold, false);
    }
  }

  // stems below the cone
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 2 * Math.PI, sx = 0.025 * Math.cos(a), sz = 0.025 * Math.sin(a);
    for (let j = 0; j < 40; j++) {
      const t = j / 39;
      P(sx * (1 + 1.2 * t), -0.2 - 0.3 * t, sz * (1 + 1.2 * t), Math.cos(a), 0, Math.sin(a), GREENS, -0.1, true);
    }
  }

  // ribbon + bow
  const by = -0.12, br = r0 + k * (by - y0) + 0.01;
  for (let j = 0; j < 90; j++) {
    const ph = (j / 90) * 2 * Math.PI;
    for (const dy of [-0.012, 0, 0.012]) P(br * Math.cos(ph), by + dy, br * Math.sin(ph), Math.cos(ph), 0, Math.sin(ph), RIBBON, 0, false);
  }
  const knot: V3 = [0, by, br + 0.01];
  for (const side of [-1, 1]) {
    for (let j = 0; j < 70; j++) {
      const a = (j / 70) * 2 * Math.PI;
      const lx = side * (0.07 + 0.07 * Math.cos(a));
      const ly = 0.04 * Math.sin(a) + (0.02 * (0.07 + 0.07 * Math.cos(a))) / 0.14;
      for (const fill of [1, 0.7]) P(knot[0] + lx * fill, knot[1] + ly * fill, knot[2] + 0.01, side * 0.3, 0.2, 0.93, RIBBON, 0.1, true);
    }
    for (let j = 0; j < 30; j++) {
      const t = j / 29;
      P(knot[0] + side * 0.06 * t, knot[1] - 0.15 * t, knot[2] + 0.015, side * 0.2, 0, 0.98, RIBBON, -0.05 + 0.05 * Math.sin(t * 9), true);
    }
  }
  for (const dx of [-0.01, 0, 0.01]) P(dx, by, knot[2] + 0.02, 0, 0, 1, RIBBON, 0.2, true, "@");

  const babies: Scene["babies"] = [];
  for (let i = 0; i < 90; i++) {
    const a = rand() * 2 * Math.PI, el = uni(0.3, 1.4), rr = uni(0.4, 0.58);
    babies.push([rr * Math.cos(a) * Math.cos(el), C[1] + rr * Math.sin(el), rr * Math.sin(a) * Math.cos(el), uni(0, 6.28)]);
  }
  const sparkles: Scene["sparkles"] = [];
  for (let i = 0; i < 30; i++) {
    const a = rand() * 2 * Math.PI, rr = uni(0.75, 0.95);
    sparkles.push([rr * Math.cos(a), uni(-0.3, 1.0), rr * Math.sin(a), uni(0, 6.28), uni(1.5, 4.0)]);
  }
  return { pts, flowers, babies, sparkles };
}

export function updateHearts(hearts: Heart[], dt: number) {
  const pick = () => HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
  while (hearts.length < NUM_HEARTS)
    hearts.push([Math.random(), 1 + Math.random(), 0.03 + Math.random() * 0.05, Math.random() * 6.28, pick()]);
  for (const h of hearts) {
    h[1] -= h[2] * dt;
    if (h[1] < 0) { h[0] = Math.random(); h[1] = 1; h[4] = pick(); }
  }
}

// xterm-256 -> css hex
const hexCache: string[] = [];
function hex(n: number) {
  if (hexCache[n]) return hexCache[n];
  let r: number, g: number, b: number;
  if (n >= 232) r = g = b = 8 + (n - 232) * 10;
  else if (n >= 16) {
    const lv = [0, 95, 135, 175, 215, 255], m = n - 16;
    r = lv[Math.floor(m / 36)]; g = lv[Math.floor(m / 6) % 6]; b = lv[m % 6];
  } else r = g = b = 128;
  return (hexCache[n] = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join(""));
}
const esc = (c: string) => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c);
const clamp = (b: number) => Math.min(0.999, Math.max(0, b));

export function render(scene: Scene, t: number, cols: number, rows: number, hearts: Heart[]): string {
  const { pts, flowers, babies, sparkles } = scene;
  const chars: string[][] = Array.from({ length: rows }, () => Array(cols).fill(" "));
  const colors: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  const zbuf: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1e9));

  const viewRows = rows - 2;
  const scale = Math.max(1, Math.min((viewRows - 2) / 1.45, (cols - 2) / 2.7));
  const sxScale = scale * 2;
  const cx = cols / 2, cy = 1 + 0.78 * scale;
  const ang = t * SPIN_SPEED, ca = Math.cos(ang), sa = Math.sin(ang);
  const ct = Math.cos(TILT), st = Math.sin(TILT);

  const projF = (x: number, y: number, z: number) => {
    const xr = x * ca - z * sa, zr = x * sa + z * ca, yp = y - PIVOT_Y;
    const yt = yp * ct - zr * st, zt = yp * st + zr * ct;
    const f = CAM_DIST / (CAM_DIST - zt);
    return [cx + xr * f * sxScale, cy - yt * f * scale, zt, f] as const;
  };
  const project = (x: number, y: number, z: number) => {
    const [fx, fy, zt] = projF(x, y, z);
    return [Math.trunc(fx), Math.trunc(fy), zt] as const;
  };
  const plot = (col: number, row: number, z: number, ch: string, color: number) => {
    if (row >= 0 && row < viewRows && col >= 0 && col < cols && z > zbuf[row][col]) {
      zbuf[row][col] = z; chars[row][col] = ch; colors[row][col] = color;
    }
  };

  for (const [x, y, , phase, color] of hearts) {
    const col = Math.trunc((x + 0.015 * Math.sin(t * 1.2 + phase)) * cols);
    plot(((col % cols) + cols) % cols, Math.trunc(y * viewRows), -50, "♥", color);
  }

  for (const [x, y, z, nx, ny, nz, pal, tone, two, ov] of pts) {
    const [col, row, zt] = project(x, y, z);
    const nxr = nx * ca - nz * sa, nzr = nx * sa + nz * ca;
    const nyt = ny * ct - nzr * st, nzt = ny * st + nzr * ct;
    let dot = nxr * LX + nyt * LY + nzt * LZ;
    if (two && dot < 0) dot = -dot * 0.55;
    const b = clamp(0.25 + 0.75 * Math.max(0, dot) + tone);
    plot(col, row, zt, ov ?? SHADE[Math.floor(b * SHADE.length)], pal[Math.floor(b * pal.length)]);
  }

  for (const { pos, kind, pal, cpal, nPet, R, seed } of flowers) {
    const [fx, fy, zt, f] = projF(...pos);
    const rx = R * f * sxScale, ry = R * f * scale;
    const dim = -0.4 * (1 - Math.min(1, Math.max(0, (zt + 0.6) / 1.2)));
    const rot = seed + ang * 0.7;
    for (let row = Math.trunc(fy - ry) - 1; row < Math.trunc(fy + ry) + 2; row++) {
      const dy = (row + 0.5 - fy) / ry;
      for (let col = Math.trunc(fx - rx) - 1; col < Math.trunc(fx + rx) + 2; col++) {
        const dx = (col + 0.5 - fx) / rx;
        if (kind === "disc") {
          const s = Math.hypot(dx, dy);
          if (s > 1) continue;
          if (s < 0.3) {
            const b = clamp(0.55 - 0.35 * dx - 0.35 * dy + dim);
            plot(col, row, zt + 0.06, s < 0.17 ? "@" : "o", cpal![Math.floor(b * cpal!.length)]);
            continue;
          }
          const ph = Math.atan2(dy, dx);
          const reach = 0.32 + 0.68 * Math.abs(Math.cos((nPet * (ph + rot)) / 2)) ** 0.7;
          if (s > reach) continue;
          const edge = s > reach - 0.14 ? -0.22 : 0;
          const b = clamp(0.62 - 0.22 * dx - 0.28 * dy + 0.12 * s + edge + dim);
          plot(col, row, zt + 0.04 * (1 - s), PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)], pal[Math.floor(b * pal.length)]);
        } else {
          const v = (1 - dy) / 2;
          if (v < 0 || v > 1) continue;
          const hw = 0.62 * Math.sin(Math.PI * 0.5 * Math.min(1, v * 1.5 + 0.05));
          if (hw <= 0 || Math.abs(dx) > hw) continue;
          const xn = dx / hw;
          if (v > 0.72 + 0.28 * Math.cos(1.5 * Math.PI * xn) ** 2) continue;
          const seam = Math.abs(Math.abs(xn) - 0.33) < 0.12 && v > 0.3 ? -0.25 : 0;
          const b = clamp(0.55 - 0.3 * xn + 0.1 * v + seam + dim);
          plot(col, row, zt + 0.03, PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)], pal[Math.floor(b * pal.length)]);
        }
      }
    }
  }

  for (const [x, y, z, phase] of babies) {
    const [col, row, zt] = project(x, y, z);
    const star = Math.sin(t * 2 + phase) > 0.6;
    plot(col, row, zt + 0.02, star ? "*" : "·", star ? 231 : 255);
  }
  for (const [x, y, z, phase, speed] of sparkles) {
    const [col, row, zt] = project(x, y, z);
    const tw = Math.sin(t * speed + phase);
    if (tw > 0.85) plot(col, row, zt, "*", 231);
    else if (tw > 0.4) plot(col, row, zt, "+", 225);
    else if (tw > 0) plot(col, row, zt, "·", 218);
  }

  const msgStart = Math.max(0, Math.floor((cols - MESSAGE.length) / 2)), shift = Math.trunc(t * 6);
  [...MESSAGE].forEach((ch, i) => {
    if (msgStart + i < cols) { chars[rows - 2][msgStart + i] = ch; colors[rows - 2][msgStart + i] = MSG_COLORS[(i + shift) % MSG_COLORS.length]; }
  });
  const hStart = Math.max(0, Math.floor((cols - HINT.length) / 2));
  [...HINT].forEach((ch, i) => {
    if (hStart + i < cols) { chars[rows - 1][hStart + i] = ch; colors[rows - 1][hStart + i] = 238; }
  });

  // group same-colored runs into spans
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = "", run = "", runColor = -1;
    const flush = () => { if (run) line += runColor > 0 ? `<span style="color:${hex(runColor)}">${run}</span>` : run; run = ""; };
    for (let c = 0; c < cols; c++) {
      const ch = chars[r][c], col = ch === " " ? 0 : colors[r][c];
      if (col !== runColor) { flush(); runColor = col; }
      run += esc(ch);
    }
    flush();
    out.push(line);
  }
  return out.join("\n");
}
