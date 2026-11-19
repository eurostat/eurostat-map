import { symbol, symbolCircle, symbolDiamond, symbolStar, symbolCross, symbolSquare, symbolTriangle, symbolWye } from 'd3-shape'
/**
 * @description give a d3 symbol from a shape name
 */
export const symbolsLibrary = {
    cross: symbolCross,
    square: symbolSquare,
    diamond: symbolDiamond,
    triangle: symbolTriangle,
    star: symbolStar,
    wye: symbolWye,
    circle: symbolCircle,
}

import { getCentroidsGroup } from '../../../core/geo/centroids'

/**
 * @description Appends <path> elements containing symbols for each region in the map SVG
 * @param {*} map map instance
 * @param {*} sizeData e.g. map.statData('size')
 * @return {*}
 */
export function appendD3SymbolsToMap(map, sizeData, out, styleSource) {
    // `out` is the map/inset the symbols are drawn into. Insets never receive the proportional-symbol
    // style state (it lives on the shared layer), so it is read from `styleSource` (the layer).
    const style = styleSource || out
    return getCentroidsGroup(out)
        .selectAll('g.em-centroid')
        .append('path')
        .filter((rg) => {
            const sv = sizeData.get(rg.properties.id)
            if (sv && sv.value !== ':') return rg
        })
        .attr('class', 'ps')
        .attr('d', (rg) => {
            //calculate size
            if (!sizeData) return
            const sv = sizeData.get(rg.properties.id)
            if (sv != 0 && !sv) return
            let size = style.classifierSize_(+sv.value) || 0

            //apply size to shape
            if (style.psCustomShape_) {
                return style.psCustomShape_.size(size * size)()
            } else {
                const symbolType = symbolsLibrary[style.psShape_] || symbolsLibrary['circle']
                return symbol()
                    .type(symbolType)
                    .size(size * size)()
            }
        })
}
