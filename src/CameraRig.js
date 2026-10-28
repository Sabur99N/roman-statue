import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Cinematic camera that glides along a smooth Catmull-Rom path as the page is
 * scrolled, revealing the statue, its reflection, the moon and the mist from a
 * sequence of curated angles. Adds a subtle idle sway + mouse parallax.
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 2.0, 0);
    this.mouse = new THREE.Vector2(0, 0);
    this.parallax = new THREE.Vector2(0, 0);

    // Curated shots (position + look-at) keyed to scroll progress.
    const positions = [
      new THREE.Vector3(0, 2.7, 7.3),    // hero: front, statue + halo
      new THREE.Vector3(0.6, 2.5, 5.4),  // manifesto: slow push-in
      new THREE.Vector3(4.8, 1.3, 4.6),  // 3/4 low, reflection on water
      new THREE.Vector3(1.4, 3.0, 2.6),  // close-up on the face
      new THREE.Vector3(-4.6, 1.1, 4.2), // opposite side, moonlight glints
      new THREE.Vector3(0, 3.8, 8.6),    // wide reveal: moon + reflection + mist
    ];
    const targets = [
      new THREE.Vector3(0, 2.4, 0),
      new THREE.Vector3(0, 2.3, 0),
      new THREE.Vector3(0, 1.5, 0),
      new THREE.Vector3(0, 2.5, 0),
      new THREE.Vector3(0, 1.6, 0),
      new THREE.Vector3(0, 1.4, 0),
    ];

    this.posCurve = new THREE.CatmullRomCurve3(positions, false, 'centripetal');
    this.targetCurve = new THREE.CatmullRomCurve3(targets, false, 'centripetal');

    this.proxy = { t: 0 };
    this._initScroll();
    this._initParallax();

    // Place camera at the hero shot immediately.
    this._apply(0);
  }

  _initScroll() {
    // The camera tour is tied to the cinematic zone only; content sections
    // that follow scroll normally over a faded backdrop.
    const zone = document.querySelector('.cinematic') || document.body;
    gsap.to(this.proxy, {
      t: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: zone,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
      },
    });
  }

  _initParallax() {
    window.addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  _apply(t) {
    const pos = this.posCurve.getPoint(t);
    const tgt = this.targetCurve.getPoint(t);
    this.camera.position.copy(pos);
    this.target.copy(tgt);
  }

  update(elapsed, delta) {
    this._apply(this.proxy.t);

    // Smooth mouse parallax.
    this.parallax.x += (this.mouse.x - this.parallax.x) * Math.min(1, delta * 3);
    this.parallax.y += (this.mouse.y - this.parallax.y) * Math.min(1, delta * 3);

    // Gentle idle breathing + parallax offsets.
    this.camera.position.x += this.parallax.x * 0.35 + Math.sin(elapsed * 0.25) * 0.05;
    this.camera.position.y += -this.parallax.y * 0.25 + Math.sin(elapsed * 0.3) * 0.04;

    this.camera.lookAt(this.target);
  }
}
