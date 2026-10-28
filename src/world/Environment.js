import * as THREE from 'three';
import { createGlowTexture } from '../utils/textures.js';

/**
 * Night sky atmosphere: gradient background, fog for depth, a starfield and a
 * glowing moon that acts as the scene's key light source and bloom seed.
 */
export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.moonDirection = new THREE.Vector3(-0.55, 0.32, -0.75).normalize();

    this._createBackground();
    this._createFog();
    this._createStars();
    this._createMoon();
  }

  _createBackground() {
    // Large inverted sphere with a vertical night gradient painted in-shader.
    const geometry = new THREE.SphereGeometry(160, 32, 32);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color('#0b1430') },
        uMiddle: { value: new THREE.Color('#070b1a') },
        uBottom: { value: new THREE.Color('#020309') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vPos;
        uniform vec3 uTop;
        uniform vec3 uMiddle;
        uniform vec3 uBottom;
        void main() {
          float h = normalize(vPos).y;
          vec3 col = mix(uMiddle, uBottom, smoothstep(0.0, -0.4, h));
          col = mix(col, uTop, smoothstep(0.0, 0.6, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(geometry, material);
    this.group.add(this.sky);
  }

  _createFog() {
    this.scene.fog = new THREE.FogExp2('#060a16', 0.028);
  }

  _createStars() {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute on a high shell, biased toward the upper hemisphere.
      const r = 90 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.lerp(1, -0.1, Math.random()));
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = Math.random() * 1.5 + 0.3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xbcd0ff,
      size: 0.6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: createGlowTexture(64),
    });

    this.stars = new THREE.Points(geometry, material);
    this.group.add(this.stars);
  }

  _createMoon() {
    const distance = 70;
    this.moonPosition = this.moonDirection.clone().multiplyScalar(distance);

    // Bright core sphere (bloom seed).
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(4, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xf2f6ff })
    );
    core.position.copy(this.moonPosition);
    this.group.add(core);

    // Soft halo billboard behind the core.
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGlowTexture(256),
        color: 0xaecbff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.scale.setScalar(38);
    halo.position.copy(this.moonPosition);
    this.group.add(halo);

    this.moon = core;
  }

  update(elapsed) {
    if (this.stars) {
      this.stars.rotation.y = elapsed * 0.006;
    }
  }
}
