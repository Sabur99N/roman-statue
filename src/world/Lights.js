import * as THREE from 'three';

/**
 * Cinematic night lighting rig:
 *  - cool moonlight key (shadow caster)
 *  - dramatic top spotlight on the statue's face
 *  - warm gold rim accents for a luxury edge glow
 *  - a glowing halo ring behind the statue (bloom seed)
 */
export class Lights {
  constructor(scene, moonPosition, bloomLayer = 1) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._moonlight(moonPosition);
    this._spot();
    this._accents();
    this._halo(bloomLayer);
    this._ambient();
  }

  _moonlight(moonPosition) {
    const moon = new THREE.DirectionalLight(0xaecbff, 1.15);
    moon.position.copy(moonPosition ? moonPosition.clone().multiplyScalar(0.12) : new THREE.Vector3(-6, 8, -9));
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.near = 0.5;
    moon.shadow.camera.far = 40;
    moon.shadow.camera.left = -8;
    moon.shadow.camera.right = 8;
    moon.shadow.camera.top = 8;
    moon.shadow.camera.bottom = -8;
    moon.shadow.bias = -0.0004;
    moon.shadow.normalBias = 0.02;
    this.group.add(moon);
    this.moon = moon;
  }

  _spot() {
    const spot = new THREE.SpotLight(0xeaf2ff, 14, 22, Math.PI * 0.2, 0.45, 1.3);
    spot.position.set(0.5, 6.5, 3.2);
    spot.target.position.set(0, 2.2, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.bias = -0.0004;
    this.group.add(spot);
    this.group.add(spot.target);
    this.spot = spot;
  }

  _accents() {
    // Warm gold rim from behind-left.
    const gold = new THREE.PointLight(0xffb867, 13, 12, 2);
    gold.position.set(-3.2, 2.6, -2.6);
    this.group.add(gold);

    // Cool cyan rim from behind-right for contrast.
    const cyan = new THREE.PointLight(0x5fa8ff, 9, 12, 2);
    cyan.position.set(3.4, 2.0, -2.2);
    this.group.add(cyan);

    // Soft uplight from the water for the marble underside.
    const up = new THREE.PointLight(0x2a4a80, 6, 8, 2);
    up.position.set(0, 0.3, 1.6);
    this.group.add(up);

    this.gold = gold;
    this.cyan = cyan;
  }

  _halo(bloomLayer) {
    // Bright ring halo behind the statue — echoes the reference art direction.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.02, 16, 160),
      new THREE.MeshBasicMaterial({ color: 0xdfe9ff })
    );
    ring.position.set(0, 2.4, -1.4);
    ring.layers.enable(bloomLayer);
    this.group.add(ring);
    this.halo = ring;
  }

  _ambient() {
    const hemi = new THREE.HemisphereLight(0x2a3a66, 0x05060c, 0.6);
    this.group.add(hemi);
  }

  update(elapsed) {
    // Gentle flicker on the gold accent for a living, candle-lit feel.
    if (this.gold) this.gold.intensity = 13 + Math.sin(elapsed * 2.1) * 2;
  }
}
