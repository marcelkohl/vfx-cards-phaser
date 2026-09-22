/**
 * Organic dissolve cover over a rounded-rect frame.
 *
 * progress 0 → fully covered; 1 → fully revealed (cover gone).
 * Noise is seeded / stable (not re-randomized each frame).
 * Luminous edge forms where the threshold crosses the FBM field.
 */
export const DISSOLVE_REVEAL_FRAGMENT_SHADER = `
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
uniform float uProgress;
uniform float uActive;
uniform float uNoiseScale;
uniform float uVariation;
uniform float uSeed;
uniform float uEdgeWidth;
uniform float uEdgeIntensity;
uniform vec3 uEdgeColor;
uniform vec3 uCoverColor;
uniform float uCoverOpacity;

float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
        v += a * valueNoise(p);
        p = m * p;
        a *= 0.5;
    }
    return v;
}

void main() {
    if (uActive < 0.5) {
        discard;
    }

    vec2 p = (outTexCoord - 0.5) * uResolution;
    vec2 halfSize = uCardSize * 0.5;
    float radius = min(uRadius, min(halfSize.x, halfSize.y));
    float sd = sdRoundedBox(p, halfSize, radius);

    if (sd > 0.5) {
        discard;
    }

    // Soft clip to rounded frame.
    float inside = 1.0 - smoothstep(-1.0, 0.5, sd);

    vec2 uv = outTexCoord;
    vec2 seedOff = vec2(uSeed * 0.173, uSeed * 0.091);
    float n = fbm(uv * uNoiseScale + seedOff);

    // Desync: center tends to open earlier; corners lag / lead irregularly.
    vec2 ap = abs(p) / max(halfSize, vec2(1e-4));
    float radial = clamp(length(ap), 0.0, 1.4);
    float corner = pow(clamp(ap.x, 0.0, 1.0), 1.35) * pow(clamp(ap.y, 0.0, 1.0), 1.35);
    float spatial = (1.0 - radial) * 0.35 + (hash21(floor(uv * 7.0 + seedOff)) - 0.5) * 0.25;
    spatial += (corner - 0.35) * 0.2;
    n = clamp(n + uVariation * spatial, 0.0, 1.0);

    // Stretch progress so early islands appear and late pockets clear.
    float threshold = uProgress * 1.12 - 0.06;
    float band = max(uEdgeWidth, 0.012);

    // cover = 1 while still hidden; 0 when revealed.
    float cover = smoothstep(threshold - band * 0.35, threshold + band, n);
    float edge = 1.0 - smoothstep(0.0, band, abs(n - threshold));
    edge *= cover * 1.15 + (1.0 - cover) * 0.35;
    edge *= smoothstep(0.02, 0.12, uProgress) * (1.0 - smoothstep(0.88, 1.0, uProgress));

    float veil = cover * uCoverOpacity;
    float glow = clamp(edge * uEdgeIntensity, 0.0, 2.0);

    vec3 rgb = uCoverColor * veil + uEdgeColor * glow;
    float alpha = clamp(max(veil, glow * 0.95), 0.0, 1.0) * inside;

    if (alpha < 0.004) {
        discard;
    }

    gl_FragColor = vec4(rgb, alpha);
}
`
