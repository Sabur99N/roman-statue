/**
 * Cinematic finishing pass: soft vignette + animated film grain for a
 * moody, luxurious photographic feel. Designed to run last in the composer.
 */
export const CinematicShader = {
  name: 'CinematicShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 1.15 },
    uGrain: { value: 0.05 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Vignette
      vec2 uv = vUv - 0.5;
      float vig = 1.0 - dot(uv, uv) * uVignette;
      vig = clamp(vig, 0.0, 1.0);
      color.rgb *= pow(vig, 1.3);

      // Subtle animated grain
      float grain = (rand(vUv + fract(uTime)) - 0.5) * uGrain;
      color.rgb += grain;

      gl_FragColor = color;
    }
  `,
};
