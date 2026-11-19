import { getCentroidsGroup } from '../../../core/geo/centroids'

/**
 * @description Appends custom SVG symbols for each region in the map
 * @param {*} map
 * @param {*} sizeData
 * @return {*}
 */
export function appendCustomSymbolsToMap(map, sizeData, out, styleSource) {
    // `out` is the map/inset the symbols are drawn into. Insets never receive the proportional-symbol
    // style state (it lives on the shared layer), so it is read from `styleSource` (the layer).
    const style = styleSource || out
    return getCentroidsGroup(out)
        .selectAll('g.em-centroid')
        .append('g')
        .filter((rg) => {
            const sv = sizeData.get(rg.properties.id)
            if (sv && sv.value !== ':') return rg
        })
        .attr('class', 'ps')
        .html(style.psCustomSVG_)
        .attr('transform', (rg) => {
            //calculate size
            const sv = sizeData.get(rg.properties.id)
            let size = style.classifierSize_(+sv.value)
            if (size) {
                return `translate(${style.psOffset_.x * size},${style.psOffset_.y * size}) scale(${size})`
            }
        })
}
