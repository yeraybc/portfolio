// Renders public/og.png (1200×630) with the site's fonts and tokens. Usage: node scripts/make-og.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const fontDir = resolve('node_modules/@fontsource');
const data = JSON.parse(readFileSync('public/data/live-run.json', 'utf8'));
const curve = data.curve;
const ols = data.meta.ols_val_rmse;
const W = 520, H = 260, yMax = 1200, yMin = 800;
const xs = (i) => (i / (curve.length - 1)) * W;
const ys = (v) => ((yMax - Math.min(v, yMax)) / (yMax - yMin)) * H;
const path = curve.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Plex;font-weight:400;src:url(file://${fontDir}/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2)}
@font-face{font-family:PlexC;font-weight:600;src:url(file://${fontDir}/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-600-normal.woff2)}
@font-face{font-family:Mono;font-weight:400;src:url(file://${fontDir}/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2)}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0f1624;color:#e4e8f0;font-family:Plex;
background-image:linear-gradient(rgb(120 150 200/.1) 1px,transparent 1px),linear-gradient(90deg,rgb(120 150 200/.1) 1px,transparent 1px),linear-gradient(rgb(120 150 200/.05) 1px,transparent 1px),linear-gradient(90deg,rgb(120 150 200/.05) 1px,transparent 1px);
background-size:40px 40px,40px 40px,8px 8px,8px 8px;display:grid;grid-template-columns:1fr 560px;align-items:center;padding:72px;gap:40px}
h1{font-family:PlexC;font-weight:600;font-size:84px;line-height:1;letter-spacing:-.02em}
.role{font-size:34px;color:#aab3c5;margin-top:12px}
.tag{margin-top:36px;font-size:22px;line-height:1.45;color:#aab3c5;max-width:520px}
.panel{background:#162033;border:1px solid #24314b;border-radius:8px;padding:20px}
.lbl{font-family:Mono;font-size:15px;color:#8a93a6;display:flex;justify-content:space-between;margin-bottom:12px}
.ok{color:#4fbf8f}
</style></head><body>
<div><h1>Yeray Benito</h1><p class="role">Data Scientist in Madrid</p>
<p class="tag">Spatial ML, volatility forecasting, credit risk and LLM agents. Every project logged as a run against its baseline.</p></div>
<div class="panel"><p class="lbl"><span>val RMSE vs OLS baseline</span><span class="ok">✓ beats baseline</span></p>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><line x1="0" x2="${W}" y1="${ys(ols)}" y2="${ys(ols)}" stroke="#7f8aa0" stroke-width="2"/>
<path d="${path}" fill="none" stroke="#f0b44c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg></div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'og-'));
const file = join(dir, 'og.html');
writeFileSync(file, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`file://${file}`);
await page.waitForTimeout(300);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('wrote public/og.png');
