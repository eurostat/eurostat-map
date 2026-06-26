import { select } from 'd3-selection'
/**
 * @description Appends <circle> elements for each region in the map SVG
 * @param {*} map map instance
 * @param {*} sizeData statistical data for size e.g. map.statData('size')
 * @param {*} out 'main' map object (as opposed to an inset map object)
 * @return {void}
 */
export function appendCirclesToMap(map, sizeData, out) {
    // Disable pointer events on containers during transition to prevent
    // hover events from firing before fill___ is properly set
    map.svg().selectAll('g.em-centroid').style('pointer-events', 'none')

    // Append circles to each symbol container
    const circles = map
        .svg()
        .selectAll('g.em-centroid')
        .filter((d) => {
            const datum = sizeData.get(d.properties.id)
            return datum && datum.value !== ':' && datum.value
        })
        .append('circle')
        .attr('stroke-width', out.psStrokeWidth_)
        .attr('stroke', out.psStroke_)
        .attr('fill-opacity', out.psFillOpacity_)
        .attr('stroke-opacity', out.psStrokeOpacity_)
        .transition()
        .duration(out.transitionDuration_)
        .attr('r', function (d) {
            const datum = sizeData.get(d.properties.id)
            const radius = out.classifierSize_(+datum.value)
            if (radius < 0) console.error('Negative radius for circle:', d.properties.id)
            if (isNaN(radius)) console.error('NaN radius for circle:', d.properties.id)
            return radius
        })
        .on('end', function () {
            // Re-enable pointer events on the container after animation completes
            select(this.parentNode).style('pointer-events', null)
        })

    return circles
}
