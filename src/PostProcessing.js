import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { CinematicShader } from './shaders/vignette.js';

/**
 * Composer chain: scene -> HDR bloom -> ACES tone map -> cinematic
 * vignette/grain -> SMAA anti-aliasing.
 */
export class PostProcessing {
  constructor(renderer, scene, camera, sizes) {
    this.renderer = renderer;

    this.composer = new EffectComposer(renderer);
    this.composer.setSize(sizes.width, sizes.height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(sizes.width, sizes.height),
      0.55, // strength
      0.6,  // radius
      0.82  // threshold — only the brightest highlights (moon, halo) glow
    );
    this.composer.addPass(this.bloom);

    this.composer.addPass(new OutputPass());

    this.cinematic = new ShaderPass(CinematicShader);
    this.composer.addPass(this.cinematic);

    this.smaa = new SMAAPass(sizes.width, sizes.height);
    this.composer.addPass(this.smaa);
  }

  resize(width, height) {
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.bloom.resolution.set(width, height);
  }

  render(elapsed) {
    this.cinematic.uniforms.uTime.value = elapsed;
    this.composer.render();
  }
}
