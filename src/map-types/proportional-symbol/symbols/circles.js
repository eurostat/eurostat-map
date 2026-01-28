import { select } from 'd3-selection'
/**
 * @description Appends <circle> elements for each region in the map SVG
 * @param {*} map map instance
 * @param {*} sizeData statistical data for size e.g. map.statData('size')
 * @return {void}
 */
export function appendCirclesToMap(map, sizeData) {
    // Append circles to each symbol container
    const circles = map
        .svg()
        .selectAll('g.em-centroid')
        .filter((d) => {
            const datum = sizeData.get(d.properties.id)
            return datum && datum.value !== ':' && datum.value
        })
        .append('circle')
        .attr('stroke-width', map.psStrokeWidth())
        .attr('stroke', map.psStroke())
        .attr('fill-opacity', map.psFillOpacity())
        .attr('stroke-opacity', map.psStrokeOpacity())
        .style('pointer-events', 'none') // disable interaction during transition
        .transition()
        .duration(map.transitionDuration())
        .attr('r', function (d) {
            const datum = sizeData.get(d.properties.id)
            const radius = map.classifierSize_(+datum.value)
            if (radius < 0) console.error('Negative radius for circle:', d.properties.id)
            if (isNaN(radius)) console.error('NaN radius for circle:', d.properties.id)
            return radius
        })
        .on('end', function () {
            // Re-enable after animation completes
            select(this).style('pointer-events', null)
        })

    return circles
}
