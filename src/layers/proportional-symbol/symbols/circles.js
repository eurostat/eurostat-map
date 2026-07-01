import { select } from 'd3-selection'
import { getCentroidsGroup } from '../../../core/geo/centroids'
/**
 * @description Appends <circle> elements for each region in the map SVG
 * @param {*} map map instance
 * @param {*} sizeData statistical data for size e.g. map.statData('size')
 * @param {*} out 'main' map object (as opposed to an inset map object)
 * @return {void}
 */
export function appendCirclesToMap(map, sizeData, out) {
    const centroidsGroup = getCentroidsGroup(out)
    const symbolContainers = centroidsGroup.selectAll('g.em-centroid')
    const transitionDuration = out.transitionDuration_ || 0

    // Disable pointer events only while an animated transition is running.
    if (transitionDuration > 0) {
        symbolContainers.style('pointer-events', 'none')
    }

    // Append circles to each symbol container
    const circles = symbolContainers
        .append('circle')
        .attr('stroke-width', out.psStrokeWidth_)
        .attr('stroke', out.psStroke_)
        .attr('fill-opacity', out.psFillOpacity_)
        .attr('stroke-opacity', out.psStrokeOpacity_)

    const setRadius = function (d) {
        const regionId = d?.properties?.id
        const datum = regionId ? sizeData.get(regionId) : null
        const rawValue = datum?.value

        if (rawValue == null || rawValue === ':' || Number.isNaN(+rawValue)) return 0

        const radius = out.classifierSize_(+rawValue)
        if (radius < 0) console.error('Negative radius for circle:', regionId)
        if (isNaN(radius)) console.error('NaN radius for circle:', regionId)
        return radius
    }

    if (transitionDuration > 0) {
        // Ensure circles always have a radius even if the transition is interrupted.
        circles
            .attr('r', 0)
            .transition()
            .duration(transitionDuration)
            .attr('r', setRadius)
            .on('end', function () {
                select(this.parentNode).style('pointer-events', null)
            })
            .on('interrupt', function (event, d) {
                select(this).attr('r', setRadius(d))
                select(this.parentNode).style('pointer-events', null)
            })
    } else {
        circles.attr('r', setRadius)
    }

    return circles
}
