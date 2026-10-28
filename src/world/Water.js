import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

/**
 * Clear, fresnel-driven reflective water.
 *
 * Built on Three's mirror `Reflector` (so the statue, moon and mist reflect
 * for real), but with a custom surface shader adapted from the raymarched
 * water technique in the brief: fbm-perturbed normals, a Schlick fresnel mix
 * between the live reflection and the deep water body, a moonlight specular
 * glint, and a distance fade into the night fog (echoing the shader's
 * `smoothstep(...) -> cubemap` blend).
 */
const WaterShader = {
  uniforms: {
    // Required by Reflector — updated automatically each frame.
    color: { value: new THREE.Color(0x8093ad) },
    tDiffuse: { value: null },
    textureMatrix: { value: new THREE.Matrix4() },
    // Custom.
    uTime: { value: 0 },
    uCameraPos: { value: new THREE.Vector3() },
    uWaterColor: { value: new THREE.Color(0x060b18) },
    uFogColor: { value: new THREE.Color(0x060a16) },
    uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    uReflectivity: { value: 0.85 },
    uRipple: { value: 0.9 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vCoord;
    varying vec3 vWorldPos;

    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vCoord = textureMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;

    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec3  uCameraPos;
    uniform vec3  uWaterColor;
    uniform vec3  uFogColor;
    uniform vec3  uMoonDir;
    uniform float uReflectivity;
    uniform float uRipple;

    varying vec4 vCoord;
    varying vec3 vWorldPos;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float f = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        f += a * noise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return f;
    }

    void main() {
      // Two drifting noise layers for a living but calm surface.
      vec2 np = vWorldPos.xz * 0.14 + vec2(uTime * 0.03, uTime * 0.021);
      float e = 0.12;
      float h  = fbm(np);
      float hx = fbm(np + vec2(e, 0.0));
      float hz = fbm(np + vec2(0.0, e));

      // Reconstruct a gently perturbed surface normal from the fbm gradient.
      vec3 N = normalize(vec3((h - hx) * uRipple, e, (h - hz) * uRipple));

      vec3 I = normalize(vWorldPos - uCameraPos);

      // Schlick fresnel: clear (transmissive) looking down, mirror at grazing.
      float f0 = 0.02;
      float fres = f0 + (1.0 - f0) * pow(1.0 - max(dot(N, -I), 0.0), 5.0);

      // Live scene reflection, distorted by the ripple normal.
      vec2 ruv = vCoord.xy / vCoord.w;
      ruv += N.xz * 0.07;
      vec3 refl = texture2D(tDiffuse, ruv).rgb;

      // Deep water body with a faint caustic shimmer.
      vec3 body = uWaterColor * (0.75 + 0.5 * fbm(np * 2.0));

      vec3 col = mix(body, refl, clamp(fres * uReflectivity, 0.0, 1.0));

      // Sharp moonlight glint.
      vec3 R = reflect(I, N);
      float spec = pow(max(dot(R, normalize(uMoonDir)), 0.0), 220.0);
      col += spec * vec3(0.85, 0.92, 1.0) * 2.2;

      // Fade to night fog with distance (the shader's far-cubemap blend).
      float dist = length(vWorldPos - uCameraPos);
      col = mix(col, uFogColor, smoothstep(24.0, 130.0, dist));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class WaterSurface {
  constructor(scene, moonDirection) {
    const geometry = new THREE.PlaneGeometry(400, 400);

    this.water = new Reflector(geometry, {
      clipBias: 0.0035,
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x8093ad,
      shader: WaterShader,
    });

    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0;
    this.material = this.water.material;
    this.material.uniforms.uMoonDir.value.copy(moonDirection);

    scene.add(this.water);
  }

  update(delta, camera) {
    this.material.uniforms.uTime.value += delta;
    if (camera) this.material.uniforms.uCameraPos.value.copy(camera.position);
  }
}
