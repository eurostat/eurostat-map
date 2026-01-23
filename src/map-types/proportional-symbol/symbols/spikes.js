export function appendSpikesToMap(map, sizeData) {
    //The spike function creates a triangular path of the given length (height) with a base width of 7 pixels.
    const spike = (length, width = out.psSpikeWidth_) => `M${-width / 2},0L0,${-length}L${width / 2},0`
    let symbolContainers = map.svg().selectAll('g.em-centroid')

    // Append circles to each symbol container
    const spikes = symbolContainers
        .append('path')
        .attr('d', (d) => {
            const datum = sizeData.get(d.properties.id)
            const value = datum ? out.classifierSize_(+datum.value) : 0
            let path = spike(value)
            return path
        })
        .style('fill', (d) => d.color || 'steelblue') // Adjust color as needed
        //.attr('fill', map.psFill_)
        .attr('fill-opacity', map.psFillOpacity_)
        .attr('stroke', map.psStroke_)
        .attr('stroke-width', map.psStrokeWidth_)

    return spikes
}
