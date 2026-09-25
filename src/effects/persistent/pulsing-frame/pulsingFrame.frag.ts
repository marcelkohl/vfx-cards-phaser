/**
 * Pulsing Frame fragment shader.
 * Thin bright contour + soft illumination on the configured side(s) of the frame.
 * No corner weighting, no interior fill wash.
 *
 * SDF: negative = inside rounded rect, positive = outside, zero = edge.
 * uGlowDirection: 0 = inside, 1 = outside, 2 = both.
 *
 * Soft glow uses a nonlinear distance falloff: strong near the contour,
 * rapidly weaker mid-band, faint dissolving tail — not a flat padded band.
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
uniform float uGlowDirection;
uniform float uOpacity;
uniform float uPulse;

float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

/**
 * Emitted-light profile vs normalized distance from the contour (0..1).
 * Most visible energy sits near t≈0; the far end is already near zero
 * before the soft outer gate, so the glowWidth boundary is not a visible panel edge.
 */
float softContourGlow(float dist, float width) {
    float t = clamp(dist / max(width, 0.001), 0.0, 1.0);
    // Near-edge bloom (dominant).
    float near = exp(-5.8 * t);
    // Soft mid / long tail — keeps spatial reach without a flat cyan mass.
    float mid = 0.28 * exp(-2.0 * t);
    float tail = 0.12 * exp(-0.95 * t);
    float g = near + mid + tail;
    // Outer support already ~0; gentle multiply avoids a hard cutoff artifact.
    g *= 1.0 - smoothstep(0.9, 1.0, t);
    return g;
}

void main() {
    vec2 p = (outTexCoord - 0.5) * uResolution;
    vec2 halfSize = uCardSize * 0.5;
    float radius = min(uRadius, min(halfSize.x, halfSize.y));
    float sd = sdRoundedBox(p, halfSize, radius);

    float frameHalf = max(uFrameHalf, 0.35);

    // Single contour core — shared across inside / outside / both.
    float core = 1.0 - smoothstep(0.0, frameHalf, abs(sd));
    core = pow(core, 1.2);

    float glow = 0.0;
    float glowW = max(uGlowWidth, 0.001);
    bool inside = uGlowDirection < 0.5 || uGlowDirection > 1.5;
    bool outside = uGlowDirection > 0.5;

    if (uGlowIntensity > 0.001) {
        if (inside && sd < 0.0) {
            glow += softContourGlow(-sd, glowW);
        }
        if (outside && sd > 0.0) {
            glow += softContourGlow(sd, glowW);
        }
        glow *= uGlowIntensity;
    }

    float strength = (core + glow) * uOpacity * uPulse;
    strength = clamp(strength, 0.0, 1.45);

    // Discard only when already negligible — preserves the faint dissolving tail.
    if (strength < 0.002) {
        discard;
    }

    gl_FragColor = vec4(uColor * strength, clamp(strength, 0.0, 1.0));
}
`
