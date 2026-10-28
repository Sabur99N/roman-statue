import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Loads the (Draco-compressed) Flora statue, normalises its transform, gives
 * it a refined marble material and mounts it on a luxury pedestal that rises
 * just above the waterline.
 */
export class Statue {
  constructor(scene, { envMap, loadingManager } = {}) {
    this.scene = scene;
    this.envMap = envMap;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.targetHeight = 3.4; // world units, base sits at water level (y=0)

    const draco = new DRACOLoader(loadingManager);
    draco.setDecoderPath('/draco/');

    this.loader = new GLTFLoader(loadingManager);
    this.loader.setDRACOLoader(draco);
  }

  load(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          this.model = model;
          this._refine(model);
          this._normalise(model); // parents the model via a pivot group
          this._buildPedestal();
          resolve(this);
        },
        undefined,
        reject
      );
    });
  }

  _refine(model) {
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;

      const map = child.material.map || null;
      if (map) map.colorSpace = THREE.SRGBColorSpace;

      // Cool aged-marble finish with a hint of specular sheen.
      child.material = new THREE.MeshStandardMaterial({
        map,
        color: map ? 0xffffff : 0xd8d2c4,
        roughness: 0.62,
        metalness: 0.05,
        envMap: this.envMap || null,
        envMapIntensity: 0.65,
      });
      child.material.needsUpdate = true;
    });
  }

  _normalise(model) {
    // These scanned models carry a large translation/rotation on their inner
    // nodes. To normalise robustly we (1) recentre the geometry on the model's
    // own origin, then (2) place the model inside a pivot group and apply all
    // scale / rotation to the pivot — so rotation always happens around the
    // geometry centre (avoids flinging the mesh far off-axis).
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Recentre geometry about the model origin.
    model.position.sub(center);

    const pivot = new THREE.Group();
    pivot.add(model);

    const scale = this.targetHeight / size.y;
    pivot.scale.setScalar(scale);
    pivot.rotation.y = 0; // front faces the hero camera (+z)

    // Seat the base at water level (y = 0) and lift onto the pedestal top.
    pivot.updateMatrixWorld(true);
    const seated = new THREE.Box3().setFromObject(pivot);
    pivot.position.y -= seated.min.y;
    pivot.position.y += 0.5;

    this.pivot = pivot;
    this.group.add(pivot);
  }

  _buildPedestal() {
    const pedestal = new THREE.Group();

    // Dark marble drum.
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.35, 0.55, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0c0e14,
        roughness: 0.35,
        metalness: 0.4,
        envMap: this.envMap || null,
        envMapIntensity: 0.8,
      })
    );
    drum.position.y = 0.275;
    drum.castShadow = true;
    drum.receiveShadow = true;
    pedestal.add(drum);

    // Gold luxury accent ring.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.16, 0.03, 24, 96),
      new THREE.MeshStandardMaterial({
        color: 0xd9b26a,
        roughness: 0.25,
        metalness: 1.0,
        emissive: 0x3a2a10,
        emissiveIntensity: 0.6,
        envMap: this.envMap || null,
        envMapIntensity: 1.4,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    pedestal.add(ring);

    this.group.add(pedestal);
  }

  update() {}
}
