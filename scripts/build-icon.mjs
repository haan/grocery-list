#!/usr/bin/env node
// Export the approved raster artwork for Android. No AI calls or native build.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Reuse the image tooling already installed with the pinned Expo SDK.
const require = createRequire(import.meta.url);
const { generateImageAsync, generateImageBackgroundAsync, compositeImagesAsync } = require('@expo/image-utils');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'assets');
const size = 1024;

async function resize(name, width) {
  const { source } = await generateImageAsync({ projectRoot: root }, {
    src: path.join(assets, name), width, height: width, resizeMode: 'contain',
  });
  return source;
}

// Preserve the selected full-color composition for non-adaptive consumers.
await fs.writeFile(path.join(assets, 'icon.png'), await resize('icon-source.png', size));

// Android uses 108dp layers with a central safe area. Keep transparent padding
// around the basket rather than allowing the launcher to crop the original art.
const foregroundSize = 768;
const background = await generateImageBackgroundAsync({
  width: size, height: size, resizeMode: 'contain', backgroundColor: 'transparent',
});
const adaptive = await compositeImagesAsync({
  background,
  foreground: await resize('icon-foreground.png', foregroundSize),
  x: (size - foregroundSize) / 2,
  y: (size - foregroundSize) / 2,
});
await fs.writeFile(path.join(assets, 'adaptive-icon.png'), adaptive);

// The native launch screen sizes this transparent image via imageWidth.
await fs.writeFile(path.join(assets, 'splash-icon.png'), await resize('icon-foreground.png', size));
console.log('Exported icon.png, adaptive-icon.png, and splash-icon.png from the approved basket artwork.');
