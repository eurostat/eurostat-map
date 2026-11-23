import { rgb } from 'd3-color'
import { piecewise, interpolateLab } from 'd3-interpolate'

export const DEFAULT_CATEGORICAL_COLORS = [
    '#388AE2',
    '#33A033',
    '#672DC4',
    '#B09120',
    '#B656BD',
    '#AF155C',
    '#2644A7',
    '#AA5F18',
    '#208486',
    '#E04040',
]

/**
 * Single-hue base colours from the Eurostat visual style guide (2022), as published in
 * https://observablehq.com/@eurostat-ws/colour-palettes-for-maps
 * A palette of any length is derived from one by `singleHuePalette`.
 */
export const EUROSTAT_SINGLE_HUES = {
    cornflower: '#388AE2',
    cobalt: '#2644A7',
    darkOrchid: '#672DC4',
    fuchsia: '#B656BD',
    berry: '#AF155C',
    sunsetRed: '#E04040',
    sienna: '#AA5F18',
    darkGold: '#B09120',
    forestGreen: '#007243',
    teal: '#00525C',
    plum: '#A54671',
}

/** Whether `name` is a known single-hue palette name (case-insensitive). */
export const isSingleHueName = (name) => typeof name === 'string' && !!findHue(name)

function findHue(name) {
    const key = Object.keys(EUROSTAT_SINGLE_HUES).find((k) => k.toLowerCase() === String(name).toLowerCase())
    return key ? EUROSTAT_SINGLE_HUES[key] : null
}

// CIE Lab (D65 white point, as in chroma.js) <-> sRGB, unrounded 0-255 channels
const XN = 0.95047
const ZN = 1.08883
const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const gam = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
const finv = (t) => (t > 6 / 29 ? t * t * t : 3 * (6 / 29) ** 2 * (t - 4 / 29))
const f = (t) => (t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29)

function labToRgb(L, a, b) {
    const fy = (L + 16) / 116
    const x = XN * finv(fy + a / 500)
    const y = finv(fy)
    const z = ZN * finv(fy - b / 200)
    const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z
    const g = -0.969266 * x + 1.8760108 * y + 0.041556 * z
    const bl = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z
    // clamp to the sRGB gamut, as chroma.js does for out-of-gamut colours
    return [r, g, bl].map((v) => Math.min(255, Math.max(0, gam(v))))
}

function rgbToLab(r, g, b) {
    const [R, G, B] = [lin(r), lin(g), lin(b)]
    const x = 0.4124564 * R + 0.3575761 * G + 0.1804375 * B
    const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B
    const z = 0.0193339 * R + 0.119192 * G + 0.9503041 * B
    const fy = f(y)
    return [116 * fy - 16, 500 * (f(x / XN) - fy), 200 * (fy - f(z / ZN))]
}

const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/**
 * Light-to-dark sequential palette of `n` colours for a named Eurostat single hue.
 * Reproduces the Eurostat notebook (chroma.js): n evenly spaced CIE Lab lightness values with the
 * base colour's a/b held constant (shifted so one class matches the base colour), smoothed with a
 * Bezier curve through Lab space and resampled with lightness correction.
 * @param {string} name e.g. 'teal', 'plum', 'darkOrchid'
 * @param {number} n number of classes
 * @returns {string[]} hex colours, lightest first
 */
export function singleHuePalette(name, n) {
    const base = findHue(name)
    if (!base) throw new Error('Unknown colour palette: ' + name)
    n = Math.max(1, Math.round(n))
    const c0 = rgb(base)
    if (n === 1) return [c0.formatHex()]
    const [L, a, b] = rgbToLab(c0.r, c0.g, c0.b)

    // control colours, lightest first
    const range = 100 * (0.95 - 1 / n)
    const step = range / (n - 1)
    const start = (100 - range) * 0.5
    const ls = Array.from({ length: n }, (_, i) => start + i * step)
    let offset = Infinity
    ls.forEach((l) => {
        if (Math.abs(L - l) < Math.abs(offset)) offset = L - l
    })
    const ctrl = ls.map((l) => rgbToLab(...labToRgb(l + offset, a, b))).reverse()

    // degree n-1 Bezier through Lab space
    const deg = n - 1
    const row = [1]
    for (let i = 1; i <= deg; i++) row[i] = (row[i - 1] * (deg - i + 1)) / i
    const bez = (t) => {
        const u = 1 - t
        const [bl, ba, bb] = [0, 1, 2].map((k) => ctrl.reduce((sum, el, j) => sum + row[j] * u ** (deg - j) * t ** j * el[k], 0))
        return labToRgb(bl, ba, bb)
    }

    // lightness correction: find t whose lightness lies on the straight line between the end lightnesses
    const lightness = (t) => rgbToLab(...bez(t))[0]
    const L0 = lightness(0)
    const L1 = lightness(1)
    const flip = L0 > L1
    const correct = (t) => {
        const ideal = L0 + (L1 - L0) * t
        let diff = lightness(t) - ideal
        let t0 = 0
        let t1 = 1
        let iter = 20
        while (Math.abs(diff) > 1e-2 && iter-- > 0) {
            if (flip) diff *= -1
            if (diff < 0) {
                t0 = t
                t += (t1 - t) * 0.5
            } else {
                t1 = t
                t += (t0 - t) * 0.5
            }
            diff = lightness(t) - ideal
        }
        return t
    }

    return Array.from({ length: n }, (_, i) => toHex(bez(correct(i / (n - 1)))))
}

/**
 * Diverging schemes are named after the two single hues they join: 'cobalt-plum' runs from dark cobalt
 * (lowest values) through a light neutral to dark plum (highest values). The neutral sits at the point
 * of divergence (see `pointOfDivergence`). Any two different single hues can be joined; these are the
 * combinations that work well together.
 */
export const EUROSTAT_DIVERGING_SCHEMES = [
    'cobalt-plum',
    'cobalt-sienna',
    'cobalt-darkGold',
    'cobalt-sunsetRed',
    'cornflower-sienna',
    'cornflower-berry',
    'teal-plum',
    'teal-berry',
    'teal-sunsetRed',
    'teal-sienna',
    'forestGreen-plum',
    'forestGreen-berry',
    'darkOrchid-darkGold',
]

const NEUTRAL = '#f5f5f5'

function parseDiverging(name) {
    const parts = String(name).split('-')
    if (parts.length !== 2) return null
    const keys = parts.map((p) => Object.keys(EUROSTAT_SINGLE_HUES).find((k) => k.toLowerCase() === p.toLowerCase()))
    return keys[0] && keys[1] && keys[0] !== keys[1] ? keys : null
}

/** Whether `name` joins two different single hues, e.g. 'cobalt-plum' (case-insensitive). */
export const isDivergingName = (name) => typeof name === 'string' && !!parseDiverging(name)

/**
 * A function t in [0, 1] -> hex colour for a diverging scheme: the first hue's dark end at 0, the
 * neutral at 0.5 and the second hue's dark end at 1.
 * @param {string} name e.g. 'cobalt-plum'
 */
export function divergingInterpolator(name) {
    const keys = parseDiverging(name)
    if (!keys) throw new Error('Unknown diverging colour scheme: ' + name)
    const low = singleHuePalette(keys[0], 9).reverse() // dark -> light
    const high = singleHuePalette(keys[1], 9) // light -> dark
    const f = piecewise(interpolateLab, [...low, NEUTRAL, ...high])
    return (t) => rgb(f(Math.min(1, Math.max(0, t)))).formatHex()
}

/**
 * Colours for a classed diverging map. Classes below the point of divergence step from the first hue
 * towards the neutral, classes above step from the neutral to the second hue, so the intensity follows
 * the class order on each side. A class that contains the point of divergence is the neutral one.
 * @param {string} name e.g. 'cobalt-plum'
 * @param {number} nBelow number of classes entirely below the point of divergence
 * @param {boolean} neutral whether one class contains the point of divergence
 * @param {number} nAbove number of classes entirely above it
 * @returns {string[]} hex colours, lowest class first
 */
export function divergingClassColors(name, nBelow, neutral, nAbove) {
    const f = divergingInterpolator(name)
    const ts = []
    for (let i = 0; i < nBelow; i++) ts.push((0.5 * i) / nBelow)
    if (neutral) ts.push(0.5)
    for (let j = 1; j <= nAbove; j++) ts.push(0.5 + (0.5 * j) / nAbove)
    return ts.map(f)
}

/** `n` colours for a diverging scheme with the point of divergence in the middle of the classes. */
export function divergingPalette(name, n) {
    const below = Math.floor(n / 2)
    return divergingClassColors(name, below, n % 2 === 1, n - below - (n % 2))
}
