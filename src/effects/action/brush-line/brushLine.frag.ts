/**
 * Luminous horizontal brush / scan front traveling bottom → top,
 * dragging irregular vertical light trails behind it.
 *
 * Local space: origin at card center; +Y is down (matches Phaser texture coords).
 * Front starts at +halfH (bottom) and moves to -halfH (top).
 * Trails extend in +Y (downward / behind the upward sweep).
 */
export const BRUSH_LINE_FRAGMENT_SHADER = `
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
uniform float uScanT;
uniform float uStrength;
uniform float uFrontStrength;
uniform float uIntensity;
uniform float uOpacity;
uniform float uLineHalf;
uniform float uLineIntensity;
uniform float uGlowWidth;
uniform float uTrailCount;
uniform float uMinTrailLength;
uniform float uMaxTrailLength;
uniform float uMinTrailWidth;
uniform float uMaxTrailWidth;
uniform float uTrailIntensity;
uniform float uSeed;

float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

float brushHash(float n) {
    return fract(sin(n * 127.1 + 311.7) * 43758.5453123);
}

void main() {
    vec2 p = (outTexCoord - 0.5) * uResolution;
    vec2 halfSize = uCardSize * 0.5;
    float radius = min(uRadius, min(halfSize.x, halfSize.y));
    float sd = sdRoundedBox(p, halfSize, radius);

    // Allow soft bloom slightly outside the frame; discard far exterior.
    float outerLimit = max(uGlowWidth * 1.15, 10.0);
    if (sd > outerLimit) {
        discard;
    }

    float strength = max(uStrength, 0.0);
    if (strength < 0.004) {
        discard;
    }

    // Bottom (+Y) → top (−Y).
    float frontY = mix(halfSize.y, -halfSize.y, clamp(uScanT, 0.0, 1.0));
    float behind = p.y - frontY;

    // --- Leading horizontal edge + bloom ---
    float dEdge = abs(p.y - frontY);
    float lineHalf = max(uLineHalf, 0.35);
    float core = exp(-(dEdge * dEdge) / max(2.0 * lineHalf * lineHalf, 1e-4));
    float bloom = exp(-(dEdge * dEdge) / max(2.0 * uGlowWidth * uGlowWidth, 1e-3));
    float front =
        (core * uLineIntensity * 1.15 + bloom * 0.55) * max(uFrontStrength, 0.0);

    // Soft luminous band immediately behind the front (not a filled slab).
    float nearWake = 0.0;
    if (behind > 0.0) {
        float wake = exp(-behind / max(uGlowWidth * 1.4, 4.0));
        nearWake = wake * 0.22 * max(uFrontStrength, 0.0);
    }

    // --- Irregular vertical brush trails ---
    float trails = 0.0;
    float count = min(max(uTrailCount, 0.0), 40.0);
    float halfW = max(halfSize.x - 3.0, 1.0);
    float lengthSpan = max(uMaxTrailLength - uMinTrailLength, 0.0);
    float widthSpan = max(uMaxTrailWidth - uMinTrailWidth, 0.0);
    float seed = uSeed + 0.17;

    for (int i = 0; i < 40; i++) {
        if (float(i) >= count) {
            break;
        }

        float fi = float(i);
        float h1 = brushHash(seed + fi * 17.13 + 1.7);
        float h2 = brushHash(seed + fi * 17.13 + 2.9);
        float h3 = brushHash(seed + fi * 17.13 + 3.1);
        float h4 = brushHash(seed + fi * 17.13 + 4.3);
        float h5 = brushHash(seed + fi * 17.13 + 5.5);
        float h6 = brushHash(seed + fi * 17.13 + 6.7);

        float xNorm = clamp(h1 + (h2 - 0.5) * 0.12, 0.0, 1.0);
        float cx = (xNorm - 0.5) * 2.0 * halfW;
        float tLen = uMinTrailLength + h3 * lengthSpan;
        float tHalf = uMinTrailWidth + h4 * widthSpan;
        float bright = 0.35 + h5 * 0.65;
        float soft = 0.35 + h6 * 0.55;

        // Only contribute behind / at the front.
        if (behind < -lineHalf * 2.0) {
            continue;
        }

        float dx = abs(p.x - cx);
        float edgeSoft = mix(1.15, 2.4, soft);
        float profile = exp(-(dx * dx) / max(2.0 * tHalf * tHalf * edgeSoft, 1e-4));
        // Thin brighter core inside wider soft stroke.
        float coreTrail = exp(-(dx * dx) / max(0.45 * tHalf * tHalf, 1e-4));
        float stroke = profile * 0.72 + coreTrail * 0.55;

        float along = clamp(behind / max(tLen, 1.0), 0.0, 1.2);
        // Strong near the front; soft length falloff; faint tip.
        float lengthFade = (1.0 - smoothstep(0.55, 1.05, along)) *
            mix(1.0, 0.55, smoothstep(0.0, 0.22, along));
        // Persistence: denser immediately behind the front.
        float attach = exp(-max(behind, 0.0) / max(tLen * 0.22, 8.0));
        attach = mix(0.55, 1.0, attach);

        trails += stroke * bright * lengthFade * attach;
    }

    trails *= uTrailIntensity * 0.55;

    // Soft overall haze behind the front — very subtle, keeps gaps readable.
    float haze = 0.0;
    if (behind > 0.0 && behind < uMaxTrailLength * 1.05) {
        float ht = behind / max(uMaxTrailLength, 1.0);
        haze = (1.0 - smoothstep(0.15, 1.0, ht)) * 0.07;
    }

    float fall = front + nearWake + trails + haze;
    // Soft frame mask — keep most energy on the card, allow edge bloom.
    float mask = 1.0 - smoothstep(0.0, outerLimit, max(sd, 0.0));
    fall *= mask;

    float glow = clamp(fall * uIntensity * uOpacity * strength, 0.0, 1.85);
    if (glow < 0.003) {
        discard;
    }

    // Hot leading edge approaches white via additive overbright.
    float hot = clamp(core * uFrontStrength * uLineIntensity * 0.9, 0.0, 1.0);
    vec3 rgb = mix(uColor, vec3(1.0), hot * 0.72);
    float alpha = clamp(glow, 0.0, 1.0);
    gl_FragColor = vec4(rgb * glow, alpha);
}
`
