#!/usr/bin/env node
// Build Android launcher and splash assets from assets/icon.svg.
// Uses a local Chrome/Chromium/Edge installation; no store-listing outputs.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { findChrome } from './lib/find-chrome.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(repoRoot, 'assets');
const iconSvgPath = path.join(assetsDir, 'icon.svg');

const SIZE = 1024;
const PAPER = '#FAFAF7'; // the glyph's paper-white ink in icon.svg
const SPLASH_GLYPH_SCALE = 0.7; // glyph size on the splash (~42% of canvas)

if (!fs.existsSync(iconSvgPath)) {
  console.error(
    `build-icon: missing ${path.relative(repoRoot, iconSvgPath)} — see the header for the icon.svg contract.`,
  );
  process.exit(1);
}
const iconSvg = fs.readFileSync(iconSvgPath, 'utf8');

// ---- Parse the per-app contract out of icon.svg ----------------------------
function readAccent(svg) {
  const m =
    svg.match(/<rect\b[^>]*\bid="bg"[^>]*\bfill="(#[0-9a-fA-F]{6})"/) ||
    svg.match(/<rect\b[^>]*\bfill="(#[0-9a-fA-F]{6})"[^>]*\bid="bg"/);
  if (!m) throw new Error('icon.svg: missing <rect id="bg" fill="#RRGGBB"> (the accent).');
  return m[1];
}
function readGlyph(svg) {
  const m = svg.match(/<g\b[^>]*\bid="glyph"[\s\S]*?<\/g>/);
  if (!m) throw new Error('icon.svg: missing <g id="glyph">...</g> (no nested <g> allowed).');
  return m[0];
}

const ACCENT = readAccent(iconSvg);
const glyphGroup = readGlyph(iconSvg);

// Splash glyph: the glyph alone, recoloured paper-white -> accent, scaled and
// centred on a transparent canvas.
function splashSvg() {
  const accentGlyph = glyphGroup.split(PAPER).join(ACCENT);
  const c = SIZE / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
    <g transform="translate(${c} ${c}) scale(${SPLASH_GLYPH_SCALE}) translate(${-c} ${-c})">
      ${accentGlyph}
    </g>
  </svg>`;
}

// ---- Render via headless Chrome --------------------------------------------
function wrapHtml(size, svg) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:transparent;}
    svg{display:block;width:${size}px;height:${size}px;}
  </style></head><body>${svg}</body></html>`;
}
function renderPng(size, outPath, svg) {
  const tmpHtml = path.join(
    os.tmpdir(),
    `ja-icon-${Date.now()}-${Math.random().toString(36).slice(2)}.html`,
  );
  fs.writeFileSync(tmpHtml, wrapHtml(size, svg), 'utf8');
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-sandbox',
    '--force-device-scale-factor=1',
    `--window-size=${size},${size}`,
    '--default-background-color=00000000',
    `--screenshot=${outPath}`,
    '--virtual-time-budget=2000',
    pathToFileURL(tmpHtml).href,
  ];
  const result = spawnSync(findChrome(), args, { stdio: 'pipe' });
  fs.rmSync(tmpHtml, { force: true });
  if (result.status !== 0 || !fs.existsSync(outPath)) {
    throw new Error(`Chrome failed (${result.status}): ${result.stderr?.toString() || ''}`);
  }
}

function build() {
  fs.mkdirSync(assetsDir, { recursive: true });
  const iconPng = path.join(assetsDir, 'icon.png');
  const adaptivePng = path.join(assetsDir, 'adaptive-icon.png');
  const splashPng = path.join(assetsDir, 'splash-icon.png');

  console.log(`Accent ${ACCENT}. Rendering icon.png / adaptive-icon.png (full square)...`);
  renderPng(SIZE, iconPng, iconSvg);
  fs.copyFileSync(iconPng, adaptivePng);
  console.log('  assets/icon.png');
  console.log('  assets/adaptive-icon.png');

  console.log('Rendering splash-icon.png (glyph only, accent on paper)...');
  renderPng(SIZE, splashPng, splashSvg());
  console.log('  assets/splash-icon.png');

  console.log('Done. Android icon and splash assets generated.');
}

build();
