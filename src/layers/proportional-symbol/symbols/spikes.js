import { getResponsiveSymbolSize } from '../../../core/responsive'
import { getCentroidsGroup } from '../../../core/geo/centroids'

export function appendSpikesToMap(map, sizeData, out, styleSource) {
    // `out` is the map/inset the symbols are drawn into. Insets never receive the proportional-symbol
    // style state (it lives on the shared layer), so it is read from `styleSource` (the layer).
    const style = styleSource || out
    //The spike function creates a triangular path of the given length (height) with a base width of 7 pixels.
    const spikeWidth = getResponsiveSymbolSize(style.psSpikeWidth_, 1)
    const spike = (length, width = spikeWidth) => `M${-width / 2},0L0,${-length}L${width / 2},0`
    let symbolContainers = getCentroidsGroup(out).selectAll('g.em-centroid')

    // Append circles to each symbol container
    const spikes = symbolContainers
        .append('path')
        .attr('d', (d) => {
            const datum = sizeData.get(d.properties.id)
            const value = datum ? style.classifierSize_(+datum.value) : 0
            let path = spike(value)
            return path
        })
        .style('fill', (d) => d.color || 'steelblue') // Adjust color as needed
        //.attr('fill', map.psFill_)
        .attr('fill-opacity', style.psFillOpacity_)
        .attr('stroke', style.psStroke_)
        .attr('stroke-width', style.psStrokeWidth_)

    return spikes
}
