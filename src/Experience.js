import * as THREE from 'three';
import { Environment } from './world/Environment.js';
import { WaterSurface } from './world/Water.js';
import { Statue } from './world/Statue.js';
import { Lights } from './world/Lights.js';
import { Smoke } from './world/Smoke.js';
import { PostProcessing } from './PostProcessing.js';
import { CameraRig } from './CameraRig.js';
import { createNightEnvironment } from './utils/textures.js';

const BLOOM_LAYER = 1;

/**
 * Orchestrates the whole 3D experience: renderer, scene, night environment,
 * water, statue, lights, smoke, post-processing and the cinematic camera.
 */
export class Experience {
  constructor(canvas, { onProgress, onReady } = {}) {
    this.canvas = canvas;
    this.onReady = onReady;
    this.sizes = { width: window.innerWidth, height: window.innerHeight };
    this.elapsed = 0;
    this.lastTime = performance.now();

    this._initRenderer();
    this._initScene();
    this._initCamera();

    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onProgress = (_url, loaded, total) => {
      if (onProgress) onProgress(total ? loaded / total : 0);
    };

    this._build();
    this._bindResize();
    this._tick();
  }

  async _initDebug() {
    if (window.location.hash !== '#debug') return;
    const { GUI } = await import('lil-gui');
    const gui = new GUI({ title: 'Atelier' });

    const render = gui.addFolder('Render');
    render.add(this.renderer, 'toneMappingExposure', 0.4, 2, 0.01).name('Exposure');
    render.add(this.post.bloom, 'strength', 0, 2, 0.01).name('Bloom');
    render.add(this.post.bloom, 'radius', 0, 1.5, 0.01).name('Bloom radius');
    render.add(this.post.bloom, 'threshold', 0, 1, 0.01).name('Bloom threshold');
    render.add(this.post.cinematic.uniforms.uVignette, 'value', 0, 2, 0.01).name('Vignette');

    const water = gui.addFolder('Water');
    water.add(this.water.material.uniforms.uRipple, 'value', 0, 3, 0.01).name('Ripple');
    water.add(this.water.material.uniforms.uReflectivity, 'value', 0, 1, 0.01).name('Reflectivity');

    const mist = gui.addFolder('Mist');
    mist.add(this.smoke.mistMaterial.uniforms.uOpacity, 'value', 0, 1, 0.01).name('Mist opacity');
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.envMap = createNightEnvironment(this.renderer);
    this.scene.environment = this.envMap;
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      42,
      this.sizes.width / this.sizes.height,
      0.1,
      500
    );
    this.camera.position.set(0, 2.4, 7);
    this.scene.add(this.camera);
  }

  async _build() {
    this.environment = new Environment(this.scene);
    this.water = new WaterSurface(this.scene, this.environment.moonDirection);
    this.lights = new Lights(this.scene, this.environment.moonPosition, BLOOM_LAYER);
    this.smoke = new Smoke(this.scene);

    this.post = new PostProcessing(this.renderer, this.scene, this.camera, this.sizes);
    this.cameraRig = new CameraRig(this.camera);

    this.statue = new Statue(this.scene, {
      envMap: this.envMap,
      loadingManager: this.loadingManager,
    });

    try {
      await this.statue.load('/models/flora.glb');
    } catch (err) {
      console.error('Failed to load statue model:', err);
    }

    this._initDebug();
    if (this.onReady) this.onReady();
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;

      this.camera.aspect = this.sizes.width / this.sizes.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.sizes.width, this.sizes.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (this.post) this.post.resize(this.sizes.width, this.sizes.height);
    });
  }

  _tick() {
    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.elapsed += delta;
    const elapsed = this.elapsed;

    if (this.environment) this.environment.update(elapsed);
    if (this.water) this.water.update(delta, this.camera);
    if (this.lights) this.lights.update(elapsed);
    if (this.smoke) this.smoke.update(elapsed, delta);
    if (this.cameraRig) this.cameraRig.update(elapsed, delta);

    if (this.post) this.post.render(elapsed);
    else this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this._tick());
  }
}
