/**
 * Fragment shader for a traveling luminous rim on a rounded rectangle.
 *
 * Coordinate notes:
 * - `outTexCoord` is WebGL-style (origin bottom-left).
 * - Local space is centered on the quad; +Y points toward the top of the card.
 * - Path direction matches the Graphics rim: top → right → bottom → left.
 */
export const CARD_RIM_LINE_FRAGMENT_SHADER = `
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
uniform float uSegment;
uniform float uCoreWidth;
uniform float uGlowWidth;
uniform vec3 uLineColor;
uniform vec3 uCoreColor;

const float PI = 3.141592653589793;
const float HALF_PI = 1.5707963267948966;
const float TAU = 6.283185307179586;

float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

float perimeterLength(vec2 halfSize, float radius) {
    vec2 straight = max(halfSize - radius, vec2(0.0));
    return 4.0 * (straight.x + straight.y) + TAU * radius;
}

/**
 * Distance along the rim starting at the left end of the top edge,
 * traveling clockwise (screen space).
 */
float distanceAlongRim(vec2 p, vec2 halfSize, float radius) {
    float sx = max(halfSize.x - radius, 1e-4);
    float sy = max(halfSize.y - radius, 1e-4);
    float arc = HALF_PI * radius;
    float top = 2.0 * sx;
    float side = 2.0 * sy;

    // Straight bands first (including the interior of the card).
    if (abs(p.x) <= sx) {
        if (p.y >= 0.0) {
            return clamp(p.x, -sx, sx) + sx;
        }
        return top + arc + side + arc + (sx - clamp(p.x, -sx, sx));
    }

    if (abs(p.y) <= sy) {
        if (p.x >= 0.0) {
            return top + arc + (sy - clamp(p.y, -sy, sy));
        }
        return top + arc + side + arc + top + arc + (clamp(p.y, -sy, sy) + sy);
    }

    // Corner quadrants.
    if (p.x > 0.0 && p.y > 0.0) {
        float a = atan(p.y - sy, p.x - sx);
        return top + (HALF_PI - a) / HALF_PI * arc;
    }

    if (p.x > 0.0 && p.y < 0.0) {
        float a = atan(p.y + sy, p.x - sx);
        return top + arc + side + (0.0 - a) / HALF_PI * arc;
    }

    if (p.x < 0.0 && p.y < 0.0) {
        float a = atan(p.y + sy, p.x + sx);
        if (a > 0.0) {
            a -= TAU;
        }
        return top + arc + side + arc + top + (-HALF_PI - a) / HALF_PI * arc;
    }

    // Top-left
    float a = atan(p.y - sy, p.x + sx);
    return top + arc + side + arc + top + arc + side + (PI - a) / HALF_PI * arc;
}

float segmentIntensity(float along01, float head01, float segment) {
    float behind = fract(head01 - along01);
    float t = clamp(behind / max(segment, 1e-4), 0.0, 1.0);

    // t = 0 at the luminous head, t = 1 at the soft tail tip.
    float head = smoothstep(0.0, 0.12, 1.0 - t);
    float body = pow(1.0 - t, 0.55);
    float tailCut = 1.0 - smoothstep(0.92, 1.0, t);
    return body * head * tailCut;
}

void main() {
    vec2 p = (outTexCoord - 0.5) * uResolution;
    vec2 halfSize = uCardSize * 0.5;
    float radius = min(uRadius, min(halfSize.x, halfSize.y));

    float sd = sdRoundedBox(p, halfSize, radius);
    float radial = abs(sd);

    float glow = exp(-0.5 * pow(radial / max(uGlowWidth, 0.001), 2.0));
    float core = exp(-0.5 * pow(radial / max(uCoreWidth, 0.001), 2.0));

    float peri = perimeterLength(halfSize, radius);
    float along = distanceAlongRim(p, halfSize, radius);
    float along01 = along / max(peri, 1e-4);
    float mask = segmentIntensity(along01, fract(uProgress), uSegment);

    // Kill contribution far from the rim or outside the traveling window.
    float alphaGlow = glow * mask * 0.55;
    float alphaCore = core * mask;

    vec3 color = uLineColor * alphaGlow + uCoreColor * alphaCore;
    float alpha = clamp(alphaGlow + alphaCore, 0.0, 1.0);

    if (alpha < 0.004) {
        discard;
    }

    gl_FragColor = vec4(color, alpha);
}
`
