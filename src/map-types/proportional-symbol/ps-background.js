import { color as d3color } from 'd3-color';
import { updateCSSRule } from '../../core/utils';

//update the color of background regions of a proportional symbol map
export function updateBackgroundColor(map, symbolFill) {
    const symbolColor = symbolFill || '#ffffff'
    const c = d3color(symbolColor)
    const hexColor = c ? c.formatHex() : '#ffffff'
    const mapId = map.svgId_ || ''
    const brightenFactor = map.psBrightenFactor_ || 0.9
    const backgroundColor = getBackgroundColor(hexColor, brightenFactor)

    updateCSSRule(`#${mapId}.em--ps .em-nutsrg`, 'fill', backgroundColor)
}

function getBackgroundColor(fillColor, brightenFactor) {
    return brightenHex(fillColor, brightenFactor)
}

function brightenHex(hex, brightenFactor) {
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
    r = Math.min(255, Math.round(r + (255 - r) * factor))
    g = Math.min(255, Math.round(g + (255 - g) * factor))
    b = Math.min(255, Math.round(b + (255 - b) * factor))

    // Return new hex
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
