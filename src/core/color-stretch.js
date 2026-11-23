// Named "stretching" of the value-to-colour mapping of continuous colour schemes, as a
// valueTransform / valueUntransform pair for the choropleth layer.

/** Names of the available stretches. 'linear' leaves the values as they are. */
export const COLOR_STRETCHES = ['linear', 'sqrt', 'cbrt', 'log']

// [curve, inverse] applied to the distance from the reference value
const CURVES = {
    sqrt: [Math.sqrt, (u) => u * u],
    cbrt: [Math.cbrt, (u) => u * u * u],
    log: [Math.log1p, Math.expm1],
}

/**
 * The transform and untransform functions of a stretch. The stretch is applied to the distance from a
 * reference value (the point of divergence, or the lowest value of a sequential scheme) and keeps its sign,
 * so it also works for negative values and leaves the reference where it is.
 * @param {string} name one of COLOR_STRETCHES
 * @param {number} [reference=0]
 * @returns {{transform: (v: number) => number, untransform: (v: number) => number}}
 */
export function colorStretch(name, reference = 0) {
    if (name === 'linear') return { transform: (v) => v, untransform: (v) => v }
    const curve = CURVES[name]
    if (!curve) throw new Error('Unknown colour stretch: ' + name + '. Available: ' + COLOR_STRETCHES.join(', '))
    const [forward, inverse] = curve
    return {
        transform: (v) => {
            const d = v - reference
            return Math.sign(d) * forward(Math.abs(d))
        },
        untransform: (u) => reference + Math.sign(u) * inverse(Math.abs(u)),
    }
}
