// Helpers shared by the vertical and horizontal discrete colour legends
import { executeForAllInsets, getFontSizeFromClass } from '../../core/utils'
import { swatchStackLayout } from '../legend-swatch'

export function highlightClass(map, callback, ecl) {
    callback(map, ecl)
    if (map.insetTemplates_) executeForAllInsets(map.insetTemplates_, map.svgId, callback, ecl)
}

/** y of the bottom of the class swatch stack (just below the title), before any divergence shift. */
export function classStackBottom(out, config) {
    return swatchStackLayout({ count: out.getNumberOfClasses(out), shapeHeight: config.shapeHeight, startY: getTitlePadding(out) }).bottom
}

export function getTitlePadding(out) {
    // Calculate the padding between the title and the first legend item
    const map = out.map
    let p = map._mapType == 'ps' ? out.colorLegend.titlePadding : out.titlePadding || 0
    if (out.maxMin) p += 10 // extra padding if max/min labels are shown
    if (out.colorLegend?.subtitle) p += getFontSizeFromClass('em-legend-subtitle') + 2
    return p
}
