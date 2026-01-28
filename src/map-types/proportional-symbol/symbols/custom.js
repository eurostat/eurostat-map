/**
 * @description Appends custom SVG symbols for each region in the map
 * @param {*} map
 * @param {*} sizeData
 * @return {*}
 */
export function appendCustomSymbolsToMap(map, sizeData, out) {
    return map
        .getCentroidsGroup(map)
        .selectAll('g.em-centroid')
        .append('g')
        .filter((rg) => {
            const sv = sizeData.get(rg.properties.id)
            if (sv && sv.value !== ':') return rg
        })
        .attr('class', 'ps')
        .html(out.psCustomSVG_)
        .attr('transform', (rg) => {
            //calculate size
            const sv = sizeData.get(rg.properties.id)
            let size = out.classifierSize_(+sv.value)
            if (size) {
                return `translate(${out.psOffset_.x * size},${out.psOffset_.y * size}) scale(${size})`
            }
        })
}
