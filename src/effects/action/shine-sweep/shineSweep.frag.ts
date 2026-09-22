/**
 * Light sweep across a rounded rectangle.
 *
 * Travel axis/sense come from `uDir` (unit vector in local space, +Y up).
 * `uDispersion` (0..1) is where the bright core starts falling off across
 * the band half-width — 0 = proportional from center, higher = condensed core.
 */
export const SHINE_SWEEP_FRAGMENT_SHADER = `
#pragma phaserTemplate(shaderName)

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 outTexCoord;

uniform vec2 uResolution;
uniform vec2 uCardSize;
uniform float uRadius;
uniform vec3 uColor;
uniform float uBandWidth;
uniform float uProgress;
uniform float uIntensity;
uniform float uOpacity;
uniform float uSoftness;
uniform float uDispersion;
uniform vec2 uDir;

float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

void main() {
    vec2 p = (outTexCoord - 0.5) * uResolution;
    vec2 halfSize = uCardSize * 0.5;
    float radius = min(uRadius, min(halfSize.x, halfSize.y));
    float sd = sdRoundedBox(p, halfSize, radius);

    if (sd > 0.0) {
        discard;
    }

    vec2 dir = normalize(uDir);
    float proj = dot(p, dir);

    float extent = abs(dot(halfSize, abs(dir))) + uBandWidth * 1.35;
    float head = mix(-extent, extent, fract(uProgress));
    float dist = abs(proj - head);

    float halfBand = max(uBandWidth, 0.001);
    float t = clamp(dist / halfBand, 0.0, 1.0);

    // Core holds full intensity until uDispersion, then falls off to the edge.
    float coreHold = clamp(uDispersion, 0.0, 0.98);
    float shine;
    if (t <= coreHold) {
        shine = 1.0;
    } else {
        float u = (t - coreHold) / max(1.0 - coreHold, 1e-4);
        // softness: higher → gentler residual toward the band edge
        float power = mix(1.75, 0.9, clamp(uSoftness, 0.0, 1.0));
        shine = pow(max(1.0 - u, 0.0), power);
    }
    shine *= 1.0 - smoothstep(0.97, 1.0, t);

    float rimFade = 1.0 - smoothstep(-1.5, 0.0, sd);
    shine *= mix(0.75, 1.0, rimFade);

    float glow = clamp(shine * uIntensity * uOpacity, 0.0, 1.0);
    if (glow < 0.004) {
        discard;
    }

    gl_FragColor = vec4(uColor * glow, glow);
}
`
