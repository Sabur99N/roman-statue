import * as THREE from 'three';

/**
 * Seamless (tiling) periodic value-noise helpers used to synthesise textures
 * procedurally so the project ships with zero binary texture assets.
 */
function hash2(x, y, period) {
  const px = ((x % period) + period) % period;
  const py = ((y % period) + period) % period;
  const s = Math.sin(px * 127.1 + py * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function periodicNoise(x, y, period) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const a = hash2(xi, yi, period);
  const b = hash2(xi + 1, yi, period);
  const c = hash2(xi, yi + 1, period);
  const d = hash2(xi + 1, yi + 1, period);

  const u = smooth(xf);
  const v = smooth(yf);

  return (
    a * (1 - u) * (1 - v) +
    b * u * (1 - v) +
    c * (1 - u) * v +
    d * u * v
  );
}

function fbm(x, y, baseFreq, octaves) {
  let value = 0;
  let amp = 0.5;
  let freq = baseFreq;
  for (let i = 0; i < octaves; i++) {
    value += amp * periodicNoise(x * freq, y * freq, freq);
    freq *= 2;
    amp *= 0.5;
  }
  return value;
}

/**
 * Generates a seamless water normal map from fbm noise. This drives the
 * ripple detail of the Water surface (kept subtle for a clear, calm look).
 */
export function createWaterNormals(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const data = image.data;

  const height = (i, j) => fbm(i / size, j / size, 6, 5);
  const strength = 2.2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hL = height((x - 1 + size) % size, y);
      const hR = height((x + 1) % size, y);
      const hD = height(x, (y - 1 + size) % size);
      const hU = height(x, (y + 1) % size);

      const nx = (hL - hR) * strength;
      const ny = (hD - hU) * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);

      const idx = (y * size + x) * 4;
      data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Soft radial sprite used for drifting smoke / mist particles.
 */
export function createSmokeTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.35, 'rgba(210,225,255,0.35)');
  grad.addColorStop(1, 'rgba(180,200,255,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Small circular glow sprite (moon halo / bloom seeds).
 */
export function createGlowTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(220,230,255,0.7)');
  grad.addColorStop(1, 'rgba(180,200,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural night-sky environment (equirectangular) used for subtle IBL
 * reflections on the marble statue and the water surface.
 */
export function createNightEnvironment(renderer) {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Vertical gradient: deep navy zenith -> near-black horizon.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0a1226');
  grad.addColorStop(0.5, '#0a0f1c');
  grad.addColorStop(1, '#03040a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Moon glow blob for a soft directional highlight in reflections.
  const mg = ctx.createRadialGradient(w * 0.72, h * 0.28, 0, w * 0.72, h * 0.28, 220);
  mg.addColorStop(0, 'rgba(190,210,255,0.9)');
  mg.addColorStop(0.4, 'rgba(120,150,220,0.25)');
  mg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, w, h);

  const equirect = new THREE.CanvasTexture(canvas);
  equirect.mapping = THREE.EquirectangularReflectionMapping;
  equirect.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(equirect).texture;
  pmrem.dispose();
  equirect.dispose();
  return envMap;
}
