import { color as d3color } from 'd3-color'
import { updateCSSRule } from '../../core/utils'

//update the color of background regions of a proportional symbol map
export function updateBackgroundColor(map, symbolFill) {
    const symbolColor = symbolFill || '#ffffff'
    const c = d3color(symbolColor)
    const hexColor = c ? c.formatHex() : '#ffffff'
    const mapId = map.svgId_ || ''
    const brightenFactor = map.psBrightenFactor_ || 0.9
    // a light tint of the symbol colour, or with darkMode() a dark one (mixed into the dark land
    // fill of css/border-modes.css). Both rules are written so toggling darkMode() needs no restyle.
    const backgroundColor = brightenHex(hexColor, brightenFactor)
    const darkBackgroundColor = brightenHex(hexColor, brightenFactor, [0x2a, 0x2a, 0x3e])

    // Always update the em-cntrg rule so a previous mixed/level-0 build's rule
    // does not persist when the user switches to a different level.
    // For level-0 and mixed, apply the same tint (country regions carry real data).
    // For all other levels, reset to '' so the static .em--ps .em-cntrg { fill:#f2f2f2 }
    // rule takes effect again.
    const lvl = map.nutsLevel_
    const tintCountries = lvl === 0 || lvl === '0' || lvl === 'mixed'
    updateCSSRule(`#${mapId}.em--ps:not(.em--dark) .em-nutsrg`, 'fill', backgroundColor)
    updateCSSRule(`#${mapId}.em--ps.em--dark .em-nutsrg`, 'fill', darkBackgroundColor)
    updateCSSRule(`#${mapId}.em--ps:not(.em--dark) .em-cntrg`, 'fill', tintCountries ? backgroundColor : '')
    updateCSSRule(`#${mapId}.em--ps.em--dark .em-cntrg`, 'fill', tintCountries ? darkBackgroundColor : '')
}

// mixes hex towards target (white by default) by brightenFactor (0 to 1)
function brightenHex(hex, brightenFactor, target = [255, 255, 255]) {
    const factor = brightenFactor // Brightening factor (0 to 1)
    // Ensure valid hex
    hex = hex.replace(/^#/, '')
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((c) => c + c)
            .join('')
    }

    // Parse RGB
    const num = parseInt(hex, 16)
    let r = (num >> 16) & 255
    let g = (num >> 8) & 255
    let b = num & 255

    // Increase brightness
    r = Math.min(255, Math.round(r + (target[0] - r) * factor))
    g = Math.min(255, Math.round(g + (target[1] - g) * factor))
    b = Math.min(255, Math.round(b + (target[2] - b) * factor))

    // Return new hex
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
