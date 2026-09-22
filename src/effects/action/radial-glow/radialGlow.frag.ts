/**
 * Soft luminous expanding halo ring.
 * Thin dense current rim + long soft inner ghost trail + short outer glow.
 * Brightness peaks at the circumference (d ≈ 1), not at the center.
 */
export const RADIAL_GLOW_FRAGMENT_SHADER = `
#pragma phaserTemplate(shaderName)

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 outTexCoord;

uniform vec2 uResolution;
uniform vec2 uRadii;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uOpacity;
uniform float uSoftness;
/** Half-width of the thin dense current rim in normalized ellipse space. */
uniform float uRingHalf;
/** Extra emphasis on the current rim (1 = neutral baseline). */
uniform float uRimIntensity;
/** How far the ghost trail extends inward from the rim (normalized d units). */
uniform float uInnerTrail;
/** How far soft glow extends outside the rim (normalized d units). */
uniform float uOuterGlow;

void main() {
    vec2 p = (outTexCoord - 0.5) * uResolution;
    vec2 radii = max(uRadii, vec2(0.5));
    float d = length(p / radii);

    float soft = clamp(uSoftness, 0.0, 1.0);
    // Thin core — do not let softness thicken the rim itself.
    float rimHalf = max(uRingHalf, 0.0012);
    float innerExtent = max(uInnerTrail, 0.02);
    float outerExtent = max(uOuterGlow, 0.01);

    float sigmaIn = innerExtent * mix(0.42, 0.62, soft);
    float sigmaOut = outerExtent * mix(0.38, 0.58, soft);
    // Rim sigma stays tightly coupled to ringWidth (softness only barely softens).
    float rimSigma = rimHalf * mix(0.55, 0.85, soft);
    // Soft optical haze around the thin rim — independent of rim thickness.
    float softWingSigma = mix(0.012, 0.028, soft);

    float inside = max(1.0 - d, 0.0);
    float outside = max(d - 1.0, 0.0);
    float rimDist = abs(d - 1.0);

    float cutoff = max(innerExtent * mix(1.8, 2.4, soft), outerExtent * mix(2.0, 2.8, soft));
    cutoff = max(cutoff, softWingSigma * 3.5);
    if (rimDist > cutoff && inside > innerExtent * 1.05) {
        discard;
    }
    if (d > 1.0 + cutoff) {
        discard;
    }

    // --- Inner ghost trail (broad, low, longer falloff toward center) ---
    float trail = 0.0;
    if (inside > 0.0) {
        float t = inside / sigmaIn;
        trail = exp(-(t * t) * 0.55) * mix(0.2, 0.3, soft);
        float shoulder = exp(-(t * t) * 0.16) * 0.1;
        trail += shoulder;
        trail *= smoothstep(innerExtent * 1.05, 0.0, inside);
    }

    // --- Short outer glow (ahead of the wave front) ---
    float outer = 0.0;
    if (outside > 0.0) {
        float t = outside / sigmaOut;
        outer = exp(-(t * t)) * mix(0.32, 0.46, soft);
        outer *= smoothstep(outerExtent * 1.1, 0.0, outside);
    }

    // --- Thin dense current rim (visual anchor) ---
    float rimBoost = max(uRimIntensity, 0.0);
    float rim = exp(-(rimDist * rimDist) / max(2.0 * rimSigma * rimSigma, 1e-6));
    rim *= mix(1.05, 1.2, soft) * rimBoost;

    // Soft haze around the thin core — keeps it optical, not a vector stroke.
    float softWing = exp(-(rimDist * rimDist) / max(2.0 * softWingSigma * softWingSigma, 1e-6));
    softWing *= 0.28 * mix(0.85, 1.1, soft);

    float fall = trail + outer + rim + softWing;
    fall = clamp(fall, 0.0, 1.75);

    float glow = clamp(fall * uIntensity * uOpacity, 0.0, 1.0);
    if (glow < 0.0025) {
        discard;
    }

    gl_FragColor = vec4(uColor * glow, glow);
}
`
