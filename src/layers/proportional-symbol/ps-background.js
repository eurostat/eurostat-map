import { color as d3color } from 'd3-color'

// The background rules written below, by selector: { rule, id (of the map/inset svg), value }.
// They live in eurostat-map's own <style id="custom-styles"> (where updateCSSRule() in
// core/utils.js always created them). Updating a cached rule directly avoids scanning every rule of
// every stylesheet of the page on each call (thousands in a host app, 4 calls per map and inset
// per restyle).
const backgroundRules = new Map()

function getCustomStyleSheet() {
    let customSheet = document.getElementById('custom-styles')
    if (!customSheet) {
        customSheet = document.createElement('style')
        customSheet.id = 'custom-styles'
        document.head.appendChild(customSheet)
    }
    return customSheet.sheet
}

// Rules of maps and insets whose svg is no longer in the document. Inset svg ids are random unless
// configured, so every rebuild with new insets used to add rules that were never removed.
function removeDetachedBackgroundRules() {
    for (const [selector, entry] of backgroundRules) {
        if (document.getElementById(entry.id)) continue
        const sheet = entry.rule.parentStyleSheet
        const index = sheet ? Array.prototype.indexOf.call(sheet.cssRules, entry.rule) : -1
        if (index >= 0) sheet.deleteRule(index)
        backgroundRules.delete(selector)
    }
}

function setBackgroundRule(id, selector, value) {
    const cached = backgroundRules.get(selector)
    const sheet = cached && cached.rule.parentStyleSheet
    if (sheet && sheet.ownerNode && sheet.ownerNode.isConnected) {
        if (cached.value !== value) {
            cached.rule.style.fill = value
            cached.value = value
        }
        return
    }
    backgroundRules.delete(selector)

    const customSheet = getCustomStyleSheet()
    let rule = Array.prototype.find.call(customSheet.cssRules, (r) => r.selectorText === selector)
    if (rule) {
        rule.style.fill = value
    } else {
        removeDetachedBackgroundRules()
        try {
            customSheet.insertRule(`${selector} { fill: ${value}; }`, customSheet.cssRules.length)
            rule = customSheet.cssRules[customSheet.cssRules.length - 1]
        } catch (e) {
            console.error(`Failed to insert rule: ${selector} { fill: ${value}; }`, e)
            return
        }
    }
    backgroundRules.set(selector, { rule, id, value })
}

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
    setBackgroundRule(mapId, `#${mapId}.em--ps:not(.em--dark) .em-nutsrg`, backgroundColor)
    setBackgroundRule(mapId, `#${mapId}.em--ps.em--dark .em-nutsrg`, darkBackgroundColor)
    setBackgroundRule(mapId, `#${mapId}.em--ps:not(.em--dark) .em-cntrg`, tintCountries ? backgroundColor : '')
    setBackgroundRule(mapId, `#${mapId}.em--ps.em--dark .em-cntrg`, tintCountries ? darkBackgroundColor : '')
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
