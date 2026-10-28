import * as THREE from 'three';
import { createSmokeTexture } from '../utils/textures.js';
import { mistVertexShader, mistFragmentShader } from '../shaders/mist.js';

/**
 * Atmospheric smoke over the water: a shader-driven mist sheet (fbm noise)
 * plus drifting billboard puffs for volume. Everything is additive & soft so
 * the water stays clear underneath.
 */
export class Smoke {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._createMistSheet();
    this._createPuffs();
  }

  _createMistSheet() {
    const geometry = new THREE.PlaneGeometry(60, 60, 1, 1);
    this.mistMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: mistVertexShader,
      fragmentShader: mistFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorLow: { value: new THREE.Color('#12203f') },
        uColorHigh: { value: new THREE.Color('#8fb0e8') },
        uOpacity: { value: 0.5 },
      },
    });

    const sheet = new THREE.Mesh(geometry, this.mistMaterial);
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.y = 0.12;
    this.group.add(sheet);
  }

  _createPuffs() {
    const texture = createSmokeTexture(256);
    this.puffs = [];
    const count = 14;

    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          color: 0x9fbdf0,
          transparent: true,
          opacity: 0.12 + Math.random() * 0.1,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );

      const radius = 2.5 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      sprite.position.set(
        Math.cos(angle) * radius,
        0.2 + Math.random() * 1.4,
        Math.sin(angle) * radius
      );
      const s = 3 + Math.random() * 4;
      sprite.scale.setScalar(s);

      sprite.userData.speed = 0.05 + Math.random() * 0.08;
      sprite.userData.baseY = sprite.position.y;
      sprite.userData.phase = Math.random() * Math.PI * 2;
      this.puffs.push(sprite);
      this.group.add(sprite);
    }
  }

  update(elapsed, delta) {
    this.mistMaterial.uniforms.uTime.value = elapsed;
    for (const puff of this.puffs) {
      puff.position.y = puff.userData.baseY + Math.sin(elapsed * puff.userData.speed + puff.userData.phase) * 0.3;
      puff.material.rotation += delta * 0.03;
    }
  }
}
