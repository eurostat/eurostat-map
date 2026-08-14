import { select } from 'd3-selection'
import { getCentroidsGroup } from '../../../core/geo/centroids'
/**
 * @description Appends <circle> elements for each region in the map SVG
 * @param {*} map map instance
 * @param {*} sizeData statistical data for size e.g. map.statData('size')
 * @param {*} out rendering target (layer or inset map object)
 * @param {*} styleSource source object holding PS style/classifier state
 * @return {void}
 */
export function appendCirclesToMap(map, sizeData, out, styleSource) {
    const style = styleSource || out
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
        .attr('stroke-width', style.psStrokeWidth_)
        .attr('stroke', style.psStroke_)
        .attr('fill-opacity', style.psFillOpacity_)
        .attr('stroke-opacity', style.psStrokeOpacity_)

    const setRadius = function (d) {
        const regionId = d?.properties?.id
        const datum = regionId ? sizeData.get(regionId) : null
        const rawValue = datum?.value

        if (rawValue == null || rawValue === ':') return 0

        if (Number.isNaN(+rawValue)) {
            // A non-numeric value matching an extra categorical class (e.g. "edit classification")
            // has no magnitude to size the circle by - without this, it fell through to the same
            // 0 radius as genuinely missing data, so the region got its correct category colour/
            // legend/tooltip but rendered as an invisible, zero-size circle. Use a fixed mid-range
            // size instead so the category is actually visible on the map.
            if (style.categoryFillStyle_ && Object.prototype.hasOwnProperty.call(style.categoryFillStyle_, rawValue)) {
                const minSize = style.psMinSize_ ?? 5
                const maxSize = style.psMaxSize_ ?? 30
                return (minSize + maxSize) / 2
            }
            return 0
        }

        const radius = style.classifierSize_(+rawValue)
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
