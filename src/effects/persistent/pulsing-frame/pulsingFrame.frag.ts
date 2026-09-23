/**
 * Pulsing Frame fragment shader.
 * Thin bright contour + soft illumination that falls inward into the framed area.
 * No corner weighting, no interior fill, no broad exterior halo.
 *
 * SDF: negative = inside rounded rect, positive = outside, zero = edge.
 */
export const PULSING_FRAME_FRAGMENT_SHADER = `
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
uniform float uFrameHalf;
uniform float uGlowWidth;
uniform float uGlowIntensity;
uniform float uOpacity;
uniform float uPulse;

float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

void main() {
    vec2 p = (outTexCoord - 0.5) * uResolution;
    vec2 halfSize = uCardSize * 0.5;
    float radius = min(uRadius, min(halfSize.x, halfSize.y));
    float sd = sdRoundedBox(p, halfSize, radius);

    float frameHalf = max(uFrameHalf, 0.35);

    // Thin bright core on the contour (tiny AA both sides to keep the line natural).
    float core = 1.0 - smoothstep(0.0, frameHalf, abs(sd));
    core = pow(core, 1.25);

    // Soft energy only inside the frame (sd < 0). Outside → no glow cloud.
    float glow = 0.0;
    float glowW = max(uGlowWidth, 0.001);
    if (sd < 0.0 && uGlowIntensity > 0.001) {
        float inward = -sd;
        float gt = clamp(inward / glowW, 0.0, 1.0);
        glow = exp(-2.0 * gt) * (1.0 - smoothstep(0.72, 1.0, gt));
        glow *= uGlowIntensity;
    }

    float strength = (core + glow) * uOpacity * uPulse;
    strength = clamp(strength, 0.0, 1.45);

    if (strength < 0.003) {
        discard;
    }

    gl_FragColor = vec4(uColor * strength, clamp(strength, 0.0, 1.0));
}
`
