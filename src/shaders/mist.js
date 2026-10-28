/**
 * Volumetric-looking ground mist that drifts across the water.
 *
 * The fbm / value-noise core is adapted from Inigo Quilez's classic shader
 * (https://www.shadertoy.com/view/XslGRr) that the brief referenced for the
 * "clear water" look, repurposed here as soft, moon-lit smoke curling above
 * the surface. Rendered additively on a large horizontal plane.
 */
export const mistVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const mistFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3  uColorLow;
  uniform vec3  uColorHigh;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  const mat3 m = mat3( 0.00,  0.80,  0.60,
                      -0.80,  0.36, -0.48,
                      -0.60, -0.48,  0.64 );

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  float noise(in vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = p.x + p.y * 57.0 + 113.0 * p.z;
    float res = mix(mix(mix(hash(n +   0.0), hash(n +   1.0), f.x),
                        mix(hash(n +  57.0), hash(n +  58.0), f.x), f.y),
                    mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                        mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
    return res;
  }

  float fbm(vec3 p) {
    float f = 0.0;
    f  = 0.5000 * noise(p); p = m * p * 2.02;
    f += 0.2500 * noise(p); p = m * p * 2.03;
    f += 0.1250 * noise(p); p = m * p * 2.01;
    f += 0.0625 * noise(p);
    return f;
  }

  void main() {
    vec3 p = 3.0 * vec3(vUv, 0.0) + uTime * vec3(0.09, 0.07, 0.12);
    float x = fbm(p);

    // Layered curls for a smoky, wispy structure.
    float smoke = fbm(vec3(vUv * 4.0 + x, uTime * 0.05));
    smoke = smoothstep(0.25, 0.75, smoke);

    // Fade toward the plane edges so mist dissolves into the night.
    float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x)
               * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);

    vec3 col = mix(uColorLow, uColorHigh, smoke);
    float alpha = smoke * edge * uOpacity;

    gl_FragColor = vec4(col, alpha);
  }
`;
