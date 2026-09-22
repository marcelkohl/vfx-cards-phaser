/**
 * Soft inner-edge glow for a rounded rectangle, weighted toward corners.
 *
 * Intensity falls off toward the card center AND along edge midpoints,
 * matching the reference look (dense corners, quiet straight sides).
 *
 * SDF: negative = inside, positive = outside, zero = edge.
 */
export const EDGE_GLOW_FRAGMENT_SHADER = `
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
uniform float uInnerDist;
uniform float uInnerIntensity;
uniform float uInnerSoftness;
uniform float uOuterSpread;
uniform float uOuterIntensity;
uniform float uOpacity;
uniform float uPulse;
uniform float uCornerFocus;

float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

/**
 * 0 at horizontal/vertical edge midpoints, 1 at corners.
 * uCornerFocus = 0 → uniform; 1 → strong corner bias.
 */
float cornerWeight(vec2 p, vec2 halfSize, float focus) {
    if (focus < 0.001) {
        return 1.0;
    }

    vec2 ap = abs(p) / max(halfSize, vec2(1e-4));
    float expv = mix(0.65, 1.55, clamp(focus, 0.0, 1.0));
    float c = pow(clamp(ap.x, 0.0, 1.0), expv) * pow(clamp(ap.y, 0.0, 1.0), expv);
    c = smoothstep(0.0, mix(0.45, 0.88, focus), c);
    float edgeFloor = mix(1.0, 0.04, focus);
    return mix(edgeFloor, 1.0, c);
}

void main() {
    vec2 p = (outTexCoord - 0.5) * uResolution;
    vec2 halfSize = uCardSize * 0.5;
    float radius = min(uRadius, min(halfSize.x, halfSize.y));
    float sd = sdRoundedBox(p, halfSize, radius);

    float corners = cornerWeight(p, halfSize, uCornerFocus);
    float innerGlow = 0.0;
    float outerGlow = 0.0;

    // Corners reach a bit deeper; mid-edges stay shorter.
    float inner = max(uInnerDist * mix(0.5, 1.2, corners), 0.001);

    if (sd < 0.0) {
        float t = clamp((-sd) / inner, 0.0, 1.0);
        float power = mix(2.35, 1.25, clamp(uInnerSoftness, 0.0, 1.0));
        float rim = pow(max(1.0 - t, 0.0), power);
        float nearEdge = 1.0 - smoothstep(0.0, 0.42, t);
        innerGlow = max(rim, nearEdge * 0.85);
        innerGlow *= 1.0 - smoothstep(0.9, 1.0, t);
        innerGlow *= corners;
    } else if (uOuterSpread > 0.001 && uOuterIntensity > 0.001) {
        float ot = clamp(sd / uOuterSpread, 0.0, 1.0);
        outerGlow = exp(-3.0 * ot) * (1.0 - smoothstep(0.85, 1.0, ot));
        outerGlow *= corners;
    } else {
        discard;
    }

    float glow =
        (innerGlow * uInnerIntensity + outerGlow * uOuterIntensity) *
        uOpacity *
        uPulse;
    glow = clamp(glow, 0.0, 1.0);

    if (glow < 0.003) {
        discard;
    }

    gl_FragColor = vec4(uColor * glow, glow);
}
`
