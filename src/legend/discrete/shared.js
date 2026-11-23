// Helpers shared by the vertical and horizontal discrete colour legends
import { executeForAllInsets, getFontSizeFromClass } from '../../core/utils'
import { swatchStackLayout, swatchStackStart } from '../legend-swatch'

export function highlightClass(map, callback, ecl) {
    callback(map, ecl)
    if (map.insetTemplates_) executeForAllInsets(map.insetTemplates_, map.svgId, callback, ecl)
}

/** y of the bottom of the class swatch stack (just below the title), before any divergence shift. */
export function classStackBottom(out, config) {
    return swatchStackLayout({ count: out.getNumberOfClasses(out), shapeHeight: config.shapeHeight, startY: getTitlePadding(out) }).bottom
}

export function getTitlePadding(out) {
    // gap between the title and the first legend item
    const map = out.map
    return swatchStackStart({
        titlePadding: map._mapType == 'ps' ? out.colorLegend.titlePadding : out.titlePadding || 0,
        extraPadding: out.maxMin ? 10 : 0, // room for the max label
        subtitleHeight: out.colorLegend?.subtitle ? getFontSizeFromClass('em-legend-subtitle') + 2 : 0,
    })
}
